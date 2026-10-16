/**
 * supervisorPinService.js — Autorización de operaciones sensibles con PIN de Supervisor/Administrador.
 * El PIN nunca se guarda en claro: SHA-256 con sal por usuario. Se guarda en este equipo (localStorage).
 * Tras 5 intentos fallidos la verificación se bloquea 60 segundos.
 */
import { auditService } from './auditService';

const STORE_KEY = 'urbanstep_supervisor_pins';
const LOCK_KEY = 'urbanstep_supervisor_pin_lock';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60000;
export const PIN_PATTERN = /^\d{4,8}$/;
export const APPROVER_ROLES = ['Admin', 'Supervisor'];

const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
};
const writeJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('No se pudo guardar el PIN:', e); }
};

const toHex = (buffer) => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');

const hashPin = async (pin, salt) => {
    if (!globalThis.crypto?.subtle) throw new Error('El navegador no soporta cifrado seguro (requiere HTTPS)');
    const data = new TextEncoder().encode(`${salt}:${pin}`);
    return toHex(await crypto.subtle.digest('SHA-256', data));
};

const randomSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)));

export const supervisorPinService = {
    /** Usuarios con PIN configurado en este equipo (sin hashes). */
    listConfigured() {
        const store = readJson(STORE_KEY, {});
        return Object.entries(store).map(([userId, e]) => ({ userId, name: e.name, role: e.role, updatedAt: e.updatedAt }));
    },

    hasAnyPin() {
        return Object.keys(readJson(STORE_KEY, {})).length > 0;
    },

    async setPin({ userId, name, role }, pin) {
        if (!APPROVER_ROLES.includes(role)) throw new Error('Solo Supervisores y Administradores pueden tener PIN de autorización');
        if (!PIN_PATTERN.test(String(pin))) throw new Error('El PIN debe tener entre 4 y 8 dígitos numéricos');
        const store = readJson(STORE_KEY, {});
        const salt = randomSalt();
        store[userId] = { name, role, salt, hash: await hashPin(String(pin), salt), updatedAt: new Date().toISOString() };
        writeJson(STORE_KEY, store);
        return true;
    },

    removePin(userId) {
        const store = readJson(STORE_KEY, {});
        delete store[userId];
        writeJson(STORE_KEY, store);
    },

    /** Segundos restantes de bloqueo (0 si no hay). */
    lockedSeconds() {
        const lock = readJson(LOCK_KEY, { fails: 0, until: 0 });
        return Math.max(0, Math.ceil((lock.until - Date.now()) / 1000));
    },

    /**
     * Verifica el PIN contra todos los aprobadores. Registra en auditoría éxito y fallo.
     * @returns {Promise<{ok:boolean, approver?:{userId,name,role}, error?:string}>}
     */
    async verify(pin, { action = 'operación sensible', requestedBy = null } = {}) {
        const remaining = supervisorPinService.lockedSeconds();
        if (remaining > 0) return { ok: false, error: `Demasiados intentos. Espera ${remaining} s.` };

        const store = readJson(STORE_KEY, {});
        const entries = Object.entries(store);
        if (entries.length === 0) {
            return { ok: false, error: 'No hay PIN de supervisor configurado en este equipo. Un administrador debe definirlo en Configuración.' };
        }

        for (const [userId, e] of entries) {
            if ((await hashPin(String(pin), e.salt)) === e.hash) {
                writeJson(LOCK_KEY, { fails: 0, until: 0 });
                try {
                    auditService.log({
                        userId, userName: e.name, userRole: e.role,
                        action: 'autorizacion_supervisor',
                        actionLabel: `Autorización de supervisor (${action}) solicitada por ${requestedBy || 'cajero'}`,
                        module: 'security', entityType: 'user', entityId: userId,
                        details: { action, requestedBy }
                    });
                } catch (err) { console.warn('Auditoría de autorización no registrada:', err); }
                return { ok: true, approver: { userId, name: e.name, role: e.role } };
            }
        }

        const lock = readJson(LOCK_KEY, { fails: 0, until: 0 });
        const fails = (lock.fails || 0) + 1;
        writeJson(LOCK_KEY, { fails: fails >= MAX_ATTEMPTS ? 0 : fails, until: fails >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0 });
        try {
            auditService.log({
                userName: requestedBy || 'Cajero', action: 'autorizacion_supervisor',
                actionLabel: `PIN de supervisor incorrecto (${action}) - intento ${fails}`,
                module: 'security', details: { action, requestedBy }
            });
        } catch (err) { console.warn('Auditoría de intento fallido no registrada:', err); }
        return { ok: false, error: fails >= MAX_ATTEMPTS ? `PIN incorrecto. Bloqueado ${LOCK_MS / 1000} s.` : `PIN incorrecto (${MAX_ATTEMPTS - fails} intentos restantes)` };
    }
};

export default supervisorPinService;
