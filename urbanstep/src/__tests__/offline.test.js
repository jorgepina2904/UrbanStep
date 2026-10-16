import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase simulado en memoria con corte de red y esquema sin la columna de costo histórico
const state = vi.hoisted(() => ({ tables: {}, netDown: false, hasCostColumn: true }));

vi.mock('../services/supabaseClient', () => {
    const fake = {
        from: (t) => {
            const q = { f: null, head: false };
            q.select = (_c, o) => { q.head = o?.head; return q; };
            q.eq = (c, v) => { q.f = [c, v]; return q; };
            q.maybeSingle = async () => ({ data: null });
            q.insert = async (rows) => {
                if (state.netDown) return { error: new TypeError('Failed to fetch') };
                const list = [].concat(rows);
                if (t === 'detalles_venta' && !state.hasCostColumn && list.some(r => 'costo_unitario_usd' in r)) {
                    return { error: { message: 'Could not find the \'costo_unitario_usd\' column of \'detalles_venta\' in the schema cache' } };
                }
                (state.tables[t] ||= []).push(...list);
                return { error: null };
            };
            q.then = (resolve) => {
                if (state.netDown) return resolve({ count: null, error: new TypeError('Failed to fetch') });
                const rows = state.tables[t] || [];
                return resolve({ count: rows.filter(r => !q.f || r[q.f[0]] === q.f[1]).length, error: null });
            };
            return q;
        }
    };
    return { supabase: fake, isSupabaseConfigured: () => true, testSupabaseConnection: async () => ({ ok: true }) };
});

const sync = await import('../services/offlineSync');
const { offlineStore } = await import('../services/offlineStore');

const sale = () => ({
    id: 'VEN-1', receiptNumber: 'TKT-OFF-CAJA-1-2026-0001', customerId: 'publico', customer: 'X', cashier: 'c', bcvRate: 42.5,
    subtotal: 10, discount: 0, tax: 1.6, igtf: 0, shippingCost: 0, total: 11.6, subtotalBs: 425, taxBs: 68, igtfBs: 0, totalBs: 493,
    paymentMethod: 'efectivo_usd', paymentMethodLabel: 'Efectivo', date: new Date().toISOString(),
    items: [{ id: 'P1', name: 'Shoe', quantity: 2, price: 5, size: 41, color: 'Negro', costUnitUsd: 3 }]
});

describe('cola offline de ventas', () => {
    beforeEach(async () => {
        state.tables = {};
        state.netDown = false;
        state.hasCostColumn = true;
        for (const e of await offlineStore.queueAll()) await offlineStore.queueRemove(e.id);
    });

    it('conserva la venta mientras no hay red y la sube una sola vez al volver', async () => {
        await sync.enqueueSale(sale());
        state.netDown = true;
        expect(await sync.syncPendingSales()).toEqual({ synced: 0, failed: 0 });
        expect(await sync.getPendingCount()).toBe(1);

        state.netDown = false;
        expect(await sync.syncPendingSales()).toEqual({ synced: 1, failed: 0 });
        expect(await sync.getPendingCount()).toBe(0);
        expect(state.tables.ventas).toHaveLength(1);
        expect(state.tables.detalles_venta).toHaveLength(1);
        expect(state.tables.pagos_venta).toHaveLength(1);
    });

    it('es idempotente: reintentar la misma venta no duplica registros', async () => {
        await sync.enqueueSale(sale());
        await sync.syncPendingSales();
        await sync.enqueueSale(sale());
        await sync.syncPendingSales();
        expect(state.tables.ventas).toHaveLength(1);
        expect(state.tables.detalles_venta).toHaveLength(1);
        expect(state.tables.pagos_venta).toHaveLength(1);
    });

    it('guarda el costo histórico y, si la columna aún no existe, reintenta sin ella', async () => {
        await sync.pushSaleRecords(sale());
        expect(state.tables.detalles_venta[0].costo_unitario_usd).toBe(3);

        state.tables = {};
        state.hasCostColumn = false;
        const res = await sync.pushSaleRecords(sale());
        expect(res.ok).toBe(true);
        expect(state.tables.detalles_venta[0]).not.toHaveProperty('costo_unitario_usd');
    });
});
