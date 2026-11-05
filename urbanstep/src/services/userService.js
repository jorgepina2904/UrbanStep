import { auditService } from './auditService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { mockUsers } from '../data/mockUsers';
import { normalizeEmail, validateEmail, validatePassword, validatePersonName, validatePhoneVE } from '../utils/validators';

const STORAGE_KEY = 'us_cached_users';

// Columnas públicas de `usuarios`: password_hash nunca se descarga (ver seguridad_usuarios_validaciones.sql)
const USER_COLUMNS = 'id, nombre_completo, correo, rol, sucursal, caja_asignada_id, activo, creado_el, actualizado_el, telefono, vehiculo, placa, rating, deliveries_count';

// true cuando la tabla `usuarios` de Supabase respondió con datos: desde ahí es la única fuente válida
let _cloudAuthoritative = false;

const VALID_ROLES = ['Admin', 'Supervisor', 'Cajero', 'Motorizado', 'Cliente'];

/**
 * Normaliza el identificador de caja para la clave foránea en la tabla 'cajas'
 */
const normalizeCajaForDb = (assigned) => {
    if (!assigned) return null;
    const str = String(assigned).trim().toLowerCase();
    if (str === 'caja 1' || str === 'caja-1') return 'caja-1';
    if (str === 'caja 2' || str === 'caja-2') return 'caja-2';
    if (str === 'caja 3' || str === 'caja-3') return 'caja-3';
    return null; // Valores virtuales como "Tienda Online" o "Flota Delivery" no van a FK de cajas
};

/**
 * Formatea el nombre amigable de caja para la interfaz
 */
const formatCajaForUi = (cajaId, role) => {
    if (cajaId === 'caja-1') return 'Caja 1';
    if (cajaId === 'caja-2') return 'Caja 2';
    if (cajaId === 'caja-3') return 'Caja 3';
    if (cajaId) return cajaId;
    if (role === 'Cliente') return 'Tienda Online';
    if (role === 'Motorizado') return 'Flota Delivery';
    return '';
};

const mapDbUser = (u) => {
    const rLower = (u.rol || '').toLowerCase();
    let mappedRole = 'Cajero';
    if (rLower === 'admin') mappedRole = 'Admin';
    else if (rLower === 'gerente' || rLower === 'supervisor') mappedRole = 'Supervisor';
    else if (rLower === 'motorizado') mappedRole = 'Motorizado';
    else if (rLower === 'cliente') mappedRole = 'Cliente';

    const assigned = formatCajaForUi(u.caja_asignada_id, mappedRole);

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
        rating: typeof u.rating === 'number' ? u.rating : (parseFloat(u.rating) || 4.9),
        deliveriesCount: u.deliveries_count ?? u.deliveriesCount ?? 0,
        active: u.activo !== undefined ? Boolean(u.activo) : true,
        createdAt: u.creado_el,
        updatedAt: u.actualizado_el
    };
};

const mapRoleToDb = (role) => {
    const rLow = (role || '').toLowerCase();
    if (rLow === 'admin') return 'admin';
    if (rLow === 'gerente' || rLow === 'supervisor') return 'gerente';
    if (rLow === 'motorizado') return 'motorizado';
    if (rLow === 'cliente') return 'cliente';
    return 'cajero';
};

/** Correo único en todo el sistema: se consulta la caché y, si hay nube, la tabla real. */
const assertEmailAvailable = async (email, excludeId = null) => {
    const clean = normalizeEmail(email);
    const local = _cachedUsers.find(u => normalizeEmail(u.email) === clean && u.id !== excludeId);
    if (local) throw new Error(`Ya existe un usuario con el correo "${clean}"`);
    if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.from('usuarios').select('id').eq('correo', clean).limit(2);
        if (!error && (data || []).some(r => r.id !== excludeId)) {
            throw new Error(`Ya existe un usuario con el correo "${clean}"`);
        }
    }
};

/**
 * Carga inicial sincrónica desde LocalStorage para evitar parpadeos o carreras asíncronas
 */
