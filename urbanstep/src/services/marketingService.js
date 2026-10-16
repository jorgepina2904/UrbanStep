/**
 * marketingService.js — Carritos abandonados y alertas de talla.
 * El contacto lo hace una persona con un enlace de WhatsApp (wa.me): no hay envío automático
 * ni proveedor de mensajería. Requiere modificaciones_fase5_marketing.sql.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { productService } from './productService';
import { buildWhatsAppUrl } from './replenishmentService';

const CART_ID_KEY = 'urbanstep_cart_recovery_id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ready = () => isSupabaseConfigured() && supabase;
const digits = (v) => String(v || '').replace(/\D/g, '');
export const isValidPhone = (v) => digits(v).length >= 10;

const siteUrl = () => (typeof window !== 'undefined' ? window.location.origin : '');

// ------------------------------------------------------------------ Carritos abandonados
export const cartRecoveryService = {
    /** Guarda o actualiza el carrito del cliente que aceptó ser contactado. */
    async save({ name, phone, items, totalUsd }) {
        if (!ready() || !isValidPhone(phone) || !Array.isArray(items) || items.length === 0) return null;
        const snapshot = items.map(i => ({
            productId: i.productId ?? i.id, name: i.name, size: i.size, color: i.color || null, quantity: i.quantity, price: i.price
        }));
        const row = { nombre: name || null, telefono: digits(phone), items: snapshot, total_usd: Number(totalUsd) || 0, estado: 'abierto', actualizado_el: new Date().toISOString() };
        try {
            let id = null;
            try { id = localStorage.getItem(CART_ID_KEY); } catch { /* sin almacenamiento */ }
            if (id && UUID_RE.test(id)) {
                const { error } = await supabase.from('carritos_abandonados').update(row).eq('id', id);
                if (!error) return id;
            }
            const { data, error } = await supabase.from('carritos_abandonados').insert(row).select('id').single();
            if (error || !data) return null;
            try { localStorage.setItem(CART_ID_KEY, data.id); } catch { /* sin almacenamiento */ }
            return data.id;
        } catch {
            return null;
        }
    },

    /** Marca el carrito como convertido (pedido confirmado) y olvida el identificador local. */
    async markConverted() {
        let id = null;
        try { id = localStorage.getItem(CART_ID_KEY); localStorage.removeItem(CART_ID_KEY); } catch { /* sin almacenamiento */ }
        if (!id || !ready()) return;
        try { await supabase.from('carritos_abandonados').update({ estado: 'convertido', actualizado_el: new Date().toISOString() }).eq('id', id); } catch { /* no bloqueante */ }
    },

    /** Para el enlace de recuperación: devuelve los renglones guardados. */
    async getForRecovery(id) {
        if (!ready() || !UUID_RE.test(String(id))) return null;
        try {
            const { data, error } = await supabase.from('carritos_abandonados').select('*').eq('id', id).maybeSingle();
            if (error || !data || data.estado === 'convertido') return null;
            await supabase.from('carritos_abandonados').update({ estado: 'recuperado' }).eq('id', id).neq('estado', 'convertido');
            try { localStorage.setItem(CART_ID_KEY, id); } catch { /* sin almacenamiento */ }
            return data.items || [];
        } catch {
            return null;
        }
    },

    /** Carritos sin movimiento hace más de `minAgeMin` minutos y sin convertir. */
    async listAbandoned({ minAgeMin = 30 } = {}) {
        if (!ready()) return { rows: [], available: false };
        try {
            const { data, error } = await supabase.from('carritos_abandonados').select('*').in('estado', ['abierto', 'contactado', 'recuperado']).order('actualizado_el', { ascending: false }).limit(200);
            if (error) return { rows: [], available: false, error: error.message };
            const limit = Date.now() - minAgeMin * 60000;
            const rows = (data || []).filter(r => new Date(r.actualizado_el).getTime() <= limit).map(r => ({
                id: r.id, name: r.nombre || 'Cliente', phone: r.telefono, items: r.items || [], totalUsd: Number(r.total_usd) || 0,
                status: r.estado, contacts: r.contactos || 0, updatedAt: r.actualizado_el, contactedAt: r.contactado_el
            }));
            return { rows, available: true };
        } catch (e) {
            return { rows: [], available: false, error: e.message };
        }
    },

    buildMessage(cart) {
        const first = String(cart.name || '').split(' ')[0] || 'Hola';
        const list = cart.items.slice(0, 3).map(i => `${i.name}${i.size ? ` (T${i.size})` : ''}`).join(', ');
        return `¡Hola ${first}! 👟 Vimos que dejaste en tu bolsa de UrbanStep: ${list}${cart.items.length > 3 ? ' y más' : ''}. ` +
            `Tus pares te esperan, pero el stock cambia rápido. Retoma tu compra aquí: ${siteUrl()}/landing?cart=1&recover=${cart.id}`;
    },

    whatsappUrl(cart) {
        return buildWhatsAppUrl(cart.phone, cartRecoveryService.buildMessage(cart));
    },

    async markContacted(id) {
        if (!ready()) return;
        const { data } = await supabase.from('carritos_abandonados').select('contactos').eq('id', id).maybeSingle();
        await supabase.from('carritos_abandonados').update({ estado: 'contactado', contactos: (data?.contactos || 0) + 1, contactado_el: new Date().toISOString() }).eq('id', id);
    },

    async dismiss(id) {
        if (!ready()) return;
        await supabase.from('carritos_abandonados').update({ estado: 'convertido' }).eq('id', id);
    }
};

