/**
 * transferService.js — Órdenes de traslado entre sucursales y depósito.
 * Flujo: solicitado -> en_transito (descuenta en origen) -> recibido | recibido_con_diferencias (suma en destino).
 * La recepción es CIEGA: quien recibe cuenta los pares sin ver la cantidad enviada; el sistema compara después.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { productService } from './productService';
import { branchService, PRINCIPAL_ID } from './branchService';
import { auditService } from './auditService';

const mapItem = (i) => ({
    id: i.id, productId: i.producto_id, name: i.nombre_producto, sku: i.sku, color: i.color || '',
    size: String(i.talla), sent: Number(i.cantidad_enviada) || 0, received: i.cantidad_recibida == null ? null : Number(i.cantidad_recibida)
});

const mapTransfer = (t) => ({
    id: t.id, fromId: t.origen_id, toId: t.destino_id, status: t.estado,
    requestedBy: t.solicitado_por, dispatchedBy: t.despachado_por, receivedBy: t.recibido_por, notes: t.notas || '',
    createdAt: t.creado_el, dispatchedAt: t.despachado_el, receivedAt: t.recibido_el,
    items: (t.traslado_items || []).map(mapItem)
});

export const TRANSFER_STATUS = {
    solicitado: { label: 'Solicitado', tone: 'bg-gray-100 text-gray-700' },
    en_transito: { label: 'En tránsito', tone: 'bg-amber-100 text-amber-800' },
    recibido: { label: 'Recibido', tone: 'bg-emerald-100 text-emerald-700' },
    recibido_con_diferencias: { label: 'Recibido con diferencias', tone: 'bg-red-100 text-red-700' },
    cancelado: { label: 'Cancelado', tone: 'bg-gray-200 text-gray-500' }
};

const requireDb = () => {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Los traslados requieren Supabase configurado');
};

/** Suma (delta>0) o resta (delta<0) pares en una ubicación, sea la principal o una sucursal. */
const applyStock = async (branchId, item, delta, reason, userName) => {
    if (branchId === PRINCIPAL_ID) {
        const product = (await productService.getAll()).find(p => p.id === item.productId);
        if (!product) throw new Error(`El producto ${item.name || item.productId} ya no existe en el catálogo`);
        const current = await branchService.getVariantQty(PRINCIPAL_ID, product, item.color, item.size);
        if (current + delta < 0) throw new Error(`Existencia insuficiente de ${product.name} talla ${item.size} en la tienda principal`);
        await productService.updateStock(product.id, current + delta, item.size, reason, userName, item.color || null);
    } else {
        await branchService.moveStock(branchId, { productId: item.productId, name: item.name, sku: item.sku, color: item.color, size: item.size, delta });
    }
};

const nextId = async (attempt = 0) => {
    const { count } = await supabase.from('traslados').select('id', { count: 'exact', head: true });
    return `TRF-${new Date().getFullYear()}-${String((count || 0) + 1 + attempt).padStart(4, '0')}`;
};

