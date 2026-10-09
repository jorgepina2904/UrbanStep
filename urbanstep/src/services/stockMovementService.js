/**
 * stockMovementService.js — Kardex y Registro de Movimientos de Inventario
 * Trazabilidad completa de cada cambio de existencias: ventas, compras, ajustes y mermas.
 */
import { generateId } from '../utils/generateId';
import { auditService } from './auditService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const MOVEMENTS_KEY = 'urbanstep_stock_movements';
const MAX_MOVEMENTS = 1000;

export const MOVEMENT_TYPES = {
    ajuste_manual: { label: 'Ajuste Manual', badgeVariant: 'warning', sign: '±' },
    edicion_producto: { label: 'Edición Catálogo', badgeVariant: 'secondary', sign: '±' },
    recepcion_compra: { label: 'Entrada por Compra', badgeVariant: 'success', sign: '+' },
    salida_venta: { label: 'Salida por Venta', badgeVariant: 'primary', sign: '-' },
    merma_dano: { label: 'Merma / Defecto', badgeVariant: 'danger', sign: '-' },
};

const getStoredMovements = () => {
    try {
        const raw = localStorage.getItem(MOVEMENTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveMovements = (list) => {
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(list.slice(0, MAX_MOVEMENTS)));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stock_movements_updated', { detail: list }));
    }
};

export const stockMovementService = {
    /**
     * Registra un movimiento de inventario (Kardex)
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
        const movement = {
            id: generateId('MOV'),
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
            createdAt: new Date().toISOString()
        };

        const list = getStoredMovements();
        list.unshift(movement);
        saveMovements(list);

        // Registrar también en auditoría general del sistema
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

        // Sincronizar en Supabase si está disponible
        if (isSupabaseConfigured() && supabase) {
            try {
                // Intentar insertar en tabla especializada 'movimientos_inventario'
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
                    // Fallback a tabla auditoria de Supabase
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
     * Obtener movimientos con filtros opcionales
     */
    getAll: ({ productId = null, type = 'all', search = '', limit = 100 } = {}) => {
        let list = getStoredMovements();

        if (productId) {
            list = list.filter(m => m.productId === productId);
        }
        if (type && type !== 'all') {
            list = list.filter(m => m.type === type);
        }
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
    getSummary: () => {
        const list = getStoredMovements();
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
        localStorage.removeItem(MOVEMENTS_KEY);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('stock_movements_updated', { detail: [] }));
        }
    }
};

export default stockMovementService;
