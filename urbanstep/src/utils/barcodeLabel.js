/**
 * Código de barras de variante de calzado (Code128): SKU|TALLA|COLOR
 * Un mismo código identifica modelo, talla y color para que el escáner de caja
 * agregue la variante exacta al carrito.
 */
const SEP = '|';

export const encodeVariantBarcode = (sku, size, color) =>
    [sku, size, color].map(v => String(v ?? '').trim().replace(/\|/g, '-')).join(SEP);

/** Devuelve { sku, size, color } o null si el texto no es un código de variante válido. */
export const decodeVariantBarcode = (raw) => {
    const parts = String(raw ?? '').trim().split(SEP);
    if (!parts[0]) return null;
    return { sku: parts[0], size: parts[1] || null, color: parts[2] || null };
};
