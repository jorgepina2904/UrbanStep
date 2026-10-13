import { mockUsers as defaultUsers } from '../data/mockUsers';
import { auditService } from './auditService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const mapDbUser = (u) => ({
    id: u.id,
    name: u.nombre_completo,
    email: u.correo,
    role: u.rol === 'admin' ? 'Admin' : (u.rol === 'gerente' ? 'Gerente' : 'Cajero'),
    branch: u.sucursal || 'Sede Principal',
    assignedCaja: u.caja_asignada_id || '',
    active: u.activo !== undefined ? u.activo : true,
    createdAt: u.creado_el,
    updatedAt: u.actualizado_el,
    password: u.rol === 'admin' ? 'admin123' : 'cajero123'
});

// Semilla inicial en memoria para arranque instantáneo
let _cachedUsers = defaultUsers.map(u => ({
    ...u,
    active: u.active !== undefined ? u.active : true,
    createdAt: new Date().toISOString()
}));

const initUsersFromCloud = async () => {
    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .order('creado_el', { ascending: true });

            if (!error && Array.isArray(data) && data.length > 0) {
                _cachedUsers = data.map(mapDbUser);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('users_changed', { detail: _cachedUsers }));
                }
            }
        } catch (e) {
            console.warn('Aviso cargando usuarios desde Supabase:', e);
        }
    }
};

if (typeof window !== 'undefined') {
    setTimeout(initUsersFromCloud, 10);
}

export const userService = {
    /**
     * Obtener todos los usuarios registrados (sincrónico desde memoria)
     */
    getAll: () => {
        return [..._cachedUsers];
    },

    /**
     * Obtener todos los usuarios directamente de Supabase
     */
    fetchAll: async () => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('*')
                    .order('creado_el', { ascending: true });

                if (!error && Array.isArray(data)) {
                    _cachedUsers = data.map(mapDbUser);
                    return [..._cachedUsers];
                }
            } catch (err) {
                console.error('Error consultando usuarios en Supabase:', err);
            }
        }
        return [..._cachedUsers];
    },

    /**
     * Obtener solo cajeros disponibles
     */
    getCashiers: () => {
        return _cachedUsers.filter(u => u.role === 'Cajero' && u.active);
    },

    /**
     * Obtener usuario por ID
     */
    getById: (id) => {
        return _cachedUsers.find(u => u.id === id) || null;
    },

    /**
     * Crear un nuevo usuario en Supabase
     */
    create: async ({ name, email, password, role = 'Cajero', assignedCaja = '', branch = 'Sede Principal', adminUser = null }) => {
        if (!name || !name.trim()) throw new Error('El nombre completo es obligatorio');
        if (!email || !email.trim()) throw new Error('El correo o identificador es obligatorio');
        if (!password || password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');

        const cleanEmail = email.trim().toLowerCase();
        if (_cachedUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
            throw new Error(`Ya existe un usuario con el correo "${cleanEmail}"`);
        }

        const newUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined;
        const normalizedRole = role.toLowerCase() === 'admin' ? 'admin' : (role.toLowerCase() === 'gerente' ? 'gerente' : 'cajero');

        const dbRow = {
            nombre_completo: name.trim(),
            correo: cleanEmail,
            rol: normalizedRole,
            sucursal: branch || 'Sede Principal',
            caja_asignada_id: assignedCaja ? assignedCaja : null,
            activo: true
        };
        if (newUuid) dbRow.id = newUuid;

        let createdUser = null;

        if (isSupabaseConfigured() && supabase) {
            const { data, error } = await supabase.from('usuarios').insert(dbRow).select().single();
            if (!error && data) {
                createdUser = mapDbUser(data);
            } else if (error) {
                console.error('Error insertando usuario en Supabase:', error);
                throw new Error(`Error en base de datos al crear usuario: ${error.message}`);
            }
        }

        if (!createdUser) {
            createdUser = {
                id: newUuid || `u-${Date.now()}`,
                name: name.trim(),
                email: cleanEmail,
                password: password.trim(),
                role: role || 'Cajero',
                branch: branch || 'Sede Principal',
                assignedCaja: assignedCaja || '',
                active: true,
                createdAt: new Date().toISOString()
            };
        }

        _cachedUsers.push(createdUser);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('users_changed', { detail: _cachedUsers }));
        }

        // Auditoría
        auditService.log({
            userId: adminUser?.id,
            userName: adminUser?.name || 'Administrador General',
            userRole: adminUser?.role || 'Admin',
            userEmail: adminUser?.email,
            action: 'create',
            actionLabel: `Creó el usuario ${createdUser.name} (${createdUser.role}) asignado a ${createdUser.assignedCaja || 'Sin caja'}`,
            module: 'settings',
            entityType: 'user',
            entityId: createdUser.id,
            details: { name: createdUser.name, email: createdUser.email, role: createdUser.role }
        });

        return createdUser;
    },

    /**
     * Actualizar usuario existente en Supabase
     */
    update: async (id, data, adminUser = null) => {
        const index = _cachedUsers.findIndex(u => u.id === id);
        const current = index !== -1 ? _cachedUsers[index] : null;

        const normalizedRole = data.role ? (data.role.toLowerCase() === 'admin' ? 'admin' : (data.role.toLowerCase() === 'gerente' ? 'gerente' : 'cajero')) : undefined;

        if (isSupabaseConfigured() && supabase) {
            const updates = {
                actualizado_el: new Date().toISOString()
            };
            if (data.name) updates.nombre_completo = data.name.trim();
            if (data.email) updates.correo = data.email.trim().toLowerCase();
            if (normalizedRole) updates.rol = normalizedRole;
            if (data.branch) updates.sucursal = data.branch;
            if (data.assignedCaja !== undefined) updates.caja_asignada_id = data.assignedCaja || null;
            if (data.active !== undefined) updates.activo = Boolean(data.active);

            const { error } = await supabase.from('usuarios').update(updates).eq('id', id);
            if (error) {
                console.error('Error actualizando usuario en Supabase:', error);
                throw new Error(`Error en base de datos al actualizar usuario: ${error.message}`);
            }
        }

        const updated = {
            ...(current || {}),
            ...data,
            name: data.name ? data.name.trim() : (current?.name || ''),
            email: data.email ? data.email.trim().toLowerCase() : (current?.email || ''),
            role: data.role || (current?.role || 'Cajero'),
            assignedCaja: data.assignedCaja !== undefined ? data.assignedCaja : (current?.assignedCaja || ''),
            branch: data.branch || (current?.branch || 'Sede Principal'),
            active: data.active !== undefined ? Boolean(data.active) : (current ? current.active : true),
            updatedAt: new Date().toISOString()
        };

        if (index !== -1) {
            _cachedUsers[index] = updated;
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('users_changed', { detail: _cachedUsers }));
        }

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
        const user = _cachedUsers.find(u => u.id === id);
        if (!user) throw new Error('Usuario no encontrado');

        if (user.role === 'Admin' && _cachedUsers.filter(u => u.role === 'Admin' && u.active).length <= 1 && user.active) {
            throw new Error('No puedes desactivar al único Administrador activo del sistema');
        }

        return userService.update(id, { active: !user.active }, adminUser);
    },

    /**
     * Asignar usuario a una caja registradora específica
     */
    assignCaja: async (userId, cajaName, adminUser = null) => {
        return userService.update(userId, { assignedCaja: cajaName }, adminUser);
    }
};

export default userService;
