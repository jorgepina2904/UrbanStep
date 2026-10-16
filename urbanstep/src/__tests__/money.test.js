import { describe, it, expect } from 'vitest';
import { round2, usdToVes, resolveSaleRate, computeInvoiceTotals, computeBsBreakdown } from '../utils/money';

describe('round2', () => {
    it('redondea la mitad hacia afuera del cero (simétrico)', () => {
        expect(round2(1.005)).toBe(1.01);
        expect(round2(-1.005)).toBe(-1.01);
        expect(round2(2.675)).toBe(2.68);
    });
    it('tolera valores no numéricos', () => {
        expect(round2(undefined)).toBe(0);
        expect(round2('abc')).toBe(0);
        expect(round2('12.345')).toBe(12.35);
    });
});

describe('usdToVes / resolveSaleRate', () => {
    it('convierte con 2 decimales exactos', () => {
        expect(usdToVes(10.1, 42.5)).toBe(429.25);
        expect(usdToVes(0.01, 879.12)).toBe(8.79);
    });
    it('prioriza la tasa congelada, luego la implícita y al final la vigente', () => {
        expect(resolveSaleRate({ bcvRate: 50 }, 99)).toBe(50);
        expect(resolveSaleRate({ total: 10, totalBs: 450 }, 99)).toBe(45);
        expect(resolveSaleRate({}, 99)).toBe(99);
    });
});

describe('computeInvoiceTotals (redondeo fiscal por renglón)', () => {
    it('redondea el IVA de cada renglón y suma los renglones ya redondeados', () => {
        const items = [{ price: 10.05, quantity: 1 }, { price: 10.05, quantity: 1 }, { price: 10.05, quantity: 1 }];
        const t = computeInvoiceTotals({ items, taxRate: 0.16 });
        expect(t.lines.map(l => l.tax)).toEqual([1.61, 1.61, 1.61]); // 1.608 por renglón
        expect(t.tax).toBe(4.83);                                    // el cálculo global daría 4.82
        expect(t.subtotal).toBe(30.15);
        expect(t.total).toBe(34.98);
    });
    it('aplica descuento por renglón, IGTF sobre base + IVA y envío', () => {
        const t = computeInvoiceTotals({ items: [{ price: 100, quantity: 2 }], discountPct: 10, taxRate: 0.16, applyIgtf: true, shipping: 3 });
        expect(t.subtotal).toBe(200);
        expect(t.discount).toBe(20);
        expect(t.base).toBe(180);
        expect(t.tax).toBe(28.8);
        expect(t.igtf).toBe(6.26);    // (180 + 28.8) * 3%
        expect(t.total).toBe(218.06); // 180 + 28.8 + 6.26 + 3
    });
    it('total = base + IVA + IGTF + envío siempre', () => {
        const t = computeInvoiceTotals({ items: [{ price: 33.33, quantity: 3 }, { price: 7.77, quantity: 2 }], discountPct: 7, applyIgtf: true, shipping: 2.5 });
        expect(t.total).toBe(Math.round((t.base + t.tax + t.igtf + t.shipping) * 100) / 100);
    });
});

describe('computeBsBreakdown', () => {
    it('el total en Bs. es exactamente la suma de sus conceptos', () => {
        const b = computeBsBreakdown({ subtotal: 30.15, discount: 1.1, tax: 4.83, igtf: 1.05, shipping: 3, rate: 879.12 });
        expect(b.totalBs).toBe(Math.round((b.subtotalBs - b.discountBs + b.taxBs + b.igtfBs + b.shippingBs) * 100) / 100);
    });
});
