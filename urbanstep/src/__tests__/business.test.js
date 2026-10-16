import { describe, it, expect } from 'vitest';
import { buildCostIndex, itemUnitCost, saleCostUsd } from '../utils/costing';
import { computeCommissions, getQuincenaRange } from '../services/commissionService';
import { computePromotions } from '../utils/promotions';
import { computeLoyalty, tierForPoints } from '../utils/loyalty';
import { computeReplenishment, buildWhatsAppUrl } from '../services/replenishmentService';

describe('costeo', () => {
    const index = buildCostIndex([{ id: 'P1', name: 'Air', cost: 40 }, { id: 'P2', name: 'Sin costo', cost: 0 }]);
    it('usa el costo actual del producto cuando no hay costo histórico', () => {
        expect(itemUnitCost({ productId: 'P1' }, index)).toMatchObject({ cost: 40, known: true });
    });
    it('el costo histórico congelado tiene prioridad sobre el costo actual', () => {
        expect(itemUnitCost({ productId: 'P1', costUnitUsd: 35 }, index).cost).toBe(35);
    });
    it('marca como estimada la línea sin costo y detecta ventas incompletas', () => {
        expect(itemUnitCost({ productId: 'P2' }, index).known).toBe(false);
        expect(saleCostUsd({ items: [{ productId: 'P1', quantity: 2 }] }, index)).toMatchObject({ costUsd: 80, complete: true });
        const partial = saleCostUsd({ items: [{ productId: 'P1', quantity: 1 }, { productId: 'P2', quantity: 1 }] }, index);
        expect(partial.complete).toBe(false);
        expect(partial.estimatedLines).toBe(1);
    });
});

describe('comisiones', () => {
    const products = [{ id: 'P1', name: 'A', cost: 40 }];
    const sales = [
        { receiptNumber: 'T1', cashier: 'Ana', subtotal: 100, items: [{ productId: 'P1', quantity: 1 }] },
        { receiptNumber: 'T2', cashier: 'Ana', subtotal: 200, items: [{ productId: 'P1', quantity: 2 }] }
    ];
    it('base ventas neta de notas de crédito', () => {
        const r = computeCommissions({ sales, creditNotes: [{ affectedInvoiceNumber: 'T2', subtotalUsd: 100 }], products, config: { ratePct: 2, base: 'ventas', overrides: {} } });
        expect(r.rows[0]).toMatchObject({ seller: 'Ana', netBaseUsd: 200, commissionUsd: 4 });
    });
    it('base margen y excepción por vendedor', () => {
        const r = computeCommissions({ sales, creditNotes: [], products, config: { ratePct: 10, base: 'margen', overrides: { Ana: 5 } } });
        expect(r.rows[0].commissionUsd).toBe(9); // margen 180 x 5%
    });
    it('la quincena anterior de la segunda mitad de mes es la primera', () => {
        expect(getQuincenaRange(-1, new Date(2026, 9, 20)).label).toBe('01–15/10/2026');
    });
});

describe('promociones', () => {
    const items = [{ id: 'A', price: 50, quantity: 2 }];
    it('2x1 regala la mitad de los pares del mismo modelo', () => {
        const r = computePromotions({ items, subtotal: 100, shippingCost: 3, promotions: [{ codigo: '2X1', tipo: 'dos_por_uno', activo: true }], couponCode: '2x1' });
        expect(r.discountUsd).toBe(50);
    });
    it('envío gratis automático solo desde el mínimo', () => {
        const promo = [{ tipo: 'envio_gratis', compra_minima_usd: 80, automatico: true, activo: true }];
        expect(computePromotions({ items, subtotal: 100, shippingCost: 3, promotions: promo }).shippingDiscountUsd).toBe(3);
        expect(computePromotions({ items, subtotal: 60, shippingCost: 3, promotions: promo }).shippingDiscountUsd).toBe(0);
    });
    it('rechaza cupones vencidos o inexistentes y nunca supera el subtotal', () => {
        const promos = [{ codigo: 'OLD', tipo: 'porcentaje', valor: 50, activo: true, vence_el: '2020-01-01' }, { codigo: 'BIG', tipo: 'monto_fijo', valor: 999, activo: true }];
        expect(computePromotions({ items, subtotal: 100, promotions: promos, couponCode: 'old' }).couponError).toMatch(/vigente/);
        expect(computePromotions({ items, subtotal: 100, promotions: promos, couponCode: 'zzz' }).couponError).toBe('Cupón no válido');
        expect(computePromotions({ items, subtotal: 100, promotions: promos, couponCode: 'big' }).discountUsd).toBe(100);
    });
});

describe('club VIP', () => {
    it('1 punto por USD neto de notas de crédito y niveles', () => {
        const l = computeLoyalty({ sales: [{ total: 200 }, { total: 150.9 }, { total: 900, status: 'anulada_por_nc' }], creditNotes: [{ totalUsd: 40 }] });
        expect(l.points).toBe(310);
        expect(l.tier.id).toBe('fan');
        expect(l.next.id).toBe('vip');
        expect(tierForPoints(1000).id).toBe('vip');
    });
});

describe('reabastecimiento', () => {
    const now = Date.parse('2026-10-15T12:00:00Z');
    const day = (n) => new Date(now - n * 86400000).toISOString();
    const products = [{ id: 'P1', name: 'Air', cost: 40, supplierId: 'S1', supplierName: 'A', colorVariants: [{ color: 'Negro', sizeStock: { 41: 2 } }] }];
    it('sugiere pedir cuando la existencia total no cubre el plazo + seguridad', () => {
        const sales = [{ date: day(2), items: [{ productId: 'P1', color: 'Negro', size: '41', quantity: 12 }] }];
        const r = computeReplenishment({ sales, products, externalStock: { 'P1|negro|41': 3 }, now });
        expect(r.lines[0]).toMatchObject({ stock: 5, suggestedQty: 10 });
    });
    it('ignora ventas fuera de ventana y ventas anuladas', () => {
        const sales = [
            { date: day(40), items: [{ productId: 'P1', color: 'Negro', size: '41', quantity: 50 }] },
            { date: day(1), status: 'anulada_por_nc', items: [{ productId: 'P1', color: 'Negro', size: '41', quantity: 9 }] }
        ];
        expect(computeReplenishment({ sales, products, now }).lines).toHaveLength(0);
    });
    it('normaliza teléfonos venezolanos para WhatsApp', () => {
        expect(buildWhatsAppUrl('0414-1234567', 'hola')).toBe('https://wa.me/584141234567?text=hola');
    });
});
