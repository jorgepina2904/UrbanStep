/**
 * auditService.js — Registro de Auditoría del Sistema
 * Registra todas las acciones importantes: login, ventas, cambios de inventario, etc.
 */
import { generateId } from '../utils/generateId';

const AUDIT_KEY = 'urbanstep_audit_logs';
const MAX_LOGS = 500;

const getStoredLogs = () => {
    try {
        const raw = localStorage.getItem(AUDIT_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveLogs = (logs) => {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
};

export const auditService = {
    /**
     * Registra una acción en el log de auditoría
     */
    log({ userId, userName, userRole, userEmail, action, actionLabel, module, entityType, entityId, details }) {
        const entry = {
            id: generateId('AUD'),
            userId: userId || null,
            userName: userName || 'Sistema',
            userRole: userRole || null,
            userEmail: userEmail || null,
            action,
            actionLabel: actionLabel || action,
            module,
            entityType: entityType || null,
            entityId: entityId || null,
            details: details || null,
            createdAt: new Date().toISOString(),
        };

        const logs = getStoredLogs();
        logs.unshift(entry);
        saveLogs(logs);

        return entry;
    },

    /**
     * Obtiene todos los logs de auditoría con filtros opcionales
     */
    getLogs({ from, to, module, action, userId, search, limit = 100 } = {}) {
        let logs = getStoredLogs();

        if (from) {
            const fromTime = new Date(from).getTime();
            logs = logs.filter(l => new Date(l.createdAt).getTime() >= fromTime);
        }
        if (to) {
            const toTime = new Date(to).getTime();
            logs = logs.filter(l => new Date(l.createdAt).getTime() <= toTime);
        }
        if (module) {
            logs = logs.filter(l => l.module === module);
        }
        if (action) {
            logs = logs.filter(l => l.action === action);
        }
        if (userId) {
            logs = logs.filter(l => l.userId === userId);
        }
        if (search) {
            const q = search.toLowerCase();
            logs = logs.filter(l =>
                (l.actionLabel || '').toLowerCase().includes(q) ||
                (l.userName || '').toLowerCase().includes(q) ||
                (l.module || '').toLowerCase().includes(q) ||
                (l.entityId || '').toLowerCase().includes(q)
            );
        }

        return logs.slice(0, limit);
    },

    /**
     * Obtiene resumen de actividad para el dashboard de auditoría
     */
    getSummary() {
        const logs = getStoredLogs();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayLogs = logs.filter(l => new Date(l.createdAt) >= today);
        const weekLogs = logs.filter(l => new Date(l.createdAt) >= weekAgo);

        // Count by module
        const byModule = {};
        const byAction = {};
        const byUser = {};

        for (const log of weekLogs) {
            byModule[log.module] = (byModule[log.module] || 0) + 1;
            byAction[log.action] = (byAction[log.action] || 0) + 1;
            const uKey = log.userName || 'Sistema';
            byUser[uKey] = (byUser[uKey] || 0) + 1;
        }

        return {
            totalLogs: logs.length,
            todayCount: todayLogs.length,
            weekCount: weekLogs.length,
            byModule: Object.entries(byModule).sort((a, b) => b[1] - a[1]),
            byAction: Object.entries(byAction).sort((a, b) => b[1] - a[1]),
            byUser: Object.entries(byUser).sort((a, b) => b[1] - a[1]),
        };
    },

    /**
     * Limpia todos los logs (solo Admin)
     */
    clearAll() {
        localStorage.removeItem(AUDIT_KEY);
    },

    /**
     * Genera datos de demostración para el módulo de auditoría
     */
    generateDemoData(user) {
        const demoActions = [
            { action: 'login', actionLabel: 'Inicio de sesión', module: 'auth', entityType: 'session' },
            { action: 'sale_create', actionLabel: 'Venta realizada - TKT-2026-0042 por $125.00', module: 'sales', entityType: 'sale', entityId: 'SAL-1042' },
            { action: 'product_update', actionLabel: 'Stock actualizado: Nike Air Max 90 → 45 uds', module: 'products', entityType: 'product', entityId: 'PRD-1003' },
            { action: 'shift_open', actionLabel: 'Turno de caja abierto en Caja 1', module: 'shifts', entityType: 'shift', entityId: 'SHF-0015' },
            { action: 'customer_create', actionLabel: 'Nuevo cliente: María González (V-22654987)', module: 'customers', entityType: 'customer', entityId: 'CLT-1005' },
            { action: 'rate_update', actionLabel: 'Tasa BCV actualizada: Bs. 42.50 → Bs. 43.10', module: 'settings', entityType: 'rate' },
            { action: 'inventory_adjust', actionLabel: 'Ajuste de inventario: Adidas Superstar -3 uds (defectuoso)', module: 'inventory', entityType: 'product', entityId: 'PRD-1007' },
            { action: 'sale_create', actionLabel: 'Venta realizada - TKT-2026-0043 por $89.50', module: 'sales', entityType: 'sale', entityId: 'SAL-1043' },
            { action: 'settings_change', actionLabel: 'Configuración fiscal actualizada: IGTF habilitado', module: 'settings', entityType: 'settings' },
            { action: 'shift_close', actionLabel: 'Turno cerrado en Caja 1 - Diferencia: $0.00', module: 'shifts', entityType: 'shift', entityId: 'SHF-0015' },
            { action: 'product_create', actionLabel: 'Nuevo producto: Puma RS-X (PRD-1025)', module: 'products', entityType: 'product', entityId: 'PRD-1025' },
            { action: 'delivery_create', actionLabel: 'Delivery asignado a Chacao - 5.2 km - $4.60', module: 'delivery', entityType: 'delivery' },
            { action: 'sale_create', actionLabel: 'Venta realizada - TKT-2026-0044 por $210.00 (con delivery)', module: 'sales', entityType: 'sale', entityId: 'SAL-1044' },
            { action: 'login', actionLabel: 'Inicio de sesión - Carlos Pérez (Cajero)', module: 'auth', entityType: 'session' },
            { action: 'price_override', actionLabel: 'Precio modificado: Air Force 1 $95.00 → $89.00 (descuento)', module: 'products', entityType: 'product', entityId: 'PRD-1002' },
        ];

        const names = ['Administrador General', 'Carlos Pérez', 'María González', 'José Rodríguez'];
        const roles = ['Admin', 'Cajero', 'Cajero', 'Cajero'];

        for (let i = demoActions.length - 1; i >= 0; i--) {
            const nameIdx = Math.floor(Math.random() * names.length);
            const hoursAgo = Math.floor(Math.random() * 168); // last 7 days
            const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

            this.log({
                userId: user?.id || `u${nameIdx + 1}`,
                userName: names[nameIdx],
                userRole: roles[nameIdx],
                userEmail: `${names[nameIdx].split(' ')[0].toLowerCase()}@urbanstep.com`,
                ...demoActions[i],
                details: { generatedDemo: true, timestamp: date.toISOString() },
            });
        }
    }
};

export default auditService;
