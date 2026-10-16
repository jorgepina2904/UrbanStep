/**
 * promotions.js — Motor puro de cupones y promociones automáticas del storefront.
 * Tipos: 'porcentaje' | 'monto_fijo' | 'envio_gratis' | 'dos_por_uno'.
 * Una promoción 'automatico' se aplica sola; el resto exige código. Solo se aplica UN cupón por código más
 * todas las promociones automáticas vigentes; los descuentos nunca superan el subtotal.
 */
import { round2 } from './money';

export const PROMO_TYPES = {
    porcentaje: 'Porcentaje de descuento',
    monto_fijo: 'Monto fijo en USD',
    envio_gratis: 'Envío gratis',
    dos_por_uno: '2x1 en modelos seleccionados'
};

const isActiveNow = (promo, now = Date.now()) => {
    if (!promo.activo) return false;
    if (promo.inicia_el && new Date(promo.inicia_el).getTime() > now) return false;
    if (promo.vence_el && new Date(promo.vence_el).getTime() < now) return false;
    if (promo.usos_maximos != null && Number(promo.usos_actuales || 0) >= Number(promo.usos_maximos)) return false;
    return true;
};

/** Calcula el efecto de UNA promoción sobre el carrito. */
const evaluate = (promo, { items, subtotal, shippingCost }) => {
    const minimum = Number(promo.compra_minima_usd) || 0;
    if (subtotal < minimum) {
        return { discountUsd: 0, shippingDiscountUsd: 0, reason: `Compra mínima de $${minimum.toFixed(2)}` };
    }
    const value = Number(promo.valor) || 0;

    switch (promo.tipo) {
        case 'porcentaje':
            return { discountUsd: round2(subtotal * Math.min(100, Math.max(0, value)) / 100), shippingDiscountUsd: 0 };
        case 'monto_fijo':
            return { discountUsd: round2(Math.min(subtotal, Math.max(0, value))), shippingDiscountUsd: 0 };
        case 'envio_gratis':
            return { discountUsd: 0, shippingDiscountUsd: round2(shippingCost || 0) };
        case 'dos_por_uno': {
            const ids = Array.isArray(promo.productos_ids) ? promo.productos_ids.map(String) : [];
            let discount = 0;
            items.forEach((i) => {
                const pid = String(i.productId ?? i.id);
                if (ids.length > 0 && !ids.includes(pid)) return;
                discount += Math.floor((Number(i.quantity) || 0) / 2) * (Number(i.price) || 0);
            });
            return discount > 0
                ? { discountUsd: round2(Math.min(subtotal, discount)), shippingDiscountUsd: 0 }
                : { discountUsd: 0, shippingDiscountUsd: 0, reason: 'Lleva 2 pares del mismo modelo para activar el 2x1' };
        }
        default:
            return { discountUsd: 0, shippingDiscountUsd: 0 };
    }
};

/**
 * @param {{items:Array, subtotal:number, shippingCost:number, promotions:Array, couponCode?:string, now?:number}} input
 * @returns {{ discountUsd:number, shippingDiscountUsd:number, applied:Array<{code:string,label:string,discountUsd:number,shippingDiscountUsd:number}>, couponError:string|null }}
 */
export const computePromotions = ({ items = [], subtotal = 0, shippingCost = 0, promotions = [], couponCode = '', now = Date.now() }) => {
    const ctx = { items, subtotal, shippingCost };
    const applied = [];
    let couponError = null;
    let discount = 0;
    let shippingDiscount = 0;

    const push = (promo, result) => {
        if (result.discountUsd <= 0 && result.shippingDiscountUsd <= 0) return false;
        applied.push({ id: promo.id, code: promo.codigo || 'AUTO', label: promo.descripcion || PROMO_TYPES[promo.tipo], discountUsd: result.discountUsd, shippingDiscountUsd: result.shippingDiscountUsd });
        discount += result.discountUsd;
        shippingDiscount += result.shippingDiscountUsd;
        return true;
    };

    promotions.filter(p => p.automatico && isActiveNow(p, now)).forEach(p => push(p, evaluate(p, ctx)));

    const code = String(couponCode || '').trim().toUpperCase();
    if (code) {
        const coupon = promotions.find(p => !p.automatico && String(p.codigo || '').toUpperCase() === code);
        if (!coupon) couponError = 'Cupón no válido';
        else if (!isActiveNow(coupon, now)) couponError = 'Este cupón no está vigente o ya agotó sus usos';
        else {
            const result = evaluate(coupon, ctx);
            if (!push(coupon, result)) couponError = result.reason || 'El cupón no aplica a tu compra';
        }
    }

    return {
        discountUsd: round2(Math.min(subtotal, discount)),
        shippingDiscountUsd: round2(Math.min(shippingCost || 0, shippingDiscount)),
        applied,
        couponError
    };
};