const loadInitialUsers = () => {
    if (typeof window !== 'undefined') {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Con nube, la caché nunca conserva contraseñas (versiones anteriores las guardaban)
                    return isSupabaseConfigured() ? parsed.map(({ password: _password, ...u }) => u) : parsed;
                }
            }
        } catch (e) {
            console.warn('Aviso leyendo caché de usuarios:', e);
        }
    }
    return [...mockUsers];
};

let _cachedUsers = loadInitialUsers();

/**
 * Persiste los usuarios en memoria y LocalStorage, y notifica a los componentes
 */
const persistUsers = (users) => {
    _cachedUsers = users;
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_cachedUsers));
        } catch (e) {
            console.warn('Aviso guardando caché de usuarios:', e);
        }
        window.dispatchEvent(new CustomEvent('users_changed', { detail: _cachedUsers }));
    }
};

/**
 * Con Supabase configurado, la tabla `usuarios` es la única fuente: los usuarios de demostración
 * solo se usan mientras la tabla está vacía (instalación nueva) o sin conexión a la nube.
 */
const syncUsersFromCloud = async () => {
    if (!isSupabaseConfigured() || !supabase) return false;
    const { data, error } = await supabase
        .from('usuarios')
        .select(USER_COLUMNS)
        .order('creado_el', { ascending: true });
    if (error || !Array.isArray(data) || data.length === 0) {
        if (error) console.warn('Aviso cargando usuarios desde Supabase:', error.message);
        return false;
    }
    _cloudAuthoritative = true;
    persistUsers(data.map(mapDbUser));
    return true;
};

