/**
 * offlineSync.js — Persistencia de ventas hacia Supabase con cola offline.
 *
 * pushSaleRecords(): escribe ventas, detalles_venta y pagos_venta. Es idempotente por id de venta,
 * por lo que reintentar tras un corte de red nunca duplica registros.
 * El stock en servidor lo descuenta el trigger fn_descontar_stock_venta al insertar detalles_venta;
 * por eso la re-sincronización NO sobrescribe stock (evita pisar ventas de otras cajas).
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { offlineStore } from './offlineStore';

const VALID_PAYMENT_ENUMS = ['pagomovil', 'zelle', 'punto_venta', 'efectivo_usd', 'efectivo_bs', 'transferencia', 'mixto'];
const SEQ_KEY = 'urbanstep_offline_seq';
const SYNC_INTERVAL_MS = 30000;

const isNetworkError = (err) => {
    if (!err) return false;
    const msg = String(err.message || err).toLowerCase();
    return err instanceof TypeError || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed') || msg.includes('load failed');
};

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Correlativo local por terminal para tickets creados sin conexión (no es número fiscal). */
export const nextOfflineReceipt = (cajaId = 'caja-1') => {
    let seq = 1;
    try {
        seq = (parseInt(localStorage.getItem(SEQ_KEY), 10) || 0) + 1;
        localStorage.setItem(SEQ_KEY, String(seq));
    } catch {
        seq = Date.now() % 1000000;
    }
    return `TKT-OFF-${String(cajaId).toUpperCase()}-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
};

const notify = async () => {
    if (typeof window === 'undefined') return;
    const pending = await offlineStore.queueAll();
    window.dispatchEvent(new CustomEvent('offline_queue_changed', { detail: { pending: pending.length } }));
};

const existsRow = async (table, column, value) => {
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq(column, value);
    if (error) throw error;
    return (count || 0) > 0;
};

/**
 * Inserta los registros relacionales de una venta.
 * @returns {{ ok: boolean, networkError: boolean, error: object|null }}
 */
export const pushSaleRecords = async (sale) => {
    if (!isSupabaseConfigured() || !supabase) return { ok: true, networkError: false, error: null };
    try {
        const dbPaymentMethod = VALID_PAYMENT_ENUMS.includes(sale.paymentMethod) ? sale.paymentMethod : 'pagomovil';
        const bcvRate = sale.bcvRate;

        // Validar claves foráneas antes de insertar en ventas (se anulan si no existen en la nube)
        const resolveFk = async (table, id) => {
            if (!id) return null;
            try {
                const { data } = await supabase.from(table).select('id').eq('id', id).maybeSingle();
                return data ? id : null;
            } catch {
                return null;
            }
        };
        const validClienteId = sale.customerId && sale.customerId !== 'publico' ? await resolveFk('clientes', sale.customerId) : null;
        const validCajaId = await resolveFk('cajas', sale.cajaId);
        const validTurnoId = await resolveFk('turnos_caja', sale.shiftId);

        // 1. Venta (idempotente: si ya existe, continuar con los detalles faltantes)
        const alreadySynced = await existsRow('ventas', 'id', sale.id);
        if (!alreadySynced) {
            const { error: saleErr } = await supabase.from('ventas').insert({
                id: sale.id,
                numero_recibo: sale.receiptNumber,
                cliente_id: validClienteId,
                nombre_cliente: sale.customer,
                caja_id: validCajaId,
                turno_id: validTurnoId,
                nombre_cajero: sale.cashier,
                tasa_bcv: bcvRate,
                subtotal_usd: sale.subtotal,
                descuento_usd: sale.discount,
                iva_usd: sale.tax,
                igtf_usd: sale.igtf,
                costo_delivery_usd: sale.shippingCost,
                total_usd: sale.total,
                subtotal_bs: sale.subtotalBs,
                iva_bs: sale.taxBs,
                igtf_bs: sale.igtfBs,
                total_bs: sale.totalBs,
                metodo_pago_principal: dbPaymentMethod,
                estado_pago: 'completado',
                empresa_envio: sale.shippingCarrier || 'retiro_tienda',
                tiene_delivery: Boolean(sale.shippingCarrier === 'delivery_local'),
                creado_el: sale.date,
                observaciones: `${sale.paymentMethodLabel}${sale.paymentReference ? ` - Ref: ${sale.paymentReference}` : ''}`
            });
            if (saleErr) return { ok: false, networkError: isNetworkError(saleErr), error: saleErr };
        }

        // 2. Detalles (el trigger descuenta stock; no reinsertar si ya existen)
        if (sale.items && sale.items.length > 0 && !(await existsRow('detalles_venta', 'venta_id', sale.id))) {
            const itemsToInsert = sale.items.map(item => ({
                venta_id: sale.id,
                producto_id: item.productId || item.id,
                nombre_producto: item.name,
                marca: item.brand || 'UrbanStep',
                talla: String(item.size || item.talla || '41'),
                color: item.color || 'Multicolor',
                cantidad: Number(item.quantity) || 1,
                precio_unitario_usd: Number(item.price) || 0,
                precio_unitario_bs: Number((item.price * bcvRate).toFixed(2)) || 0,
                subtotal_usd: Number((item.price * (item.quantity || 1)).toFixed(2)) || 0,
                subtotal_bs: Number((item.price * (item.quantity || 1) * bcvRate).toFixed(2)) || 0
            }));
            const { error: detErr } = await supabase.from('detalles_venta').insert(itemsToInsert);
            if (detErr) return { ok: false, networkError: isNetworkError(detErr), error: detErr };
        }

        // 3. Pago
        if (!(await existsRow('pagos_venta', 'venta_id', sale.id))) {
            const { error: payErr } = await supabase.from('pagos_venta').insert({
                venta_id: sale.id,
                metodo_pago: dbPaymentMethod,
                monto_usd: sale.total,
                monto_bs: sale.totalBs,
                banco_origen: sale.paymentBank || null,
                numero_referencia: sale.paymentReference || null,
                observaciones: sale.paymentMethodLabel
            });
            if (payErr) return { ok: false, networkError: isNetworkError(payErr), error: payErr };
        }

        return { ok: true, networkError: false, error: null };
    } catch (err) {
        return { ok: false, networkError: isNetworkError(err), error: err };
    }
};

export const enqueueSale = async (sale) => {
    await offlineStore.queueAdd({ id: sale.id, sale: { ...sale, pendingSync: true }, queuedAt: new Date().toISOString(), attempts: 0 });
    await notify();
};

export const getPendingCount = async () => (await offlineStore.queueAll()).length;

let _syncing = false;

/** Sube la cola en orden cronológico. Se detiene ante el primer fallo de red. */
export const syncPendingSales = async () => {
    if (_syncing || isOffline() || !isSupabaseConfigured() || !supabase) return { synced: 0, failed: 0 };
    _syncing = true;
    let synced = 0;
    let failed = 0;
    try {
        const queue = (await offlineStore.queueAll()).sort((a, b) => String(a.queuedAt).localeCompare(String(b.queuedAt)));
        for (const entry of queue) {
            const res = await pushSaleRecords(entry.sale);
            if (res.ok) {
                await offlineStore.queueRemove(entry.id);
                synced += 1;
            } else if (res.networkError) {
                break; // sin conexión estable: reintentar luego
            } else {
                failed += 1;
                console.warn('Venta en cola rechazada por el servidor, se reintentará:', entry.id, res.error);
                await offlineStore.queueAdd({ ...entry, attempts: (entry.attempts || 0) + 1, lastError: String(res.error?.message || res.error) });
            }
        }
    } finally {
        _syncing = false;
        await notify();
        if (synced > 0 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline_sales_synced', { detail: { synced } }));
        }
    }
    return { synced, failed };
};

// Sincronización automática: al recuperar conexión, al abrir la app y periódicamente mientras haya pendientes
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { syncPendingSales(); });
    setTimeout(() => { syncPendingSales(); notify(); }, 2000);
    setInterval(async () => {
        if (!isOffline() && (await getPendingCount()) > 0) syncPendingSales();
    }, SYNC_INTERVAL_MS);
}
