/**
 * warrantyService.js — Garantías y mermas: lotes de reclamo al proveedor.
 * El calzado devuelto por falla de fábrica (Nota de Crédito "producto_danado") no reingresa a venta; se agrupa
 * en un lote, se envía al proveedor y se resuelve con reposición, nota de crédito del proveedor o rechazo.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { returnService } from './returnService';
import { productService } from './productService';
import { branchService, PRINCIPAL_ID } from './branchService';

const requireDb = () => {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Los lotes de garantía requieren Supabase configurado');
};

const mapBatch = (b) => ({
    id: b.id, supplierId: b.proveedor_id, supplierName: b.proveedor_nombre, status: b.estado, resolution: b.resolucion,
    notes: b.notas || '', createdBy: b.creado_por, createdAt: b.creado_el, sentAt: b.enviado_el, resolvedAt: b.resuelto_el,
    items: (b.lote_garantia_items || []).map(i => ({
        id: i.id, productId: i.producto_id, name: i.nombre_producto, sku: i.sku, color: i.color || '',
        size: i.talla ? String(i.talla) : '', qty: Number(i.cantidad) || 1, creditNote: i.nota_credito, reason: i.motivo
    }))
});

export const RESOLUTIONS = {
    reposicion: 'El proveedor repone los pares',
    nota_credito_proveedor: 'Nota de crédito del proveedor',
    rechazado: 'Reclamo rechazado (pérdida)'
};

export const warrantyService = {
    async list() {
        if (!isSupabaseConfigured() || !supabase) return { rows: [], available: false };
        try {
            const { data, error } = await supabase.from('lotes_garantia').select('*, lote_garantia_items(*)').order('creado_el', { ascending: false }).limit(100);
            if (error) return { rows: [], available: false, error: error.message };
            return { rows: (data || []).map(mapBatch), available: true };
        } catch (e) {
            return { rows: [], available: false, error: e.message };
        }
    },

    /** Renglones de Notas de Crédito por falla de fábrica que aún no están en ningún lote. */
    async getCandidates() {
        const [notes, batches, products] = await Promise.all([
            returnService.getAll().catch(() => []),
            warrantyService.list(),
            productService.getAll()
        ]);
        const used = new Set();
        batches.rows.forEach(b => b.items.forEach(i => used.add(`${i.creditNote}|${i.productId}|${i.color}|${i.size}`)));
        const byId = new Map(products.map(p => [p.id, p]));
        const out = [];
        (notes || []).filter(n => n.reason === 'producto_danado').forEach((n) => {
            (n.items || []).forEach((i) => {
                const productId = i.productId || i.id;
                const key = `${n.creditNoteNumber}|${productId}|${i.color || ''}|${i.size || ''}`;
                if (used.has(key)) return;
                const p = byId.get(productId);
                out.push({
                    key, creditNote: n.creditNoteNumber, date: n.date, productId, name: i.name, sku: i.sku || p?.sku || '',
                    color: i.color || '', size: i.size ? String(i.size) : '', qty: Number(i.quantity) || 1,
                    supplierId: p?.supplierId || null, supplierName: p?.supplierName || 'Sin proveedor'
                });
            });
        });
        return out;
    },

    async createBatch({ supplierId, supplierName, items, notes = '', user = 'Sistema' }) {
        requireDb();
        if (!Array.isArray(items) || items.length === 0) throw new Error('Selecciona al menos un renglón para el lote');
        const { count } = await supabase.from('lotes_garantia').select('id', { count: 'exact', head: true });
        const id = `GAR-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
        const { error } = await supabase.from('lotes_garantia').insert({ id, proveedor_id: supplierId || null, proveedor_nombre: supplierName || null, notas: notes || null, creado_por: user });
        if (error) throw new Error(error.message);
        const { error: itemsErr } = await supabase.from('lote_garantia_items').insert(items.map(i => ({
            lote_id: id, producto_id: i.productId, nombre_producto: i.name, sku: i.sku, color: i.color, talla: i.size || null,
            cantidad: i.qty, nota_credito: i.creditNote, motivo: 'Falla de fábrica'
        })));
        if (itemsErr) {
            await supabase.from('lotes_garantia').delete().eq('id', id);
            throw new Error(itemsErr.message);
        }
        return id;
    },

    async markSent(id) {
        requireDb();
        const { error } = await supabase.from('lotes_garantia').update({ estado: 'enviado', enviado_el: new Date().toISOString() }).eq('id', id).eq('estado', 'abierto');
        if (error) throw new Error(error.message);
    },

    /** Cierra el lote. Con "reposicion" los pares repuestos reingresan a la tienda principal. */
    async resolve(id, resolution, user = 'Sistema') {
        requireDb();
        if (!RESOLUTIONS[resolution]) throw new Error('Resolución no válida');
        const { rows } = await warrantyService.list();
        const batch = rows.find(b => b.id === id);
        if (!batch) throw new Error('Lote no encontrado');
        if (batch.status === 'resuelto') throw new Error('Este lote ya fue resuelto');

        if (resolution === 'reposicion') {
            const products = await productService.getAll();
            for (const item of batch.items) {
                const product = products.find(p => p.id === item.productId);
                if (!product || !item.size) continue; // sin talla no se puede ubicar la variante
                const current = await branchService.getVariantQty(PRINCIPAL_ID, product, item.color, item.size);
                await productService.updateStock(product.id, current + item.qty, item.size, `Reposición por garantía ${id}`, user, item.color || null);
            }
        }
        const { error } = await supabase.from('lotes_garantia').update({ estado: 'resuelto', resolucion: resolution, resuelto_el: new Date().toISOString() }).eq('id', id);
        if (error) throw new Error(error.message);
    }
};

export default warrantyService;