const initUsersFromCloud = () => syncUsersFromCloud().catch((e) => console.warn('Aviso cargando usuarios desde Supabase:', e));

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
     * Obtener todos los usuarios directamente de Supabase y sincronizar la caché
     */
    fetchAll: async () => {
        try {
            await syncUsersFromCloud();
        } catch (err) {
            console.error('Error consultando usuarios en Supabase:', err);
        }
        return [..._cachedUsers];
    },

    /** true si los usuarios provienen de Supabase (los de demostración ya no aplican). */
    isCloudAuthoritative: () => _cloudAuthoritative,

    /** true solo si Supabase respondió y la tabla `usuarios` está vacía (instalación nueva). */
    isCloudEmpty: async () => {
        if (!isSupabaseConfigured() || !supabase) return false;
        const { data, error } = await supabase.from('usuarios').select('id').limit(1);
        return !error && Array.isArray(data) && data.length === 0;
    },

    /** Convierte una fila de `usuarios` (o de login_usuario) al modelo de la aplicación. */
    fromDbRow: (row) => mapDbUser(row),

    /** Columnas públicas de la tabla `usuarios` (sin password_hash). */
    publicColumns: USER_COLUMNS,

    /** Consulta un usuario por correo directamente en la nube (para el inicio de sesión). */
    findInCloudByEmail: async (email) => {
        if (!isSupabaseConfigured() || !supabase) return null;
        const { data, error } = await supabase.from('usuarios').select(USER_COLUMNS).eq('correo', normalizeEmail(email)).maybeSingle();
        if (error || !data) return null;
        return mapDbUser(data);
    },

    /**
     * Guarda la lista completa de usuarios en la caché reactiva
     */
    save: (usersList) => {
        if (Array.isArray(usersList)) {
            persistUsers([...usersList]);
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
     * Obtener usuario por correo
     */
    getByEmail: (email) => {
        const clean = (email || '').trim().toLowerCase();
        return _cachedUsers.find(u => (u.email || '').toLowerCase() === clean) || null;
    },

    /**
     * Cuenta de cliente para quien entra con Google: se crea una sola vez (sin contraseña local)
     * para que aparezca en Configuración > Usuarios. Si el correo ya existe, se reutiliza tal cual.
     */
    ensureClientAccount: async ({ name, email }) => {
        const existing = userService.getByEmail(email) || await userService.findInCloudByEmail(email);
        if (existing) return existing;
        const displayName = String(name || '').trim() || normalizeEmail(email).split('@')[0];
        return userService.create({ name: displayName, email, role: 'Cliente', assignedCaja: 'Tienda Online', branch: 'Ecommerce Online', provider: 'google' });
    },

    /**
     * Crear un nuevo usuario en Supabase
     */
    create: async ({ name, email, password, role = 'Cajero', assignedCaja = '', branch = 'Sede Principal', phone = '', vehicle = '', plate = '', rating = 4.9, provider = 'credenciales', adminUser = null }) => {
        // Validaciones (las mismas reglas de los formularios, repetidas aquí para que ningún flujo las salte).
        // El nombre de una cuenta Google lo define Google; solo se exige que exista.
        const nameError = provider === 'google' ? (String(name || '').trim() ? null : 'El nombre es obligatorio') : validatePersonName(name);
        if (nameError) throw new Error(nameError);
        const emailError = validateEmail(email);
        if (emailError) throw new Error(emailError);
        if (!VALID_ROLES.includes(role)) throw new Error(`Rol de usuario inválido: ${role}`);
        if (provider !== 'google') {
            const passwordError = validatePassword(password);
            if (passwordError) throw new Error(passwordError);
        }
        const phoneError = validatePhoneVE(phone, { required: role === 'Motorizado' });
        if (phoneError) throw new Error(phoneError);
        if (role === 'Motorizado' && (!vehicle || !String(plate).trim())) {
            throw new Error('El motorizado necesita vehículo y placa registrados');
        }

        const cleanEmail = normalizeEmail(email);
        await assertEmailAvailable(cleanEmail);

        const newUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined;
        const dbCajaId = normalizeCajaForDb(assignedCaja);

        const dbRow = {
            nombre_completo: name.trim().replace(/\s+/g, ' '),
            correo: cleanEmail,
            rol: mapRoleToDb(role),
            sucursal: branch || 'Sede Principal',
            caja_asignada_id: dbCajaId,
            telefono: phone || null,
            vehiculo: vehicle || null,
            placa: plate ? String(plate).trim().toUpperCase() : null,
            rating: typeof rating === 'number' ? rating : 4.9,
            deliveries_count: 0,
            // Se cifra con bcrypt en la base de datos (trigger de seguridad_usuarios_validaciones.sql)
            password_hash: provider === 'google' ? null : String(password).trim(),
            activo: true
        };
        if (newUuid) dbRow.id = newUuid;

        let createdUser = null;

        if (isSupabaseConfigured() && supabase) {
            let { data, error } = await supabase.from('usuarios').insert(dbRow).select(USER_COLUMNS).single();
            // Caja inexistente en la tabla `cajas`: se guarda sin caja asignada
            if (error && error.code === '23503' && dbRow.caja_asignada_id) {
                ({ data, error } = await supabase.from('usuarios').insert({ ...dbRow, caja_asignada_id: null }).select(USER_COLUMNS).single());
            }
            if (error || !data) {
                // Nunca se "crea" solo en este navegador: el usuario no existiría para el resto del sistema
                if (error?.code === '23505') throw new Error(`Ya existe un usuario con el correo "${cleanEmail}"`);
                throw new Error(`No se pudo registrar el usuario en la base de datos: ${error?.message || 'sin respuesta'}`);
            }
            createdUser = mapDbUser(data);
        }

        if (!createdUser) {
            createdUser = {
                id: newUuid || `u-${Date.now()}`,
                name: name.trim(),
                email: cleanEmail,
                password: password.trim(),
                role: role || 'Cajero',
                branch: branch || 'Sede Principal',
                assignedCaja: assignedCaja || (role === 'Motorizado' ? 'Flota Delivery' : (role === 'Cliente' ? 'Tienda Online' : '')),
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
            if (assignedCaja && !createdUser.assignedCaja) {
                createdUser.assignedCaja = assignedCaja;
            }
        }

        const nextList = [..._cachedUsers, createdUser];
        persistUsers(nextList);

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
    update: async (id, rawData, adminUser = null) => {
        const index = _cachedUsers.findIndex(u => u.id === id);
        const current = index !== -1 ? _cachedUsers[index] : null;

        // Contraseña vacía al editar = conservar la actual
        const data = { ...rawData };
        if (data.password !== undefined && !String(data.password).trim()) delete data.password;

        if (data.name !== undefined) {
            const nameError = validatePersonName(data.name);
            if (nameError) throw new Error(nameError);
        }
        if (data.email !== undefined && normalizeEmail(data.email) !== normalizeEmail(current?.email)) {
            const emailError = validateEmail(data.email);
            if (emailError) throw new Error(emailError);
            await assertEmailAvailable(data.email, id);
        }
        if (data.role !== undefined && !VALID_ROLES.includes(data.role)) throw new Error(`Rol de usuario inválido: ${data.role}`);
        if (data.password !== undefined) {
            const passwordError = validatePassword(data.password);
            if (passwordError) throw new Error(passwordError);
        }
        if (data.phone) {
            const phoneError = validatePhoneVE(data.phone);
            if (phoneError) throw new Error(phoneError);
        }
        if (current?.role === 'Admin' && data.role && data.role !== 'Admin'
            && _cachedUsers.filter(u => u.role === 'Admin' && u.active).length <= 1) {
            throw new Error('No puedes quitarle el rol al único Administrador activo del sistema');
        }

        const normalizedRole = mapRoleToDb(data.role || current?.role);

        const usesCloud = isSupabaseConfigured() && supabase;
        if (usesCloud) {
            const updates = {
                actualizado_el: new Date().toISOString()
            };
            if (data.name) updates.nombre_completo = data.name.trim().replace(/\s+/g, ' ');
            if (data.email) updates.correo = normalizeEmail(data.email);
            if (data.role) updates.rol = normalizedRole;
            if (data.branch) updates.sucursal = data.branch;
            if (data.assignedCaja !== undefined) updates.caja_asignada_id = normalizeCajaForDb(data.assignedCaja);
            if (data.active !== undefined) updates.activo = Boolean(data.active);
            if (data.phone !== undefined) updates.telefono = data.phone || null;
            if (data.vehicle !== undefined) updates.vehiculo = data.vehicle || null;
            if (data.plate !== undefined) updates.placa = data.plate ? String(data.plate).trim().toUpperCase() : null;
            if (data.rating !== undefined) updates.rating = typeof data.rating === 'number' ? data.rating : 4.9;
            // Se cifra con bcrypt en la base de datos
            if (data.password !== undefined) updates.password_hash = data.password.trim();

            let { error } = await supabase.from('usuarios').update(updates).eq('id', id);
            if (error && error.code === '23503') {
                // La caja indicada no existe en la tabla `cajas`: se guarda sin caja
                ({ error } = await supabase.from('usuarios').update({ ...updates, caja_asignada_id: null }).eq('id', id));
            }
            if (error) {
                if (error.code === '23505') throw new Error('Ese correo ya pertenece a otro usuario');
                throw new Error(`No se pudo actualizar el usuario en la base de datos: ${error.message}`);
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
            rating: data.rating !== undefined ? data.rating : (current?.rating || 4.9),
            active: data.active !== undefined ? Boolean(data.active) : (current ? current.active : true),
            updatedAt: new Date().toISOString()
        };
        // Solo sin nube (modo demostración) la contraseña vive en este navegador
        if (usesCloud) delete updated.password;
        else updated.password = data.password !== undefined ? data.password.trim() : (current?.password || '');

        const nextList = [..._cachedUsers];
        if (index !== -1) {
            nextList[index] = updated;
        } else {
            nextList.push(updated);
        }
        persistUsers(nextList);

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

        const nextList = _cachedUsers.filter(u => u.id !== id);
        persistUsers(nextList);

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
