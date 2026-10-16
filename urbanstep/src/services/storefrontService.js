/**
 * storefrontService.js — Servicios de la tienda en línea.
 *  - Cupones y promociones: tabla 'cupones' en Supabase (compartida por todos los navegadores).
 *  - Reseñas: tabla 'resenas' en Supabase. Sin la tabla (ver modificaciones_fase1_ecommerce.sql) la sección queda vacía.
 *  - Lista de deseos y libreta de direcciones: guardadas en este navegador, separadas por cuenta.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { customerService } from './customerService';
import { saleService } from './saleServices';
import { deliveryService } from './deliveryService';

const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
};
const writeJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('No se pudo guardar en el navegador:', e); }
};
const owner = (user) => String(user?.id || user?.email || 'invitado');

// ---------------------------------------------------------------- Lista de deseos
const wishKey = (user) => `urbanstep_wishlist_${owner(user)}`;

export const wishlistService = {
    get: (user) => readJson(wishKey(user), []),
    has: (user, productId) => readJson(wishKey(user), []).includes(productId),
    toggle: (user, productId) => {
        const list = readJson(wishKey(user), []);
        const next = list.includes(productId) ? list.filter(id => id !== productId) : [...list, productId];
        writeJson(wishKey(user), next);
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('wishlist_changed', { detail: next }));
        return next.includes(productId);
    }
};

// ---------------------------------------------------------------- Libreta de direcciones
const addrKey = (user) => `urbanstep_addresses_${owner(user)}`;

export const addressBookService = {
    list: (user) => readJson(addrKey(user), []),
    add: (user, { label, address, zone, phone }) => {
        if (!address || !address.trim()) throw new Error('La dirección es obligatoria');
        const list = readJson(addrKey(user), []);
        const entry = {
            id: `addr-${Date.now()}`,
            label: (label || 'Casa').trim(),
            address: address.trim(),
            zone: zone || '',
            phone: (phone || '').trim(),
            isDefault: list.length === 0
        };
        writeJson(addrKey(user), [...list, entry]);
        return entry;
    },
    remove: (user, id) => {
        let list = readJson(addrKey(user), []).filter(a => a.id !== id);
        if (list.length > 0 && !list.some(a => a.isDefault)) list = list.map((a, i) => ({ ...a, isDefault: i === 0 }));
        writeJson(addrKey(user), list);
        return list;
    },
    setDefault: (user, id) => {
        const list = readJson(addrKey(user), []).map(a => ({ ...a, isDefault: a.id === id }));
        writeJson(addrKey(user), list);
        return list;
    }
};

// ---------------------------------------------------------------- Cupones y promociones
export const promotionService = {
    /** Promociones activas visibles para la tienda. */
    async getActive() {
        if (!isSupabaseConfigured() || !supabase) return [];
        try {
            const { data, error } = await supabase.from('cupones').select('*').eq('activo', true);
            if (error) return [];
            return data || [];
        } catch {
            return [];
        }
    },

    /** Todas (panel de administración). */
    async getAll() {
        if (!isSupabaseConfigured() || !supabase) return { rows: [], available: false };
        try {
            const { data, error } = await supabase.from('cupones').select('*').order('creado_el', { ascending: false });
            if (error) return { rows: [], available: false, error: error.message };
            return { rows: data || [], available: true };
        } catch (e) {
            return { rows: [], available: false, error: e.message };
        }
    },

    async create(promo) {
        if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase no está configurado');
        const row = {
            codigo: promo.automatico ? null : String(promo.codigo || '').trim().toUpperCase(),
            descripcion: promo.descripcion || null,
            tipo: promo.tipo,
            valor: Number(promo.valor) || 0,
            compra_minima_usd: Number(promo.compra_minima_usd) || 0,
            productos_ids: Array.isArray(promo.productos_ids) ? promo.productos_ids : null,
            automatico: Boolean(promo.automatico),
            activo: promo.activo !== false,
            inicia_el: promo.inicia_el || null,
            vence_el: promo.vence_el || null,
            usos_maximos: promo.usos_maximos ? Number(promo.usos_maximos) : null
        };
        if (!row.automatico && !row.codigo) throw new Error('El cupón necesita un código');
        if (row.tipo === 'porcentaje' && (row.valor <= 0 || row.valor > 100)) throw new Error('El porcentaje debe estar entre 1 y 100');
        if (row.tipo === 'monto_fijo' && row.valor <= 0) throw new Error('El monto debe ser mayor a 0');
        const { data, error } = await supabase.from('cupones').insert(row).select().single();
        if (error) throw new Error(error.code === '23505' ? 'Ya existe un cupón con ese código' : error.message);
        return data;
    },

    async setActive(id, activo) {
        const { error } = await supabase.from('cupones').update({ activo }).eq('id', id);
        if (error) throw new Error(error.message);
    },

    async remove(id) {
        const { error } = await supabase.from('cupones').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },

    /** Registra un uso tras confirmar el pedido (no bloqueante). */
    async registerUse(applied = []) {
        if (!isSupabaseConfigured() || !supabase) return;
        for (const a of applied) {
            if (!a.id) continue;
            try {
                await supabase.rpc('incrementar_uso_cupon', { p_id: a.id });
            } catch (e) {
                console.warn('No se pudo registrar el uso del cupón:', e);
            }
        }
    }
};

