import { describe, it, expect, vi, beforeEach } from 'vitest';

// Modo local: sin Supabase, todo vive en memoria (db)
vi.mock('../services/supabaseClient', () => ({
    supabase: null,
    isSupabaseConfigured: () => false,
    testSupabaseConnection: async () => ({ ok: false })
}));

const { db } = await import('../services/api');
const { saleService } = await import('../services/saleServices');
const { accountingService } = await import('../services/accountingService');
const { computeInvoiceTotals } = await import('../utils/money');

const product = (over = {}) => ({
    id: 'P1', name: 'Air Max', sku: 'NK-1', brand: 'Nike', price: 50, cost: 20, stock: 10, minStock: 2, status: 'in_stock',
    colors: ['Negro'], color: 'Negro', sizes: ['41'], sizeStock: { 41: 10 },
    colorVariants: [{ color: 'Negro', sizeStock: { 41: 10 }, total: 10 }], ...over
});

describe('venta y asiento contable coinciden al céntimo', () => {
    beforeEach(() => {
        db.sales = [];
        db.products = [product()];
    });

    it('persiste montos redondeados por renglón, Bs. por concepto y el costo histórico', async () => {
        const items = [{ productId: 'P1', name: 'Air Max', size: '41', color: 'Negro', price: 10.05, quantity: 3 }];
        const t = computeInvoiceTotals({ items, discountPct: 10, taxRate: 0.16, applyIgtf: true, shipping: 3 });
        const sale = await saleService.create({
            items, subtotal: t.subtotal, discountAmount: t.discount, tax: t.tax, igtf: t.igtf, shippingCost: t.shipping, total: t.total,
            bcvRate: 879.12, paymentMethod: 'efectivo_usd', cashier: 'Ana'
        });

        expect(sale.total).toBe(t.total);
        expect(sale.totalBs).toBe(
            Math.round((sale.subtotalBs - Math.round(t.discount * 879.12 * 100) / 100 + sale.taxBs + sale.igtfBs + Math.round(3 * 879.12 * 100) / 100) * 100) / 100
        );
        expect(sale.items[0].costUnitUsd).toBe(20); // CPP congelado al vender
    });

    it('el asiento usa el IVA real del documento, cuadra y no duplica IGTF ni envío', async () => {
        const items = [{ productId: 'P1', name: 'Air Max', size: '41', color: 'Negro', price: 50, quantity: 2 }];
        const t = computeInvoiceTotals({ items, discountPct: 10, taxRate: 0.16, applyIgtf: true, shipping: 3 });
        const sale = await saleService.create({
            items, subtotal: t.subtotal, discountAmount: t.discount, tax: t.tax, igtf: t.igtf, shippingCost: t.shipping, total: t.total,
            bcvRate: 879.12, paymentMethod: 'efectivo_usd', cashier: 'Ana'
        });

        const diario = await accountingService.getLibroDiario({});
        const asiento = diario.find(a => a.id === `asiento-vta-${sale.id}`);

        expect(asiento.cuadrado).toBe(true);
        expect(asiento.total_debe_usd).toBe(sale.total);          // lo cobrado, sin sumar IGTF de nuevo
        expect(asiento.total_debe_usd).toBe(asiento.total_haber_usd);
        expect(asiento.total_debe_bs).toBe(asiento.total_haber_bs);
        expect(asiento.total_debe_bs).toBe(sale.totalBs);         // igual al ticket

        const iva = asiento.renglones.find(r => r.cuenta_id === '2.1.02.01.001');
        expect(iva.haber_usd).toBe(sale.tax);                     // IVA = el del Libro de Ventas
        const delivery = asiento.renglones.find(r => r.cuenta_id === '4.1.01.02.001');
        expect(delivery.haber_usd).toBe(3);
    });

    it('el costo de ventas usa el costo congelado aunque el producto suba de costo después', async () => {
        const items = [{ productId: 'P1', name: 'Air Max', size: '41', color: 'Negro', price: 50, quantity: 1 }];
        const t = computeInvoiceTotals({ items, taxRate: 0.16 });
        const sale = await saleService.create({ items, subtotal: t.subtotal, tax: t.tax, total: t.total, bcvRate: 800, paymentMethod: 'pagomovil', cashier: 'Ana' });

        db.products[0].cost = 35; // llega una importación más cara
        const diario = await accountingService.getLibroDiario({});
        const costo = diario.find(a => a.id === `asiento-costo-${sale.id}`);
        expect(costo.total_debe_usd).toBe(20);
    });
});
