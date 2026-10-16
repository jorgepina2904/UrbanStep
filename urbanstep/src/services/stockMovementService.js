/**
 * stockMovementService.js — Kardex y Registro de Movimientos de Inventario
 * Conectado 100% a 'movimientos_inventario' (y fallback a 'auditoria') en Supabase.
 */
import { generateId } from '../utils/generateId';
import { auditService } from './auditService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export const MOVEMENT_TYPES = {
    ajuste_manual: { label: 'Ajuste Manual', badgeVariant: 'warning', sign: '±' },
    edicion_producto: { label: 'Edición Catálogo', badgeVariant: 'secondary', sign: '±' },
    recepcion_compra: { label: 'Entrada por Compra', badgeVariant: 'success', sign: '+' },
    salida_venta: { label: 'Salida por Venta', badgeVariant: 'primary', sign: '-' },
    merma_dano: { label: 'Merma / Defecto', badgeVariant: 'danger', sign: '-' },
    // Catálogo homologado SGF (alias de compatibilidad con los valores históricos incluidos)
    entrada_compra: { label: 'Entrada por Compra', badgeVariant: 'success', sign: '+' },
    entrada_devolucion: { label: 'Entrada por Devolución', badgeVariant: 'success', sign: '+' },
    baja_merma_dano: { label: 'Baja por Merma / Defecto', badgeVariant: 'danger', sign: '-' },
    traslado_origen: { label: 'Traslado: salida de origen', badgeVariant: 'warning', sign: '-' },
    traslado_destino: { label: 'Traslado: entrada a destino', badgeVariant: 'primary', sign: '+' },
};

const mapMovFromDb = (m) => ({
    id: m.id,
    productId: m.producto_id,
    productName: m.nombre_producto || 'Producto',
    sku: m.sku || 'N/A',
    previousStock: Number(m.stock_anterior) || 0,
    newStock: Number(m.stock_nuevo) || 0,
    delta: Number(m.cantidad_delta) || 0,
    type: m.tipo_movimiento || 'ajuste_manual',
    typeLabel: MOVEMENT_TYPES[m.tipo_movimiento]?.label || m.tipo_movimiento,
    reason: m.motivo || 'Modificación de existencias',
    size: m.talla ? String(m.talla) : null,
    userName: m.usuario_nombre || 'Sistema',
    referenceId: m.referencia_id || null,
    createdAt: m.creado_el
});

let _cachedMovements = [];

// Carga inicial reactiva desde Supabase Cloud
const initMovementsFromCloud = async () => {
    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('movimientos_inventario')
                .select('*')
                .order('creado_el', { ascending: false })
                .limit(200);

            if (!error && Array.isArray(data)) {
                _cachedMovements = data.map(mapMovFromDb);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('stock_movements_updated', { detail: _cachedMovements }));
                }
            }
        } catch (e) {
            console.warn('Aviso sincronizando movimientos de inventario:', e);
        }
    }
};

if (typeof window !== 'undefined') {
    setTimeout(initMovementsFromCloud, 10);
}

