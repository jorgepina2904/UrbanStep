import React, { useState, useEffect } from 'react';
import { bcvService } from '../services/bcvService';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Badge from './Badge';
import { saleService } from '../services/saleServices';
import { returnService, RETURN_REASONS } from '../services/returnService';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    RotateCcw, 
    FileText, 
    AlertTriangle, 
    CheckCircle2, 
    Search, 
    DollarSign, 
    Printer, 
    ShieldCheck, 
    Tag, 
    PackageX, 
    XCircle,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReturnModal({ isOpen, onClose, onReturnCompleted, initialSale = null }) {
    const { formatUSD, formatBs, rate } = useCurrency();
    const { user } = useAuth();

    const [sales, setSales] = useState([]);
    const [selectedSale, setSelectedSale] = useState(initialSale);
    const [searchInvoice, setSearchInvoice] = useState('');
    const [selectedItems, setSelectedItems] = useState({});
    const [reason, setReason] = useState('mal_facturado');
    const [notes, setNotes] = useState('');
    const [refundMethod, setRefundMethod] = useState('efectivo_usd');
    const [authorizedBy, setAuthorizedBy] = useState(user?.name || 'Supervisor de Caja');
    const [processing, setProcessing] = useState(false);
    const [issuedNote, setIssuedNote] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadSales();
            setIssuedNote(null);
            if (initialSale) {
                selectSale(initialSale);
            }
        }
    }, [isOpen, initialSale]);

    const loadSales = async () => {
        try {
            const all = await saleService.getAll();
            setSales(all.slice(0, 50));
        } catch (err) {
            console.error('Error cargando ventas:', err);
        }
    };

    const selectSale = (sale) => {
        setSelectedSale(sale);
        // Pre-seleccionar todos los items por defecto
        const itemsToUse = (Array.isArray(sale.items) && sale.items.length > 0)
            ? sale.items
            : [{
                productId: 'prod-fallback',
                name: 'Calzado Deportivo',
                size: '41',
                color: 'Estándar',
                price: Number(sale.total) || 100,
                quantity: 1
            }];

        const initialSelected = {};
        itemsToUse.forEach((item, idx) => {
            initialSelected[idx] = {
                ...item,
                returnQty: item.quantity || 1,
                selected: true
            };
        });
        setSelectedItems(initialSelected);
    };

    const toggleItemSelection = (idx) => {
        setSelectedItems(prev => ({
            ...prev,
            [idx]: {
                ...prev[idx],
                selected: !prev[idx]?.selected
            }
        }));
    };

    const updateItemQty = (idx, qty) => {
        const max = selectedSale?.items?.[idx]?.quantity || 1;
        const safe = Math.max(1, Math.min(max, parseInt(qty) || 1));
        setSelectedItems(prev => ({
            ...prev,
            [idx]: {
                ...prev[idx],
                returnQty: safe
            }
        }));
    };

    // Calcular montos de devolución
    const activeReturnItems = Object.values(selectedItems).filter(i => i.selected);
    const subtotalReturnUsd = activeReturnItems.reduce((acc, i) => acc + (Number(i.price) || 0) * (i.returnQty || 1), 0);
    const taxReturnUsd = Math.round(subtotalReturnUsd * 0.16 * 100) / 100;
    const totalReturnUsd = Math.round((subtotalReturnUsd + taxReturnUsd) * 100) / 100;

    const currentRate = selectedSale?.bcvRate || rate || bcvService.getRate().rate;
    const totalReturnBs = Math.round(totalReturnUsd * currentRate * 100) / 100;

    const handleProcessReturn = async (e) => {
        if (e) e.preventDefault();

        if (!selectedSale) {
            toast.error('Debe seleccionar una factura o ticket de venta');
            return;
        }

        if (activeReturnItems.length === 0) {
            toast.error('Debe seleccionar al menos un producto a devolver');
            return;
        }

        setProcessing(true);
        try {
            const refundMethodLabels = {
                efectivo_usd: 'Efectivo Divisas ($)',
                efectivo_bs: 'Efectivo Bolívares (Bs)',
                pagomovil: 'Pago Móvil Bancario',
                saldo_favor: 'Saldo a Favor / Nota de Crédito'
            };

            const note = await returnService.createReturn({
                saleId: selectedSale.id,
                affectedInvoiceNumber: selectedSale.receiptNumber || `TKT-${selectedSale.id}`,
                customer: selectedSale.customer,
                customerDoc: selectedSale.customerDoc,
                customerPhone: selectedSale.customerPhone,
                items: activeReturnItems.map(i => ({
                    productId: i.productId || i.id,
                    name: i.name,
                    size: i.size || i.talla,
                    color: i.color,
                    quantity: i.returnQty,
                    price: i.price,
                    total: i.price * i.returnQty
                })),
                reason,
                notes: notes.trim(),
                refundMethod,
                refundMethodLabel: refundMethodLabels[refundMethod] || 'Efectivo',
                authorizedBy: authorizedBy.trim() || 'Supervisor de Caja',
                cashier: user?.name || selectedSale.cashier || 'Cajero'
            });

            setIssuedNote(note);
            toast.success(`Nota de Crédito ${note.creditNoteNumber} emitida con éxito`);
            if (onReturnCompleted) onReturnCompleted(note);
        } catch (err) {
            console.error('Error procesando devolución:', err);
            toast.error(err.message || 'Error al procesar la devolución');
        } finally {
            setProcessing(false);
        }
    };

    const filteredSales = sales.filter(s => {
        if (!searchInvoice) return true;
        const q = searchInvoice.toLowerCase();
        return (s.receiptNumber && s.receiptNumber.toLowerCase().includes(q)) ||
               (s.customer && s.customer.toLowerCase().includes(q)) ||
               (s.customerDoc && s.customerDoc.toLowerCase().includes(q));
    });

    const handlePrintTicket = () => {
        window.print();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={issuedNote ? `Nota de Crédito Fiscal: ${issuedNote.creditNoteNumber}` : "↩️ Gestión de Devolución & Nota de Crédito SENIAT"}
            size={issuedNote ? "sm" : "lg"}
        >
            {issuedNote ? (
                /* Ticket Fiscal Formal de Nota de Crédito */
                <div className="space-y-4">
                    <div id="credit-note-print-area" className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-mono text-xs space-y-3 shadow-inner">
                        <div className="text-center pb-2 border-b border-dashed border-gray-300 dark:border-gray-700 space-y-0.5">
                            <h3 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white">URBANSTEP VENEZUELA C.A.</h3>
                            <p className="text-[11px] text-gray-500">RIF: J-50123456-7 • Barquisimeto, Estado Lara</p>
                            <p className="font-bold text-rose-600 dark:text-rose-400 mt-1">NOTA DE CRÉDITO FISCAL</p>
                            <p className="text-xs font-black text-gray-900 dark:text-white">{issuedNote.creditNoteNumber}</p>
                            <p className="text-[10px] text-gray-400">N° Control: {issuedNote.fiscalControlNumber}</p>
                        </div>

                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Factura Afectada:</span>
                                <strong className="text-gray-900 dark:text-white">{issuedNote.affectedInvoiceNumber}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Fecha Emisión:</span>
                                <span>{new Date(issuedNote.date).toLocaleString('es-VE')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Cliente:</span>
                                <span>{issuedNote.customer}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">C.I. / RIF:</span>
                                <span>{issuedNote.customerDoc}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tasa Oficial BCV:</span>
                                <span>Bs. {issuedNote.bcvRate?.toFixed(2)}/USD</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                                <span className="text-gray-500">Motivo Legal SGF:</span>
                                <strong className="text-gray-900 dark:text-white text-right max-w-[180px] truncate">{issuedNote.reasonLabel}</strong>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700">
                            <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Artículos Devueltos:</p>
                            <div className="space-y-1 text-[11px]">
                                {issuedNote.items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{i.quantity}x {i.name} ({i.size ? `Talla ${i.size}` : ''}{i.color ? ` - ${i.color}` : ''})</span>
                                        <strong>${(i.price * i.quantity).toFixed(2)}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1 text-right text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Base Imponible Devuelta:</span>
                                <span>${issuedNote.subtotalUsd?.toFixed(2)} / Bs. {issuedNote.subtotalBs?.toLocaleString('es-VE')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">IVA 16% Reversado:</span>
                                <span>${issuedNote.taxUsd?.toFixed(2)} / Bs. {issuedNote.taxBs?.toLocaleString('es-VE')}</span>
                            </div>
                            <div className="flex justify-between text-xs font-black text-rose-600 dark:text-rose-400 pt-1 border-t border-gray-200 dark:border-gray-800">
                                <span>TOTAL NOTA DE CRÉDITO:</span>
                                <span>${issuedNote.totalUsd?.toFixed(2)} / Bs. {issuedNote.totalBs?.toLocaleString('es-VE')}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500 pt-1">
                                <span>Modalidad de Reembolso:</span>
                                <strong>{issuedNote.refundMethodLabel}</strong>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>Destino de Calzado:</span>
                                <strong className={issuedNote.restoredToStock ? "text-emerald-600" : "text-amber-600"}>
                                    {issuedNote.restoredToStock ? "Reingreso a Stock Vendible" : "Baja a Merma / Garantía"}
                                </strong>
                            </div>
                        </div>

                        <div className="text-center pt-2 text-[10px] text-gray-400 border-t border-dashed border-gray-200 dark:border-gray-800">
                            Autorizado por: {issuedNote.authorizedBy} • Cajero: {issuedNote.cashier}
                            <p className="mt-1">Documento Fiscal Electrónico bajo Providencia SENIAT SNAT/2011/0071</p>
                        </div>
                    </div>

                    <div className="flex justify-between gap-2 pt-2">
                        <Button variant="secondary" onClick={onClose} className="w-1/2">
                            Cerrar
                        </Button>
                        <Button variant="primary" onClick={handlePrintTicket} className="w-1/2 flex items-center justify-center gap-1.5">
                            <Printer className="w-4 h-4" />
                            Imprimir Ticket
                        </Button>
                    </div>
                </div>
            ) : (
                /* Formulario de Selección y Procesamiento de Devolución */
                <form onSubmit={handleProcessReturn} className="space-y-4">
                    {!selectedSale ? (
                        /* Paso 1: Buscar y Seleccionar Factura */
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Buscar Factura o Ticket a Devolver
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar por N° Recibo (ej: TKT-2026-1000) o Nombre de Cliente..."
                                        value={searchInvoice}
                                        onChange={(e) => setSearchInvoice(e.target.value)}
                                        className="pl-9 text-xs"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredSales.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-gray-400">
                                        No se encontraron ventas para devolver
                                    </div>
                                ) : (
                                    filteredSales.map((s) => (
                                        <div
                                            key={s.id}
                                            onClick={() => selectSale(s)}
                                            className="p-3 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer flex items-center justify-between text-xs transition-colors"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <strong className="text-gray-900 dark:text-white font-mono">{s.receiptNumber || s.id}</strong>
                                                    <span className="text-[10px] text-gray-400">{new Date(s.date).toLocaleDateString('es-VE')}</span>
                                                    {s.status === 'anulada_por_nc' && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">Anulada</span>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 mt-0.5">{s.customer} • {s.items?.length || 0} artículo(s)</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-900 dark:text-white">${s.total?.toFixed(2)}</p>
                                                <p className="text-[10px] text-gray-400">Bs. {s.totalBs?.toLocaleString('es-VE')}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Paso 2 y 3: Selección de Artículos, Motivo SGF y Reembolso */
                        <div className="space-y-4">
                            {/* Cabecera de Factura Seleccionada */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">
                                            {selectedSale.receiptNumber || selectedSale.id}
                                        </span>
                                        <span className="text-xs text-gray-400">• {selectedSale.customer}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500">
                                        Emitida el {new Date(selectedSale.date).toLocaleDateString('es-VE')} • Tasa: Bs. {currentRate}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSale(null)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Cambiar Factura
                                </button>
                            </div>

                            {/* Selección de Artículos a Devolver */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Artículos a Devolver (Marca las casillas que apliquen):
                                </label>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {((selectedSale.items && selectedSale.items.length > 0) ? selectedSale.items : [{
                                        productId: 'prod-fallback',
                                        name: 'Calzado Deportivo',
                                        size: '41',
                                        color: 'Estándar',
                                        price: Number(selectedSale.total) || 100,
                                        quantity: 1
                                    }]).map((item, idx) => {
                                        const isSel = selectedItems[idx]?.selected;
                                        const returnQty = selectedItems[idx]?.returnQty || 1;

                                        return (
                                            <div
                                                key={idx}
                                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                                                    isSel
                                                        ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700'
                                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(isSel)}
                                                        onChange={() => toggleItemSelection(idx)}
                                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                                                        <p className="text-[11px] text-gray-500">
                                                            {item.size ? `Talla: ${item.size} • ` : ''}{item.color ? `Color: ${item.color} • ` : ''}Precio: ${Number(item.price).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isSel && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <label className="text-[11px] text-gray-500">Cant:</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={item.quantity || 1}
                                                            value={returnQty}
                                                            onChange={(e) => updateItemQty(idx, e.target.value)}
                                                            className="w-14 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 font-bold text-center"
                                                        />
                                                        <span className="font-bold text-gray-900 dark:text-white ml-2">
                                                            ${((Number(item.price) || 0) * returnQty).toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Selector de Motivo SGF (Requisito Principal del Usuario) */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Motivo Legal de la Devolución (SGF / VEN-NIIF) *
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {/* 1. Mal Facturado */}
                                    <div
                                        onClick={() => setReason('mal_facturado')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                            reason === 'mal_facturado'
                                                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 text-blue-600 dark:text-blue-400">
                                            <Tag className="w-4 h-4" />
                                            <span className="font-bold text-xs">Mal Facturado</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                                            Error de precio, talla o digitación.
                                        </p>
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Reingresa a Stock Vendible
                                        </p>
                                    </div>

                                    {/* 2. Producto Dañado */}
                                    <div
                                        onClick={() => setReason('producto_danado')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                            reason === 'producto_danado'
                                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 text-amber-600 dark:text-amber-400">
                                            <PackageX className="w-4 h-4" />
                                            <span className="font-bold text-xs">Producto Dañado</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                                            Falla de fábrica o deterioro.
                                        </p>
                                        <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold mt-1.5 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Baja a Merma (No vendible)
                                        </p>
                                    </div>

                                    {/* 3. Factura Fallida */}
                                    <div
                                        onClick={() => setReason('factura_fallida')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                            reason === 'factura_fallida'
                                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 text-rose-600 dark:text-rose-400">
                                            <XCircle className="w-4 h-4" />
                                            <span className="font-bold text-xs">Factura Fallida</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                                            Transacción cancelada o duplicada.
                                        </p>
                                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Anula Venta y Restaura Stock
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modalidad de Reembolso & Autorización */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Modalidad de Reembolso
                                    </label>
                                    <select
                                        value={refundMethod}
                                        onChange={(e) => setRefundMethod(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white"
                                    >
                                        <option value="efectivo_usd">💵 Efectivo Divisas ($)</option>
                                        <option value="efectivo_bs">🇻🇪 Efectivo Bolívares (Bs)</option>
                                        <option value="pagomovil">📱 Pago Móvil Bancario</option>
                                        <option value="saldo_favor">🎟️ Saldo a Favor del Cliente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Personal que Autoriza (Supervisor/Admin)
                                    </label>
                                    <Input
                                        type="text"
                                        value={authorizedBy}
                                        onChange={(e) => setAuthorizedBy(e.target.value)}
                                        placeholder="Nombre del supervisor"
                                        className="text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Observaciones / Justificación de Auditoría
                                </label>
                                <Input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ej: Cambio por talla 42 debido a error de digitación en caja..."
                                    className="text-xs"
                                />
                            </div>

                            {/* Resumen Total de Devolución */}
                            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                                        Total a Devolver al Cliente:
                                    </p>
                                    <p className="text-[11px] text-rose-700 dark:text-rose-400">
                                        Subtotal: ${subtotalReturnUsd.toFixed(2)} + IVA 16%: ${taxReturnUsd.toFixed(2)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                                        ${totalReturnUsd.toFixed(2)}
                                    </p>
                                    <p className="text-xs font-bold text-gray-500">
                                        Bs. {totalReturnBs.toLocaleString('es-VE')}
                                    </p>
                                </div>
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <Button type="button" variant="secondary" onClick={onClose} disabled={processing}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary" disabled={processing || activeReturnItems.length === 0}>
                                    {processing ? 'Emitiendo Nota de Crédito...' : 'Emitir Nota de Crédito SENIAT'}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            )}
        </Modal>
    );
}