// ---------------------------------------------------------------- Reseñas
export const reviewService = {
    async list(productId) {
        if (!isSupabaseConfigured() || !supabase) return [];
        try {
            const { data, error } = await supabase
                .from('resenas').select('*').eq('producto_id', productId).eq('aprobada', true)
                .order('creado_el', { ascending: false });
            return error ? [] : (data || []);
        } catch {
            return [];
        }
    },

    summarize(reviews) {
        const count = reviews.length;
        const avg = count > 0 ? reviews.reduce((a, r) => a + (Number(r.calificacion) || 0), 0) / count : 0;
        const distribution = [5, 4, 3, 2, 1].map(stars => ({ stars, count: reviews.filter(r => Number(r.calificacion) === stars).length }));
        return { count, average: Math.round(avg * 10) / 10, distribution };
    },

    async add({ productId, userId, userName, rating, title, comment, verifiedPurchase }) {
        if (!isSupabaseConfigured() || !supabase) throw new Error('Las reseñas requieren conexión a Supabase');
        const stars = Number(rating);
        if (!(stars >= 1 && stars <= 5)) throw new Error('Elige una calificación de 1 a 5 estrellas');
        if (!comment || comment.trim().length < 10) throw new Error('Cuéntanos un poco más (mínimo 10 caracteres)');
        const { error } = await supabase.from('resenas').insert({
            producto_id: productId,
            usuario_id: userId ? String(userId) : null,
            nombre_usuario: userName || 'Cliente',
            calificacion: stars,
            titulo: (title || '').trim() || null,
            comentario: comment.trim(),
            compra_verificada: Boolean(verifiedPurchase),
            aprobada: Boolean(verifiedPurchase) // las no verificadas esperan moderación
        });
        if (error) throw new Error(error.message);
        return { moderated: !verifiedPurchase };
    }
};

// ---------------------------------------------------------------- Cuenta del cliente
export const accountService = {
    /** Ficha de cliente (clientes) vinculada al usuario por correo. */
    async getCustomerRecord(user) {
        if (!user?.email) return null;
        const email = String(user.email).trim().toLowerCase();
        try {
            const all = await customerService.getAll();
            return all.find(c => String(c.email || '').trim().toLowerCase() === email) || null;
        } catch {
            return null;
        }
    },

    /** Pedidos del cliente (más recientes primero) con su estado de entrega. */
    async getOrders(user) {
        const customer = await accountService.getCustomerRecord(user);
        if (!customer) return [];
        const [sales, deliveries] = await Promise.all([
            saleService.getAll(),
            deliveryService.getAll().catch(() => [])
        ]);
        const bySale = new Map((deliveries || []).map(d => [d.saleId, d]));
        return sales
            .filter(s => s.customerId === customer.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(s => ({ ...s, delivery: bySale.get(s.id) || null }));
    },

    /** ¿El cliente compró este producto? (para marcar la reseña como compra verificada). */
    async hasPurchased(user, productId) {
        const orders = await accountService.getOrders(user);
        return orders.some(o => (o.items || []).some(i => String(i.productId ?? i.id) === String(productId)));
    }
};
