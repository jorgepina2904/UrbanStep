import React, { useState, useMemo } from 'react';
import { 
    Filter, 
    Download, 
    Search, 
    ShoppingBag, 
    DollarSign, 
    Calendar, 
    Layers, 
    FileSpreadsheet,
    ArrowUpDown,
    CheckCircle2
} from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function GranularSalesReport({ sales = [] }) {
    const { formatUSD, formatBs, isSwapped, rate } = useCurrency();

    // Filtros multidimensionales
    const [searchModel, setSearchModel] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [selectedSize, setSelectedSize] = useState('all');
    const [selectedColor, setSelectedColor] = useState('all');
    const [selectedChannel, setSelectedChannel] = useState('all'); // 'all' | 'pos' | 'ecommerce'
    const [selectedPayment, setSelectedPayment] = useState('all');
    const [sortField, setSortField] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');

    // Desglosar ventas por ítem individual (cada fila = 1 producto vendido con su talla y color)
    const granularItems = useMemo(() => {
        const rows = [];
        (sales || []).forEach(sale => {
            const channel = (sale.cashier || '').toLowerCase().includes('ecommerce') || (sale.notes || '').toLowerCase().includes('ecommerce')
                ? 'Ecommerce Web'
                : 'POS Mostrador';

            if (Array.isArray(sale.items) && sale.items.length > 0) {
                sale.items.forEach(it => {
                    const price = Number(it.price) || 0;
                    const qty = Number(it.quantity) || 1;
                    const totalUsd = Number(it.totalUsd || it.total) || (price * qty);
                    const costUnit = Number(it.costUnitUsd) > 0 ? Number(it.costUnitUsd) : (price * 0.55);
                    const totalCost = costUnit * qty;
                    const grossProfit = totalUsd - totalCost;
                    const marginPct = totalUsd > 0 ? (grossProfit / totalUsd) * 100 : 0;

                    rows.push({
                        id: `${sale.id}-${it.productId || it.id}-${it.size}-${it.color}`,
                        saleId: sale.id,
                        receiptNumber: sale.receiptNumber || 'TKT-VENTA',
                        date: sale.date || new Date().toISOString(),
                        customer: sale.customer || 'Cliente Mostrador',
                        cashier: sale.cashier || 'Cajero Principal',
                        channel,
                        paymentMethod: sale.paymentMethod || 'pago_movil',
                        productName: it.name || 'Calzado Deportivo',
                        brand: it.brand || 'UrbanStep',
                        size: String(it.size || '39'),
                        color: it.color || 'Original',
                        quantity: qty,
                        priceUsd: price,
                        costUsd: costUnit,
                        totalUsd,
                        totalBs: totalUsd * (sale.bcvRate || rate),
                        grossProfitUsd: grossProfit,
                        marginPct
                    });
                });
            }
        });
        return rows;
    }, [sales, rate]);

    // Opciones para los filtros
    const availableBrands = useMemo(() => {
        const set = new Set(granularItems.map(i => i.brand).filter(Boolean));
        return ['all', ...Array.from(set)];
    }, [granularItems]);

    const availableSizes = useMemo(() => {
        const set = new Set(granularItems.map(i => i.size).filter(Boolean));
        return ['all', ...Array.from(set).sort((a, b) => Number(a) - Number(b))];
    }, [granularItems]);

    const availableColors = useMemo(() => {
        const set = new Set(granularItems.map(i => i.color).filter(Boolean));
        return ['all', ...Array.from(set)];
    }, [granularItems]);

    // Filtrar filas
    const filteredRows = useMemo(() => {
        return granularItems.filter(row => {
            const matchesSearch = !searchModel || 
                row.productName.toLowerCase().includes(searchModel.toLowerCase()) ||
                row.receiptNumber.toLowerCase().includes(searchModel.toLowerCase()) ||
                row.customer.toLowerCase().includes(searchModel.toLowerCase());

            const matchesBrand = selectedBrand === 'all' || row.brand.toLowerCase() === selectedBrand.toLowerCase();
            const matchesSize = selectedSize === 'all' || row.size === selectedSize;
            const matchesColor = selectedColor === 'all' || row.color.toLowerCase() === selectedColor.toLowerCase();
            const matchesChannel = selectedChannel === 'all' || 
                (selectedChannel === 'pos' && row.channel === 'POS Mostrador') ||
                (selectedChannel === 'ecommerce' && row.channel === 'Ecommerce Web');
            const matchesPayment = selectedPayment === 'all' || row.paymentMethod.toLowerCase() === selectedPayment.toLowerCase();

            return matchesSearch && matchesBrand && matchesSize && matchesColor && matchesChannel && matchesPayment;
        }).sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            if (sortField === 'date') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [granularItems, searchModel, selectedBrand, selectedSize, selectedColor, selectedChannel, selectedPayment, sortField, sortDirection]);

    // Totales calculados de las filas filtradas
    const totals = useMemo(() => {
        const units = filteredRows.reduce((acc, r) => acc + r.quantity, 0);
        const revenueUsd = filteredRows.reduce((acc, r) => acc + r.totalUsd, 0);
        const revenueBs = filteredRows.reduce((acc, r) => acc + r.totalBs, 0);
        const profitUsd = filteredRows.reduce((acc, r) => acc + r.grossProfitUsd, 0);
        const avgMargin = revenueUsd > 0 ? (profitUsd / revenueUsd) * 100 : 0;

        return { units, revenueUsd, revenueBs, profitUsd, avgMargin };
    }, [filteredRows]);

    // Exportar a CSV
    const handleExportCSV = () => {
        const headers = ['Fecha', 'Ticket', 'Canal', 'Cliente', 'Producto', 'Marca', 'Talla', 'Color', 'Cantidad', 'Precio Unit USD', 'Total USD', 'Total Bs', 'Margen USD', 'Margen %', 'Metodo Pago'];
        const csvContent = [
            headers.join(','),
            ...filteredRows.map(r => [
                new Date(r.date).toLocaleDateString(),
                `"${r.receiptNumber}"`,
                `"${r.channel}"`,
                `"${r.customer}"`,
                `"${r.productName}"`,
                `"${r.brand}"`,
                `"${r.size}"`,
                `"${r.color}"`,
                r.quantity,
                r.priceUsd.toFixed(2),
                r.totalUsd.toFixed(2),
                r.totalBs.toFixed(2),
                r.grossProfitUsd.toFixed(2),
                `${r.marginPct.toFixed(1)}%`,
                `"${r.paymentMethod}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reporte_ventas_especifico_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Auditoría Transaccional Detallada
                    </span>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                        Reporte de Ventas Específico (Multi-Filtro Granular)
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Desglose unitario por silueta, talla exacta, color, canal y rentabilidad unitaria
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Exportar a Excel / CSV</span>
                    </button>
                </div>
            </div>

            {/* Panel de Filtros Multidimensionales */}
            <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-blue-600" /> Filtros Específicos
                    </span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {filteredRows.length} ítems encontrados
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                    {/* Búsqueda */}
                    <div className="lg:col-span-2">
                        <input
                            type="text"
                            value={searchModel}
                            onChange={(e) => setSearchModel(e.target.value)}
                            placeholder="Buscar modelo, ticket o cliente..."
                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Marca */}
                    <div>
                        <select
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Marca: Todas</option>
                            {availableBrands.filter(b => b !== 'all').map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    {/* Talla Específica */}
                    <div>
                        <select
                            value={selectedSize}
                            onChange={(e) => setSelectedSize(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Talla: Todas</option>
                            {availableSizes.filter(s => s !== 'all').map(s => (
                                <option key={s} value={s}>Talla {s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Canal de Venta */}
                    <div>
                        <select
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Canal: Todos</option>
                            <option value="pos">🏪 POS Mostrador</option>
                            <option value="ecommerce">🌐 Ecommerce Web</option>
                        </select>
                    </div>

                    {/* Método de Pago */}
                    <div>
                        <select
                            value={selectedPayment}
                            onChange={(e) => setSelectedPayment(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Pago: Todos</option>
                            <option value="pago_movil">Pago Móvil</option>
                            <option value="zelle">Zelle</option>
                            <option value="cash_usd">Efectivo $</option>
                            <option value="tarjeta">Punto / Tarjeta</option>
                            <option value="binance">Binance Pay</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Cards de Totales Filtrados */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <span className="text-[11px] text-gray-400 font-semibold block">Total Pares Vendidos</span>
                    <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{totals.units} pares</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <span className="text-[11px] text-gray-400 font-semibold block">Venta Bruta Facturada</span>
                    <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5">
                        {isSwapped ? formatBs(totals.revenueBs) : formatUSD(totals.revenueUsd)}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">
                        {isSwapped ? formatUSD(totals.revenueUsd) : formatBs(totals.revenueBs)}
                    </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <span className="text-[11px] text-gray-400 font-semibold block">Utilidad Bruta Generada</span>
                    <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {isSwapped ? formatBs(totals.profitUsd * rate) : formatUSD(totals.profitUsd)}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold block">
                        {isSwapped ? formatUSD(totals.profitUsd) : formatBs(totals.profitUsd * rate)}
                    </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <span className="text-[11px] text-gray-400 font-semibold block">Margen Promedio Real</span>
                    <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{totals.avgMargin.toFixed(1)}%</p>
                </div>
            </div>

            {/* Granular Table */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-300 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-3 px-3.5 text-left">Fecha / Hora</th>
                                <th className="py-3 px-3 text-left">Ticket / Recibo</th>
                                <th className="py-3 px-3 text-left">Canal</th>
                                <th className="py-3 px-4 text-left">Calzado Vendido</th>
                                <th className="py-3 px-2.5 text-center">Talla</th>
                                <th className="py-3 px-2.5 text-center">Color</th>
                                <th className="py-3 px-2.5 text-center">Cant</th>
                                <th className="py-3 px-3.5 text-right">P. Venta</th>
                                <th className="py-3 px-3.5 text-right">Total USD</th>
                                <th className="py-3 px-3.5 text-right">Margen Bruto</th>
                                <th className="py-3 px-3.5 text-center">Método Pago</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="py-12 text-center text-gray-400">
                                        No se encontraron ventas con los filtros seleccionados
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-850 transition-colors">
                                        <td className="py-2.5 px-3.5 text-gray-500 font-sans text-[11px]">
                                            {new Date(r.date).toLocaleDateString()} <span className="text-[9px] text-gray-400">{new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">
                                            {r.receiptNumber}
                                        </td>
                                        <td className="py-2.5 px-3 font-sans">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                r.channel === 'Ecommerce Web'
                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                            }`}>
                                                {r.channel}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4 font-sans font-bold text-gray-900 dark:text-white max-w-[180px] truncate" title={r.productName}>
                                            <span className="text-blue-600 mr-1">[{r.brand}]</span>
                                            {r.productName}
                                        </td>
                                        <td className="py-2.5 px-2.5 text-center">
                                            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                                                {r.size}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-2.5 text-center font-sans text-[11px] text-gray-600 dark:text-gray-400 truncate max-w-[80px]">
                                            {r.color}
                                        </td>
                                        <td className="py-2.5 px-2.5 text-center font-black text-gray-900 dark:text-white">
                                            {r.quantity}
                                        </td>
                                        <td className="py-2.5 px-3.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                                            {formatUSD(r.priceUsd)}
                                        </td>
                                        <td className="py-2.5 px-3.5 text-right font-black text-gray-900 dark:text-white">
                                            {formatUSD(r.totalUsd)}
                                        </td>
                                        <td className="py-2.5 px-3.5 text-right">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                +{formatUSD(r.grossProfitUsd)}
                                            </span>
                                            <span className="text-[10px] text-gray-400 block">
                                                ({r.marginPct.toFixed(0)}%)
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3.5 text-center font-sans">
                                            <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg">
                                                {r.paymentMethod.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
