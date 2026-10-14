import { auditService } from './auditService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { mockUsers } from '../data/mockUsers';

const mapDbUser = (u) => {
    let assigned = u.caja_asignada_id || '';
    if (assigned === 'caja-1') assigned = 'Caja 1';
    else if (assigned === 'caja-2') assigned = 'Caja 2';
    else if (assigned === 'caja-3') assigned = 'Caja 3';

    const rLower = (u.rol || '').toLowerCase();
    let mappedRole = 'Cajero';
    if (rLower === 'admin') mappedRole = 'Admin';
    else if (rLower === 'gerente' || rLower === 'supervisor') mappedRole = 'Supervisor';
    else if (rLower === 'motorizado') mappedRole = 'Motorizado';
    else if (rLower === 'cliente') mappedRole = 'Cliente';

    return {
        id: u.id,
        name: u.nombre_completo,
        email: u.correo,
        role: mappedRole,
        branch: u.sucursal || 'Sede Principal',
        assignedCaja: assigned,
        phone: u.telefono || u.phone || '',
        vehicle: u.vehiculo || u.vehicle || '',
        plate: u.placa || u.plate || '',
        rating: u.rating || 4.9,
        deliveriesCount: u.deliveries_count || u.deliveriesCount || 0,
        active: u.activo !== undefined ? u.activo : true,
        createdAt: u.creado_el,
        updatedAt: u.actualizado_el,
        password: mappedRole === 'Admin' ? 'admin2914' : (mappedRole === 'Motorizado' ? 'moto123' : 'cajero123')
    };
};

// Caché reactiva sincronizada con la base de datos y respaldada por mockUsers
let _cachedUsers = [...mockUsers];

const initUsersFromCloud = async () => {
    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .order('creado_el', { ascending: true });

            if (!error && Array.isArray(data) && data.length > 0) {
                const cloudUsers = data.map(mapDbUser);
                // Asegurar que los motorizados de la flota base siempre existan
                const merged = [...cloudUsers];
                mockUsers.forEach(mu => {
                    if (!merged.some(cu => cu.email.toLowerCase() === mu.email.toLowerCase())) {
                        merged.push(mu);
                    }
                });
                _cachedUsers = merged;
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
    initUsersFromCloud();
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
    create: async ({ name, email, password, role = 'Cajero', assignedCaja = '', branch = 'Sede Principal', phone = '', vehicle = '', plate = '', rating = 4.9, adminUser = null }) => {
        if (!name || !name.trim()) throw new Error('El nombre completo es obligatorio');
        if (!email || !email.trim()) throw new Error('El correo o identificador es obligatorio');
        if (!password || password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');

        const cleanEmail = email.trim().toLowerCase();
        if (_cachedUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
            throw new Error(`Ya existe un usuario con el correo "${cleanEmail}"`);
        }

        const newUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined;
        const rLow = (role || '').toLowerCase();
        let normalizedRole = 'cajero';
        if (rLow === 'admin') normalizedRole = 'admin';
        else if (rLow === 'gerente' || rLow === 'supervisor') normalizedRole = 'gerente';
        else if (rLow === 'motorizado') normalizedRole = 'motorizado';
        else if (rLow === 'cliente') normalizedRole = 'cliente';

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
            try {
                const { data, error } = await supabase.from('usuarios').insert(dbRow).select().single();
                if (!error && data) {
                    createdUser = mapDbUser(data);
                } else if (error) {
                    // Si el enum de postgres no incluye 'motorizado', reintentar con 'cajero' como fallback en BD
                    if (error.message?.includes('enum') || error.code === '22P02') {
                        const fallbackRow = { ...dbRow, rol: 'cajero' };
                        const { data: fbData } = await supabase.from('usuarios').insert(fallbackRow).select().single();
                        if (fbData) {
                            createdUser = { ...mapDbUser(fbData), role: role || 'Motorizado' };
                        }
                    } else {
                        console.warn('Aviso insertando usuario en Supabase:', error);
                    }
                }
            } catch (supErr) {
                console.warn('Aviso conexión Supabase usuarios:', supErr);
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
                assignedCaja: assignedCaja || (role === 'Motorizado' ? 'Flota Delivery' : ''),
                phone: phone || '',
                vehicle: vehicle || '',
                plate: plate || '',
                rating: rating || 4.9,
                deliveriesCount: 0,
                active: true,
                createdAt: new Date().toISOString()
            };
        } else {
            createdUser.phone = phone || createdUser.phone || '';
            createdUser.vehicle = vehicle || createdUser.vehicle || '';
            createdUser.plate = plate || createdUser.plate || '';
            createdUser.rating = rating || createdUser.rating || 4.9;
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

        const rLow = (data.role || current?.role || '').toLowerCase();
        let normalizedRole = 'cajero';
        if (rLow === 'admin') normalizedRole = 'admin';
        else if (rLow === 'gerente' || rLow === 'supervisor') normalizedRole = 'gerente';
        else if (rLow === 'motorizado') normalizedRole = 'motorizado';
        else if (rLow === 'cliente') normalizedRole = 'cliente';

        if (isSupabaseConfigured() && supabase) {
            try {
                const updates = {
                    actualizado_el: new Date().toISOString()
                };
                if (data.name) updates.nombre_completo = data.name.trim();
                if (data.email) updates.correo = data.email.trim().toLowerCase();
                if (data.role) updates.rol = normalizedRole;
                if (data.branch) updates.sucursal = data.branch;
                if (data.assignedCaja !== undefined) updates.caja_asignada_id = data.assignedCaja || null;
                if (data.active !== undefined) updates.activo = Boolean(data.active);

                const { error } = await supabase.from('usuarios').update(updates).eq('id', id);
                if (error && (error.message?.includes('enum') || error.code === '22P02')) {
                    updates.rol = 'cajero';
                    await supabase.from('usuarios').update(updates).eq('id', id);
                }
            } catch (err) {
                console.warn('Aviso actualizando usuario en Supabase:', err);
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
            phone: data.phone !== undefined ? data.phone : (current?.phone || ''),
            vehicle: data.vehicle !== undefined ? data.vehicle : (current?.vehicle || ''),
            plate: data.plate !== undefined ? data.plate : (current?.plate || ''),
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
    },

    /**
     * Eliminar usuario de Supabase Cloud
     */
    delete: async (id, adminUser = null) => {
        const user = _cachedUsers.find(u => u.id === id);
        if (!user) throw new Error('Usuario no encontrado');

        if (user.role === 'Admin' && _cachedUsers.filter(u => u.role === 'Admin' && u.active).length <= 1) {
            throw new Error('No es posible eliminar al único Administrador activo del sistema.');
        }
        if (adminUser && adminUser.id === id) {
            throw new Error('No puedes eliminar tu propia cuenta en sesión activa.');
        }

        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase.from('usuarios').delete().eq('id', id);
            if (error) {
                console.error('Error eliminando usuario en Supabase:', error);
                throw new Error(`Error en base de datos al eliminar usuario: ${error.message}`);
            }
        }

        _cachedUsers = _cachedUsers.filter(u => u.id !== id);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('users_changed', { detail: _cachedUsers }));
        }

        auditService.log({
            userId: adminUser?.id,
            userName: adminUser?.name || 'Administrador General',
            userRole: adminUser?.role || 'Admin',
            action: 'delete',
            actionLabel: `Eliminó el usuario ${user.name} (${user.role})`,
            module: 'settings',
            entityType: 'user',
            entityId: id,
            details: { name: user.name, email: user.email, role: user.role }
        });

        return true;
    }
};

export default userService;
