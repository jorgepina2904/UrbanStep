import { cashRegisters as defaultRegisters } from '../data/mockUsers';
import { auditService } from './auditService';

const CAJAS_STORAGE_KEY = 'urbanstep_cash_registers';

/**
 * Obtiene las cajas registradoras iniciales asegurando persistencia en localStorage
 */
const getStoredRegisters = () => {
    try {
        const stored = localStorage.getItem(CAJAS_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error('Error leyendo cajas de localStorage:', e);
    }
    // Si no existen, sembramos con las cajas por defecto
    const initial = defaultRegisters.map(c => ({
        ...c,
        pin: c.pin || '1234',
        active: c.active !== undefined ? c.active : true,
    }));
    try {
        localStorage.setItem(CAJAS_STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {
        console.error('Error guardando cajas iniciales:', e);
    }
    return initial;
};

const saveRegisters = (registers) => {
    try {
        localStorage.setItem(CAJAS_STORAGE_KEY, JSON.stringify(registers));
        window.dispatchEvent(new CustomEvent('cash_registers_changed', { detail: registers }));
    } catch (e) {
        console.error('Error guardando cajas en localStorage:', e);
    }
};

export const cashRegisterService = {
    /**
     * Obtener todas las cajas registradoras
     */
    getAll: () => {
        return getStoredRegisters();
    },

    /**
     * Obtener solo cajas activas disponibles para apertura
     */
    getActive: () => {
        return getStoredRegisters().filter(c => c.active);
    },

    /**
     * Obtener una caja por su ID
     */
    getById: (id) => {
        const registers = getStoredRegisters();
        return registers.find(c => c.id === id) || null;
    },

    /**
     * Crear una nueva caja registradora
     */
    create: async ({ name, location, pin, active = true, user = null }) => {
        const registers = getStoredRegisters();

        if (!name || !name.trim()) {
            throw new Error('El nombre de la caja es obligatorio');
        }
        if (!pin || !pin.trim() || pin.trim().length < 4) {
            throw new Error('El PIN o clave debe tener al menos 4 dígitos');
        }

        // Generar ID único incremental
        const nextNum = registers.length + 1;
        const newId = `caja-${nextNum}-${Date.now().toString(36).slice(-4)}`;

        const newRegister = {
            id: newId,
            name: name.trim(),
            location: location?.trim() || 'Área General de Tienda',
            pin: pin.trim(),
            active: Boolean(active),
            createdAt: new Date().toISOString(),
        };

        registers.push(newRegister);
        saveRegisters(registers);

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
     * Actualizar datos de una caja existente
     */
    update: async (id, { name, location, pin, active }, user = null) => {
        const registers = getStoredRegisters();
        const index = registers.findIndex(c => c.id === id);

        if (index === -1) {
            throw new Error('Caja registradora no encontrada');
        }

        const prev = registers[index];
        const updated = {
            ...prev,
            name: name !== undefined ? name.trim() : prev.name,
            location: location !== undefined ? location.trim() : prev.location,
            pin: pin !== undefined && pin.trim().length >= 4 ? pin.trim() : prev.pin,
            active: active !== undefined ? Boolean(active) : prev.active,
            updatedAt: new Date().toISOString(),
        };

        registers[index] = updated;
        saveRegisters(registers);

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

        const registers = getStoredRegisters();
        const index = registers.findIndex(c => c.id === id);

        if (index === -1) {
            throw new Error('Caja registradora no encontrada');
        }

        registers[index].pin = newPin.trim();
        registers[index].updatedAt = new Date().toISOString();
        saveRegisters(registers);

        auditService.log({
            userId: user?.id,
            userName: user?.name || 'Administrador',
            userRole: user?.role || 'Admin',
            action: 'update',
            actionLabel: `Clave/PIN reasignado para caja: ${registers[index].name}`,
            module: 'settings',
            entityType: 'cash_register',
            entityId: id,
        });

        return registers[index];
    },

    /**
     * Activar o desactivar una caja
     */
    toggleActive: async (id, user = null) => {
        const registers = getStoredRegisters();
        const index = registers.findIndex(c => c.id === id);

        if (index === -1) {
            throw new Error('Caja registradora no encontrada');
        }

        registers[index].active = !registers[index].active;
        registers[index].updatedAt = new Date().toISOString();
        saveRegisters(registers);

        auditService.log({
            userId: user?.id,
            userName: user?.name || 'Administrador',
            userRole: user?.role || 'Admin',
            action: 'update',
            actionLabel: `Estado de ${registers[index].name} cambiado a: ${registers[index].active ? 'Activa' : 'Inactiva'}`,
            module: 'settings',
            entityType: 'cash_register',
            entityId: id,
        });

        return registers[index];
    },

    /**
     * Eliminar una caja
     */
    delete: async (id, user = null) => {
        const registers = getStoredRegisters();
        const target = registers.find(c => c.id === id);

        if (!target) {
            throw new Error('Caja no encontrada');
        }

        const filtered = registers.filter(c => c.id !== id);
        saveRegisters(filtered);

        auditService.log({
            userId: user?.id,
            userName: user?.name || 'Administrador',
            userRole: user?.role || 'Admin',
            action: 'delete',
            actionLabel: `Caja registradora eliminada: ${target.name}`,
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
        await new Promise(r => setTimeout(r, 150));
        const registers = getStoredRegisters();
        const caja = registers.find(c => c.id === cajaId);

        if (!caja) {
            return { success: false, error: 'Caja registradora no encontrada' };
        }
        if (!caja.active) {
            return { success: false, error: 'Esta caja se encuentra actualmente deshabilitada' };
        }
        if (caja.pin !== pin) {
            return { success: false, error: 'PIN o clave de seguridad incorrecta' };
        }

        return { success: true, caja };
    },

    /**
     * Restaurar cajas a los valores de fábrica
     */
    resetDefaults: () => {
        localStorage.removeItem(CAJAS_STORAGE_KEY);
        return getStoredRegisters();
    }
};

export default cashRegisterService;
