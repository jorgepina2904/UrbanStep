import React, { useState, useEffect, useMemo } from 'react';
import { 
    Truck, 
    DollarSign, 
    CreditCard, 
    CheckCircle2, 
    Calendar, 
    User, 
    Phone, 
    FileText, 
    Download, 
    Plus, 
    AlertCircle, 
    X,
    Building2,
    Banknote
} from 'lucide-react';
import { deliveryService, FLEET_DRIVERS } from '../../services/deliveryService';
import { useCurrency } from '../../contexts/CurrencyContext';
import { VENEZUELA_BANKS } from '../../data/venezuelaData';
import toast from 'react-hot-toast';

export default function MotorizadosPayoutReport() {
    const { formatUSD, formatBs, rate, isSwapped } = useCurrency();

    const [deliveries, setDeliveries] = useState([]);
    const [payoutsHistory, setPayoutsHistory] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('urbanstep_driver_payouts') || '[]');
        } catch {
            return [];
        }
    });

    const [selectedDriver, setSelectedDriver] = useState('all');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [driverToPay, setDriverToPay] = useState(null);

    // Formulario de liquidación a motorizado
    const [payoutForm, setPayoutForm] = useState({
        paymentMethod: 'pago_movil', // 'pago_movil' | 'cash_usd' | 'transferencia'
        bank: 'Banesco Banco Universal',
        reference: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Cargar envíos
    useEffect(() => {
        const load = async () => {
            try {
                const list = await deliveryService.getAll();
                setDeliveries(Array.isArray(list) ? list : []);
            } catch (e) {
                console.warn('Error cargando envíos:', e);
            }
        };
        load();
    }, []);

    // Identificar qué envíos ya fueron liquidados
    const settledDeliveryIds = useMemo(() => {
        const ids = new Set();
        payoutsHistory.forEach(p => {
            if (Array.isArray(p.deliveryIds)) {
                p.deliveryIds.forEach(id => ids.add(id));
            }
        });
        return ids;
    }, [payoutsHistory]);

    // Resumen por cada motorizado
    const driverSummaries = useMemo(() => {
        return FLEET_DRIVERS.map(driver => {
            const driverDeliveries = deliveries.filter(d => 
                (d.driverName && d.driverName.toLowerCase().includes(driver.name.toLowerCase())) ||
                (d.driverPhone && d.driverPhone === driver.phone)
            );

            const completed = driverDeliveries.filter(d => d.status === 'entregado');
            const pendingSettlement = completed.filter(d => !settledDeliveryIds.has(d.id));
            const alreadySettled = completed.filter(d => settledDeliveryIds.has(d.id));

            // Tarifa por carrera: Se calcula en base al costo del delivery o tarifa base de $2.50
            const totalEarnedUsd = completed.reduce((sum, d) => sum + (Number(d.deliveryCostUsd) > 0 ? Number(d.deliveryCostUsd) : 2.5), 0);
            const pendingAmountUsd = pendingSettlement.reduce((sum, d) => sum + (Number(d.deliveryCostUsd) > 0 ? Number(d.deliveryCostUsd) : 2.5), 0);
            const settledAmountUsd = alreadySettled.reduce((sum, d) => sum + (Number(d.deliveryCostUsd) > 0 ? Number(d.deliveryCostUsd) : 2.5), 0);

            return {
                ...driver,
                totalDeliveries: driverDeliveries.length,
                completedDeliveries: completed.length,
                pendingDeliveriesCount: pendingSettlement.length,
                pendingDeliveries: pendingSettlement,
                totalEarnedUsd,
                totalEarnedBs: totalEarnedUsd * rate,
                pendingAmountUsd,
                pendingAmountBs: pendingAmountUsd * rate,
                settledAmountUsd,
                settledAmountBs: settledAmountUsd * rate
            };
        });
    }, [deliveries, settledDeliveryIds, rate]);

    // Totales globales
    const overallStats = useMemo(() => {
        const totalCompleted = driverSummaries.reduce((s, d) => s + d.completedDeliveries, 0);
        const totalPendingUsd = driverSummaries.reduce((s, d) => s + d.pendingAmountUsd, 0);
        const totalSettledUsd = driverSummaries.reduce((s, d) => s + d.settledAmountUsd, 0);

        return {
            totalCompleted,
            totalPendingUsd,
            totalPendingBs: totalPendingUsd * rate,
            totalSettledUsd,
            totalSettledBs: totalSettledUsd * rate
        };
    }, [driverSummaries, rate]);

    // Abrir modal de liquidación para un motorizado específico
    const handleOpenPayout = (driverSummary) => {
        setDriverToPay(driverSummary);
        setPayoutForm({
            paymentMethod: 'pago_movil',
            bank: 'Banesco Banco Universal',
            reference: '',
            notes: `Liquidación fletes de ${driverSummary.pendingDeliveriesCount} carreras`,
            date: new Date().toISOString().split('T')[0]
        });
        setIsPayoutModalOpen(true);
    };

    // Confirmar y registrar liquidación
    const handleConfirmPayout = (e) => {
        e.preventDefault();
        if (!driverToPay) return;

        if (driverToPay.pendingDeliveriesCount === 0) {
            toast.error('Este repartidor no tiene carreras pendientes por liquidar');
            return;
        }

        if (payoutForm.paymentMethod !== 'cash_usd' && (!payoutForm.reference || payoutForm.reference.trim().length < 4)) {
            toast.error('Ingresa el número de referencia bancaria');
            return;
        }

        const payoutReceipt = {
            id: `PAYOUT-MOT-${Date.now().toString().slice(-6)}`,
            receiptNumber: `LIQ-${Date.now().toString().slice(-5)}`,
            driverId: driverToPay.id,
            driverName: driverToPay.name,
            driverPhone: driverToPay.phone,
            vehicle: driverToPay.vehicle,
            deliveriesCount: driverToPay.pendingDeliveriesCount,
            deliveryIds: driverToPay.pendingDeliveries.map(d => d.id),
            amountUsd: driverToPay.pendingAmountUsd,
            amountBs: driverToPay.pendingAmountBs,
            bcvRate: rate,
            paymentMethod: payoutForm.paymentMethod,
            bank: payoutForm.bank,
            reference: payoutForm.reference || 'EFECTIVO-DIVISA',
            notes: payoutForm.notes,
            settledAt: new Date().toISOString()
        };

        const updatedHistory = [payoutReceipt, ...payoutsHistory];
        setPayoutsHistory(updatedHistory);
        try {
            localStorage.setItem('urbanstep_driver_payouts', JSON.stringify(updatedHistory));
        } catch (err) {
            console.warn('Error guardando liquidaciones:', err);
        }

        setIsPayoutModalOpen(false);
        setDriverToPay(null);
        toast.success(`Liquidación emitida a ${driverToPay.name}: ${formatUSD(payoutReceipt.amountUsd)}`, { icon: '🏍️' });
    };

    // Exportar liquidaciones a CSV
    const handleExportPayoutsCSV = () => {
        const headers = ['Comprobante', 'Fecha', 'Motorizado', 'Telefono', 'Vehiculo', 'Carreras', 'Monto USD', 'Monto Bs', 'Metodo', 'Banco', 'Referencia'];
        const csvContent = [
            headers.join(','),
            ...payoutsHistory.map(p => [
                `"${p.receiptNumber}"`,
                new Date(p.settledAt).toLocaleDateString(),
                `"${p.driverName}"`,
                `"${p.driverPhone}"`,
                `"${p.vehicle}"`,
                p.deliveriesCount,
                p.amountUsd.toFixed(2),
                p.amountBs.toFixed(2),
                `"${p.paymentMethod}"`,
                `"${p.bank}"`,
                `"${p.reference}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reporte_pagos_motorizados_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-blue-600" />
                        Logística & Flota de Envíos
                    </span>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                        Modalidad de Pago a Motorizados & Reporte de Liquidación
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Liquidación de comisiones de flete, control de carreras completadas y emisión de recibos
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportPayoutsCSV}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exportar Liquidaciones</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards de Liquidación */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Total Envíos Completados
                    </span>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {overallStats.totalCompleted} carreras
                    </p>
                    <span className="text-[10px] text-gray-400">
                        En Barquisimeto, Cabudare y Encomiendas
                    </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Saldo Pendiente por Liquidar
                    </span>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400">
                        {isSwapped ? formatBs(overallStats.totalPendingBs) : formatUSD(overallStats.totalPendingUsd)}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-400">
                        {isSwapped ? formatUSD(overallStats.totalPendingUsd) : formatBs(overallStats.totalPendingBs)}
                    </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        Total Liquidado a Repartidores
                    </span>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                        {isSwapped ? formatBs(overallStats.totalSettledBs) : formatUSD(overallStats.totalSettledUsd)}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-gray-600 dark:text-gray-400">
                        {payoutsHistory.length} comprobantes emitidos
                    </p>
                </div>
            </div>

            {/* Tabla de Motorizados y Balances */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        Flota de Repartidores & Estado de Cuentas
                    </h4>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-3 px-4 text-left">Motorizado</th>
                                <th className="py-3 px-4 text-left">Vehículo / Placa</th>
                                <th className="py-3 px-3 text-center">Carreras Entregadas</th>
                                <th className="py-3 px-4 text-right">Ganancias Totales</th>
                                <th className="py-3 px-4 text-right">Pendiente por Pagar</th>
                                <th className="py-3 px-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                            {driverSummaries.map((drv) => {
                                const hasPending = drv.pendingDeliveriesCount > 0;

                                return (
                                    <tr key={drv.id} className="hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="font-sans">
                                                <p className="font-bold text-gray-900 dark:text-white">{drv.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono">{drv.phone}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-sans text-gray-600 dark:text-gray-300">
                                            <p className="font-medium">{drv.vehicle}</p>
                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {drv.plate}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="font-bold text-gray-900 dark:text-white">{drv.completedDeliveries}</span>
                                            {drv.pendingDeliveriesCount > 0 && (
                                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block font-sans">
                                                    ({drv.pendingDeliveriesCount} por liquidar)
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {formatUSD(drv.totalEarnedUsd)}
                                            </span>
                                            <span className="text-[10px] text-gray-400 block">
                                                {formatBs(drv.totalEarnedBs)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`font-black ${hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                                                {formatUSD(drv.pendingAmountUsd)}
                                            </span>
                                            {hasPending && (
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
                                                    {formatBs(drv.pendingAmountBs)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                type="button"
                                                disabled={!hasPending}
                                                onClick={() => handleOpenPayout(drv)}
                                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 mx-auto ${
                                                    hasPending
                                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 active:scale-95'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                <CreditCard className="w-3.5 h-3.5" />
                                                <span>Liquidar Pago</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Historial de Liquidaciones Emitidas */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden space-y-3">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            Historial Contable de Liquidaciones a Repartidores
                        </h4>
                        <p className="text-[11px] text-gray-400">
                            Comprobantes emitidos y registrados en el egreso de fletes
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-2.5 px-4 text-left">Recibo / Folio</th>
                                <th className="py-2.5 px-4 text-left">Fecha</th>
                                <th className="py-2.5 px-4 text-left">Repartidor</th>
                                <th className="py-2.5 px-3 text-center">Carreras</th>
                                <th className="py-2.5 px-4 text-right">Monto USD</th>
                                <th className="py-2.5 px-4 text-right">Monto Bs.</th>
                                <th className="py-2.5 px-4 text-center">Método & Ref.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                            {payoutsHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-10 text-center text-gray-400 font-sans">
                                        No hay liquidaciones registradas todavía. Usa el botón "Liquidar Pago" arriba.
                                    </td>
                                </tr>
                            ) : (
                                payoutsHistory.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors">
                                        <td className="py-2.5 px-4 font-bold text-blue-600">
                                            {p.receiptNumber}
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-500 font-sans text-[11px]">
                                            {new Date(p.settledAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-2.5 px-4 font-sans font-bold text-gray-900 dark:text-white">
                                            {p.driverName}
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-bold">
                                            {p.deliveriesCount}
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-bold text-gray-900 dark:text-white">
                                            {formatUSD(p.amountUsd)}
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatBs(p.amountBs)}
                                        </td>
                                        <td className="py-2.5 px-4 text-center font-sans">
                                            <span className="text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg text-gray-600 dark:text-gray-300">
                                                {p.paymentMethod.replace('_', ' ')} • {p.reference}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Liquidación a Motorizado */}
            {isPayoutModalOpen && driverToPay && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                                    <Banknote className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white">
                                        Liquidar Pago a {driverToPay.name}
                                    </h4>
                                    <p className="text-[11px] text-gray-400">
                                        {driverToPay.vehicle} • {driverToPay.phone}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPayoutModalOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmPayout} className="p-5 space-y-4">
                            {/* Resumen de Montos a Pagar */}
                            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs text-gray-500">Carreras a Liquidar:</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {driverToPay.pendingDeliveriesCount} entregas
                                    </span>
                                </div>
                                <div className="flex justify-between items-baseline pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                                    <span className="text-xs font-bold text-blue-950 dark:text-blue-200">Monto Total a Pagar:</span>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                                            {formatUSD(driverToPay.pendingAmountUsd)}
                                        </p>
                                        <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatBs(driverToPay.pendingAmountBs)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Método de Liquidación */}
                            <div>
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                                    Forma de Pago
                                </label>
                                <select
                                    value={payoutForm.paymentMethod}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, paymentMethod: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white"
                                >
                                    <option value="pago_movil">📱 Pago Móvil en Bolívares (Bs.)</option>
                                    <option value="cash_usd">💵 Efectivo en Dólares ($ Cash)</option>
                                    <option value="transferencia">🏦 Transferencia Bancaria</option>
                                </select>
                            </div>

                            {/* Banco y Referencia */}
                            {payoutForm.paymentMethod !== 'cash_usd' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                                            Banco Emisor
                                        </label>
                                        <select
                                            value={payoutForm.bank}
                                            onChange={(e) => setPayoutForm({ ...payoutForm, bank: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                                        >
                                            {VENEZUELA_BANKS.map(b => (
                                                <option key={b.code} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                                            Nº Referencia *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={payoutForm.reference}
                                            onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })}
                                            placeholder="Ej: 749201"
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                                    Notas Contables / Glosa de Egreso
                                </label>
                                <input
                                    type="text"
                                    value={payoutForm.notes}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirmar Liquidación y Emitir Recibo</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
