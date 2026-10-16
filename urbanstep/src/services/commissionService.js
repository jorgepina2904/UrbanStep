/**
 * commissionService.js — Comisiones por vendedor (cajero/asesor).
 * Base de cálculo configurable: 'ventas' (subtotal sin IVA) o 'margen' (subtotal - costo de ventas).
 * Las notas de crédito restan la base de la factura afectada, por lo que una devolución
 * reduce la comisión del vendedor que la originó.
 * La configuración vive en localStorage de este equipo (no requiere cambios de esquema).
 */
import { round2 } from '../utils/money';
import { buildCostIndex, saleCostUsd } from '../utils/costing';

const CONFIG_KEY = 'urbanstep_commission_config';

export const DEFAULT_COMMISSION_CONFIG = {
    ratePct: 2,          // % por defecto para todo vendedor
    base: 'ventas',      // 'ventas' | 'margen'
    overrides: {}        // { 'Nombre Vendedor': ratePct }
};

export const getCommissionConfig = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
        if (stored) return { ...DEFAULT_COMMISSION_CONFIG, ...stored, overrides: { ...(stored.overrides || {}) } };
    } catch { /* sin almacenamiento disponible */ }
    return { ...DEFAULT_COMMISSION_CONFIG };
};

export const saveCommissionConfig = (config) => {
    const clean = {
        ratePct: Math.min(100, Math.max(0, Number(config.ratePct) || 0)),
        base: config.base === 'margen' ? 'margen' : 'ventas',
        overrides: Object.fromEntries(
            Object.entries(config.overrides || {})
                .map(([k, v]) => [k, Math.min(100, Math.max(0, Number(v) || 0))])
                .filter(([k]) => k)
        )
    };
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(clean)); } catch { /* sin almacenamiento disponible */ }
    return clean;
};

/** Quincena fiscal: 1-15 y 16-fin de mes. offset=0 actual, -1 anterior. Devuelve ISO from/to. */
export const getQuincenaRange = (offset = 0, ref = new Date()) => {
    let year = ref.getFullYear();
    let month = ref.getMonth();
    let second = ref.getDate() > 15;
    for (let i = 0; i < Math.abs(offset); i++) {
        if (offset < 0) {
            if (second) second = false;
            else { second = true; month -= 1; if (month < 0) { month = 11; year -= 1; } }
        }
    }
    const lastDay = new Date(year, month + 1, 0).getDate();
    const from = new Date(year, month, second ? 16 : 1, 0, 0, 0, 0);
    const to = new Date(year, month, second ? lastDay : 15, 23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString(), label: `${second ? '16' : '01'}–${second ? lastDay : '15'}/${String(month + 1).padStart(2, '0')}/${year}` };
};

/**
 * @param {{sales:Array, creditNotes:Array, products:Array, from?:string, to?:string, config?:object}} input
 */
export const computeCommissions = ({ sales = [], creditNotes = [], products = [], config = getCommissionConfig() }) => {
    const index = buildCostIndex(products);
    const byReceipt = new Map(sales.map(s => [s.receiptNumber, s]));
    const rows = new Map();

    const rowFor = (name) => {
        if (!rows.has(name)) {
            const ratePct = config.overrides?.[name] ?? config.ratePct;
            rows.set(name, { seller: name, ratePct, salesCount: 0, creditNotesCount: 0, salesBaseUsd: 0, returnsBaseUsd: 0, estimatedCostLines: 0 });
        }
        return rows.get(name);
    };

    sales.forEach((s) => {
        if (s.status === 'anulada_por_nc') return; // anulada por NC factura fallida: no genera comisión
        const row = rowFor(s.cashier || 'Cajero');
        const subtotal = Number(s.subtotal) || 0;
        let base = subtotal;
        if (config.base === 'margen') {
            const cost = saleCostUsd(s, index);
            base = subtotal - (cost.complete ? cost.costUsd : subtotal * 0.55);
            if (!cost.complete) row.estimatedCostLines += 1;
        }
        row.salesCount += 1;
        row.salesBaseUsd += base;
    });

    creditNotes.forEach((nc) => {
        const original = byReceipt.get(nc.affectedInvoiceNumber);
        if (!original) return; // sin factura localizable en el periodo: no se compensa
        const row = rowFor(original.cashier || 'Cajero');
        row.creditNotesCount += 1;
        let base = Number(nc.subtotalUsd) || 0;
        if (config.base === 'margen') {
            const subtotalOriginal = Number(original.subtotal) || 0;
            const cost = saleCostUsd(original, index);
            const ratio = subtotalOriginal > 0 ? base / subtotalOriginal : 0;
            base = base - (cost.complete ? cost.costUsd : subtotalOriginal * 0.55) * ratio;
        }
        row.returnsBaseUsd += base;
    });

    const list = [...rows.values()].map((r) => {
        const netBase = r.salesBaseUsd - r.returnsBaseUsd;
        return {
            ...r,
            salesBaseUsd: round2(r.salesBaseUsd),
            returnsBaseUsd: round2(r.returnsBaseUsd),
            netBaseUsd: round2(netBase),
            commissionUsd: round2(Math.max(0, netBase) * (r.ratePct / 100))
        };
    }).sort((a, b) => b.commissionUsd - a.commissionUsd);

    return {
        base: config.base,
        ratePct: config.ratePct,
        totalCommissionUsd: round2(list.reduce((acc, r) => acc + r.commissionUsd, 0)),
        rows: list
    };
};
