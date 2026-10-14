import { auditService } from './auditService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const mapCajaFromDb = (c) => ({
    id: c.id,
    name: c.nombre,
    location: c.ubicacion || 'Planta Principal',
    pin: c.clave_pin || '1234',
    active: c.activa !== undefined ? c.activa : true,
    createdAt: c.creada_el,
    updatedAt: c.actualizada_el
});

// Caché reactiva sincronizada 100% con la tabla 'cajas' en Supabase Cloud
let _cachedRegisters = [];

// Carga inicial reactiva desde Supabase en cuanto el módulo se carga
const initLoadFromSupabase = async () => {
    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('cajas')
                .select('*')
                .order('creada_el', { ascending: true });

            if (!error && Array.isArray(data) && data.length > 0) {
                _cachedRegisters = data.map(mapCajaFromDb);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('cash_registers_changed', { detail: _cachedRegisters }));
                }
            }
        } catch (e) {
            console.warn('Aviso cargando cajas desde Supabase:', e);
        }
    }
};

if (typeof window !== 'undefined') {
    initLoadFromSupabase();
}

export const cashRegisterService = {
    /**
     * Obtener todas las cajas registradoras (sincrónico desde caché en memoria)
     */
    getAll: () => {
        return [..._cachedRegisters];
    },

    /**
     * Obtener todas las cajas directamente desde Supabase Cloud
     */
    fetchAll: async () => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('cajas')
                    .select('*')
                    .order('creada_el', { ascending: true });

                if (!error && Array.isArray(data)) {
                    _cachedRegisters = data.map(mapCajaFromDb);
                    return [..._cachedRegisters];
                }
            } catch (e) {
                console.error('Error consultando cajas en Supabase:', e);
            }
        }
        return [..._cachedRegisters];
    },

    /**
     * Obtener solo cajas activas disponibles para apertura
     */
    getActive: () => {
        return _cachedRegisters.filter(c => c.active);
    },

    /**
     * Obtener una caja por su ID
     */
    getById: (id) => {
        return _cachedRegisters.find(c => c.id === id) || null;
    },

    /**
     * Crear una nueva caja registradora en Supabase
     */
    create: async ({ name, location, pin, active = true, user = null }) => {
        if (!name || !name.trim()) {
            throw new Error('El nombre de la caja es obligatorio');
        }
        if (!pin || !pin.trim() || pin.trim().length < 4) {
            throw new Error('El PIN o clave debe tener al menos 4 dígitos');
        }

        const nextNum = _cachedRegisters.length + 1;
        const newId = `caja-${nextNum}-${Date.now().toString(36).slice(-4)}`;

        const newRegister = {
            id: newId,
            name: name.trim(),
            location: location?.trim() || 'Área General de Tienda',
            pin: pin.trim(),
            active: Boolean(active),
            createdAt: new Date().toISOString(),
        };

        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase.from('cajas').insert({
                id: newRegister.id,
                nombre: newRegister.name,
                ubicacion: newRegister.location,
                clave_pin: newRegister.pin,
                pin_hash: newRegister.pin,
                activa: newRegister.active
            });
            if (error) {
                console.error('Error insertando caja en Supabase:', error);
                throw new Error(`Error en base de datos: ${error.message}`);
            }
        }

        _cachedRegisters.push(newRegister);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cash_registers_changed', { detail: _cachedRegisters }));
        }

        // Registro en auditoría
        auditService.log({
            userId: user?.id,
            userName: user?.name || 'Administrador',
            userRole: user?.role || 'Admin',
            action: 'create',
            actionLabel: `Caja registradora creada: ${newRegister.name} (${newRegister.location})`,
            module: 'settings',
            entityType: 'cash_register',
            entityId: newRegister.id,
            details: { name: newRegister.name, location: newRegister.location },
        });

        return newRegister;
    },

    /**
     * Actualizar datos de una caja existente en Supabase
     */
    update: async (id, { name, location, pin, active }, user = null) => {
        const index = _cachedRegisters.findIndex(c => c.id === id);
        const prev = index !== -1 ? _cachedRegisters[index] : null;

        const updated = {
            id,
            name: name !== undefined ? name.trim() : (prev?.name || 'Caja'),
            location: location !== undefined ? location.trim() : (prev?.location || 'Área General'),
            pin: pin !== undefined && pin.trim().length >= 4 ? pin.trim() : (prev?.pin || '1234'),
            active: active !== undefined ? Boolean(active) : (prev ? prev.active : true),
            updatedAt: new Date().toISOString(),
        };

        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase
                .from('cajas')
                .update({
                    nombre: updated.name,
                    ubicacion: updated.location,
                    clave_pin: updated.pin,
                    pin_hash: updated.pin,
                    activa: updated.active,
                    actualizada_el: updated.updatedAt
                })
                .eq('id', id);

            if (error) {
                console.error('Error actualizando caja en Supabase:', error);
                throw new Error(`Error actualizando caja en base de datos: ${error.message}`);
            }
        }

        if (index !== -1) {
            _cachedRegisters[index] = { ...prev, ...updated };
        } else {
            _cachedRegisters.push(updated);
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cash_registers_changed', { detail: _cachedRegisters }));
        }

        auditService.log({
            userId: user?.id,
            userName: user?.name || 'Administrador',
            userRole: user?.role || 'Admin',
            action: 'update',
            actionLabel: `Caja registradora modificada: ${updated.name}`,
            module: 'settings',
            entityType: 'cash_register',
            entityId: id,
            details: { previous: prev, current: updated },
        });

        return updated;
    },

    /**
     * Asignar o cambiar específicamente la clave/PIN de una caja
     */
    updatePin: async (id, newPin, user = null) => {
        if (!newPin || newPin.trim().length < 4) {
            throw new Error('La clave/PIN debe contener al menos 4 dígitos numéricos');
        }

        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase
                .from('cajas')
                .update({
                    clave_pin: newPin.trim(),
                    pin_hash: newPin.trim(),
                    actualizada_el: new Date().toISOString()
                })
                .eq('id', id);

            if (error) {
                throw new Error(`Error actualizando PIN en Supabase: ${error.message}`);
            }
        }

        const index = _cachedRegisters.findIndex(c => c.id === id);
        if (index !== -1) {
            _cachedRegisters[index].pin = newPin.trim();
            _cachedRegisters[index].updatedAt = new Date().toISOString();
        }

        auditService.log({
            userId: user?.id,
            userName: user?.name || 'Administrador',
            userRole: user?.role || 'Admin',
            action: 'update',
            actionLabel: `Clave/PIN reasignado para caja: ${id}`,
            module: 'settings',
            entityType: 'cash_register',
            entityId: id,
        });

        return _cachedRegisters[index];
    },

    /**
     * Activar o desactivar una caja
     */
    toggleActive: async (id, user = null) => {
        const index = _cachedRegisters.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Caja registradora no encontrada');

        const newActiveState = !_cachedRegisters[index].active;

        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase
                .from('cajas')
                .update({
                    activa: newActiveState,
                    actualizada_el: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw new Error(`Error en Supabase: ${error.message}`);
        }

        _cachedRegisters[index].active = newActiveState;
        _cachedRegisters[index].updatedAt = new Date().toISOString();

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cash_registers_changed', { detail: _cachedRegisters }));
        }

        auditService.log({
            userId: user?.id,
            userName: user?.name || 'Administrador',
            userRole: user?.role || 'Admin',
            action: 'update',
            actionLabel: `Estado de ${_cachedRegisters[index].name} cambiado a: ${newActiveState ? 'Activa' : 'Inactiva'}`,
            module: 'settings',
            entityType: 'cash_register',
            entityId: id,
        });

        return _cachedRegisters[index];
    },

    /**
     * Eliminar una caja de Supabase
     */
    delete: async (id, user = null) => {
        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase
                .from('cajas')
                .delete()
                .eq('id', id);

            if (error) throw new Error(`Error eliminando en Supabase: ${error.message}`);
        }

        _cachedRegisters = _cachedRegisters.filter(c => c.id !== id);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cash_registers_changed', { detail: _cachedRegisters }));
        }

        auditService.log({
            userId: user?.id,
            userName: user?.name || 'Administrador',
            userRole: user?.role || 'Admin',
            action: 'delete',
            actionLabel: `Caja registradora eliminada: ${id}`,
            module: 'settings',
            entityType: 'cash_register',
            entityId: id,
        });

        return true;
    },

    /**
     * Validar credenciales (PIN) de una caja
     */
    validatePin: async (cajaId, pin) => {
        let caja = _cachedRegisters.find(c => c.id === cajaId);

        // Si está configurado Supabase, consultar el PIN más reciente
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data } = await supabase
                    .from('cajas')
                    .select('*')
                    .eq('id', cajaId)
                    .single();
                if (data) {
                    caja = mapCajaFromDb(data);
                }
            } catch {}
        }

        if (!caja) {
            return { success: false, error: 'Caja registradora no encontrada' };
        }
        if (!caja.active) {
            return { success: false, error: 'Esta caja se encuentra actualmente deshabilitada' };
        }
        if (String(caja.pin) !== String(pin).trim()) {
            return { success: false, error: 'PIN o clave de seguridad incorrecta' };
        }

        return { success: true, caja };
    },

    /**
     * Restaurar cajas a los valores de fábrica
     */
    resetDefaults: async () => {
        return cashRegisterService.fetchAll();
    }
};

export default cashRegisterService;
