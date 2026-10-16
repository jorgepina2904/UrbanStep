/**
 * replenishmentService.js — Reabastecimiento inteligente de calzado.
 * Velocidad de venta por variante (talla x color) en una ventana móvil; sugiere pedir cuando la existencia
 * total (tienda + sucursales) cae bajo el punto de reorden = velocidad x (plazo del proveedor + días de seguridad).
 */
import { round2 } from '../utils/money';

export const DEFAULT_REPLENISHMENT = { windowDays: 28, leadDays: 7, coverDays: 21, safetyDays: 5 };

const variantKey = (productId, color, size) => `${productId}|${String(color ?? '').trim().toLowerCase()}|${String(size)}`;

/** Variantes con su existencia propia de la tienda principal: [{color, size, qty}] */
const productVariants = (p) => {
    const out = [];
    if (Array.isArray(p.colorVariants) && p.colorVariants.length > 0) {
        p.colorVariants.forEach(v => Object.entries(v.sizeStock || {}).forEach(([size, qty]) => out.push({ color: v.color || '', size, qty: Math.max(0, parseInt(qty) || 0) })));
    } else {
        Object.entries(p.sizeStock || {}).forEach(([size, qty]) => out.push({ color: p.color || '', size, qty: Math.max(0, parseInt(qty) || 0) }));
    }
    return out;
};

/**
 * @param {{sales:Array, products:Array, externalStock?:Object, params?:Object, now?:number}} input
 *   externalStock: { "<productId>|<color>|<talla>": pares en otras sucursales }
 */
export const computeReplenishment = ({ sales = [], products = [], externalStock = {}, params = {}, now = Date.now() }) => {
    const cfg = { ...DEFAULT_REPLENISHMENT, ...params };
    const since = now - cfg.windowDays * 86400000;

    const sold = new Map();
    sales.forEach((s) => {
        if (s.status === 'anulada_por_nc') return;
        const t = new Date(s.date).getTime();
        if (!(t >= since && t <= now)) return;
        (s.items || []).forEach((i) => {
            const key = variantKey(i.productId ?? i.id, i.color, i.size);
            sold.set(key, (sold.get(key) || 0) + (Number(i.quantity) || 1));
        });
    });

    const lines = [];
    products.forEach((p) => {
        productVariants(p).forEach((v) => {
            const key = variantKey(p.id, v.color, v.size);
            const units = sold.get(key) || 0;
            if (units === 0) return;
            const velocity = units / cfg.windowDays; // pares por día
            const stock = v.qty + (externalStock[key] || 0);
            const reorderPoint = velocity * (cfg.leadDays + cfg.safetyDays);
            if (stock > reorderPoint) return;
            const target = velocity * (cfg.leadDays + cfg.coverDays + cfg.safetyDays);
            const suggestedQty = Math.max(1, Math.ceil(target - stock));
            lines.push({
                productId: p.id, name: p.name, brand: p.brand || 'Sin marca', sku: p.sku, color: v.color, size: String(v.size),
                stock, storeStock: v.qty, unitsSold: units, velocityWeekly: round2(velocity * 7),
                daysOfCover: velocity > 0 ? round2(stock / velocity) : null,
                suggestedQty, unitCostUsd: Number(p.cost) || 0,
                lineCostUsd: round2(suggestedQty * (Number(p.cost) || 0)),
                urgent: stock === 0 || stock / velocity < cfg.leadDays,
                supplierId: p.supplierId || 'SIN-PROVEEDOR', supplierName: p.supplierName || 'Sin proveedor asignado'
            });
        });
    });

    lines.sort((a, b) => Number(b.urgent) - Number(a.urgent) || (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0));

    const bySupplierMap = new Map();
    lines.forEach((l) => {
        const g = bySupplierMap.get(l.supplierId) || { supplierId: l.supplierId, supplierName: l.supplierName, lines: [], totalQty: 0, totalCostUsd: 0, urgentCount: 0 };
        g.lines.push(l);
        g.totalQty += l.suggestedQty;
        g.totalCostUsd += l.lineCostUsd;
        if (l.urgent) g.urgentCount += 1;
        bySupplierMap.set(l.supplierId, g);
    });
    const bySupplier = [...bySupplierMap.values()].map(g => ({ ...g, totalCostUsd: round2(g.totalCostUsd) }));

    const modelMap = new Map();
    products.forEach((p) => {
        let units = 0;
        productVariants(p).forEach(v => { units += sold.get(variantKey(p.id, v.color, v.size)) || 0; });
        if (units > 0) modelMap.set(p.id, { productId: p.id, name: p.name, brand: p.brand || 'Sin marca', unitsSold: units, weeklyVelocity: round2((units / cfg.windowDays) * 7) });
    });
    const byModel = [...modelMap.values()].sort((a, b) => b.weeklyVelocity - a.weeklyVelocity);

    return { params: cfg, lines, bySupplier, byModel, urgentCount: lines.filter(l => l.urgent).length };
};

/** Texto de la orden de compra listo para enviar por WhatsApp o correo. */
export const buildPurchaseOrderText = ({ supplierName, lines, company = 'UrbanStep Venezuela C.A.', date = new Date() }) => {
    const rows = lines.map(l => `• ${l.name}${l.color ? ` – ${l.color}` : ''} – Talla ${l.size}: ${l.suggestedQty} par(es)`);
    const total = lines.reduce((a, l) => a + l.suggestedQty, 0);
    return [
        `*Orden de compra – ${company}*`,
        `Proveedor: ${supplierName}`,
        `Fecha: ${date.toLocaleDateString('es-VE')}`,
        '',
        ...rows,
        '',
        `Total: ${total} pares`,
        'Por favor confirmar disponibilidad, precio y fecha de entrega. ¡Gracias!'
    ].join('\n');
};

/** Enlace wa.me; el teléfono venezolano se normaliza a formato internacional (58...). */
export const buildWhatsAppUrl = (phone, text) => {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `58${digits.slice(1)}`;
    else if (digits.length === 10) digits = `58${digits}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};
