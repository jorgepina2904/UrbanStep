import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { useShift } from '../contexts/ShiftContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { 
    Lock, 
    Printer, 
    DollarSign, 
    Coins
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShiftCloseModal({ isOpen, onClose, settings }) {
    const { activeShift, closeShift, getShiftSummary } = useShift();
    const { formatBs, formatUSD } = useCurrency();

    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [countedUsd, setCountedUsd] = useState('');
    const [countedBs, setCountedBs] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [closedReport, setClosedReport] = useState(null);

    const loadSummary = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getShiftSummary(activeShift?.id);
            setSummary(data);
            if (data) {
                // Prellenar con el monto esperado para agilizar
                setCountedUsd(data.expectedCashUsd.toString());
                setCountedBs(data.expectedCashBs.toString());
            }
        } finally {
            setLoading(false);
        }
    }, [activeShift?.id, getShiftSummary]);

    useEffect(() => {
        if (isOpen && activeShift) {
            loadSummary();
        }
    }, [isOpen, activeShift, loadSummary]);

    const numCountedUsd = parseFloat(countedUsd) || 0;
    const numCountedBs = parseFloat(countedBs) || 0;

    const diffUsd = summary ? numCountedUsd - summary.expectedCashUsd : 0;
    const diffBs = summary ? numCountedBs - summary.expectedCashBs : 0;

    const handleConfirmClose = async () => {
        setSubmitting(true);
        try {
            const report = await closeShift({
                countedCashUsd: numCountedUsd,
                countedCashBs: numCountedBs,
                notes,
            });
            setClosedReport(report);
            toast.success('¡Caja cerrada y turno finalizado exitosamente!');
        } catch (err) {
            toast.error('Error al cerrar caja: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!activeShift) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (closedReport) {
                    setClosedReport(null);
                }
                onClose();
            }}
            title={closedReport ? '🧾 Comprobante de Cierre de Caja (Corte Z)' : '🔒 Cierre de Turno y Arqueo de Caja'}
            size="md"
        >
            {closedReport ? (
                /* Reporte final imprimible */
                <div className="space-y-4">
                    <div id="printable-shift-close" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-gray-800 dark:text-gray-200 font-mono text-xs shadow-inner">
                        <div className="text-center border-b border-dashed border-gray-300 dark:border-gray-700 pb-3 mb-3">
                            <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase">{settings?.storeName || 'UrbanStep Venezuela'}</h2>
                            <p className="text-[11px] text-gray-500">RIF: {settings?.rif || 'J-50123456-7'}</p>
                            <p className="font-bold text-blue-600 dark:text-blue-400 mt-1">CIERRE DE TURNO / CORTE Z</p>
                            <p className="text-[10px] text-gray-400">Folio: {closedReport.id}</p>
                        </div>

                        <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 dark:border-gray-700 pb-3 mb-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500">CAJA / TERMINAL:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{closedReport.cajaName || 'Caja 1'} ({closedReport.cajaLocation || 'General'})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">CAJERO:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{closedReport.cashierName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">APERTURA:</span>
                                <span>{new Date(closedReport.openedAt).toLocaleString('es-VE')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">CIERRE:</span>
                                <span>{new Date(closedReport.closedAt).toLocaleString('es-VE')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">TRANSACCIONES:</span>
                                <span className="font-bold">{closedReport.salesCount} ventas</span>
                            </div>
                        </div>

                        {/* Desglose de Ventas por Método */}
                        <div className="space-y-1.5 text-xs border-b border-dashed border-gray-300 dark:border-gray-700 pb-3 mb-3">
                            <p className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px]">Ventas por Forma de Pago:</p>
                            <div className="flex justify-between">
                                <span>Efectivo Divisas ($):</span>
                                <span className="font-bold">{formatUSD(closedReport.salesCashUsd)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Efectivo Bolívares (Bs.):</span>
                                <span className="font-bold">{formatBs(closedReport.salesCashBs)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Pago Móvil (Bs.):</span>
                                <span className="font-bold text-emerald-600">{formatBs(closedReport.salesPagomovilBs)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Punto de Venta / Débito:</span>
                                <span className="font-bold">{formatBs(closedReport.salesPuntoBs)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Zelle ($ USD):</span>
                                <span className="font-bold text-purple-600">{formatUSD(closedReport.salesZelleUsd)}</span>
                            </div>
                            <div className="flex justify-between font-bold pt-1 border-t border-gray-200 dark:border-gray-800 text-sm text-blue-600 dark:text-blue-400">
                                <span>TOTAL VENDIDO:</span>
                                <span>{formatUSD(closedReport.totalSalesUsd)}</span>
                            </div>
                        </div>

                        {/* Cuadre de Efectivo */}
                        <div className="space-y-1.5 text-xs border-b border-dashed border-gray-300 dark:border-gray-700 pb-3 mb-3">
                            <p className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px]">Arqueo de Gaveta (Efectivo):</p>
                            <div className="flex justify-between">
                                <span>Base Inicial USD:</span>
                                <span>{formatUSD(closedReport.initialCashUsd)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Efectivo USD Esperado:</span>
                                <span>{formatUSD(closedReport.expectedCashUsd)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Efectivo USD Contado:</span>
                                <span>{formatUSD(closedReport.countedCashUsd)}</span>
                            </div>
                            <div className={`flex justify-between font-bold ${closedReport.differenceUsd === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                <span>Diferencia USD:</span>
                                <span>{closedReport.differenceUsd >= 0 ? `+${formatUSD(closedReport.differenceUsd)}` : formatUSD(closedReport.differenceUsd)}</span>
                            </div>

                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between font-bold">
                                    <span>Efectivo Bs. Esperado:</span>
                                    <span>{formatBs(closedReport.expectedCashBs)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Efectivo Bs. Contado:</span>
                                    <span>{formatBs(closedReport.countedCashBs)}</span>
                                </div>
                                <div className={`flex justify-between font-bold ${closedReport.differenceBs === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    <span>Diferencia Bs.:</span>
                                    <span>{closedReport.differenceBs >= 0 ? `+${formatBs(closedReport.differenceBs)}` : formatBs(closedReport.differenceBs)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center pt-2 text-[10px] text-gray-400">
                            <p>Firma del Cajero: ________________________</p>
                            <p className="mt-2">UrbanStep POS • Cierre de Turno</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="secondary" className="flex-1 flex items-center justify-center gap-1.5" onClick={handlePrint}>
                            <Printer className="w-4 h-4" />
                            Imprimir Arqueo
                        </Button>
                        <Button variant="primary" className="flex-1" onClick={onClose}>
                            Aceptar y Salir
                        </Button>
                    </div>
                </div>
            ) : loading ? (
                <div className="py-12 text-center text-gray-500">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Calculando arqueo de turno...</p>
                </div>
            ) : (
                /* Formulario de Arqueo */
                <div className="space-y-4">
                    {/* Shift metadata */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Cajero:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{activeShift.cashierName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Apertura:</span>
                            <span>{new Date(activeShift.openedAt).toLocaleTimeString('es-VE')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Ventas en Turno:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{summary?.salesCount || 0} tickets emitidos</span>
                        </div>
                    </div>

                    {/* Totals by payment method */}
                    <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2 text-xs">
                        <p className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px]">
                            Resumen Recaudado en el Turno:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                                <p className="text-[10px] text-emerald-600 font-medium">Pago Móvil</p>
                                <p className="font-bold text-sm">{formatBs(summary?.salesPagomovilBs || 0)}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                                <p className="text-[10px] text-blue-600 font-medium">Punto / Débito</p>
                                <p className="font-bold text-sm">{formatBs(summary?.salesPuntoBs || 0)}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300">
                                <p className="text-[10px] text-purple-600 font-medium">Zelle (USD)</p>
                                <p className="font-bold text-sm">{formatUSD(summary?.salesZelleUsd || 0)}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                                <p className="text-[10px] text-amber-600 font-medium">Total Facturado</p>
                                <p className="font-bold text-sm">{formatUSD(summary?.totalSalesUsd || 0)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Physical Cash Count */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                            Conteo Físico de Dinero en Gaveta:
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                    Efectivo $ USD Contado
                                </label>
                                <Input
                                    type="number"
                                    step="1"
                                    value={countedUsd}
                                    onChange={(e) => setCountedUsd(e.target.value)}
                                    placeholder="0"
                                    className="font-bold text-emerald-600"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Esperado: {formatUSD(summary?.expectedCashUsd || 0)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                                    <Coins className="w-3.5 h-3.5 text-blue-600" />
                                    Efectivo Bs. Contado
                                </label>
                                <Input
                                    type="number"
                                    step="10"
                                    value={countedBs}
                                    onChange={(e) => setCountedBs(e.target.value)}
                                    placeholder="0"
                                    className="font-bold text-blue-600"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Esperado: {formatBs(summary?.expectedCashBs || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Live Discrepancies */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/70 rounded-xl space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                                <span>Diferencia USD:</span>
                                <span className={`font-bold ${diffUsd === 0 ? 'text-emerald-600' : diffUsd > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                    {diffUsd === 0 ? 'Cuadrado ($0.00)' : diffUsd > 0 ? `Sobrante +${formatUSD(diffUsd)}` : `Faltante ${formatUSD(diffUsd)}`}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Diferencia Bs.:</span>
                                <span className={`font-bold ${diffBs === 0 ? 'text-emerald-600' : diffBs > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                    {diffBs === 0 ? 'Cuadrado (Bs. 0,00)' : diffBs > 0 ? `Sobrante +${formatBs(diffBs)}` : `Faltante ${formatBs(diffBs)}`}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Notas de Cierre (Opcional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Observaciones de caja, entrega de dinero a gerencia o detalle de faltantes"
                                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button variant="secondary" className="flex-1 text-xs" onClick={onClose} disabled={submitting}>
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-1 text-xs flex items-center justify-center gap-1.5 font-bold"
                            onClick={handleConfirmClose}
                            disabled={submitting}
                        >
                            <Lock className="w-4 h-4" />
                            {submitting ? 'Cerrando...' : 'Cerrar Turno de Caja'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
