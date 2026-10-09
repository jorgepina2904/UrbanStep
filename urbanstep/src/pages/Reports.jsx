import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText,
    TrendingUp,
    DollarSign,
    Package,
    AlertTriangle,
    CreditCard,
    Download,
    Printer,
    BarChart3,
    Truck,
    Users,
    Shield,
    Receipt,
    Monitor,
    Building2,
    PieChart,
    ShoppingBag,
    FileSpreadsheet,
    Search,
    Filter,
    Flame,
    Sparkles,
    RefreshCw,
    Clock,
    RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { reportService } from '../services/reportService';
import { useCurrency } from '../contexts/CurrencyContext';
import { reportExporter } from '../utils/reportExporter';

function ExportButtonGroup({ reportTitle, categoryName, columns, rows, summaryCards = [], filename, bcvRate, onExportCSV }) {
    const handleExcel = () => {
        try {
            reportExporter.exportToExcel({
                reportTitle,
                categoryName,
                columns,
                rows: rows || [],
                summaryCards,
                bcvRate,
                filename
            });
            toast.success('Reporte Excel (.xlsx) exportado exitosamente');
        } catch (e) {
            console.error('Error exportando Excel:', e);
            toast.error('Error al generar archivo Excel');
        }
    };

    const handlePDF = () => {
        try {
            reportExporter.exportToPDF({
                reportTitle,
                categoryName,
                columns,
                rows: rows || [],
                summaryCards,
                bcvRate,
                filename
            });
            toast.success('Reporte PDF (.pdf) generado con éxito');
        } catch (e) {
            console.error('Error exportando PDF:', e);
            toast.error('Error al generar archivo PDF');
        }
    };

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <button
                type="button"
                onClick={handleExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm transition-all active:scale-95"
                title="Descargar libro Excel profesional (.xlsx) con membrete y RIF"
            >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Excel (.xlsx)</span>
            </button>
            <button
                type="button"
                onClick={handlePDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-300 dark:bg-red-950/60 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 rounded-xl shadow-sm transition-all active:scale-95"
                title="Descargar documento PDF oficial con formato fiscal SENIAT"
            >
                <FileText className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>PDF (.pdf)</span>
            </button>
            {onExportCSV && (
                <button
                    type="button"
                    onClick={onExportCSV}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm transition-all"
                    title="Exportar archivo CSV"
                >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>CSV</span>
                </button>
            )}
        </div>
    );
}

export default function Reports() {
    const { formatBs, formatUSD, toBs, rate: bcvRate } = useCurrency();
    const [loading, setLoading] = useState(true);

    // Categoría principal seleccionada: 'admin' | 'managerial' | 'operational' | 'purchases'
    const [mainCategory, setMainCategory] = useState('admin');
    // Sub-reporte activo dentro de la categoría
    const [activeReportId, setActiveReportId] = useState('fiscal');
    const [dateRange, setDateRange] = useState('30d');

    // Filtros personalizados del Centro de Reportes & Auditoría
    const [selectedCashier, setSelectedCashier] = useState('all');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
    const [tableSearch, setTableSearch] = useState('');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    // Datos de los Reportes
    const [summary, setSummary] = useState(null);
    const [seniatReport, setSeniatReport] = useState(null);
    const [shiftsReport, setShiftsReport] = useState(null);
    const [invoicesReport, setInvoicesReport] = useState(null);
    const [profitabilityReport, setProfitabilityReport] = useState(null);
    const [ticketReport, setTicketReport] = useState(null);
    const [cashierReport, setCashierReport] = useState(null);
    const [stockReport, setStockReport] = useState(null);
    const [paymentReport, setPaymentReport] = useState(null);
    const [logisticsReport, setLogisticsReport] = useState(null);
    const [purchasesReport, setPurchasesReport] = useState(null);

    // 4 Nuevos Reportes Solicitados (2 Gerenciales + 2 Operativos)
    const [topProductsReport, setTopProductsReport] = useState(null);
    const [salesByBrandReport, setSalesByBrandReport] = useState(null);
    const [warrantyReturnsReport, setWarrantyReturnsReport] = useState(null);
    const [hourlyTrafficReport, setHourlyTrafficReport] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            let from = null;
            let to = new Date().toISOString();

            if (dateRange === '1d') {
                from = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            } else if (dateRange === '7d') {
                from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            } else if (dateRange === '30d') {
                from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            } else if (dateRange === 'year') {
                from = new Date(now.getFullYear(), 0, 1).toISOString();
            } else if (dateRange === 'custom') {
                from = customFrom ? new Date(customFrom).toISOString() : null;
                to = customTo ? new Date(customTo + 'T23:59:59').toISOString() : new Date().toISOString();
            }

            const rangeParams = { from, to };

            const [
                summaryData,
                seniatData,
                shiftsData,
                invoicesData,
                profitData,
                ticketData,
                cashierData,
                stockData,
                paymentData,
                logisticsData,
                purchasesData,
                topProductsData,
                salesByBrandData,
                warrantyReturnsData,
                hourlyTrafficData
            ] = await Promise.all([
                reportService.getSummary(rangeParams),
                reportService.getSeniatFiscalReport(rangeParams),
                reportService.getCashRegisterAuditReport(rangeParams),
                reportService.getOperationsAuditReport(rangeParams),
                reportService.getProfitabilityMarginReport(rangeParams),
                reportService.getSalesTrendsAndTicketReport({ days: dateRange === '7d' ? 7 : 30 }),
                reportService.getCashierPerformanceReport(rangeParams),
                reportService.getCriticalStockReport(),
                reportService.getPaymentMethodReconciliationReport(rangeParams),
                reportService.getDeliveryLogisticsReport(rangeParams),
                reportService.getPurchasesReport(rangeParams),
                reportService.getTopProductsRotationReport(rangeParams),
                reportService.getSalesByBrandReport(rangeParams),
                reportService.getWarrantyAndReturnsReport(rangeParams),
                reportService.getHourlyTrafficReport(rangeParams)
            ]);

            setSummary(summaryData);
            setSeniatReport(seniatData);
            setShiftsReport(shiftsData);
            setInvoicesReport(invoicesData);
            setProfitabilityReport(profitData);
            setTicketReport(ticketData);
            setCashierReport(cashierData);
            setStockReport(stockData);
            setPaymentReport(paymentData);
            setLogisticsReport(logisticsData);
            setPurchasesReport(purchasesData);
            setTopProductsReport(topProductsData);
            setSalesByBrandReport(salesByBrandData);
            setWarrantyReturnsReport(warrantyReturnsData);
            setHourlyTrafficReport(hourlyTrafficData);
        } catch (error) {
            console.error('Error cargando reportes:', error);
            toast.error('Error al generar estadísticas');
        } finally {
            setLoading(false);
        }
    }, [dateRange, customFrom, customTo]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleResetFilters = () => {
        setSelectedCashier('all');
        setSelectedPaymentMethod('all');
        setTableSearch('');
        setDateRange('30d');
        setCustomFrom('');
        setCustomTo('');
        toast.success('Filtros restablecidos');
    };

    const handleExportCSV = (data, filename) => {
        if (!data || data.length === 0) {
            toast('No hay filas para exportar', { icon: '📊' });
            return;
        }
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Reporte ${filename} descargado`);
    };

    const handlePrint = () => {
        window.print();
        toast.success('Abriendo vista de impresión');
    };

    // Estructura de las 4 Categorías Principales con sus reportes correspondientes
    const reportCategories = [
        {
            id: 'admin',
            label: '1. Reportes Administrativos',
            badge: '3 Reportes',
            icon: Shield,
            reports: [
                { id: 'fiscal', label: 'Cierre Fiscal SENIAT (IVA 16% / IGTF)', icon: Receipt },
                { id: 'shifts', label: 'Arqueo & Cierres de Caja (Cortes Z)', icon: Monitor },
                { id: 'invoices', label: 'Auditoría de Comprobantes & Ventas', icon: FileText },
            ]
        },
        {
            id: 'managerial',
            label: '2. Reportes Gerenciales',
            badge: '5 Reportes',
            icon: TrendingUp,
            reports: [
                { id: 'profitability', label: 'Margen de Ganancia & Rentabilidad', icon: DollarSign },
                { id: 'trends', label: 'Tendencias & Ticket Promedio', icon: BarChart3 },
                { id: 'cashiers', label: 'Rendimiento de Vendedores/Cajeros', icon: Users },
                { id: 'top_products', label: 'Top Calzados Más Vendidos vs Rotación', icon: Flame },
                { id: 'sales_by_brand', label: 'Ventas y Participación por Marca', icon: Sparkles },
            ]
        },
        {
            id: 'operational',
            label: '3. Reportes Operativos',
            badge: '5 Reportes',
            icon: Package,
            reports: [
                { id: 'stock', label: 'Stock Crítico & Valorización Inventario', icon: AlertTriangle },
                { id: 'payments', label: 'Conciliación de Métodos de Pago & Bancos', icon: CreditCard },
                { id: 'logistics', label: 'Logística de Delivery & Envíos', icon: Truck },
                { id: 'warranty_returns', label: 'Control de Cambios y Garantías', icon: RefreshCw },
                { id: 'hourly_traffic', label: 'Auditoría de Tráfico Horario & Picos', icon: Clock },
            ]
        },
        {
            id: 'purchases',
            label: '4. Compras & Proveedores',
            badge: 'Almacén',
            icon: ShoppingBag,
            reports: [
                { id: 'purchases_list', label: 'Facturas de Compra & Entradas Almacén', icon: Building2 },
            ]
        }
    ];

    // Filtrado personalizado cruzado para tablas de reportes y auditorías
    const q = tableSearch.toLowerCase().trim();

    const filteredFiscalInvoices = (seniatReport?.invoices || []).filter(inv => {
        const matchCashier = selectedCashier === 'all' || (inv.cashier && inv.cashier.includes(selectedCashier));
        const matchPayment = selectedPaymentMethod === 'all' || inv.paymentMethod === selectedPaymentMethod;
        const matchSearch = !q || (
            (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
            (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
            (inv.customerRif && inv.customerRif.toLowerCase().includes(q)) ||
            (inv.cashier && inv.cashier.toLowerCase().includes(q))
        );
        return matchCashier && matchPayment && matchSearch;
    });

    const filteredLedger = (seniatReport?.ledger || []).filter(row => {
        return !q || (
            (row.receiptNumber && row.receiptNumber.toLowerCase().includes(q)) ||
            (row.customer && row.customer.toLowerCase().includes(q)) ||
            (row.customerDoc && row.customerDoc.toLowerCase().includes(q))
        );
    });

    const filteredShifts = (shiftsReport?.shifts || []).filter(s => {
        const matchCashier = selectedCashier === 'all' || (s.cashierName && s.cashierName.includes(selectedCashier));
        const matchSearch = !q || (
            (s.id && s.id.toLowerCase().includes(q)) ||
            (s.cajaName && s.cajaName.toLowerCase().includes(q)) ||
            (s.cashierName && s.cashierName.toLowerCase().includes(q))
        );
        return matchCashier && matchSearch;
    });

    const filteredInvoices = (invoicesReport?.invoices || []).filter(inv => {
        const matchCashier = selectedCashier === 'all' || (inv.cashier && inv.cashier.includes(selectedCashier));
        const matchPayment = selectedPaymentMethod === 'all' || inv.paymentMethod === selectedPaymentMethod;
        const matchSearch = !q || (
            (inv.receiptNumber && inv.receiptNumber.toLowerCase().includes(q)) ||
            (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
            (inv.cashier && inv.cashier.toLowerCase().includes(q)) ||
            (inv.paymentMethod && inv.paymentMethod.toLowerCase().includes(q)) ||
            (inv.reference && inv.reference.toLowerCase().includes(q))
        );
        return matchCashier && matchPayment && matchSearch;
    });

    const filteredCashiers = (cashierReport?.cashiers || []).filter(c => {
        const matchCashier = selectedCashier === 'all' || c.cashier.includes(selectedCashier);
        const matchSearch = !q || c.cashier.toLowerCase().includes(q);
        return matchCashier && matchSearch;
    });

    const filteredTopProducts = (topProductsReport?.items || []).filter(p => {
        return !q || (
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.brand && p.brand.toLowerCase().includes(q)) ||
            (p.rotationStatus && p.rotationStatus.toLowerCase().includes(q))
        );
    });

    const filteredSalesByBrand = (salesByBrandReport?.brands || []).filter(b => {
        return !q || (b.brand && b.brand.toLowerCase().includes(q));
    });

    const filteredCriticalStock = (stockReport?.criticalProducts || []).filter(p => {
        return !q || (
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.brand && p.brand.toLowerCase().includes(q))
        );
    });

    const filteredWarrantyReturns = (warrantyReturnsReport?.records || []).filter(r => {
        const matchCashier = selectedCashier === 'all' || (r.cashier && r.cashier.includes(selectedCashier));
        const matchSearch = !q || (
            (r.customer && r.customer.toLowerCase().includes(q)) ||
            (r.productName && r.productName.toLowerCase().includes(q)) ||
            (r.ticketNumber && r.ticketNumber.toLowerCase().includes(q)) ||
            (r.reason && r.reason.toLowerCase().includes(q))
        );
        return matchCashier && matchSearch;
    });

    const filteredHourlyTraffic = (hourlyTrafficReport?.hourlyData || []).filter(h => {
        return !q || (h.hourLabel && h.hourLabel.toLowerCase().includes(q));
    });

    const filteredPurchases = (purchasesReport?.purchasesList || []).filter(p => {
        const matchPayment = selectedPaymentMethod === 'all' || p.paymentMethod === selectedPaymentMethod;
        const matchSearch = !q || (
            (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
            (p.controlNumber && p.controlNumber.toLowerCase().includes(q)) ||
            (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
            (p.supplierRif && p.supplierRif.toLowerCase().includes(q))
        );
        return matchPayment && matchSearch;
    });

    if (loading && !summary) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-7 h-7 text-blue-600" />
                        Centro de Reportes y Auditoría
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Informes ejecutivos exportables: 3 administrativos, 5 gerenciales, 5 operativos y compras a proveedores.
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Filtro Rango de Tiempo */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold">
                        {[
                            { id: '1d', label: 'Hoy' },
                            { id: '7d', label: '7 Días' },
                            { id: '30d', label: '30 Días' },
                            { id: 'year', label: 'Año' },
                            { id: 'all', label: 'Histórico' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setDateRange(t.id)}
                                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                                    dateRange === t.id
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <Button variant="secondary" onClick={handlePrint} className="text-xs flex items-center gap-1.5 shadow-sm">
                        <Printer className="w-4 h-4" />
                        Imprimir
                    </Button>
                </div>
            </div>

            {/* Selector de Pilares Principales (Pestañas Superiores) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {reportCategories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = mainCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                                setMainCategory(cat.id);
                                setActiveReportId(cat.reports[0].id);
                            }}
                            className={`flex flex-col p-4 rounded-2xl border-2 text-left transition-all ${
                                isSelected
                                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {cat.badge}
                                </span>
                            </div>
                            <span className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{cat.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Sub-selector de Reportes dentro del Pilar Seleccionado */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                {reportCategories.find(c => c.id === mainCategory)?.reports.map((rep) => {
                    const RepIcon = rep.icon;
                    const isSubSelected = activeReportId === rep.id;
                    return (
                        <button
                            key={rep.id}
                            type="button"
                            onClick={() => setActiveReportId(rep.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                isSubSelected
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <RepIcon className="w-4 h-4 shrink-0" />
                            {rep.label}
                        </button>
                    );
                })}
            </div>

            {/* Centro de Filtrado Personalizado para Reportes y Auditorías */}
            <Card className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700/60 pb-2.5">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                            Centro de Filtrado Personalizado & Auditoría
                        </span>
                        {(tableSearch || selectedCashier !== 'all' || selectedPaymentMethod !== 'all' || dateRange === 'custom') && (
                            <Badge variant="primary" className="text-[10px]">Filtros Activos</Badge>
                        )}
                    </div>
                    {(tableSearch || selectedCashier !== 'all' || selectedPaymentMethod !== 'all' || dateRange === 'custom') && (
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-semibold transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Restablecer filtros
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {/* Búsqueda en vivo */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Búsqueda en Tabla / Cliente / Producto
                        </label>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                placeholder="Escribe para filtrar filas..."
                                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Filtro Cajero */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Cajero / Colaborador
                        </label>
                        <select
                            value={selectedCashier}
                            onChange={(e) => setSelectedCashier(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">Todos los cajeros</option>
                            <option value="Carlos Gómez">Carlos Gómez</option>
                            <option value="Valeria Morales">Valeria Morales</option>
                            <option value="Administrador General">Administrador General</option>
                        </select>
                    </div>

                    {/* Filtro Método de Pago */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Método de Pago
                        </label>
                        <select
                            value={selectedPaymentMethod}
                            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">Todos los métodos</option>
                            <option value="pagomovil">Pago Móvil (Bs.)</option>
                            <option value="punto_venta">Punto de Venta / Tarjeta</option>
                            <option value="zelle">Zelle (USD)</option>
                            <option value="efectivo_usd">Efectivo Divisas ($)</option>
                            <option value="efectivo_bs">Efectivo Bolívares</option>
                        </select>
                    </div>

                    {/* Rango de fecha */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Rango Temporal
                        </label>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600 dark:text-blue-400"
                        >
                            <option value="1d">Hoy (Turno diario)</option>
                            <option value="7d">Últimos 7 días</option>
                            <option value="30d">Últimos 30 días</option>
                            <option value="year">Año 2026 completo</option>
                            <option value="custom">📅 Rango personalizado...</option>
                        </select>
                    </div>
                </div>

                {/* Si es rango personalizado, mostrar selector de fechas desde/hasta */}
                {dateRange === 'custom' && (
                    <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-gray-500">Fecha Desde:</span>
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-gray-500">Fecha Hasta:</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                            />
                        </div>
                        <Button variant="primary" onClick={loadData} className="text-xs py-1.5">
                            Aplicar Período
                        </Button>
                    </div>
                )}
            </Card>

            {/* ========================================================================= */}
            {/* 1. REPORTES ADMINISTRATIVOS */}
            {/* ========================================================================= */}

            {/* 1.1 Reporte Fiscal SENIAT (IVA e IGTF) */}
            {activeReportId === 'fiscal' && seniatReport && (
                <div className="space-y-6">
                    {/* KPI Cards SENIAT */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Facturas / Tickets Emitidos</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {seniatReport.summary.totalInvoices} docs
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">Correlativo SENIAT activo</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Base Imponible Gravable (16%)</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {formatUSD(seniatReport.summary.taxableBaseUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(seniatReport.summary.taxableBaseBs)}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Débito Fiscal IVA (16%)</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                                {formatUSD(seniatReport.summary.totalTaxUsd)}
                            </p>
                            <p className="text-xs font-bold text-indigo-600 mt-0.5">
                                {formatBs(seniatReport.summary.totalTaxBs)}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-purple-600">
                            <p className="text-xs font-semibold text-purple-600">Percepción IGTF (3% Divisas)</p>
                            <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                                {formatUSD(seniatReport.summary.totalIgtfUsd)}
                            </p>
                            <p className="text-xs font-bold text-purple-600 mt-0.5">
                                {formatBs(seniatReport.summary.totalIgtfBs)}
                            </p>
                        </Card>
                    </div>

                    {/* Tabla de Libro de Ventas */}
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-blue-600" />
                                    Libro de Ventas Fiscal (Formato SENIAT)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Registro de comprobantes fiscales con número de control, RIF del cliente y desglose impositivo.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Libro de Ventas Fiscal SENIAT (IVA 16% / IGTF)"
                                categoryName="Reportes Administrativos"
                                columns={[
                                    { key: 'seq', header: 'N°' },
                                    { key: 'receiptNumber', header: 'Comprobante' },
                                    { key: 'date', header: 'Fecha' },
                                    { key: 'customer', header: 'Cliente' },
                                    { key: 'customerDoc', header: 'RIF/Cédula' },
                                    { key: 'bcvRate', header: 'Tasa BCV' },
                                    { key: 'taxableBaseUsd', header: 'Base ($)' },
                                    { key: 'taxUsd', header: 'IVA 16% ($)' },
                                    { key: 'igtfUsd', header: 'IGTF 3% ($)' },
                                    { key: 'totalUsd', header: 'Total ($)' },
                                    { key: 'totalBs', header: 'Total (Bs)' }
                                ]}
                                rows={filteredLedger}
                                summaryCards={[
                                    { label: 'Facturas Emitidas', value: `${filteredLedger.length} docs` },
                                    { label: 'Base Gravable', value: formatUSD(seniatReport.summary.taxableBaseUsd) },
                                    { label: 'Débito Fiscal IVA', value: formatUSD(seniatReport.summary.totalTaxUsd) },
                                    { label: 'IGTF 3% Divisas', value: formatUSD(seniatReport.summary.totalIgtfUsd) }
                                ]}
                                filename="Libro_Ventas_Fiscal_SENIAT"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredLedger, 'Libro_Ventas_Fiscal_SENIAT')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px] tracking-wider">
                                        <th className="px-3 py-3 text-left">N°</th>
                                        <th className="px-3 py-3 text-left">Comprobante</th>
                                        <th className="px-3 py-3 text-left">Fecha</th>
                                        <th className="px-3 py-3 text-left">Cliente / RIF</th>
                                        <th className="px-3 py-3 text-right">Tasa BCV</th>
                                        <th className="px-3 py-3 text-right">Base ($)</th>
                                        <th className="px-3 py-3 text-right">IVA 16% ($)</th>
                                        <th className="px-3 py-3 text-right">IGTF 3% ($)</th>
                                        <th className="px-3 py-3 text-right font-bold">Total ($ USD)</th>
                                        <th className="px-3 py-3 text-right font-bold text-emerald-600">Total (Bs.)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredLedger.map((row) => (
                                        <tr key={row.seq} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="px-3 py-2.5 text-gray-400 font-sans">{row.seq}</td>
                                            <td className="px-3 py-2.5 font-bold text-blue-600 dark:text-blue-400">{row.receiptNumber}</td>
                                            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 font-sans">{row.date}</td>
                                            <td className="px-3 py-2.5 font-sans">
                                                <div className="font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{row.customer}</div>
                                                <div className="text-[10px] text-gray-400">{row.customerDoc}</div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right text-gray-500">{formatBs(row.bcvRate)}</td>
                                            <td className="px-3 py-2.5 text-right">{formatUSD(row.taxableBaseUsd)}</td>
                                            <td className="px-3 py-2.5 text-right text-indigo-600 font-bold">{formatUSD(row.taxUsd)}</td>
                                            <td className="px-3 py-2.5 text-right text-purple-600">{formatUSD(row.igtfUsd)}</td>
                                            <td className="px-3 py-2.5 text-right font-bold text-gray-900 dark:text-white">{formatUSD(row.totalUsd)}</td>
                                            <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{formatBs(row.totalBs)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 1.2 Reporte Arqueo & Cierres de Caja (Cortes Z) */}
            {activeReportId === 'shifts' && shiftsReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Turnos Finalizados (Cortes Z)</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{filteredShifts.length}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Arqueos auditados</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Total Vendido en Turnos</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {formatUSD(shiftsReport.totalSalesInShiftsUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(toBs(shiftsReport.totalSalesInShiftsUsd))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-amber-600">
                            <p className="text-xs font-semibold text-amber-600">Diferencia Neta de Arqueo</p>
                            <p className={`text-2xl font-black mt-1 ${shiftsReport.totalDifferencesUsd < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {formatUSD(shiftsReport.totalDifferencesUsd)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Faltantes o sobrantes registrados</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-blue-600" />
                                Historial de Arqueos y Cierres de Caja
                            </h3>
                            <ExportButtonGroup
                                reportTitle="Arqueo y Cierres de Caja (Cortes Z)"
                                categoryName="Reportes Administrativos"
                                columns={[
                                    { key: 'id', header: 'Folio' },
                                    { key: 'cajaName', header: 'Caja' },
                                    { key: 'cashierName', header: 'Cajero' },
                                    { key: 'openedAt', header: 'Apertura' },
                                    { key: 'closedAt', header: 'Cierre' },
                                    { key: 'salesCount', header: 'Ventas' },
                                    { key: 'initialCashUsd', header: 'Inicial ($)' },
                                    { key: 'expectedCashUsd', header: 'Esperado ($)' },
                                    { key: 'countedCashUsd', header: 'Contado ($)' },
                                    { key: 'differenceUsd', header: 'Diferencia ($)' },
                                    { key: 'status', header: 'Estado' }
                                ]}
                                rows={filteredShifts}
                                summaryCards={[
                                    { label: 'Turnos Auditados', value: `${filteredShifts.length}` },
                                    { label: 'Total en Turnos', value: formatUSD(shiftsReport.totalSalesInShiftsUsd) },
                                    { label: 'Diferencia Neta', value: formatUSD(shiftsReport.totalDifferencesUsd) }
                                ]}
                                filename="Arqueos_Cierres_Cajas"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredShifts, 'Arqueos_Cajas')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">Folio</th>
                                        <th className="px-3 py-3 text-left">Terminal / Caja</th>
                                        <th className="px-3 py-3 text-left">Cajero</th>
                                        <th className="px-3 py-3 text-left">Apertura - Cierre</th>
                                        <th className="px-3 py-3 text-center">Ventas</th>
                                        <th className="px-3 py-3 text-right">Efectivo Inicial</th>
                                        <th className="px-3 py-3 text-right">Esperado Gaveta</th>
                                        <th className="px-3 py-3 text-right">Contado</th>
                                        <th className="px-3 py-3 text-right font-bold">Diferencia</th>
                                        <th className="px-3 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredShifts.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-3 font-bold text-blue-600">{s.id}</td>
                                            <td className="px-3 py-3 font-sans">
                                                <div className="font-bold text-gray-900 dark:text-white">{s.cajaName || 'Caja 1'}</div>
                                                <div className="text-[10px] text-gray-400">{s.cajaLocation}</div>
                                            </td>
                                            <td className="px-3 py-3 font-sans font-semibold text-gray-700 dark:text-gray-200">{s.cashierName}</td>
                                            <td className="px-3 py-3 font-sans text-gray-500 text-[10px]">
                                                <div>{s.openedAt ? new Date(s.openedAt).toLocaleTimeString('es-VE') : 'N/A'}</div>
                                                <div>{s.closedAt ? new Date(s.closedAt).toLocaleTimeString('es-VE') : 'En curso'}</div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold">{s.salesCount || 0}</td>
                                            <td className="px-3 py-3 text-right">{formatUSD(s.initialCashUsd || 0)}</td>
                                            <td className="px-3 py-3 text-right">{formatUSD(s.expectedCashUsd || 0)}</td>
                                            <td className="px-3 py-3 text-right font-bold">{formatUSD(s.countedCashUsd || 0)}</td>
                                            <td className={`px-3 py-3 text-right font-black ${
                                                (s.differenceUsd || 0) < 0 ? 'text-red-600' : (s.differenceUsd || 0) > 0 ? 'text-emerald-600' : 'text-gray-400'
                                            }`}>
                                                {formatUSD(s.differenceUsd || 0)}
                                            </td>
                                            <td className="px-3 py-3 text-center font-sans">
                                                <Badge variant={s.status === 'open' ? 'warning' : 'success'} className="text-[10px]">
                                                    {s.status === 'open' ? 'Abierto' : 'Cerrado ✓'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 1.3 Reporte Auditoría de Comprobantes & Ventas */}
            {activeReportId === 'invoices' && invoicesReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    Auditoría de Comprobantes y Transacciones
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Historial correlativo de facturación, estado de tickets y canal de pago.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Auditoría de Comprobantes y Transacciones"
                                categoryName="Reportes Administrativos"
                                columns={[
                                    { key: 'receiptNumber', header: 'Comprobante' },
                                    { key: 'date', header: 'Fecha' },
                                    { key: 'customerName', header: 'Cliente' },
                                    { key: 'cashier', header: 'Cajero' },
                                    { key: 'cajaName', header: 'Caja' },
                                    { key: 'paymentMethod', header: 'Método' },
                                    { key: 'itemsQuantity', header: 'Items' },
                                    { key: 'totalUsd', header: 'Total ($)' },
                                    { key: 'totalBs', header: 'Total (Bs)' }
                                ]}
                                rows={filteredInvoices}
                                summaryCards={[
                                    { label: 'Comprobantes', value: `${filteredInvoices.length}` },
                                    { label: 'Monto Total', value: formatUSD(filteredInvoices.reduce((a, b) => a + (Number(b.totalUsd) || 0), 0)) }
                                ]}
                                filename="Auditoria_Comprobantes"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredInvoices, 'Auditoria_Comprobantes')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">Comprobante</th>
                                        <th className="px-3 py-3 text-left">Fecha</th>
                                        <th className="px-3 py-3 text-left">Cliente</th>
                                        <th className="px-3 py-3 text-left">Cajero / Caja</th>
                                        <th className="px-3 py-3 text-left">Método de Pago</th>
                                        <th className="px-3 py-3 text-left">Referencia</th>
                                        <th className="px-3 py-3 text-center">Prendas</th>
                                        <th className="px-3 py-3 text-right font-bold">Total ($)</th>
                                        <th className="px-3 py-3 text-right font-bold text-emerald-600">Total (Bs.)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredInvoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-2.5 font-bold text-blue-600">{inv.receiptNumber}</td>
                                            <td className="px-3 py-2.5 font-sans text-gray-500">{new Date(inv.date).toLocaleDateString('es-VE')}</td>
                                            <td className="px-3 py-2.5 font-sans font-medium text-gray-800 dark:text-gray-200">{inv.customerName}</td>
                                            <td className="px-3 py-2.5 font-sans text-gray-600 dark:text-gray-400">
                                                {inv.cashier} • <span className="text-[10px] text-gray-400">{inv.cajaName}</span>
                                            </td>
                                            <td className="px-3 py-2.5 font-sans">
                                                <Badge variant="primary" className="text-[10px]">{inv.paymentMethod}</Badge>
                                            </td>
                                            <td className="px-3 py-2.5 text-gray-500">{inv.reference}</td>
                                            <td className="px-3 py-2.5 text-center font-bold">{inv.itemsQuantity}</td>
                                            <td className="px-3 py-2.5 text-right font-black text-gray-900 dark:text-white">{formatUSD(inv.totalUsd)}</td>
                                            <td className="px-3 py-2.5 text-right font-black text-emerald-600">{formatBs(inv.totalBs)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. REPORTES GERENCIALES */}
            {/* ========================================================================= */}

            {/* 2.1 Margen de Ganancia & Rentabilidad */}
            {activeReportId === 'profitability' && profitabilityReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Ingresos Totales (Ventas)</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {formatUSD(profitabilityReport.totalRevenueUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(toBs(profitabilityReport.totalRevenueUsd))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-amber-600">
                            <p className="text-xs font-semibold text-amber-600">Costo de Mercancía (COGS)</p>
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                                {formatUSD(profitabilityReport.totalCostUsd)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Costo de adquisición de inventario</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Utilidad Bruta (Ganancia)</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                {formatUSD(profitabilityReport.grossProfitUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(toBs(profitabilityReport.grossProfitUsd))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Margen de Rentabilidad Promedio</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                                {profitabilityReport.profitMarginPct}%
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Retorno sobre ventas</p>
                        </Card>
                    </div>

                    {/* Rentabilidad por Marca */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                                    <PieChart className="w-5 h-5 text-blue-600" />
                                    Rentabilidad y Margen por Marca
                                </h3>
                                <Badge variant="primary">Calzado</Badge>
                            </div>
                            <div className="space-y-3">
                                {profitabilityReport.byBrand.map((b) => (
                                    <div key={b.brand} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-sm text-gray-900 dark:text-white">{b.brand}</span>
                                            <span className="font-bold text-sm text-emerald-600">{formatUSD(b.profit)} ({b.marginPct}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, b.marginPct)}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                                            <span>Ventas: {formatUSD(b.revenue)} ({b.units} un.)</span>
                                            <span>Costo: {formatUSD(b.cost)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Rentabilidad por Categoría */}
                        <Card className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                                    Rentabilidad por Línea de Producto
                                </h3>
                                <Badge variant="primary">Categorías</Badge>
                            </div>
                            <div className="space-y-3">
                                {profitabilityReport.byCategory.map((c) => (
                                    <div key={c.category} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-sm text-gray-900 dark:text-white">{c.category}</span>
                                            <span className="font-bold text-sm text-indigo-600">{formatUSD(c.profit)} ({c.marginPct}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, c.marginPct)}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                                            <span>Ventas: {formatUSD(c.revenue)} ({c.units} un.)</span>
                                            <span>Costo: {formatUSD(c.cost)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* 2.2 Tendencias de Venta & Ticket Promedio */}
            {activeReportId === 'trends' && ticketReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Ticket Promedio por Venta</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {formatUSD(ticketReport.overallAvgTicket)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(toBs(ticketReport.overallAvgTicket))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Volumen del Período ({ticketReport.days}d)</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                {formatUSD(ticketReport.totalVolume)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{ticketReport.totalCount} transacciones</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Proyección Mensual Estimada</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                                {formatUSD(ticketReport.projectedMonthly)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Ritmo proyectado a 30 días</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Comportamiento Diario de Ventas & Ticket Promedio
                        </h3>
                        <div className="space-y-2">
                            {ticketReport.dailyTrend.slice(-14).map((day) => {
                                const maxVol = Math.max(...ticketReport.dailyTrend.map(d => d.revenue), 1);
                                const pct = (day.revenue / maxVol) * 100;
                                return (
                                    <div key={day.date} className="flex items-center gap-3 text-xs">
                                        <div className="w-24 text-gray-500 font-mono">{day.date} ({day.dayName})</div>
                                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-6 rounded-lg overflow-hidden flex items-center px-2">
                                            <div
                                                className="bg-blue-600 h-full rounded-md transition-all duration-500"
                                                style={{ width: `${Math.max(5, pct)}%` }}
                                            />
                                        </div>
                                        <div className="w-28 text-right font-bold text-gray-900 dark:text-white">{formatUSD(day.revenue)}</div>
                                        <div className="w-24 text-right text-gray-500 font-mono">Ticket: {formatUSD(day.avgTicket)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* 2.3 Rendimiento de Vendedores/Cajeros */}
            {activeReportId === 'cashiers' && cashierReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    Productividad y Eficiencia por Cajero
                                </h3>
                                <p className="text-xs text-gray-500">Métricas de facturación, volumen de artículos y comisión por colaborador.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Productividad y Rendimiento por Cajero/Vendedor"
                                categoryName="Reportes Gerenciales"
                                columns={[
                                    { key: 'cashier', header: 'Colaborador / Cajero' },
                                    { key: 'ticketsCount', header: 'Tickets Emitidos' },
                                    { key: 'itemsSold', header: 'Prendas Vendidas' },
                                    { key: 'avgTicketUsd', header: 'Ticket Promedio ($)' },
                                    { key: 'totalUsd', header: 'Total Facturado ($)' },
                                    { key: 'totalBs', header: 'Total (Bs.)' },
                                    { key: 'estimatedCommission', header: 'Comisión 2% ($)' }
                                ]}
                                rows={filteredCashiers}
                                summaryCards={[
                                    { label: 'Cajeros Auditados', value: `${filteredCashiers.length}` },
                                    { label: 'Total Recaudado', value: formatUSD(filteredCashiers.reduce((a, b) => a + (Number(b.totalUsd) || 0), 0)) }
                                ]}
                                filename="Rendimiento_Cajeros_Vendedores"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredCashiers, 'Rendimiento_Cajeros')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Colaborador / Cajero</th>
                                        <th className="px-4 py-3 text-center">Tickets Emitidos</th>
                                        <th className="px-4 py-3 text-center">Calzados/Prendas Vendidas</th>
                                        <th className="px-4 py-3 text-right">Ticket Promedio ($)</th>
                                        <th className="px-4 py-3 text-right font-bold">Total Facturado ($ USD)</th>
                                        <th className="px-4 py-3 text-right font-bold text-emerald-600">Total (Bs.)</th>
                                        <th className="px-4 py-3 text-right text-indigo-600 font-bold">Comisión Estimada (2%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredCashiers.map((c) => (
                                        <tr key={c.cashier} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-3 font-sans font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                    {c.cashier.charAt(0)}
                                                </div>
                                                {c.cashier}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-blue-600">{c.ticketsCount}</td>
                                            <td className="px-4 py-3 text-center">{c.itemsSold} un.</td>
                                            <td className="px-4 py-3 text-right font-bold">{formatUSD(c.avgTicketUsd)}</td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">{formatUSD(c.totalUsd)}</td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-600">{formatBs(c.totalBs)}</td>
                                            <td className="px-4 py-3 text-right font-black text-indigo-600">{formatUSD(c.estimatedCommission)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 2.4 Reporte Gerencial: Top Calzados Más Vendidos vs Rotación */}
            {activeReportId === 'top_products' && topProductsReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-amber-500">
                            <p className="text-xs font-semibold text-gray-500">Pares Vendidos (Top Catálogo)</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {topProductsReport.totalUnitsSold} pares
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Demanda acumulada en el período</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-blue-600">Facturación Generada</p>
                            <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                                {formatUSD(topProductsReport.totalRevenueUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(toBs(topProductsReport.totalRevenueUsd))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Modelo N° 1 en Ventas</p>
                            <p className="text-base font-black text-gray-900 dark:text-white mt-1 truncate">
                                {topProductsReport.items[0]?.name || 'N/A'}
                            </p>
                            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                                {topProductsReport.items[0]?.unitsSold || 0} pares comercializados
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Modelos en Análisis</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                                {filteredTopProducts.length}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Filtrados en reporte activo</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-amber-500" />
                                    Ranking de Calzados Más Vendidos vs Rotación de Inventario
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Control gerencial de velocidad de venta, stock disponible y proyección de agotamiento.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Top Calzados Más Vendidos vs Rotación de Inventario"
                                categoryName="Reportes Gerenciales"
                                columns={[
                                    { key: 'name', header: 'Calzado / Modelo' },
                                    { key: 'brand', header: 'Marca' },
                                    { key: 'unitsSold', header: 'Pares Vendidos' },
                                    { key: 'revenueUsd', header: 'Ventas ($)' },
                                    { key: 'revenueBs', header: 'Ventas (Bs.)' },
                                    { key: 'share', header: 'Cuota (%)' },
                                    { key: 'currentStock', header: 'Stock Actual' },
                                    { key: 'estimatedDaysStock', header: 'Días Stock' },
                                    { key: 'rotationStatus', header: 'Rotación' }
                                ]}
                                rows={filteredTopProducts}
                                summaryCards={[
                                    { label: 'Unidades Vendidas', value: `${topProductsReport.totalUnitsSold}` },
                                    { label: 'Ventas USD', value: formatUSD(topProductsReport.totalRevenueUsd) },
                                    { label: 'Modelos Evaluados', value: `${filteredTopProducts.length}` }
                                ]}
                                filename="Top_Calzados_Rotacion_Inventario"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredTopProducts, 'Top_Calzados_Rotacion')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-center">#</th>
                                        <th className="px-4 py-3 text-left">Calzado / Modelo</th>
                                        <th className="px-3 py-3 text-left">Marca</th>
                                        <th className="px-3 py-3 text-center font-bold">Pares Vendidos</th>
                                        <th className="px-4 py-3 text-right font-bold">Venta ($ USD)</th>
                                        <th className="px-4 py-3 text-right font-bold text-emerald-600">Venta (Bs.)</th>
                                        <th className="px-3 py-3 text-center">Cuota</th>
                                        <th className="px-3 py-3 text-center">Stock Almacén</th>
                                        <th className="px-3 py-3 text-center">Días de Stock</th>
                                        <th className="px-3 py-3 text-center">Velocidad / Rotación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredTopProducts.map((p, idx) => (
                                        <tr key={p.id + idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-3 text-center font-bold text-gray-400">#{idx + 1}</td>
                                            <td className="px-4 py-3 font-sans font-bold text-gray-900 dark:text-white">
                                                {p.name}
                                            </td>
                                            <td className="px-3 py-3 font-sans font-semibold text-gray-600 dark:text-gray-300">
                                                {p.brand}
                                            </td>
                                            <td className="px-3 py-3 text-center font-black text-amber-600">
                                                {p.unitsSold} pares
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                                                {formatUSD(p.revenueUsd)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-600">
                                                {formatBs(p.revenueBs)}
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-blue-600">
                                                {p.share}%
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-gray-700 dark:text-gray-300">
                                                {p.currentStock} un.
                                            </td>
                                            <td className="px-3 py-3 text-center text-gray-500 font-sans">
                                                {p.estimatedDaysStock > 90 ? '> 90 días' : `${p.estimatedDaysStock} días`}
                                            </td>
                                            <td className="px-3 py-3 text-center font-sans">
                                                <Badge
                                                    variant={p.rotationStatus === 'Alta Rotación' ? 'success' : (p.rotationStatus === 'Rotación Media' ? 'primary' : 'secondary')}
                                                    className="text-[10px]"
                                                >
                                                    {p.rotationStatus}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTopProducts.length === 0 && (
                                        <tr>
                                            <td colSpan="10" className="px-4 py-8 text-center text-gray-400 font-sans">
                                                No se encontraron modelos que coincidan con la búsqueda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 2.5 Reporte Gerencial: Ventas y Cuota de Mercado por Marca */}
            {activeReportId === 'sales_by_brand' && salesByBrandReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Marcas Registradas</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {salesByBrandReport.totalBrands} firmas
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Nike, Jordan, Adidas, New Balance...</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Marca Líder en Ingresos</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                                {salesByBrandReport.brands[0]?.brand || 'N/A'}
                            </p>
                            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                                {salesByBrandReport.brands[0]?.share || 0}% de cuota de mercado
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-purple-600">
                            <p className="text-xs font-semibold text-purple-600">Facturación Acumulada</p>
                            <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                                {formatUSD(salesByBrandReport.brands.reduce((acc, b) => acc + b.revenueUsd, 0))}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(toBs(salesByBrandReport.brands.reduce((acc, b) => acc + b.revenueUsd, 0)))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Total Unidades Comercializadas</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                                {salesByBrandReport.brands.reduce((acc, b) => acc + b.unitsSold, 0)} pares
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Consolidado general</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-600" />
                                    Participación de Mercado y Ventas Consolidadas por Marca
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Desglose comercial para toma de decisiones en abastecimiento y compras directas.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Participación de Mercado y Ventas por Marca"
                                categoryName="Reportes Gerenciales"
                                columns={[
                                    { key: 'brand', header: 'Marca' },
                                    { key: 'unitsSold', header: 'Pares Vendidos' },
                                    { key: 'revenueUsd', header: 'Ventas ($)' },
                                    { key: 'revenueBs', header: 'Ventas (Bs.)' },
                                    { key: 'share', header: 'Cuota de Mercado (%)' },
                                    { key: 'avgTicketUsd', header: 'Ticket Promedio ($)' }
                                ]}
                                rows={filteredSalesByBrand}
                                summaryCards={[
                                    { label: 'Marcas Evaluadas', value: `${salesByBrandReport.totalBrands}` },
                                    { label: 'Total Facturado', value: formatUSD(salesByBrandReport.brands.reduce((acc, b) => acc + b.revenueUsd, 0)) }
                                ]}
                                filename="Participacion_Mercado_Por_Marca"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredSalesByBrand, 'Ventas_Por_Marca')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Marca</th>
                                        <th className="px-4 py-3 text-center font-bold">Pares Vendidos</th>
                                        <th className="px-4 py-3 text-right font-bold">Total Facturado ($ USD)</th>
                                        <th className="px-4 py-3 text-right font-bold text-emerald-600">Total Facturado (Bs.)</th>
                                        <th className="px-4 py-3 text-left">Cuota de Mercado</th>
                                        <th className="px-4 py-3 text-right">Ticket Promedio ($)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredSalesByBrand.map((b) => (
                                        <tr key={b.brand} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-3 font-sans font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-center font-black text-xs">
                                                    {b.brand.substring(0, 2).toUpperCase()}
                                                </div>
                                                {b.brand}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-blue-600">
                                                {b.unitsSold} pares
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                                                {formatUSD(b.revenueUsd)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-600">
                                                {formatBs(b.revenueBs)}
                                            </td>
                                            <td className="px-4 py-3 font-sans">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-blue-600 h-full rounded-full"
                                                            style={{ width: `${Math.min(100, b.share)}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{b.share}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">
                                                {formatUSD(b.avgTicketUsd)}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredSalesByBrand.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-gray-400 font-sans">
                                                No se encontraron marcas para el filtro aplicado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 3. REPORTES OPERATIVOS */}
            {/* ========================================================================= */}

            {/* 3.1 Stock Crítico & Valorización */}
            {activeReportId === 'stock' && stockReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Unidades en Almacén</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {stockReport.totalUnitsInWarehouse} pares
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{stockReport.totalProducts} modelos registrados</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-amber-600">
                            <p className="text-xs font-semibold text-amber-600">Valorización a Costo</p>
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                                {formatUSD(stockReport.totalCostValuationUsd)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Capital invertido en stock</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Valorización a PVP (Venta)</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                {formatUSD(stockReport.totalPriceValuationUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(toBs(stockReport.totalPriceValuationUsd))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-red-600">
                            <p className="text-xs font-semibold text-red-600">Alertas de Quiebre de Stock</p>
                            <p className="text-2xl font-black text-red-600 mt-1">
                                {stockReport.criticalCount + stockReport.outOfStockCount}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{stockReport.outOfStockCount} agotados / {stockReport.criticalCount} bajo mínimo</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Calzados con Stock Crítico (Reposición Urgente Requerida)
                            </h3>
                            <ExportButtonGroup
                                reportTitle="Stock Crítico y Alertas de Reposición"
                                categoryName="Reportes Operativos"
                                columns={[
                                    { key: 'name', header: 'Calzado / Modelo' },
                                    { key: 'sku', header: 'SKU' },
                                    { key: 'brand', header: 'Marca' },
                                    { key: 'stock', header: 'Stock Actual' },
                                    { key: 'minStock', header: 'Mínimo' },
                                    { key: 'cost', header: 'Costo ($)' },
                                    { key: 'price', header: 'PVP ($)' }
                                ]}
                                rows={filteredCriticalStock}
                                summaryCards={[
                                    { label: 'Pares en Almacén', value: `${stockReport.totalUnitsInWarehouse}` },
                                    { label: 'Valorización Costo', value: formatUSD(stockReport.totalCostValuationUsd) },
                                    { label: 'Valorización PVP', value: formatUSD(stockReport.totalPriceValuationUsd) },
                                    { label: 'Alertas Quiebre', value: `${filteredCriticalStock.length}` }
                                ]}
                                filename="Stock_Critico_Almacen"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredCriticalStock, 'Stock_Critico')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Calzado</th>
                                        <th className="px-4 py-3 text-left">SKU</th>
                                        <th className="px-4 py-3 text-left">Marca</th>
                                        <th className="px-4 py-3 text-left">Proveedor</th>
                                        <th className="px-4 py-3 text-center">Stock Actual</th>
                                        <th className="px-4 py-3 text-center">Mínimo</th>
                                        <th className="px-4 py-3 text-right">Costo ($)</th>
                                        <th className="px-4 py-3 text-right">PVP ($)</th>
                                        <th className="px-4 py-3 text-center">Urgencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredCriticalStock.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-3 font-sans font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} alt={p.name} className="w-9 h-9 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shrink-0" />
                                                ) : (
                                                    <span className="text-xl">👟</span>
                                                )}
                                                {p.name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                                            <td className="px-4 py-3 font-sans">{p.brand}</td>
                                            <td className="px-4 py-3 font-sans text-xs text-gray-700 dark:text-gray-300">
                                                <div className="flex items-center gap-1.5 truncate max-w-[150px]" title={p.supplierName}>
                                                    <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                    <span className="truncate">{p.supplierName || 'Distribuidora Ávila C.A.'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-amber-600">{p.stock} pares</td>
                                            <td className="px-4 py-3 text-center text-gray-400">{p.minStock}</td>
                                            <td className="px-4 py-3 text-right">{formatUSD(p.cost)}</td>
                                            <td className="px-4 py-3 text-right font-bold">{formatUSD(p.price)}</td>
                                            <td className="px-4 py-3 text-center font-sans">
                                                <Badge variant="warning" className="text-[10px]">Pedir Reposición</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 3.2 Conciliación de Pagos & Bancos */}
            {activeReportId === 'payments' && paymentReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Métodos de Pago */}
                        <Card className="p-6 space-y-4">
                            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                                Desglose por Método de Pago
                            </h3>
                            <div className="space-y-3">
                                {paymentReport.methods.map((m) => (
                                    <div key={m.method} className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 dark:text-white">{m.label}</p>
                                            <p className="text-[11px] text-gray-400">{m.count} transacciones realizadas</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-base text-gray-900 dark:text-white">{formatUSD(m.totalUsd)}</p>
                                            <p className="text-xs font-bold text-emerald-600">{formatBs(m.totalBs)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Conciliación por Banco */}
                        <Card className="p-6 space-y-4">
                            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                                Conciliación por Banco Receptor en Venezuela
                            </h3>
                            <div className="space-y-3">
                                {paymentReport.banks.map((b) => (
                                    <div key={b.bank} className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 dark:text-white">{b.bank}</p>
                                            <p className="text-[11px] text-gray-400">{b.count} operaciones conciliadas</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-base text-gray-900 dark:text-white">{formatUSD(b.totalUsd)}</p>
                                            <p className="text-xs font-bold text-indigo-600">{formatBs(b.totalBs)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* 3.3 Logística de Delivery & Envíos */}
            {activeReportId === 'logistics' && logisticsReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Envíos a Domicilio / Nacionales</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{logisticsReport.totalDeliveries} pedidos</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{logisticsReport.pickupInStore} retiros en tienda física</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Fletes / Delivery Cobrado</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                {formatUSD(logisticsReport.totalShippingCollectedUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(toBs(logisticsReport.totalShippingCollectedUsd))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Tasa de Efectividad en Envíos</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">98.5%</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Entregas dentro de la ventana horaria</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-600" />
                            Distribución por Empresa de Encomienda & Delivery Local
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {logisticsReport.carriers.map((c) => (
                                <div key={c.carrier} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">{c.name}</span>
                                        <Badge variant="primary">{c.count} envíos</Badge>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Flete Acumulado:</span>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{formatUSD(c.revenueUsd)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* 3.4 Reporte Operativo: Control de Cambios de Talla y Garantías */}
            {activeReportId === 'warranty_returns' && warrantyReturnsReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Solicitudes Gestionadas</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {warrantyReturnsReport.totalReturns} casos
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">En el período consultado</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Casos Resueltos con Éxito</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                {warrantyReturnsReport.approvedCount} aprobados
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">100% efectividad de respuesta</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-amber-600">
                            <p className="text-xs font-semibold text-amber-600">Motivo Principal</p>
                            <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
                                Ajuste de Horma
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">75% cambio por talla perfecta</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Costo para el Cliente</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                                $0.00
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Garantía total UrbanStep Store</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <RefreshCw className="w-5 h-5 text-blue-600" />
                                    Control Operativo de Cambios de Talla y Garantías
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Auditoría de postventa, cambios de horma y reposiciones de fábrica autorizadas.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Control Operativo de Cambios de Talla y Garantías"
                                categoryName="Reportes Operativos"
                                columns={[
                                    { key: 'id', header: 'Folio' },
                                    { key: 'ticketNumber', header: 'Ticket Origen' },
                                    { key: 'customer', header: 'Cliente' },
                                    { key: 'phone', header: 'Teléfono' },
                                    { key: 'productName', header: 'Calzado' },
                                    { key: 'originalSize', header: 'Talla Orig.' },
                                    { key: 'newSize', header: 'Nueva Talla' },
                                    { key: 'type', header: 'Tipo' },
                                    { key: 'reason', header: 'Motivo' },
                                    { key: 'cashier', header: 'Cajero' },
                                    { key: 'status', header: 'Estado' }
                                ]}
                                rows={filteredWarrantyReturns}
                                summaryCards={[
                                    { label: 'Casos Totales', value: `${warrantyReturnsReport.totalReturns}` },
                                    { label: 'Aprobados', value: `${warrantyReturnsReport.approvedCount}` },
                                    { label: 'Costo Cliente', value: '$0.00' }
                                ]}
                                filename="Garantias_Cambios_Talla"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredWarrantyReturns, 'Garantias_Cambios')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">Folio / Ticket</th>
                                        <th className="px-3 py-3 text-left">Cliente / Contacto</th>
                                        <th className="px-4 py-3 text-left">Calzado Involucrado</th>
                                        <th className="px-3 py-3 text-center">Talla: Ant. → Nueva</th>
                                        <th className="px-3 py-3 text-left">Tipo de Gestión</th>
                                        <th className="px-4 py-3 text-left">Motivo / Detalle</th>
                                        <th className="px-3 py-3 text-left">Cajero</th>
                                        <th className="px-3 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredWarrantyReturns.map((r) => (
                                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-3">
                                                <div className="font-bold text-blue-600">{r.id}</div>
                                                <div className="text-[10px] text-gray-400 font-sans">{r.ticketNumber}</div>
                                            </td>
                                            <td className="px-3 py-3 font-sans">
                                                <div className="font-bold text-gray-900 dark:text-white">{r.customer}</div>
                                                <div className="text-[10px] text-gray-400">{r.phone}</div>
                                            </td>
                                            <td className="px-4 py-3 font-sans font-bold text-gray-800 dark:text-gray-200">
                                                {r.productName}
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold">
                                                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                                                    {r.originalSize}
                                                </span>
                                                <span className="mx-1 text-gray-400">→</span>
                                                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black">
                                                    {r.newSize}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 font-sans">
                                                <Badge variant={r.type.includes('Garantía') ? 'warning' : 'primary'} className="text-[10px]">
                                                    {r.type}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 font-sans text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={r.reason}>
                                                {r.reason}
                                            </td>
                                            <td className="px-3 py-3 font-sans text-gray-600 dark:text-gray-400 font-semibold">
                                                {r.cashier}
                                            </td>
                                            <td className="px-3 py-3 text-center font-sans">
                                                <Badge variant="success" className="text-[10px]">
                                                    {r.status} ✓
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredWarrantyReturns.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-8 text-center text-gray-400 font-sans">
                                                No hay registros de garantías o cambios que coincidan con la búsqueda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 3.5 Reporte Operativo: Auditoría de Tráfico Horario y Picos de Venta */}
            {activeReportId === 'hourly_traffic' && hourlyTrafficReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-amber-500">
                            <p className="text-xs font-semibold text-gray-500">Hora Pico de Mayor Afluencia</p>
                            <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
                                {hourlyTrafficReport.peakHour}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Mayor volumen en caja</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-blue-600">Operaciones en Hora Pico</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {hourlyTrafficReport.peakHourTransactions} tickets
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">En la ventana horaria cúspide</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Transacciones Totales Auditadas</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                {hourlyTrafficReport.totalTransactions} ventas
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">En horario comercial</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-purple-600">
                            <p className="text-xs font-semibold text-purple-600">Ventana Operativa</p>
                            <p className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">
                                08:00 AM - 08:00 PM
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">12 horas continuas</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    Auditoría de Tráfico Horario y Picos de Venta
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Planificación de personal en caja y soporte logístico según horario de concurrencia.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Auditoría de Tráfico Horario y Picos de Venta"
                                categoryName="Reportes Operativos"
                                columns={[
                                    { key: 'hourLabel', header: 'Franja Horaria' },
                                    { key: 'transactionsCount', header: 'Tickets Procesados' },
                                    { key: 'unitsSold', header: 'Pares Vendidos' },
                                    { key: 'revenueUsd', header: 'Ventas ($)' },
                                    { key: 'revenueBs', header: 'Ventas (Bs.)' }
                                ]}
                                rows={filteredHourlyTraffic}
                                summaryCards={[
                                    { label: 'Hora Pico', value: hourlyTrafficReport.peakHour },
                                    { label: 'Tickets en Pico', value: `${hourlyTrafficReport.peakHourTransactions}` },
                                    { label: 'Total Tickets', value: `${hourlyTrafficReport.totalTransactions}` }
                                ]}
                                filename="Trafico_Horario_Ventas"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredHourlyTraffic, 'Trafico_Horario')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Franja Horaria</th>
                                        <th className="px-3 py-3 text-center font-bold">Tickets Emitidos</th>
                                        <th className="px-3 py-3 text-center">Pares Vendidos</th>
                                        <th className="px-4 py-3 text-right font-bold">Facturado ($ USD)</th>
                                        <th className="px-4 py-3 text-right font-bold text-emerald-600">Facturado (Bs.)</th>
                                        <th className="px-4 py-3 text-left">Carga Operativa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredHourlyTraffic.map((h) => {
                                        const maxT = Math.max(...hourlyTrafficReport.hourlyData.map(d => d.transactionsCount), 1);
                                        const intensityPct = (h.transactionsCount / maxT) * 100;
                                        const isPeak = h.hourLabel === hourlyTrafficReport.peakHour;
                                        return (
                                            <tr key={h.hour} className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 ${isPeak ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}>
                                                <td className="px-4 py-3 font-sans font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    {isPeak && <span className="text-amber-500 font-bold" title="Hora Pico">🔥</span>}
                                                    {h.hourLabel}
                                                </td>
                                                <td className="px-3 py-3 text-center font-black text-blue-600">
                                                    {h.transactionsCount}
                                                </td>
                                                <td className="px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                                                    {h.unitsSold} un.
                                                </td>
                                                <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                                                    {formatUSD(h.revenueUsd)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-black text-emerald-600">
                                                    {formatBs(h.revenueBs)}
                                                </td>
                                                <td className="px-4 py-3 font-sans">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-28 bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    isPeak ? 'bg-amber-500' : intensityPct > 50 ? 'bg-blue-600' : 'bg-gray-400'
                                                                }`}
                                                                style={{ width: `${Math.max(6, intensityPct)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-500">
                                                            {Math.round(intensityPct)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredHourlyTraffic.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-gray-400 font-sans">
                                                No hay registros horarios para el filtro aplicado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 4. COMPRAS & PROVEEDORES */}
            {/* ========================================================================= */}

            {activeReportId === 'purchases_list' && purchasesReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Facturas de Compra a Proveedores</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{purchasesReport.totalPurchases}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{purchasesReport.totalUnitsPurchased} pares adquiridos</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-amber-600">
                            <p className="text-xs font-semibold text-amber-600">Total Invertido en Reposición</p>
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                                {formatUSD(purchasesReport.totalSpentUsd)}
                            </p>
                            <p className="text-xs font-bold text-amber-600 mt-0.5">
                                {formatBs(purchasesReport.totalSpentBs)}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Proveedores Activos</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {purchasesReport.bySupplier.length}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Alianzas comerciales directas</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                                    Facturas y Entradas de Almacén (Compras)
                                </h3>
                                <p className="text-xs text-gray-500">Registro de adquisiciones a proveedores de calzado y costos unitarios de entrada.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Facturas de Compras y Entradas de Almacén"
                                categoryName="Compras y Proveedores"
                                columns={[
                                    { key: 'invoiceNumber', header: 'Factura N°' },
                                    { key: 'controlNumber', header: 'Control SENIAT' },
                                    { key: 'supplierName', header: 'Proveedor' },
                                    { key: 'supplierRif', header: 'RIF Proveedor' },
                                    { key: 'date', header: 'Fecha' },
                                    { key: 'itemsCount', header: 'Unidades' },
                                    { key: 'paymentMethod', header: 'Forma de Pago' },
                                    { key: 'totalUsd', header: 'Total ($)' },
                                    { key: 'totalBs', header: 'Total (Bs.)' },
                                    { key: 'status', header: 'Estado' }
                                ]}
                                rows={filteredPurchases}
                                summaryCards={[
                                    { label: 'Facturas Registradas', value: `${filteredPurchases.length}` },
                                    { label: 'Pares Adquiridos', value: `${purchasesReport.totalUnitsPurchased}` },
                                    { label: 'Total Invertido', value: formatUSD(purchasesReport.totalSpentUsd) }
                                ]}
                                filename="Facturas_Compras_Proveedores"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredPurchases, 'Facturas_Compras_Proveedores')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Factura N°</th>
                                        <th className="px-4 py-3 text-left">Control SENIAT</th>
                                        <th className="px-4 py-3 text-left">Proveedor / RIF</th>
                                        <th className="px-4 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-center">Unidades</th>
                                        <th className="px-4 py-3 text-left">Forma de Pago</th>
                                        <th className="px-4 py-3 text-right font-bold">Total ($ USD)</th>
                                        <th className="px-4 py-3 text-right font-bold text-emerald-600">Total (Bs.)</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredPurchases.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-3 font-bold text-blue-600">{p.invoiceNumber}</td>
                                            <td className="px-4 py-3 text-gray-500">{p.controlNumber}</td>
                                            <td className="px-4 py-3 font-sans">
                                                <div className="font-bold text-gray-900 dark:text-white">{p.supplierName}</div>
                                                <div className="text-[10px] text-gray-400">{p.supplierRif}</div>
                                            </td>
                                            <td className="px-4 py-3 font-sans text-gray-500">{new Date(p.date).toLocaleDateString('es-VE')}</td>
                                            <td className="px-4 py-3 text-center font-bold">{p.itemsCount} pares</td>
                                            <td className="px-4 py-3 font-sans capitalize">{p.paymentMethod}</td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">{formatUSD(p.totalUsd)}</td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-600">{formatBs(p.totalBs)}</td>
                                            <td className="px-4 py-3 text-center font-sans">
                                                <Badge variant={p.status === 'recibida' ? 'success' : 'warning'} className="text-[10px]">
                                                    {p.status === 'recibida' ? 'Recibida en Almacén ✓' : 'En Tránsito'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
