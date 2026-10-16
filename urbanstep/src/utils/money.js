/**
 * Utilidades monetarias bimonetarias (USD de referencia / VES a tasa BCV).
 * Redondeo comercial a 2 decimales, tolerante a errores de coma flotante.
 */
export const round2 = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    // Redondeo aritmético simétrico (mitad hacia afuera del cero): -1.005 -> -1.01 igual que 1.005 -> 1.01
    const abs = Math.round((Math.abs(v) + Number.EPSILON) * 100) / 100;
    return v < 0 ? -abs : abs;
};

/**
 * Resuelve la tasa BCV aplicable a una venta: la tasa congelada al emitir el documento;
 * si no existe, la implícita (totalBs / total); y solo en último caso la tasa vigente.
 */
export const resolveSaleRate = (sale, fallbackRate = 0) => {
    const stored = Number(sale?.bcvRate);
    if (stored > 0) return stored;
    const total = Number(sale?.total);
    const totalBs = Number(sale?.totalBs);
    if (total > 0 && totalBs > 0) return totalBs / total;
    return Number(fallbackRate) || 0;
};

/** Convierte USD a Bs. con la tasa BCV indicada, redondeado a 2 decimales. */
export const usdToVes = (usd, rate) => round2((Number(usd) || 0) * (Number(rate) || 0));

/**
 * Totales de un documento con criterio fiscal unificado (decisión SGF): redondeo a 2 decimales POR RENGLÓN
 * (monto bruto, descuento e IVA de cada línea) y suma directa de los renglones ya redondeados.
 * Así el ticket, la factura, el asiento contable y el Libro de Ventas coinciden al céntimo.
 *
 * @param {{items:Array<{price:number,quantity:number}>, discountPct?:number, taxRate?:number, igtfRate?:number, applyIgtf?:boolean, shipping?:number}} input
 */
export const computeInvoiceTotals = ({ items = [], discountPct = 0, taxRate = 0.16, igtfRate = 0.03, applyIgtf = false, shipping = 0 }) => {
    const pct = Math.min(100, Math.max(0, Number(discountPct) || 0));
    const lines = items.map((i) => {
        const gross = round2((Number(i.price) || 0) * (Number(i.quantity) || 0));
        const discount = round2(gross * pct / 100);
        const base = round2(gross - discount);
        const tax = round2(base * (Number(taxRate) || 0));
        return { gross, discount, base, tax };
    });
    const sum = (key) => round2(lines.reduce((acc, l) => acc + l[key], 0));
    const subtotal = sum('gross');
    const discount = sum('discount');
    const base = sum('base');
    const tax = sum('tax');
    const igtf = applyIgtf ? round2((base + tax) * (Number(igtfRate) || 0)) : 0;
    const shippingUsd = round2(shipping);
    return { lines, subtotal, discount, base, tax, igtf, shipping: shippingUsd, total: round2(base + tax + igtf + shippingUsd) };
};

/**
 * Equivalente en Bs. de un documento: cada concepto se redondea por separado a la tasa del documento y el total en
 * Bs. es la suma de esos conceptos, de modo que el desglose en bolívares siempre cuadra consigo mismo.
 */
export const computeBsBreakdown = ({ subtotal = 0, discount = 0, tax = 0, igtf = 0, shipping = 0, rate = 0 }) => {
    const r = Number(rate) || 0;
    const subtotalBs = usdToVes(subtotal, r);
    const discountBs = usdToVes(discount, r);
    const taxBs = usdToVes(tax, r);
    const igtfBs = usdToVes(igtf, r);
    const shippingBs = usdToVes(shipping, r);
    return { subtotalBs, discountBs, taxBs, igtfBs, shippingBs, totalBs: round2(subtotalBs - discountBs + taxBs + igtfBs + shippingBs) };
};
