import React, { useMemo, useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { productService } from '../services/productService';
import { encodeVariantBarcode } from '../utils/barcodeLabel';
import { formatCurrency } from '../utils/formatCurrency';

const SIZES = {
    '50x30': { w: 50, h: 30, label: '50 × 30 mm' },
    '40x25': { w: 40, h: 25, label: '40 × 25 mm' },
    '58x40': { w: 58, h: 40, label: '58 × 40 mm' }
};

function Barcode({ value }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current) return;
        try {
            JsBarcode(ref.current, value, { format: 'CODE128', displayValue: false, margin: 0, height: 40, width: 1.6 });
        } catch (e) {
            console.warn('Código de barras inválido:', value, e);
        }
    }, [value]);
    return <svg ref={ref} className="w-full h-auto max-h-[12mm]" role="img" aria-label={`Código ${value}`} />;
}

const selectClass = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm py-2.5 px-3';

/** Genera una etiqueta por cada par (talla × color) con stock, repetida según existencias. */
export default function LabelPrintModal({ isOpen, onClose, product }) {
    const [sizeKey, setSizeKey] = useState('50x30');
    const [copiesMode, setCopiesMode] = useState('stock'); // 'stock' | 'one'

    const variants = useMemo(() => {
        if (!product) return [];
        const colors = (Array.isArray(product.colorVariants) && product.colorVariants.length > 0)
            ? product.colorVariants.map(v => v.color)
            : [product.color || 'Único'];
        const rows = [];
        colors.forEach((color) => {
            const stockMap = productService.getColorSizeStock(product, color) || product.sizeStock || {};
            Object.keys(stockMap).forEach((size) => {
                const qty = Math.max(0, parseInt(stockMap[size]) || 0);
                if (qty > 0) rows.push({ color, size, qty });
            });
        });
        return rows;
    }, [product]);

    const labels = useMemo(() => variants.flatMap(v => {
        const copies = copiesMode === 'stock' ? v.qty : 1;
        return Array.from({ length: copies }, (_, i) => ({ ...v, key: `${v.color}-${v.size}-${i}` }));
    }), [variants, copiesMode]);

    if (!product) return null;
    const dim = SIZES[sizeKey];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`🏷️ Etiquetas: ${product.name}`} size="lg">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="label-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tamaño de etiqueta</label>
                        <select id="label-size" value={sizeKey} onChange={(e) => setSizeKey(e.target.value)} className={selectClass}>
                            {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="label-copies" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cantidad</label>
                        <select id="label-copies" value={copiesMode} onChange={(e) => setCopiesMode(e.target.value)} className={selectClass}>
                            <option value="stock">Una por cada par en existencia</option>
                            <option value="one">Una por variante (talla y color)</option>
                        </select>
                    </div>
                </div>

                {labels.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">Este modelo no tiene variantes con existencia para etiquetar.</p>
                ) : (
                    <>
                        <p className="text-xs text-gray-500">{labels.length} etiqueta(s) · {variants.length} variante(s)</p>
                        <div id="printable-labels" className="flex flex-wrap gap-2 max-h-[45vh] overflow-y-auto">
                            {labels.map((l) => (
                                <div
                                    key={l.key}
                                    className="label-item bg-white text-black border border-gray-300 rounded p-1.5 flex flex-col justify-between"
                                    style={{ width: `${dim.w}mm`, height: `${dim.h}mm` }}
                                >
                                    <p className="text-[9px] font-bold leading-tight truncate">{product.name}</p>
                                    <p className="text-[8px] leading-tight truncate">{l.color} · Talla {l.size}</p>
                                    <Barcode value={encodeVariantBarcode(product.sku, l.size, l.color)} />
                                    <div className="flex justify-between items-end text-[8px] leading-none">
                                        <span className="font-mono truncate">{product.sku}</span>
                                        <span className="text-[11px] font-black">{formatCurrency(product.price)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <style>{`@media print { @page { size: ${dim.w}mm ${dim.h}mm; margin: 0; } }`}</style>
                    </>
                )}

                <div className="flex gap-2 pt-1">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>Cerrar</Button>
                    <Button className="flex-1" disabled={labels.length === 0} onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimir etiquetas
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
