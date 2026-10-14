import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';
import { getColorHex } from '../utils/shoeSizes';
import { productService } from '../services/productService';
import { Layers, ShieldCheck, CheckCircle2, XCircle, SlidersHorizontal, AlertTriangle, EyeOff, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VariantAvailabilityModal({ isOpen, onClose, product, onSaved }) {
    if (!product) return null;

    const availableColors = Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors
        : (product.color ? [product.color] : ['Original']);

    const [selectedColor, setSelectedColor] = useState(availableColors[0] || 'Original');
    const [globalDisabled, setGlobalDisabled] = useState(Boolean(product.disabled));
    const [disabledVariants, setDisabledVariants] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (product) {
            setGlobalDisabled(Boolean(product.disabled));
            setSelectedColor(availableColors[0] || 'Original');
            setDisabledVariants(product.disabledVariants ? { ...product.disabledVariants } : {});
        }
    }, [product]);

    // Obtener desglose de stock para el color actual
    const currentVariantStock = productService.getColorSizeStock(product, selectedColor) || product.sizeStock || {};
    const sizes = Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes
        : Object.keys(currentVariantStock);

    const isSizeDisabled = (color, size) => {
        if (globalDisabled) return true;
        const key = `${color}_${size}`;
        return Boolean(disabledVariants[key]);
    };

    const toggleSize = (color, size) => {
        const key = `${color}_${size}`;
        const updated = { ...disabledVariants };
        if (updated[key]) {
            delete updated[key];
        } else {
            updated[key] = true;
        }
        setDisabledVariants(updated);
    };

    const handleDisableAllForColor = (color) => {
        const updated = { ...disabledVariants };
        sizes.forEach(s => {
            updated[`${color}_${s}`] = true;
        });
        setDisabledVariants(updated);
    };

    const handleEnableAllForColor = (color) => {
        const updated = { ...disabledVariants };
        sizes.forEach(s => {
            delete updated[`${color}_${s}`];
        });
        setDisabledVariants(updated);
    };

    const handleDisableZeroStockForColor = (color) => {
        const updated = { ...disabledVariants };
        sizes.forEach(s => {
            const count = currentVariantStock[s] ?? 0;
            if (count <= 0) {
                updated[`${color}_${s}`] = true;
            }
        });
        setDisabledVariants(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await productService.updateVariantAvailability(product.id, {
                disabled: globalDisabled,
                disabledVariants
            });
            toast.success('Disponibilidad de variantes actualizada exitosamente');
            if (onSaved) onSaved();
            onClose();
        } catch (err) {
            console.error('Error guardando disponibilidad:', err);
            toast.error(err.message || 'Error al actualizar disponibilidad');
        } finally {
            setSaving(false);
        }
    };

    const totalDisabledCount = Object.keys(disabledVariants).length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Gestión de Disponibilidad & Agotamiento por Talla/Color"
            size="lg"
        >
            <div className="space-y-5">
                {/* Product Header Summary */}
                <div className="flex items-center gap-4 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80">
                    <div className="w-14 h-14 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        {product.imageUrl || product.image ? (
                            <img src={product.imageUrl || product.image} alt={product.name} className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-2xl">👟</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">{product.brand}</span>
                            <span className="text-xs text-gray-400">• SKU: {product.sku}</span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{product.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Stock Físico en Almacén: <strong className="text-gray-900 dark:text-white">{product.stock} pares</strong>
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        {globalDisabled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <EyeOff className="w-3.5 h-3.5" />
                                Producto Deshabilitado
                            </span>
                        ) : totalDisabledCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                {totalDisabledCount} variante(s) pausada(s)
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                100% Disponible
                            </span>
                        )}
                    </div>
                </div>

                {/* Fiscal / Accounting Integrity Banner */}
                <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                        <p className="font-semibold">Integridad Contable VEN-NIIF & Trazabilidad SENIAT:</p>
                        <p className="text-[11px] text-blue-700 dark:text-blue-300">
                            Pausar o deshabilitar un calzado no borra ni deja en cero su contador físico de inventario. Las existencias permanecen registradas en el almacén y en los libros de kardex para auditoría fiscal.
                        </p>
                    </div>
                </div>

                {/* Master Switch: Estado General del Producto */}
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Estado Comercial del Producto (Global)</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Si se deshabilita, el producto se oculta por completo de la venta en POS y Ecommerce sin modificar su conteo de stock.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setGlobalDisabled(!globalDisabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            !globalDisabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                !globalDisabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                {/* Subpantalla de Variantes por Color y Talla */}
                {!globalDisabled ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-blue-600" />
                                <span>Filtrado por Color y Tallas Individuales</span>
                            </label>
                            <span className="text-[11px] text-gray-400">Selecciona el color para configurar sus tallas</span>
                        </div>

                        {/* Color Selector Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                            {availableColors.map((col) => {
                                const isCurrent = (selectedColor || '').toLowerCase() === col.toLowerCase();
                                const hex = getColorHex(col);
                                const vStock = productService.getColorSizeStock(product, col) || {};
                                const vTotal = Object.values(vStock).reduce((a, b) => a + (parseInt(b) || 0), 0);

                                return (
                                    <button
                                        key={col}
                                        type="button"
                                        onClick={() => setSelectedColor(col)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border ${
                                            isCurrent
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/30'
                                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full border border-white/60 shrink-0" style={{ background: hex }} />
                                        <span>{col}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isCurrent ? 'bg-blue-700 text-blue-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                            {vTotal} pares
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quick actions for current color */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">
                                Tallas para color <strong>{selectedColor}</strong>:
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleEnableAllForColor(selectedColor)}
                                    className="px-2 py-0.5 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold"
                                >
                                    Habilitar todas
                                </button>
                                <span className="text-gray-300">•</span>
                                <button
                                    type="button"
                                    onClick={() => handleDisableZeroStockForColor(selectedColor)}
                                    className="px-2 py-0.5 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold"
                                >
                                    Pausar sin stock (0)
                                </button>
                                <span className="text-gray-300">•</span>
                                <button
                                    type="button"
                                    onClick={() => handleDisableAllForColor(selectedColor)}
                                    className="px-2 py-0.5 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold"
                                >
                                    Pausar todas
                                </button>
                            </div>
                        </div>

                        {/* Sizes Grid for Selected Color */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1">
                            {sizes.map((s) => {
                                const stockCount = currentVariantStock[s] ?? (product.sizeStock ? product.sizeStock[s] ?? 0 : 0);
                                const isDis = isSizeDisabled(selectedColor, s);

                                return (
                                    <div
                                        key={s}
                                        onClick={() => toggleSize(selectedColor, s)}
                                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all select-none ${
                                            isDis
                                                ? 'bg-gray-50 dark:bg-gray-900 border-dashed border-gray-300 dark:border-gray-700 opacity-60'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 shadow-xs'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">Talla {s}</span>
                                            {isDis ? (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                                                    Pausada
                                                </span>
                                            ) : stockCount > 0 ? (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                                                    Activa
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                                    Sin Stock
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                            Stock real: <strong>{stockCount} pares</strong>
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-500 text-xs space-y-1">
                        <EyeOff className="w-8 h-8 mx-auto text-gray-400" />
                        <p className="font-semibold text-gray-700 dark:text-gray-300">El producto se encuentra deshabilitado de forma global</p>
                        <p className="text-gray-400">Ninguna talla ni color estará disponible para la venta en el Punto de Venta ni en Ecommerce.</p>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar Disponibilidad'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
