/**
 * branchService.js — Sucursales y existencias por ubicación.
 * La Tienda Principal conserva su inventario en `productos` (POS y catálogo web); las demás ubicaciones
 * guardan variantes talla x color en `stock_sucursal`. Requiere modificaciones_fase3_sucursales.sql.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { productService } from './productService';

export const PRINCIPAL_ID = 'SUC-PRINCIPAL';
const FALLBACK_BRANCHES = [{ id: PRINCIPAL_ID, name: 'Tienda Principal', type: 'tienda', address: '', phone: '', isPrincipal: true, active: true }];

const mapBranch = (b) => ({
    id: b.id,
    name: b.nombre,
    type: b.tipo,
    address: b.direccion || '',
    phone: b.telefono || '',
    isPrincipal: Boolean(b.es_principal),
    active: b.activa !== false
});

const colorKey = (c) => String(c ?? '').trim();

export const branchService = {
    /** { branches, available } — available=false si falta ejecutar el SQL de la Fase 3. */
    async list() {
        if (!isSupabaseConfigured() || !supabase) return { branches: FALLBACK_BRANCHES, available: false };
        try {
            const { data, error } = await supabase.from('sucursales').select('*').order('es_principal', { ascending: false }).order('nombre');
            if (error || !Array.isArray(data) || data.length === 0) return { branches: FALLBACK_BRANCHES, available: false, error: error?.message };
            return { branches: data.map(mapBranch), available: true };
        } catch (e) {
            return { branches: FALLBACK_BRANCHES, available: false, error: e.message };
        }
    },

    async create({ name, type = 'tienda', address = '', phone = '' }) {
        if (!name || !name.trim()) throw new Error('El nombre de la sucursal es obligatorio');
        const id = `SUC-${name.trim().toUpperCase().normalize('NFD').replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)}`;
        const { error } = await supabase.from('sucursales').insert({ id, nombre: name.trim(), tipo: type, direccion: address, telefono: phone });
        if (error) throw new Error(error.code === '23505' ? 'Ya existe una sucursal con ese nombre' : error.message);
        return id;
    },

    async setActive(id, active) {
        if (id === PRINCIPAL_ID) throw new Error('La sucursal principal no puede desactivarse');
        const { error } = await supabase.from('sucursales').update({ activa: active }).eq('id', id);
        if (error) throw new Error(error.message);
    },

    /** Filas de stock de sucursales NO principales: [{ branchId, productId, color, size, qty }] */
    async getBranchStock(productId = null) {
        if (!isSupabaseConfigured() || !supabase) return [];
        try {
            let q = supabase.from('stock_sucursal').select('*').gt('cantidad', 0);
            if (productId) q = q.eq('producto_id', productId);
            const { data, error } = await q;
            if (error) return [];
            return (data || []).map(r => ({ branchId: r.sucursal_id, productId: r.producto_id, name: r.nombre_producto, sku: r.sku, color: r.color || '', size: String(r.talla), qty: Number(r.cantidad) || 0 }));
        } catch {
            return [];
        }
    },

    /** Existencia de una variante en una ubicación (la principal sale de `productos`). */
    async getVariantQty(branchId, product, color, size) {
        if (branchId === PRINCIPAL_ID) {
            const map = productService.getColorSizeStock(product, color) || product.sizeStock || {};
            return Math.max(0, parseInt(map[String(size)]) || 0);
        }
        const rows = await branchService.getBranchStock(product.id);
        return rows.filter(r => r.branchId === branchId && colorKey(r.color).toLowerCase() === colorKey(color).toLowerCase() && r.size === String(size))
            .reduce((a, r) => a + r.qty, 0);
    },

    /** Otras ubicaciones con existencia de la variante (para la consulta en caja). */
    async findElsewhere(product, color, size) {
        const [{ branches }, rows] = await Promise.all([branchService.list(), branchService.getBranchStock(product.id)]);
        const names = new Map(branches.map(b => [b.id, b]));
        return rows
            .filter(r => colorKey(r.color).toLowerCase() === colorKey(color).toLowerCase() && r.size === String(size) && names.get(r.branchId)?.active !== false)
            .map(r => ({ branchId: r.branchId, branchName: names.get(r.branchId)?.name || r.branchId, qty: r.qty }));
    },

    /** Movimiento atómico en una sucursal no principal (delta puede ser negativo). */
    async moveStock(branchId, { productId, name, sku, color, size, delta }) {
        const { data, error } = await supabase.rpc('mover_stock_sucursal', {
            p_sucursal: branchId, p_producto: productId, p_nombre: name || null, p_sku: sku || null,
            p_color: colorKey(color), p_talla: String(size), p_delta: delta
        });
        if (error) throw new Error(error.message);
        return data;
    },

    /** Matriz de existencias: por producto, total por ubicación. */
    async getStockMatrix() {
        const [products, { branches }, rows] = await Promise.all([productService.getAll(), branchService.list(), branchService.getBranchStock()]);
        const byProduct = new Map();
        rows.forEach(r => {
            const entry = byProduct.get(r.productId) || {};
            entry[r.branchId] = (entry[r.branchId] || 0) + r.qty;
            byProduct.set(r.productId, entry);
        });
        const matrix = products.map(p => {
            const perBranch = { [PRINCIPAL_ID]: Math.max(0, Number(p.stock) || 0), ...(byProduct.get(p.id) || {}) };
            const total = Object.values(perBranch).reduce((a, n) => a + n, 0);
            return { product: p, perBranch, total };
        });
        return { branches, matrix };
    }
};

export default branchService;