// ------------------------------------------------------------------ Alertas de talla
export const stockAlertService = {
    async subscribe({ product, color, size, name, contact }) {
        if (!ready()) throw new Error('Las alertas requieren conexión con la tienda');
        const clean = String(contact || '').trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
        if (!isEmail && !isValidPhone(clean)) throw new Error('Escribe un WhatsApp (ej: 0414-1234567) o un correo válido');
        const { error } = await supabase.from('alertas_stock').insert({
            producto_id: product.id, nombre_producto: product.name, color: color || '', talla: String(size),
            nombre: (name || '').trim() || null, contacto: isEmail ? clean.toLowerCase() : digits(clean)
        });
        if (error) {
            if (error.code === '23505') return { duplicated: true };
            throw new Error(error.message);
        }
        return { duplicated: false };
    },

    /** Alertas pendientes, separadas entre "ya hay stock" (listas para avisar) y "aún sin stock". */
    async listPending() {
        if (!ready()) return { ready: [], waiting: [], available: false };
        try {
            const { data, error } = await supabase.from('alertas_stock').select('*').is('notificado_el', null).order('creado_el', { ascending: true }).limit(500);
            if (error) return { ready: [], waiting: [], available: false, error: error.message };
            const products = await productService.getAll();
            const byId = new Map(products.map(p => [p.id, p]));
            const out = { ready: [], waiting: [], available: true };
            (data || []).forEach((a) => {
                const p = byId.get(a.producto_id);
                const row = { id: a.id, productId: a.producto_id, name: a.nombre_producto, color: a.color, size: String(a.talla), customer: a.nombre || 'Cliente', contact: a.contacto, createdAt: a.creado_el, isEmail: a.contacto.includes('@') };
                (p && productService.getAvailableStock(p, row.size, row.color) > 0 ? out.ready : out.waiting).push(row);
            });
            return out;
        } catch (e) {
            return { ready: [], waiting: [], available: false, error: e.message };
        }
    },

    /** ¿Cuántas personas esperan este producto? (para avisar tras recibir una compra) */
    async countReadyForProducts(productIds) {
        const { ready: readyRows } = await stockAlertService.listPending();
        return readyRows.filter(r => productIds.includes(r.productId)).length;
    },

    buildMessage(alert) {
        const first = String(alert.customer || '').split(' ')[0] || 'Hola';
        return `¡Hola ${first}! 🎉 Ya llegó la talla ${alert.size}${alert.color ? ` (${alert.color})` : ''} de ${alert.name} a UrbanStep. ` +
            `Resérvala antes de que se agote: ${siteUrl()}/producto/${alert.productId}`;
    },

    whatsappUrl(alert) {
        return buildWhatsAppUrl(alert.contact, stockAlertService.buildMessage(alert));
    },

    mailtoUrl(alert) {
        return `mailto:${alert.contact}?subject=${encodeURIComponent(`Ya llegó tu talla ${alert.size} - ${alert.name}`)}&body=${encodeURIComponent(stockAlertService.buildMessage(alert))}`;
    },

    async markNotified(id) {
        if (!ready()) return;
        await supabase.from('alertas_stock').update({ notificado_el: new Date().toISOString() }).eq('id', id);
    }
};
