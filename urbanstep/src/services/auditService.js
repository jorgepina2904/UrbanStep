/**
 * auditService.js — Registro de Auditoría del Sistema
 * Conectado 100% a la tabla 'auditoria' en Supabase como Fuente Única de la Verdad.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';

const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const mapActionToEnum = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('login') || act === 'inicio_sesion') return 'inicio_sesion';
    if (act.includes('logout') || act === 'cierre_sesion') return 'cierre_sesion';
    if (act === 'create' || act === 'creacion') return 'creacion';
    if (act === 'update' || act === 'actualizacion') return 'actualizacion';
    if (act === 'delete' || act === 'eliminacion') return 'eliminacion';
    if (act.includes('shift_open') || act === 'apertura_turno') return 'apertura_turno';
    if (act.includes('shift_close') || act === 'cierre_turno') return 'cierre_turno';
    if (act.includes('sale') || act === 'venta_creada') return 'venta_creada';
    if (act.includes('purchase') || act.includes('compra')) return 'compra_creada';
    if (act.includes('product') || act.includes('producto')) return 'producto_actualizado';
    if (act.includes('inventory') || act === 'ajuste_inventario') return 'ajuste_inventario';
    if (act.includes('delivery') || act === 'envio_creado') return 'envio_creado';
    if (act.includes('rate') || act === 'actualizacion_tasa') return 'actualizacion_tasa';
    if (act.includes('settings') || act === 'cambio_configuracion') return 'cambio_configuracion';
    return 'actualizacion';
};

const mapRoleToEnum = (role) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return 'admin';
    if (r === 'gerente') return 'gerente';
    if (r === 'almacenista') return 'almacenista';
    return 'cajero';
};

const mapAuditFromDb = (a) => ({
    id: a.id,
    userId: a.usuario_id,
    userName: a.nombre_usuario || 'Sistema',
    userRole: a.rol_usuario,
    userEmail: a.correo_usuario,
    action: a.accion,
    actionLabel: a.etiqueta_accion || a.accion,
    module: a.modulo,
    entityType: a.tipo_entidad,
    entityId: a.entidad_id,
    details: a.detalles,
    createdAt: a.creado_el
});

// Buffer local en memoria
let _cachedLogs = [];

export const auditService = {
    /**
     * Registra una acción en la tabla 'auditoria' de Supabase
     */
    log({ userId, userName, userRole, userEmail, action, actionLabel, module, entityType, entityId, details }) {
        const nowIso = new Date().toISOString();
        const entry = {
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `aud-${Date.now()}`,
            userId: userId || null,
            userName: userName || 'Sistema',
            userRole: userRole || null,
            userEmail: userEmail || null,
            action,
            actionLabel: actionLabel || action,
            module: module || 'general',
            entityType: entityType || null,
            entityId: entityId ? String(entityId) : null,
            details: details || null,
            createdAt: nowIso,
        };

        _cachedLogs.unshift(entry);
        if (_cachedLogs.length > 300) _cachedLogs.pop();

        // Enviar a Supabase en segundo plano
        if (isSupabaseConfigured() && supabase) {
            (async () => {
                try {
                    const row = {
                        usuario_id: isValidUUID(userId) ? userId : null,
                        nombre_usuario: userName || 'Sistema',
                        rol_usuario: mapRoleToEnum(userRole),
                        correo_usuario: userEmail || null,
                        accion: mapActionToEnum(action),
                        etiqueta_accion: actionLabel || action,
                        modulo: module || 'sistema',
                        tipo_entidad: entityType || null,
                        entidad_id: entityId ? String(entityId) : null,
                        detalles: details || null,
                        creado_el: nowIso
                    };
                    if (isValidUUID(entry.id)) {
                        row.id = entry.id;
                    }

                    await supabase.from('auditoria').insert(row);
                } catch (err) {
                    console.warn('Aviso guardando auditoría en Supabase:', err);
                }
            })();
        }

        return entry;
    },

    /**
     * Obtiene los logs de auditoría directamente desde Supabase Cloud
     */
    async getLogs({ from, to, module, action, userId, search, limit = 100 } = {}) {
        if (isSupabaseConfigured() && supabase) {
            try {
                let query = supabase
                    .from('auditoria')
                    .select('*')
                    .order('creado_el', { ascending: false })
                    .limit(limit);

                if (module) query = query.eq('modulo', module);
                if (from) query = query.gte('creado_el', from);
                if (to) query = query.lte('creado_el', to);

                const { data, error } = await query;
                if (!error && Array.isArray(data)) {
                    let logs = data.map(mapAuditFromDb);
                    if (search) {
                        const q = search.toLowerCase();
                        logs = logs.filter(l =>
                            (l.actionLabel || '').toLowerCase().includes(q) ||
                            (l.userName || '').toLowerCase().includes(q) ||
                            (l.module || '').toLowerCase().includes(q) ||
                            (l.entityId || '').toLowerCase().includes(q)
                        );
                    }
                    _cachedLogs = logs;
                    return logs;
                }
            } catch (err) {
                console.error('Error consultando auditoría en Supabase:', err);
            }
        }

        return _cachedLogs.slice(0, limit);
    },

    /**
     * Obtiene resumen de actividad para el dashboard
     */
    async getSummary() {
        const logs = await this.getLogs({ limit: 300 });
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayLogs = logs.filter(l => new Date(l.createdAt) >= today);
        const weekLogs = logs.filter(l => new Date(l.createdAt) >= weekAgo);

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
     * Limpia los logs en caché
     */
    clearAll() {
        _cachedLogs = [];
    }
};

export default auditService;
