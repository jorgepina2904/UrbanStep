import { mockUsers as defaultUsers } from '../data/mockUsers';
import { auditService } from './auditService';

const USERS_STORAGE_KEY = 'urbanstep_system_users';

const getStoredUsers = () => {
    try {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error('Error leyendo usuarios de localStorage:', e);
    }

    const initial = defaultUsers.map(u => ({
        ...u,
        active: u.active !== undefined ? u.active : true,
        createdAt: new Date().toISOString()
    }));

    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {
        console.error('Error guardando usuarios iniciales:', e);
    }
    return initial;
};

const saveUsers = (users) => {
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('users_changed', { detail: users }));
        }
    } catch (e) {
        console.error('Error guardando usuarios en localStorage:', e);
    }
};

export const userService = {
    /**
     * Obtener todos los usuarios registrados
     */
    getAll: () => {
        return getStoredUsers();
    },

    /**
     * Obtener solo cajeros disponibles
     */
    getCashiers: () => {
        return getStoredUsers().filter(u => u.role === 'Cajero' && u.active);
    },

    /**
     * Obtener usuario por ID
     */
    getById: (id) => {
        const users = getStoredUsers();
        return users.find(u => u.id === id) || null;
    },

    /**
     * Crear un nuevo usuario del sistema
     */
    create: async ({ name, email, password, role = 'Cajero', assignedCaja = '', branch = 'Sede Principal', adminUser = null }) => {
        const users = getStoredUsers();

        if (!name || !name.trim()) {
            throw new Error('El nombre completo es obligatorio');
        }
        if (!email || !email.trim()) {
            throw new Error('El correo o identificador es obligatorio');
        }
        if (!password || password.length < 4) {
            throw new Error('La contraseña debe tener al menos 4 caracteres');
        }

        const cleanEmail = email.trim().toLowerCase();
        if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
            throw new Error(`Ya existe un usuario con el correo "${cleanEmail}"`);
        }

        const nextNum = users.length + 1;
        const newId = `u${nextNum}-${Date.now().toString(36).slice(-4)}`;

        const newUser = {
            id: newId,
            name: name.trim(),
            email: cleanEmail,
            password: password.trim(),
            role: role || 'Cajero',
            branch: branch || 'Sede Principal',
            assignedCaja: assignedCaja || '',
            active: true,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);

        // Auditoría
        auditService.log({
            userId: adminUser?.id,
            userName: adminUser?.name || 'Administrador General',
            userRole: adminUser?.role || 'Admin',
            userEmail: adminUser?.email,
            action: 'create',
            actionLabel: `Creó el usuario ${newUser.name} (${newUser.role}) asignado a ${newUser.assignedCaja || 'Sin caja'}`,
            module: 'settings',
            entityType: 'user',
            entityId: newUser.id,
            details: { name: newUser.name, email: newUser.email, role: newUser.role, assignedCaja: newUser.assignedCaja }
        });

        return newUser;
    },

    /**
     * Actualizar usuario existente
     */
    update: async (id, data, adminUser = null) => {
        const users = getStoredUsers();
        const index = users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('Usuario no encontrado');

        const current = users[index];
        const updated = {
            ...current,
            ...data,
            name: data.name ? data.name.trim() : current.name,
            email: data.email ? data.email.trim().toLowerCase() : current.email,
            password: data.password ? data.password.trim() : current.password,
            role: data.role || current.role,
            assignedCaja: data.assignedCaja !== undefined ? data.assignedCaja : current.assignedCaja,
            branch: data.branch || current.branch,
            active: data.active !== undefined ? Boolean(data.active) : current.active,
            updatedAt: new Date().toISOString()
        };

        users[index] = updated;
        saveUsers(users);

        auditService.log({
            userId: adminUser?.id,
            userName: adminUser?.name || 'Administrador General',
            userRole: adminUser?.role || 'Admin',
            action: 'update',
            actionLabel: `Actualizó datos del usuario ${updated.name}`,
            module: 'settings',
            entityType: 'user',
            entityId: updated.id,
            details: data
        });

        return updated;
    },

    /**
     * Alternar estado activo / inactivo
     */
    toggleActive: async (id, adminUser = null) => {
        const users = getStoredUsers();
        const index = users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('Usuario no encontrado');

        if (users[index].role === 'Admin' && users.filter(u => u.role === 'Admin' && u.active).length <= 1 && users[index].active) {
            throw new Error('No puedes desactivar al único Administrador activo del sistema');
        }

        users[index].active = !users[index].active;
        users[index].updatedAt = new Date().toISOString();
        saveUsers(users);

        auditService.log({
            userId: adminUser?.id,
            userName: adminUser?.name || 'Administrador General',
            userRole: adminUser?.role || 'Admin',
            action: 'update',
            actionLabel: `${users[index].active ? 'Activó' : 'Desactivó'} al usuario ${users[index].name}`,
            module: 'settings',
            entityType: 'user',
            entityId: id,
            details: { active: users[index].active }
        });

        return users[index];
    },

    /**
     * Asignar usuario a una caja registradora específica
     */
    assignCaja: async (userId, cajaName, adminUser = null) => {
        return userService.update(userId, { assignedCaja: cajaName }, adminUser);
    }
};

export default userService;
