/**
 * Utilidades monetarias bimonetarias (USD de referencia / VES a tasa BCV).
 * Redondeo comercial a 2 decimales, tolerante a errores de coma flotante.
 */
export const round2 = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.round((v + Number.EPSILON) * 100) / 100;
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
