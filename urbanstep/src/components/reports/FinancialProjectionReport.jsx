import React, { useState, useMemo } from 'react';
import { 
    TrendingUp, 
    Calculator, 
    Calendar, 
    DollarSign, 
    Package, 
    ArrowUpRight, 
    ArrowDownRight, 
    Sliders, 
    Download, 
    Sparkles,
    AlertCircle,
    CheckCircle2,
    PieChart,
    BarChart3
} from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function FinancialProjectionReport({ sales = [], products = [], purchases = [] }) {
    const { formatUSD, formatBs, rate, isSwapped } = useCurrency();

    // Factores de simulación interactivos
    const [growthRate, setGrowthRate] = useState(15); // % de crecimiento esperado
    const [fixedMonthlyCosts, setFixedMonthlyCosts] = useState(1800); // Costos fijos mensuales ($ alquiler, nómina, servicios)
    const [projectionHorizon, setProjectionHorizon] = useState('90'); // '30' | '60' | '90' días

    // 1. Análisis del histórico real (Últimos 30 días)
    const baselineMetrics = useMemo(() => {
        const totalSalesRevenue = sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
        const totalSalesCount = sales.length || 1;
        const avgTicket = totalSalesRevenue / totalSalesCount;

        // Costo de ventas real estimado (COGS)
        let totalCogs = 0;
        let totalUnitsSold = 0;
        sales.forEach(s => {
            if (Array.isArray(s.items)) {
                s.items.forEach(it => {
                    const qty = Number(it.quantity) || 1;
                    totalUnitsSold += qty;
                    const cost = Number(it.costUnitUsd) || (Number(it.price) * 0.55); // 55% costo base promedio
                    totalCogs += cost * qty;
                });
            }
        });

        const grossProfit = totalSalesRevenue - totalCogs;
        const grossMarginPct = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 45;

        // Promedio diario (Run-rate diario)
        const dailyRunRate = totalSalesRevenue / 30;
        const dailyUnitsRunRate = totalUnitsSold / 30;

        return {
            totalSalesRevenue,
            totalUnitsSold,
            avgTicket,
            grossMarginPct,
            dailyRunRate,
            dailyUnitsRunRate,
            avgUnitSellingPrice: totalUnitsSold > 0 ? totalSalesRevenue / totalUnitsSold : 120,
            avgUnitCost: totalUnitsSold > 0 ? totalCogs / totalUnitsSold : 65
        };
    }, [sales]);

    // 2. Modelo de Proyección Financiera (Forecasting 30, 60 y 90 Días)
    const projections = useMemo(() => {
        const multiplier = 1 + (growthRate / 100);
        const days = parseInt(projectionHorizon) || 30;
        const months = days / 30;

        // Ventas estimadas
        const projectedRevenueUsd = baselineMetrics.dailyRunRate * days * multiplier;
        const projectedRevenueBs = projectedRevenueUsd * rate;
        const projectedUnits = Math.round(baselineMetrics.dailyUnitsRunRate * days * multiplier);

        // Costo variable estimado (COGS)
        const projectedCogsUsd = projectedUnits * baselineMetrics.avgUnitCost;
        const projectedGrossProfitUsd = projectedRevenueUsd - projectedCogsUsd;

        // Costos fijos en el periodo
        const totalFixedCosts = fixedMonthlyCosts * months;
        const projectedNetProfitUsd = projectedGrossProfitUsd - totalFixedCosts;
        const projectedNetProfitBs = projectedNetProfitUsd * rate;

        // Punto de Equilibrio (Break-Even) mensual
        // Unidades = Costos Fijos / (Precio Promedio - Costo Variable Unitario)
        const contributionMarginPerUnit = Math.max(1, baselineMetrics.avgUnitSellingPrice - baselineMetrics.avgUnitCost);
        const breakEvenUnitsMonthly = Math.ceil(fixedMonthlyCosts / contributionMarginPerUnit);
        const breakEvenRevenueMonthly = breakEvenUnitsMonthly * baselineMetrics.avgUnitSellingPrice;

        // Requerimiento de capital de reposición (Re-stocking)
        // Para sostener las unidades proyectadas con margen de seguridad del 20%
        const requiredRestockUnits = Math.round(projectedUnits * 1.15);
        const requiredRestockCapitalUsd = requiredRestockUnits * baselineMetrics.avgUnitCost;

        // Hitos a 30, 60 y 90 días
        const milestones = [
            { days: 30, label: '30 Días', rev: baselineMetrics.dailyRunRate * 30 * multiplier, units: Math.round(baselineMetrics.dailyUnitsRunRate * 30 * multiplier) },
            { days: 60, label: '60 Días', rev: baselineMetrics.dailyRunRate * 60 * multiplier, units: Math.round(baselineMetrics.dailyUnitsRunRate * 60 * multiplier) },
            { days: 90, label: '90 Días', rev: baselineMetrics.dailyRunRate * 90 * multiplier, units: Math.round(baselineMetrics.dailyUnitsRunRate * 90 * multiplier) },
        ];

        return {
            days,
            projectedRevenueUsd,
            projectedRevenueBs,
            projectedUnits,
            projectedGrossProfitUsd,
            projectedNetProfitUsd,
            projectedNetProfitBs,
            breakEvenUnitsMonthly,
            breakEvenRevenueMonthly,
            requiredRestockCapitalUsd,
            requiredRestockUnits,
            milestones
        };
    }, [baselineMetrics, growthRate, fixedMonthlyCosts, projectionHorizon, rate]);

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header del Reporte */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white shadow-xl">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                        Dirección de Finanzas (CFO) • Planificación Estratégica
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black mt-1">
                        Reporte de Proyección Financiera & Ventas (Forecasting)
                    </h3>
                    <p className="text-xs text-blue-200/80 mt-1">
                        Estimación probabilística basada en velocidad de rotación real, run-rate diario y punto de equilibrio
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                        Tasa BCV: {formatBs(rate)}
                    </span>
                </div>
            </div>

            {/* Panel de Control de Parámetros de Simulación */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-blue-600" />
                        Variables del Modelo de Proyección
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                        Run-Rate Actual: {formatUSD(baselineMetrics.dailyRunRate)} / día
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Crecimiento esperado */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-semibold">Tasa Crecimiento Esperado:</span>
                            <span className="font-bold text-blue-600 font-mono">+{growthRate}%</span>
                        </div>
                        <input
                            type="range"
                            min="-20"
                            max="60"
                            step="5"
                            value={growthRate}
                            onChange={(e) => setGrowthRate(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                            <span>-20% (Pesimista)</span>
                            <span>0% (Base)</span>
                            <span>+60% (Expansión)</span>
                        </div>
                    </div>

                    {/* Costos Fijos Mensuales */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-gray-500 font-semibold block">
                            Costos Fijos Operativos Mensuales (USD):
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">$</span>
                            <input
                                type="number"
                                step="100"
                                value={fixedMonthlyCosts}
                                onChange={(e) => setFixedMonthlyCosts(Number(e.target.value))}
                                className="w-full pl-7 pr-3 py-2 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Horizonte temporal */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-gray-500 font-semibold block">
                            Horizonte de Proyección:
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {['30', '60', '90'].map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setProjectionHorizon(d)}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                                        projectionHorizon === d
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                            : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    {d} Días
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards de Resultados Proyectados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ingresos Proyectados */}
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Ventas Estimadas ({projectionHorizon} Días)
                    </span>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {isSwapped ? formatBs(projections.projectedRevenueBs) : formatUSD(projections.projectedRevenueUsd)}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {isSwapped ? formatUSD(projections.projectedRevenueUsd) : formatBs(projections.projectedRevenueBs)}
                    </p>
                    <span className="text-[10px] text-gray-400 block pt-1 border-t border-gray-100 dark:border-gray-700">
                        Volumen: ~{projections.projectedUnits} pares de sneakers
                    </span>
                </div>

                {/* Utilidad Neta Proyectada */}
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Utilidad Neta Proyectada
                    </span>
                    <p className={`text-2xl font-black ${projections.projectedNetProfitUsd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {isSwapped ? formatBs(projections.projectedNetProfitBs) : formatUSD(projections.projectedNetProfitUsd)}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-gray-500">
                        Margen Bruto Modelo: {baselineMetrics.grossMarginPct.toFixed(1)}%
                    </p>
                    <span className="text-[10px] text-gray-400 block pt-1 border-t border-gray-100 dark:border-gray-700">
                        Deduciendo ${fixedMonthlyCosts * (parseInt(projectionHorizon)/30)} costos fijos
                    </span>
                </div>

                {/* Punto de Equilibrio (Break-Even) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Punto de Equilibrio (Break-Even Mensual)
                    </span>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {projections.breakEvenUnitsMonthly} pares
                    </p>
                    <p className="text-[11px] font-mono font-bold text-gray-500">
                        Meta: {formatUSD(projections.breakEvenRevenueMonthly)} / mes
                    </p>
                    <span className="text-[10px] text-gray-400 block pt-1 border-t border-gray-100 dark:border-gray-700">
                        Cubre alquiler, nómina y servicios sin pérdida
                    </span>
                </div>

                {/* Capital de Reabastecimiento Requerido */}
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Capital Requerido para Reabastecer
                    </span>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {formatUSD(projections.requiredRestockCapitalUsd)}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-gray-500">
                        Para reposición de {projections.requiredRestockUnits} pares
                    </p>
                    <span className="text-[10px] text-gray-400 block pt-1 border-t border-gray-100 dark:border-gray-700">
                        Evita quiebre de stock en modelos clave
                    </span>
                </div>
            </div>

            {/* Tabla Comparativa de Hitos de Crecimiento */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            Escalabilidad de Ingresos por Periodo
                        </h4>
                        <p className="text-xs text-gray-500">
                            Estimación progresiva a tasa constante del +{growthRate}%
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-3 px-4 text-left">Periodo</th>
                                <th className="py-3 px-4 text-center">Pares Estimados</th>
                                <th className="py-3 px-4 text-right">Ingreso Bruto ($ USD)</th>
                                <th className="py-3 px-4 text-right">Equivalente Oficial (Bs.)</th>
                                <th className="py-3 px-4 text-right">Costo Mercancía (COGS)</th>
                                <th className="py-3 px-4 text-right">Utilidad Bruta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                            {projections.milestones.map((m) => {
                                const cogs = m.units * baselineMetrics.avgUnitCost;
                                const gross = m.rev - cogs;
                                return (
                                    <tr key={m.days} className="hover:bg-gray-50 dark:hover:bg-gray-850">
                                        <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                                            {m.label} ({m.days} Días)
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                                            {m.units} pares
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">
                                            {formatUSD(m.rev)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatBs(m.rev * rate)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-500">
                                            {formatUSD(cogs)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-indigo-600 dark:text-indigo-400">
                                            {formatUSD(gross)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
