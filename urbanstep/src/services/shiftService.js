/**
 * shiftService.js — Gestión de Turnos y Arqueo de Caja (Apertura y Cierre)
 */
import { generateId } from '../utils/generateId';
import { db, simulateNetworkDelay } from './api';

const SHIFTS_KEY = 'urbanstep_shifts';
const ACTIVE_SHIFT_KEY = 'urbanstep_active_shift';
const LAST_SALE_KEY = 'urbanstep_last_sale';

export const shiftService = {
    /**
     * Obtiene el turno activo si existe
     */
    getCurrentShift: () => {
        try {
            const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Error leyendo turno activo:', e);
            return null;
        }
    },

    /**
     * Abre un nuevo turno de caja con fondo inicial
     */
    openShift: async ({ cashierId, cashierName, cajaId, cajaName, cajaLocation, initialCashUsd = 0, initialCashBs = 0, notes = '' }) => {
        await simulateNetworkDelay(150);

        const newShift = {
            id: generateId('SHF'),
            cashierId: cashierId || 'u2',
            cashierName: cashierName || 'Cajero',
            cajaId: cajaId || 'caja-1',
            cajaName: cajaName || 'Caja 1',
            cajaLocation: cajaLocation || 'Sede Principal',
            status: 'open',
            openedAt: new Date().toISOString(),
            closedAt: null,
            initialCashUsd: Number(initialCashUsd) || 0,
            initialCashBs: Number(initialCashBs) || 0,
            notes,
        };

        localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(newShift));
        window.dispatchEvent(new CustomEvent('shift_status_changed', { detail: newShift }));

        return newShift;
    },

    /**
     * Calcula las ventas y totales del turno actual
     */
    getShiftSummary: async (shiftId) => {
        await simulateNetworkDelay(100);
        const shift = shiftService.getCurrentShift();
        if (!shift) return null;

        const shiftStartTime = new Date(shift.openedAt).getTime();
        
        // Ventas registradas desde la apertura del turno para esta caja
        const shiftSales = db.sales.filter(s => {
            const saleTime = new Date(s.date).getTime();
            const matchesTime = saleTime >= shiftStartTime;
            const matchesCaja = !s.cajaId || s.cajaId === shift.cajaId;
            return matchesTime && matchesCaja;
        });

        // Totales por forma de pago
        let salesCashUsd = 0;
        let salesCashBs = 0;
        let salesPagomovilBs = 0;
        let salesPuntoBs = 0;
        let salesZelleUsd = 0;
        let totalSalesUsd = 0;
        let totalSalesBs = 0;

        for (const s of shiftSales) {
            totalSalesUsd += Number(s.total) || 0;
            totalSalesBs += Number(s.totalBs) || 0;

            if (s.paymentMethod === 'efectivo_usd') {
                salesCashUsd += Number(s.total) || 0;
            } else if (s.paymentMethod === 'efectivo_bs') {
                salesCashBs += Number(s.totalBs) || 0;
            } else if (s.paymentMethod === 'pagomovil') {
                salesPagomovilBs += Number(s.totalBs) || 0;
            } else if (s.paymentMethod === 'punto_venta' || s.paymentMethod === 'card') {
                salesPuntoBs += Number(s.totalBs) || 0;
            } else if (s.paymentMethod === 'zelle') {
                salesZelleUsd += Number(s.total) || 0;
            } else {
                // Pagos mixtos u otros
                salesPagomovilBs += Number(s.totalBs) || 0;
            }
        }

        // Efectivo esperado en gaveta (Fondo base + Ventas en efectivo)
        const expectedCashUsd = shift.initialCashUsd + salesCashUsd;
        const expectedCashBs = shift.initialCashBs + salesCashBs;

        return {
            shift,
            salesCount: shiftSales.length,
            sales: shiftSales,
            salesCashUsd,
            salesCashBs,
            salesPagomovilBs,
            salesPuntoBs,
            salesZelleUsd,
            totalSalesUsd,
            totalSalesBs,
            expectedCashUsd,
            expectedCashBs,
        };
    },

    /**
     * Cierra el turno de caja (Arqueo / Corte Z)
     */
    closeShift: async ({ countedCashUsd, countedCashBs, notes = '' }) => {
        await simulateNetworkDelay(200);
        const shift = shiftService.getCurrentShift();
        if (!shift) throw new Error('No hay un turno de caja abierto actualmente');

        const summary = await shiftService.getShiftSummary(shift.id);

        const countedUsd = Number(countedCashUsd) || 0;
        const countedBs = Number(countedCashBs) || 0;

        const diffUsd = countedUsd - summary.expectedCashUsd;
        const diffBs = countedBs - summary.expectedCashBs;

        const closedShift = {
            ...shift,
            status: 'closed',
            closedAt: new Date().toISOString(),
            salesCount: summary.salesCount,
            totalSalesUsd: summary.totalSalesUsd,
            totalSalesBs: summary.totalSalesBs,
            salesCashUsd: summary.salesCashUsd,
            salesCashBs: summary.salesCashBs,
            salesPagomovilBs: summary.salesPagomovilBs,
            salesPuntoBs: summary.salesPuntoBs,
            salesZelleUsd: summary.salesZelleUsd,
            expectedCashUsd: summary.expectedCashUsd,
            expectedCashBs: summary.expectedCashBs,
            countedCashUsd: countedUsd,
            countedCashBs: countedBs,
            differenceUsd: diffUsd,
            differenceBs: diffBs,
            closingNotes: notes,
        };

        // Guardar en histórico de turnos
        try {
            const rawHistory = localStorage.getItem(SHIFTS_KEY);
            const history = rawHistory ? JSON.parse(rawHistory) : [];
            history.unshift(closedShift);
            localStorage.setItem(SHIFTS_KEY, JSON.stringify(history.slice(0, 50)));
        } catch (e) {
            console.error('Error guardando histórico de turnos:', e);
        }

        // Limpiar turno activo
        localStorage.removeItem(ACTIVE_SHIFT_KEY);
        window.dispatchEvent(new CustomEvent('shift_status_changed', { detail: null }));

        return closedShift;
    },

    /**
     * Guarda la última venta para reimpresión rápida
     */
    saveLastSale: (sale) => {
        try {
            localStorage.setItem(LAST_SALE_KEY, JSON.stringify(sale));
        } catch (e) {
            console.error(e);
        }
    },

    /**
     * Obtiene la última venta realizada
     */
    getLastSale: () => {
        try {
            const raw = localStorage.getItem(LAST_SALE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error(e);
        }
        return db.sales.length > 0 ? db.sales[0] : null;
    }
};

export default shiftService;
