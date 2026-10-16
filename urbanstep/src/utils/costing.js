/**
 * Costeo real por Costo Promedio Ponderado (el costo vive en product.cost, actualizado en cada compra).
 * Una línea sin costo conocido se marca como estimada; quien consume el resultado decide el respaldo.
 */
import { round2 } from './money';

export const buildCostIndex = (products = []) => {
    const byId = new Map();
    const byName = new Map();
    products.forEach((p) => {
        if (p?.id != null) byId.set(p.id, p);
        if (p?.name) byName.set(String(p.name).toLowerCase(), p);
    });
    return { byId, byName };
};

export const findProduct = (item, index) =>
    index.byId.get(item.productId ?? item.id) || index.byName.get(String(item.name || '').toLowerCase()) || null;

/** Costo unitario real del ítem; known=false si el producto no existe o no tiene costo cargado. */
export const itemUnitCost = (item, index) => {
    const product = findProduct(item, index);
    // Costo histórico congelado al vender (detalles_venta.costo_unitario_usd) tiene prioridad sobre el costo actual
    const frozen = Number(item.costUnitUsd);
    if (frozen > 0) return { cost: frozen, known: true, product };
    const cost = Number(product?.cost);
    return cost > 0 ? { cost, known: true, product } : { cost: 0, known: false, product };
};

/** Costo de ventas de una venta: { costUsd, complete, estimatedLines } */
export const saleCostUsd = (sale, index) => {
    let total = 0;
    let estimatedLines = 0;
    (sale.items || []).forEach((item) => {
        const qty = Number(item.quantity) || 1;
        const { cost, known } = itemUnitCost(item, index);
        if (known) total += cost * qty;
        else estimatedLines += 1;
    });
    return { costUsd: round2(total), complete: estimatedLines === 0 && (sale.items || []).length > 0, estimatedLines };
};