export const transferService = {
    async list({ status = null } = {}) {
        if (!isSupabaseConfigured() || !supabase) return { rows: [], available: false };
        try {
            let q = supabase.from('traslados').select('*, traslado_items(*)').order('creado_el', { ascending: false }).limit(200);
            if (status) q = q.eq('estado', status);
            const { data, error } = await q;
            if (error) return { rows: [], available: false, error: error.message };
            return { rows: (data || []).map(mapTransfer), available: true };
        } catch (e) {
            return { rows: [], available: false, error: e.message };
        }
    },

    /**
     * @param {{fromId:string,toId:string,items:Array<{product:object,color:string,size:string,qty:number}>,user:string,notes?:string,dispatch?:boolean}} input
     */
    async create({ fromId, toId, items, user = 'Sistema', notes = '', dispatch = false }) {
        requireDb();
        if (!fromId || !toId) throw new Error('Elige origen y destino');
        if (fromId === toId) throw new Error('El origen y el destino deben ser distintos');
        if (!Array.isArray(items) || items.length === 0) throw new Error('Agrega al menos un modelo al traslado');

        const clean = items.map((i) => ({
            productId: i.product.id, name: i.product.name, sku: i.product.sku,
            color: String(i.color ?? ''), size: String(i.size), qty: parseInt(i.qty, 10)
        }));
        clean.forEach(i => { if (!(i.qty > 0)) throw new Error(`Cantidad inválida para ${i.name} talla ${i.size}`); });

        let id = null;
        for (let attempt = 0; attempt < 3 && !id; attempt++) {
            const candidate = await nextId(attempt);
            const { error } = await supabase.from('traslados').insert({ id: candidate, origen_id: fromId, destino_id: toId, estado: 'solicitado', solicitado_por: user, notas: notes || null });
            if (!error) id = candidate;
            else if (error.code !== '23505') throw new Error(error.message);
        }
        if (!id) throw new Error('No se pudo asignar el número de traslado, intenta de nuevo');

        const { error: itemsErr } = await supabase.from('traslado_items').insert(clean.map(i => ({
            traslado_id: id, producto_id: i.productId, nombre_producto: i.name, sku: i.sku, color: i.color, talla: i.size, cantidad_enviada: i.qty
        })));
        if (itemsErr) {
            await supabase.from('traslados').delete().eq('id', id);
            throw new Error(itemsErr.message);
        }

        if (dispatch) await transferService.dispatch(id, user);
        return id;
    },

    /** Descuenta en el origen y deja el traslado en tránsito. Revierte si algún renglón falla. */
    async dispatch(id, user = 'Sistema') {
        requireDb();
        const { rows } = await transferService.list();
        const t = rows.find(r => r.id === id);
        if (!t) throw new Error('Traslado no encontrado');
        if (t.status !== 'solicitado') throw new Error('Solo se pueden despachar traslados solicitados');

        const done = [];
        try {
            for (const item of t.items) {
                await applyStock(t.fromId, item, -item.sent, `Traslado ${id} en tránsito`, user);
                done.push(item);
            }
        } catch (err) {
            for (const item of done) {
                try { await applyStock(t.fromId, item, item.sent, `Reversa de despacho fallido ${id}`, user); } catch (e) { console.error('No se pudo revertir el despacho:', e); }
            }
            throw err;
        }
        const { error } = await supabase.from('traslados').update({ estado: 'en_transito', despachado_por: user, despachado_el: new Date().toISOString() }).eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    /**
     * Recepción ciega. counts = { [itemId]: pares contados }. Devuelve { status, differences }.
     */
    async receive(id, counts, user = 'Sistema') {
        requireDb();
        const { rows } = await transferService.list();
        const t = rows.find(r => r.id === id);
        if (!t) throw new Error('Traslado no encontrado');
        if (t.status !== 'en_transito') throw new Error('Solo se pueden recibir traslados en tránsito');

        for (const item of t.items) {
            const n = counts[item.id];
            if (n === undefined || n === '' || !(Number(n) >= 0) || !Number.isInteger(Number(n))) {
                throw new Error(`Indica los pares contados de ${item.name} talla ${item.size} (0 si no llegó)`);
            }
        }

        const differences = [];
        for (const item of t.items) {
            const received = Number(counts[item.id]);
            if (received > 0) await applyStock(t.toId, item, received, `Recepción de traslado ${id}`, user);
            const { error } = await supabase.from('traslado_items').update({ cantidad_recibida: received }).eq('id', item.id);
            if (error) throw new Error(error.message);
            if (received !== item.sent) differences.push({ ...item, received, diff: received - item.sent });
        }

        const status = differences.length > 0 ? 'recibido_con_diferencias' : 'recibido';
        const { error } = await supabase.from('traslados').update({ estado: status, recibido_por: user, recibido_el: new Date().toISOString() }).eq('id', id);
        if (error) throw new Error(error.message);

        if (differences.length > 0) {
            try {
                auditService.log({
                    userName: user, action: 'ajuste_inventario',
                    actionLabel: `ALERTA diferencia en recepción de traslado ${id} (${differences.length} renglón/es)`,
                    module: 'inventory', entityType: 'traslado', entityId: id,
                    details: { differences: differences.map(d => ({ producto: d.name, talla: d.size, enviado: d.sent, recibido: d.received })) }
                });
            } catch (e) { console.warn('Auditoría de diferencia no registrada:', e); }
        }
        return { status, differences };
    },

    /** Cancela un traslado; si ya estaba en tránsito devuelve los pares al origen. */
    async cancel(id, user = 'Sistema') {
        requireDb();
        const { rows } = await transferService.list();
        const t = rows.find(r => r.id === id);
        if (!t) throw new Error('Traslado no encontrado');
        if (!['solicitado', 'en_transito'].includes(t.status)) throw new Error('Este traslado ya no se puede cancelar');
        if (t.status === 'en_transito') {
            for (const item of t.items) await applyStock(t.fromId, item, item.sent, `Cancelación de traslado ${id}`, user);
        }
        const { error } = await supabase.from('traslados').update({ estado: 'cancelado' }).eq('id', id);
        if (error) throw new Error(error.message);
    }
};

export default transferService;