export const stockMovementService = {
    /**
     * Registra un movimiento de inventario (Kardex) en Supabase Cloud
     */
    record: async ({
        productId,
        productName,
        sku,
        previousStock,
        newStock,
        delta = null,
        type = 'ajuste_manual',
        reason = 'Ajuste de inventario',
        size = null,
        userName = 'Administrador',
        userRole = 'admin',
        userId = null,
        referenceId = null,
    }) => {
        const calculatedDelta = delta !== null ? delta : (Number(newStock) - Number(previousStock));
        const nowIso = new Date().toISOString();
        const movId = generateId('MOV');

        const movement = {
            id: movId,
            productId,
            productName: productName || 'Producto',
            sku: sku || 'N/A',
            previousStock: Number(previousStock) || 0,
            newStock: Number(newStock) || 0,
            delta: calculatedDelta,
            type,
            typeLabel: MOVEMENT_TYPES[type]?.label || type,
            reason: reason || 'Modificación de existencias',
            size: size ? String(size) : null,
            userName: userName || 'Sistema',
            userRole: userRole || null,
            userId: userId || null,
            referenceId: referenceId || null,
            createdAt: nowIso
        };

        _cachedMovements.unshift(movement);
        if (_cachedMovements.length > 500) _cachedMovements.pop();

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('stock_movements_updated', { detail: _cachedMovements }));
        }

        // Registrar en auditoría general
        try {
            auditService.log({
                userId,
                userName,
                userRole,
                action: 'inventory_adjust',
                actionLabel: `${MOVEMENT_TYPES[type]?.label || 'Ajuste'}: ${movement.productName} (${calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta} uds)`,
                module: 'inventory',
                entityType: 'product',
                entityId: productId,
                details: {
                    sku: movement.sku,
                    size: movement.size,
                    previousStock: movement.previousStock,
                    newStock: movement.newStock,
                    delta: movement.delta,
                    reason: movement.reason,
                    type: movement.type
                }
            });
        } catch (e) {
            console.warn('Error registrando auditoría de stock:', e);
        }

        // Persistir en Supabase Cloud
        if (isSupabaseConfigured() && supabase) {
            try {
                const { error: movErr } = await supabase.from('movimientos_inventario').insert({
                    id: movement.id,
                    producto_id: movement.productId,
                    nombre_producto: movement.productName,
                    sku: movement.sku,
                    stock_anterior: movement.previousStock,
                    stock_nuevo: movement.newStock,
                    cantidad_delta: movement.delta,
                    tipo_movimiento: movement.type,
                    motivo: movement.reason,
                    talla: movement.size,
                    usuario_nombre: movement.userName,
                    referencia_id: movement.referenceId,
                    creado_el: movement.createdAt
                });

                if (movErr) {
                    // Fallback a tabla auditoria
                    await supabase.from('auditoria').insert({
                        id: generateId('AUD'),
                        nombre_usuario: movement.userName,
                        accion: 'ajuste_inventario',
                        etiqueta_accion: `Kardex: ${movement.productName} (${calculatedDelta > 0 ? `+${calculatedDelta}` : calculatedDelta})`,
                        modulo: 'inventario',
                        tipo_entidad: 'producto',
                        entidad_id: movement.productId,
                        detalles: movement
                    });
                }
            } catch (err) {
                console.warn('Aviso sincronización Kardex Supabase:', err);
            }
        }

        return movement;
    },

    /**
     * Obtener movimientos con filtros desde Supabase Cloud (con respuesta inmediata de caché)
     */
    getAll: async ({ productId = null, type = 'all', search = '', limit = 100 } = {}) => {
        if (isSupabaseConfigured() && supabase) {
            try {
                let query = supabase
                    .from('movimientos_inventario')
                    .select('*')
                    .order('creado_el', { ascending: false })
                    .limit(limit);

                if (productId) {
                    query = query.eq('producto_id', productId);
                }
                if (type && type !== 'all') {
                    query = query.eq('tipo_movimiento', type);
                }

                const { data, error } = await query;
                if (!error && Array.isArray(data)) {
                    let list = data.map(mapMovFromDb);
                    if (search) {
                        const q = search.toLowerCase().trim();
                        list = list.filter(m =>
                            (m.productName && m.productName.toLowerCase().includes(q)) ||
                            (m.sku && m.sku.toLowerCase().includes(q)) ||
                            (m.reason && m.reason.toLowerCase().includes(q)) ||
                            (m.userName && m.userName.toLowerCase().includes(q)) ||
                            (m.size && String(m.size).includes(q))
                        );
                    }
                    _cachedMovements = list;
                    return list;
                }
            } catch (err) {
                console.error('Error consultando movimientos en Supabase:', err);
            }
        }

        let list = [..._cachedMovements];
        if (productId) list = list.filter(m => m.productId === productId);
        if (type && type !== 'all') list = list.filter(m => m.type === type);
        if (search) {
            const q = search.toLowerCase().trim();
            list = list.filter(m =>
                (m.productName && m.productName.toLowerCase().includes(q)) ||
                (m.sku && m.sku.toLowerCase().includes(q)) ||
                (m.reason && m.reason.toLowerCase().includes(q)) ||
                (m.userName && m.userName.toLowerCase().includes(q)) ||
                (m.size && String(m.size).includes(q))
            );
        }
        return list.slice(0, limit);
    },

    /**
     * Resumen estadístico de movimientos
     */
    getSummary: async () => {
        const list = await stockMovementService.getAll({ limit: 500 });
        const totalEntries = list.filter(m => m.delta > 0).reduce((sum, m) => sum + m.delta, 0);
        const totalExits = list.filter(m => m.delta < 0).reduce((sum, m) => sum + Math.abs(m.delta), 0);
        return {
            totalMovements: list.length,
            totalEntries,
            totalExits,
            lastMovement: list[0] || null
        };
    },

    clearAll: () => {
        _cachedMovements = [];
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('stock_movements_updated', { detail: [] }));
        }
    }
};

export default stockMovementService;
