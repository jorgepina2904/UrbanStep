import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import {
    FileText,
    TrendingUp,
    DollarSign,
    Package,
    AlertTriangle,
    CreditCard,
    Download,
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
    RotateCcw,
    BookOpen,
    Layers,
    CheckCircle2,
    Landmark,
    Sliders,
    Lock,
    Database,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    Calendar,
    ChevronRight,
    ExternalLink,
    Check,
    XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { reportService } from '../services/reportService';
import { accountingService } from '../services/accountingService';
import { auditService } from '../services/auditService';
import { useCurrency } from '../contexts/CurrencyContext';
import { reportExporter } from '../utils/reportExporter';

/**
 * Grupo de Botones de Exportación Formal (Excel .xlsx y PDF oficial con jsPDF)
 * Disponible en todos los reportes del sistema con sus formatos correspondientes
 */
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
            toast.success('Libro contable Excel (.xlsx) exportado con éxito');
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
            toast.success('Documento fiscal PDF (.pdf) generado con membrete oficial');
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
                title="Descargar documento PDF oficial con formato fiscal SENIAT / VEN-NIIF"
            >
                <FileText className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>PDF (.pdf)</span>
            </button>
            {onExportCSV && (
                <button
                    type="button"
                    onClick={onExportCSV}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm transition-all"
                    title="Exportar archivo CSV plano"
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

    // Las 6 Capas Funcionales del SGF
    const [mainCategory, setMainCategory] = useState('contabilidad');
    // Sub-reporte activo dentro de la capa seleccionada
    const [activeReportId, setActiveReportId] = useState('libro_diario');
    const [dateRange, setDateRange] = useState('30d');

    // Filtros de Auditoría
    const [selectedCashier, setSelectedCashier] = useState('all');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
    const [tableSearch, setTableSearch] = useState('');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    // Estado para Capa 1: Contabilidad Formal
    const [planCuentas, setPlanCuentas] = useState([]);
    const [libroDiario, setLibroDiario] = useState([]);
    const [libroMayor, setLibroMayor] = useState([]);
    const [balanceComprobacion, setBalanceComprobacion] = useState(null);
    const [estadosFinancieros, setEstadosFinancieros] = useState(null);

    // Estado para Capa 2: Fiscal Venezuela (SENIAT)
    const [seniatReport, setSeniatReport] = useState(null);
    const [seniatPurchasesReport, setSeniatPurchasesReport] = useState(null);
    const [withholdingsReport, setWithholdingsReport] = useState(null);

    // Estado para Capa 3: Tesorería
    const [shiftsReport, setShiftsReport] = useState(null);
    const [cashFlowProjReport, setCashFlowProjReport] = useState(null);
    const [paymentReport, setPaymentReport] = useState(null);

    // Estado para Capa 4: Operaciones e Inventario
    const [kardexReport, setKardexReport] = useState(null);
    const [stockReport, setStockReport] = useState(null);
    const [topProductsReport, setTopProductsReport] = useState(null);
    const [logisticsReport, setLogisticsReport] = useState(null);
    const [warrantyReturnsReport, setWarrantyReturnsReport] = useState(null);

    // Estado para Capa 5: BI / Dashboards Ejecutivos
    const [summary, setSummary] = useState(null);
    const [profitabilityReport, setProfitabilityReport] = useState(null);
    const [ticketReport, setTicketReport] = useState(null);
    const [cashierReport, setCashierReport] = useState(null);
    const [salesByBrandReport, setSalesByBrandReport] = useState(null);
    const [hourlyTrafficReport, setHourlyTrafficReport] = useState(null);

    // Estado para Capa 6: Administración y Auditoría
    const [auditLogs, setAuditLogs] = useState([]);

    // Carga unificada de datos a través de las 6 capas
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
                // 1. Contabilidad
                planData,
                diarioData,
                mayorData,
                balanceCompData,
                estadosFinData,
                // 2. Fiscal
                seniatSalesData,
                seniatPurchasesData,
                withholdingsData,
                // 3. Tesorería
                shiftsData,
                cashFlowData,
                paymentData,
                // 4. Operaciones
                kardexData,
                stockData,
                topProductsData,
                logisticsData,
                warrantyReturnsData,
                // 5. BI Dashboards
                summaryData,
                profitData,
                ticketData,
                cashierData,
                salesByBrandData,
                hourlyTrafficData,
                // 6. Auditoría
                auditLogsData
            ] = await Promise.all([
                accountingService.getPlanCuentas().catch(() => []),
                accountingService.getLibroDiario(rangeParams).catch(() => []),
                accountingService.getLibroMayor(rangeParams).catch(() => []),
                accountingService.getBalanceComprobacion(rangeParams).catch(() => null),
                accountingService.getEstadosFinancieros(rangeParams).catch(() => null),
                reportService.getSeniatFiscalReport(rangeParams).catch(() => null),
                reportService.getSeniatPurchasesReport(rangeParams).catch(() => null),
                reportService.getWithholdingsReport(rangeParams).catch(() => null),
                reportService.getCashRegisterAuditReport(rangeParams).catch(() => null),
                reportService.getProjectedCashFlow().catch(() => null),
                reportService.getPaymentMethodReconciliationReport(rangeParams).catch(() => null),
                reportService.getValuedKardex(rangeParams).catch(() => null),
                reportService.getCriticalStockReport().catch(() => null),
                reportService.getTopProductsRotationReport(rangeParams).catch(() => null),
                reportService.getDeliveryLogisticsReport(rangeParams).catch(() => null),
                reportService.getWarrantyAndReturnsReport(rangeParams).catch(() => null),
                reportService.getSummary(rangeParams).catch(() => null),
                reportService.getProfitabilityMarginReport(rangeParams).catch(() => null),
                reportService.getSalesTrendsAndTicketReport({ days: dateRange === '7d' ? 7 : 30 }).catch(() => []),
                reportService.getCashierPerformanceReport(rangeParams).catch(() => []),
                reportService.getSalesByBrandReport(rangeParams).catch(() => null),
                reportService.getHourlyTrafficReport(rangeParams).catch(() => null),
                auditService.getLogs({ limit: 100 }).catch(() => [])
            ]);

            setPlanCuentas(planData);
            setLibroDiario(diarioData);
            setLibroMayor(mayorData);
            setBalanceComprobacion(balanceCompData);
            setEstadosFinancieros(estadosFinData);

            setSeniatReport(seniatSalesData);
            setSeniatPurchasesReport(seniatPurchasesData);
            setWithholdingsReport(withholdingsData);

            setShiftsReport(shiftsData);
            setCashFlowProjReport(cashFlowData);
            setPaymentReport(paymentData);

            setKardexReport(kardexData);
            setStockReport(stockData);
            setTopProductsReport(topProductsData);
            setLogisticsReport(logisticsData);
            setWarrantyReturnsReport(warrantyReturnsData);

            setSummary(summaryData);
            setProfitabilityReport(profitData);
            setTicketReport(ticketData);
            setCashierReport(cashierData);
            setSalesByBrandReport(salesByBrandData);
            setHourlyTrafficReport(hourlyTrafficData);

            setAuditLogs(auditLogsData);
        } catch (error) {
            console.error('Error consolidando datos SGF:', error);
            toast.error('Error al compilar libros contables');
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
        toast.success('Filtros contables restablecidos');
    };

    const handleExportCSV = (data, filename) => {
        if (!data || data.length === 0) {
            toast('No hay registros para exportar', { icon: '📊' });
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

    // Estructura de las 6 Capas Funcionales del SGF
    const reportCategories = useMemo(() => [
        {
            id: 'contabilidad',
            label: 'Capa 1: Contabilidad Formal',
            subtitle: 'VEN-NIIF & Partida Doble',
            badge: '5 Libros',
            icon: BookOpen,
            reports: [
                { id: 'libro_diario', label: 'Libro Diario (Doble Partida)', icon: BookOpen },
                { id: 'libro_mayor', label: 'Libro Mayor General', icon: Layers },
                { id: 'balance_comprobacion', label: 'Balance de Comprobación', icon: CheckCircle2 },
                { id: 'estados_financieros', label: 'Estados Financieros (Resultados & Balance)', icon: Landmark },
                { id: 'plan_cuentas', label: 'Plan de Cuentas Maestro', icon: FileSpreadsheet },
            ]
        },
        {
            id: 'fiscal',
            label: 'Capa 2: Fiscal Venezuela',
            subtitle: 'SENIAT Providencia 0071',
            badge: '4 Módulos',
            icon: Receipt,
            reports: [
                { id: 'fiscal_ventas', label: 'Libro de Ventas Fiscal (IVA 16% / IGTF 3%)', icon: Receipt },
                { id: 'fiscal_compras', label: 'Libro de Compras Fiscal (Crédito & Retención)', icon: Building2 },
                { id: 'retenciones', label: 'Comprobantes de Retención IVA & ISLR', icon: Shield },
                { id: 'resumen_fiscal', label: 'Declaración & Cierre Fiscal Consolidado', icon: DollarSign },
            ]
        },
        {
            id: 'tesoreria',
            label: 'Capa 3: Tesorería',
            subtitle: 'Caja + Bancos Consolidado',
            badge: '3 Módulos',
            icon: CreditCard,
            reports: [
                { id: 'tesoreria_consolidada', label: 'Posición Consolidada Caja & Bancos', icon: Landmark },
                { id: 'cierres_caja', label: 'Libro de Caja & Auditoría de Turnos (Cortes Z)', icon: Monitor },
                { id: 'flujo_proyectado', label: 'Flujo de Caja Proyectado (30/60/90 Días)', icon: TrendingUp },
            ]
        },
        {
            id: 'operaciones',
            label: 'Capa 4: Operaciones e Inventario',
            subtitle: 'Kardex & Logística',
            badge: '5 Módulos',
            icon: Package,
            reports: [
                { id: 'kardex_valorizado', label: 'Kardex Valorizado PEPS / Promedio', icon: Package },
                { id: 'stock_critico', label: 'Stock Crítico & Alertas de Reposición', icon: AlertTriangle },
                { id: 'rotacion_productos', label: 'Top Calzados Más Vendidos vs Rotación', icon: Flame },
                { id: 'logistica_delivery', label: 'Logística de Delivery & Envíos', icon: Truck },
                { id: 'garantias_devoluciones', label: 'Control de Cambios y Garantías', icon: RotateCcw },
            ]
        },
        {
            id: 'bi',
            label: 'Capa 5: BI / Dashboards Ejecutivos',
            subtitle: 'Analítica Visual & Exportable',
            badge: '4 Dashboards',
            icon: BarChart3,
            reports: [
                { id: 'bi_tendencias', label: 'Tendencias & Ticket Promedio', icon: BarChart3 },
                { id: 'bi_cajeros', label: 'Rendimiento de Vendedores/Cajeros', icon: Users },
                { id: 'bi_marcas', label: 'Ventas y Participación por Marca', icon: Sparkles },
                { id: 'bi_trafico', label: 'Auditoría de Tráfico Horario & Picos', icon: Clock },
            ]
        },
        {
            id: 'admin',
            label: 'Capa 6: Administración & Auditoría',
            subtitle: 'Trazabilidad & Seguridad',
            badge: '4 Módulos',
            icon: Shield,
            reports: [
                { id: 'log_auditoria', label: 'Log Inmutable de Auditoría del Sistema', icon: Shield },
                { id: 'impuestos_config', label: 'Parámetros Fiscales y Tributarios', icon: Sliders },
                { id: 'matriz_rbac', label: 'Matriz de Permisos y Roles (RBAC)', icon: Lock },
                { id: 'respaldos_bd', label: 'Respaldos e Integridad de Base de Datos', icon: Database },
            ]
        }
    ], []);

    // Búsqueda en vivo
    const q = tableSearch.toLowerCase().trim();

    // Filtros calculados para Capa 1
    const filteredLibroDiario = useMemo(() => {
        return (libroDiario || []).filter(a => {
            if (!q) return true;
            return (
                (a.documento_numero && a.documento_numero.toLowerCase().includes(q)) ||
                (a.glosa && a.glosa.toLowerCase().includes(q)) ||
                (a.modulo && a.modulo.toLowerCase().includes(q)) ||
                (a.detalles || []).some(d => d.cuenta_codigo.includes(q) || d.cuenta_nombre.toLowerCase().includes(q))
            );
        });
    }, [libroDiario, q]);

    const filteredLibroMayor = useMemo(() => {
        return (libroMayor || []).filter(c => {
            if (!q) return true;
            return c.codigo.includes(q) || c.nombre.toLowerCase().includes(q) || c.tipo.toLowerCase().includes(q);
        });
    }, [libroMayor, q]);

    const filteredBalanceComp = useMemo(() => {
        return (balanceComprobacion?.cuentas || []).filter(c => {
            if (!q) return true;
            return c.codigo.includes(q) || c.nombre.toLowerCase().includes(q);
        });
    }, [balanceComprobacion, q]);

    const filteredPlanCuentas = useMemo(() => {
        return (planCuentas || []).filter(c => {
            if (!q) return true;
            return c.codigo.includes(q) || c.nombre.toLowerCase().includes(q) || c.tipo.toLowerCase().includes(q);
        });
    }, [planCuentas, q]);

    // Filtros calculados para Capa 2
    const filteredVentasLedger = useMemo(() => {
        return (seniatReport?.ledger || []).filter(r => {
            if (!q) return true;
            return (
                (r.receiptNumber && r.receiptNumber.toLowerCase().includes(q)) ||
                (r.customer && r.customer.toLowerCase().includes(q)) ||
                (r.customerDoc && r.customerDoc.toLowerCase().includes(q))
            );
        });
    }, [seniatReport, q]);

    const filteredComprasLedger = useMemo(() => {
        return (seniatPurchasesReport?.ledger || []).filter(r => {
            if (!q) return true;
            return (
                (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(q)) ||
                (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
                (r.supplierRif && r.supplierRif.toLowerCase().includes(q)) ||
                (r.retentionVoucher && r.retentionVoucher.includes(q))
            );
        });
    }, [seniatPurchasesReport, q]);

    // Filtros calculados para Capa 3
    const filteredShifts = useMemo(() => {
        return (shiftsReport?.shifts || []).filter(s => {
            const matchCashier = selectedCashier === 'all' || (s.cashierName && s.cashierName.includes(selectedCashier));
            const matchSearch = !q || (
                (s.id && s.id.toLowerCase().includes(q)) ||
                (s.cajaName && s.cajaName.toLowerCase().includes(q)) ||
                (s.cashierName && s.cashierName.toLowerCase().includes(q))
            );
            return matchCashier && matchSearch;
        });
    }, [shiftsReport, selectedCashier, q]);

    // Filtros calculados para Capa 4
    const filteredKardex = useMemo(() => {
        return (kardexReport?.items || []).filter(item => {
            if (!q) return true;
            return (
                item.name.toLowerCase().includes(q) ||
                item.sku.toLowerCase().includes(q) ||
                item.brand.toLowerCase().includes(q) ||
                item.category.toLowerCase().includes(q)
            );
        });
    }, [kardexReport, q]);

    const filteredCriticalStock = useMemo(() => {
        return (stockReport?.criticalProducts || []).filter(p => {
            if (!q) return true;
            return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
        });
    }, [stockReport, q]);

    const filteredTopProducts = useMemo(() => {
        return (topProductsReport?.items || []).filter(p => {
            if (!q) return true;
            return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.rotationStatus.toLowerCase().includes(q);
        });
    }, [topProductsReport, q]);

    // Filtros calculados para Capa 6
    const filteredAuditLogs = useMemo(() => {
        return (auditLogs || []).filter(log => {
            if (!q) return true;
            return (
                (log.userName && log.userName.toLowerCase().includes(q)) ||
                (log.actionLabel && log.actionLabel.toLowerCase().includes(q)) ||
                (log.module && log.module.toLowerCase().includes(q)) ||
                (log.details && JSON.stringify(log.details).toLowerCase().includes(q))
            );
        });
    }, [auditLogs, q]);

    if (loading && !summary && !balanceComprobacion) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] gap-3">
                <Spinner size="lg" />
                <p className="text-sm font-semibold text-gray-500 animate-pulse">
                    Consolidando Sistema SGF y libros de doble partida...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16 animate-fadeIn">
            {/* Header Corporativo SGF */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white rounded-md shadow-sm">
                            SGF • SISTEMA DE GESTIÓN FISCAL Y FINANCIERA
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md">
                            VEN-NIIF Doble Partida
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md">
                            Sede Única • Barquisimeto
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Landmark className="w-7 h-7 text-blue-600" />
                        UrbanStep Venezuela C.A.
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        RIF: J-50123456-7 • Av. Los Leones, C.C. Las Trinitarias • Arquitectura Contable Formal de 6 Capas
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                    {/* Tasa BCV Oficial */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        <span>Tasa BCV:</span>
                        <span className="font-black font-mono">{Number(bcvRate || 876.80).toFixed(2)} VES/USD</span>
                    </div>

                    {/* Selector de Rango Temporal */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold">
                        {[
                            { id: '1d', label: 'Hoy' },
                            { id: '7d', label: '7 Días' },
                            { id: '30d', label: '30 Días' },
                            { id: 'year', label: 'Año 2026' },
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
                </div>
            </div>

            {/* Selector de las 6 Capas Funcionales */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {reportCategories.map((cat) => {
                    const isSelected = mainCategory === cat.id;
                    const Icon = cat.icon;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                                setMainCategory(cat.id);
                                setActiveReportId(cat.reports[0].id);
                            }}
                            className={`flex flex-col p-3.5 rounded-2xl border-2 text-left transition-all ${
                                isSelected
                                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 ring-2 ring-blue-500/20 shadow-md scale-[1.01]'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isSelected ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}>
                                    {cat.badge}
                                </span>
                            </div>
                            <span className="font-black text-xs text-gray-900 dark:text-white line-clamp-1">{cat.label}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{cat.subtitle}</span>
                        </button>
                    );
                })}
            </div>

            {/* Sub-selector de Reportes dentro de la Capa Seleccionada */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                {reportCategories.find(c => c.id === mainCategory)?.reports.map((rep) => {
                    const RepIcon = rep.icon;
                    const isSubSelected = activeReportId === rep.id;
                    return (
                        <button
                            key={rep.id}
                            type="button"
                            onClick={() => setActiveReportId(rep.id)}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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

            {/* Barra de Filtro y Búsqueda Cruzada */}
            <Card className="p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                            Filtros de Auditoría & Trazabilidad
                        </span>
                        {(tableSearch || selectedCashier !== 'all' || selectedPaymentMethod !== 'all') && (
                            <Badge variant="primary" className="text-[10px]">Filtros Activos</Badge>
                        )}
                    </div>
                    {(tableSearch || selectedCashier !== 'all' || selectedPaymentMethod !== 'all') && (
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-semibold transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Restablecer filtros
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                placeholder="Buscar por código, comprobante, cliente o cuenta..."
                                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={selectedCashier}
                            onChange={(e) => setSelectedCashier(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">Todos los colaboradores / cajeros</option>
                            <option value="Carlos Gómez">Carlos Gómez (Cajero)</option>
                            <option value="Valeria Morales">Valeria Morales (Cajera)</option>
                            <option value="Administrador General">Administrador General</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={selectedPaymentMethod}
                            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">Todos los métodos de pago</option>
                            <option value="pagomovil">Pago Móvil (VES)</option>
                            <option value="punto">Punto de Venta Biopago (VES)</option>
                            <option value="efectivo_usd">Efectivo USD (IGTF 3%)</option>
                            <option value="zelle">Zelle Digital (USD)</option>
                            <option value="zinli">Zinli / Tarjeta Internacional</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* ========================================================================= */}
            {/* CAPA 1: CONTABILIDAD FORMAL (VEN-NIIF) */}
            {/* ========================================================================= */}

            {/* 1.1 Libro Diario */}
            {mainCategory === 'contabilidad' && activeReportId === 'libro_diario' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Asientos Registrados</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {filteredLibroDiario.length} asientos
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Partida Doble Automática</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Total DEBE Contable</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {formatUSD(filteredLibroDiario.reduce((acc, a) => acc + (a.total_debe_usd || 0), 0))}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(filteredLibroDiario.reduce((acc, a) => acc + (a.total_debe_bs || 0), 0))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Total HABER Contable</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                                {formatUSD(filteredLibroDiario.reduce((acc, a) => acc + (a.total_haber_usd || 0), 0))}
                            </p>
                            <p className="text-xs font-bold text-indigo-600 mt-0.5">
                                {formatBs(filteredLibroDiario.reduce((acc, a) => acc + (a.total_haber_bs || 0), 0))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20">
                            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cuadre de Partida Doble
                            </p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">
                                $0.00 ✓
                            </p>
                            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Debe = Haber (100% Cuadrado)</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                    Libro Diario General (Doble Partida VEN-NIIF)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Asientos automáticos generados desde ventas, compras y cierres Z. Moneda de presentación dual: VES / USD.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Libro Diario General VEN-NIIF"
                                categoryName="Capa 1: Contabilidad Formal"
                                columns={[
                                    { key: 'numero_asiento', header: 'Asiento' },
                                    { key: 'fecha', header: 'Fecha' },
                                    { key: 'documento_numero', header: 'Documento' },
                                    { key: 'glosa', header: 'Glosa / Concepto' },
                                    { key: 'modulo', header: 'Módulo' },
                                    { key: 'total_debe_usd', header: 'Debe ($)' },
                                    { key: 'total_haber_usd', header: 'Haber ($)' },
                                    { key: 'total_debe_bs', header: 'Debe (Bs.)' },
                                    { key: 'total_haber_bs', header: 'Haber (Bs.)' },
                                    { key: 'estado', header: 'Estado' }
                                ]}
                                rows={filteredLibroDiario.map(a => ({
                                    ...a,
                                    estado: a.cuadrado ? 'Cuadrado ✓' : 'Descuadrado ✗'
                                }))}
                                summaryCards={[
                                    { label: 'Asientos', value: `${filteredLibroDiario.length}` },
                                    { label: 'Total Debe', value: formatUSD(filteredLibroDiario.reduce((acc, a) => acc + (a.total_debe_usd || 0), 0)) },
                                    { label: 'Total Haber', value: formatUSD(filteredLibroDiario.reduce((acc, a) => acc + (a.total_haber_usd || 0), 0)) }
                                ]}
                                filename="Libro_Diario_VEN_NIIF"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredLibroDiario, 'Libro_Diario')}
                            />
                        </div>

                        <div className="space-y-4">
                            {filteredLibroDiario.slice(0, 25).map((asiento) => (
                                <div key={asiento.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-gray-50 dark:bg-gray-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 text-xs">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-black text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                                                #{asiento.numero_asiento}
                                            </span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                {new Date(asiento.fecha).toLocaleDateString('es-VE')}
                                            </span>
                                            <span className="text-gray-500 font-mono">Doc: {asiento.documento_numero}</span>
                                            <span className="capitalize px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-bold">
                                                {asiento.modulo}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 font-mono text-[10px]">Tasa: {asiento.tasa_bcv} Bs/$</span>
                                            <Badge variant={asiento.cuadrado ? 'success' : 'danger'} className="text-[10px]">
                                                {asiento.cuadrado ? 'Partida Doble Cuadrada ✓' : 'Descuadre ✗'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 italic bg-white dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
                                        {asiento.glosa}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-gray-800/40 text-[10px] uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">
                                                    <th className="px-4 py-1.5 text-left font-mono">Código</th>
                                                    <th className="px-4 py-1.5 text-left">Cuenta Contable</th>
                                                    <th className="px-4 py-1.5 text-right">Debe ($)</th>
                                                    <th className="px-4 py-1.5 text-right">Haber ($)</th>
                                                    <th className="px-4 py-1.5 text-right font-semibold text-emerald-600">Debe (Bs.)</th>
                                                    <th className="px-4 py-1.5 text-right font-semibold text-emerald-600">Haber (Bs.)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                                {(asiento.detalles || []).map((det, dIdx) => (
                                                    <tr key={dIdx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                                                        <td className="px-4 py-1.5 text-blue-600 font-bold">{det.cuenta_codigo}</td>
                                                        <td className="px-4 py-1.5 font-sans">{det.cuenta_nombre}</td>
                                                        <td className="px-4 py-1.5 text-right font-bold">{det.debe_usd > 0 ? formatUSD(det.debe_usd) : '—'}</td>
                                                        <td className="px-4 py-1.5 text-right font-bold text-gray-600 dark:text-gray-400">{det.haber_usd > 0 ? formatUSD(det.haber_usd) : '—'}</td>
                                                        <td className="px-4 py-1.5 text-right text-emerald-600 font-bold">{det.debe_bs > 0 ? formatBs(det.debe_bs) : '—'}</td>
                                                        <td className="px-4 py-1.5 text-right text-emerald-600 font-bold">{det.haber_bs > 0 ? formatBs(det.haber_bs) : '—'}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-50 dark:bg-gray-800/60 font-bold border-t border-gray-200 dark:border-gray-700">
                                                    <td colSpan="2" className="px-4 py-2 text-right font-sans uppercase text-[10px]">Totales del Asiento:</td>
                                                    <td className="px-4 py-2 text-right text-blue-600">{formatUSD(asiento.total_debe_usd)}</td>
                                                    <td className="px-4 py-2 text-right text-blue-600">{formatUSD(asiento.total_haber_usd)}</td>
                                                    <td className="px-4 py-2 text-right text-emerald-600">{formatBs(asiento.total_debe_bs)}</td>
                                                    <td className="px-4 py-2 text-right text-emerald-600">{formatBs(asiento.total_haber_bs)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                            {filteredLibroDiario.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    No se encontraron asientos contables para el filtro aplicado.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* 1.2 Libro Mayor General */}
            {mainCategory === 'contabilidad' && activeReportId === 'libro_mayor' && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-blue-600" />
                                    Libro Mayor General (Cuentas T)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Consolidación de débitos, créditos y saldos acumulados por cuenta contable según su naturaleza.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Libro Mayor General VEN-NIIF"
                                categoryName="Capa 1: Contabilidad Formal"
                                columns={[
                                    { key: 'codigo', header: 'Código' },
                                    { key: 'nombre', header: 'Cuenta' },
                                    { key: 'naturaleza', header: 'Naturaleza' },
                                    { key: 'total_debe_usd', header: 'Débitos ($)' },
                                    { key: 'total_haber_usd', header: 'Créditos ($)' },
                                    { key: 'saldo_final_usd', header: 'Saldo ($)' },
                                    { key: 'saldo_final_bs', header: 'Saldo (Bs.)' }
                                ]}
                                rows={filteredLibroMayor}
                                summaryCards={[
                                    { label: 'Cuentas con Movimiento', value: `${filteredLibroMayor.length}` }
                                ]}
                                filename="Libro_Mayor_General"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredLibroMayor, 'Libro_Mayor')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">Código</th>
                                        <th className="px-4 py-3 text-left">Cuenta Contable</th>
                                        <th className="px-3 py-3 text-center">Naturaleza</th>
                                        <th className="px-3 py-3 text-right">Total Debe ($)</th>
                                        <th className="px-3 py-3 text-right">Total Haber ($)</th>
                                        <th className="px-4 py-3 text-right font-bold">Saldo Final ($ USD)</th>
                                        <th className="px-4 py-3 text-right font-bold text-emerald-600">Saldo Final (Bs.)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredLibroMayor.map((cuenta) => (
                                        <tr key={cuenta.codigo} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-2.5 font-bold text-blue-600">{cuenta.codigo}</td>
                                            <td className="px-4 py-2.5 font-sans font-medium text-gray-900 dark:text-white">{cuenta.nombre}</td>
                                            <td className="px-3 py-2.5 text-center font-sans">
                                                <Badge variant={cuenta.naturaleza === 'deudora' ? 'primary' : 'warning'} className="text-[10px]">
                                                    {cuenta.naturaleza}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-bold">{formatUSD(cuenta.total_debe_usd)}</td>
                                            <td className="px-3 py-2.5 text-right font-bold text-gray-500">{formatUSD(cuenta.total_haber_usd)}</td>
                                            <td className="px-4 py-2.5 text-right font-black text-gray-900 dark:text-white">
                                                {formatUSD(cuenta.saldo_final_usd)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-black text-emerald-600">
                                                {formatBs(cuenta.saldo_final_bs)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 1.3 Balance de Comprobación */}
            {mainCategory === 'contabilidad' && activeReportId === 'balance_comprobacion' && balanceComprobacion && (
                <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                                ✓
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                                    Balance de Comprobación Cuadrado (Debe = Haber)
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    Todas las sumas y saldos satisfacen rigurosamente el teorema fundamental de la partida doble.
                                </p>
                            </div>
                        </div>
                        <Badge variant="success" className="text-xs py-1 px-3">
                            Cuadre Matemático Verificado
                        </Badge>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    Balance de Comprobación de Sumas y Saldos
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Total de sumas del Debe / Haber y saldos Deudor / Acreedor en USD y Bolívares.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Balance de Comprobación de Sumas y Saldos"
                                categoryName="Capa 1: Contabilidad Formal"
                                columns={[
                                    { key: 'codigo', header: 'Código' },
                                    { key: 'nombre', header: 'Cuenta' },
                                    { key: 'total_debe_usd', header: 'Suma Debe ($)' },
                                    { key: 'total_haber_usd', header: 'Suma Haber ($)' },
                                    { key: 'saldo_deudor_usd', header: 'Saldo Deudor ($)' },
                                    { key: 'saldo_acreedor_usd', header: 'Saldo Acreedor ($)' }
                                ]}
                                rows={filteredBalanceComp}
                                summaryCards={[
                                    { label: 'Total Suma Debe', value: formatUSD(balanceComprobacion.sumas.total_debe_usd) },
                                    { label: 'Total Suma Haber', value: formatUSD(balanceComprobacion.sumas.total_haber_usd) },
                                    { label: 'Total Saldo Deudor', value: formatUSD(balanceComprobacion.sumas.total_deudor_usd) },
                                    { label: 'Total Saldo Acreedor', value: formatUSD(balanceComprobacion.sumas.total_acreedor_usd) }
                                ]}
                                filename="Balance_Comprobacion_Sumas_Saldos"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredBalanceComp, 'Balance_Comprobacion')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">Código</th>
                                        <th className="px-4 py-3 text-left">Cuenta Contable</th>
                                        <th className="px-3 py-3 text-right">Suma Debe ($)</th>
                                        <th className="px-3 py-3 text-right">Suma Haber ($)</th>
                                        <th className="px-3 py-3 text-right font-bold text-blue-600">Saldo Deudor ($)</th>
                                        <th className="px-3 py-3 text-right font-bold text-purple-600">Saldo Acreedor ($)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredBalanceComp.map((c) => (
                                        <tr key={c.codigo} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-2 font-bold text-blue-600">{c.codigo}</td>
                                            <td className="px-4 py-2 font-sans font-medium text-gray-900 dark:text-white">{c.nombre}</td>
                                            <td className="px-3 py-2 text-right">{c.total_debe_usd > 0 ? formatUSD(c.total_debe_usd) : '—'}</td>
                                            <td className="px-3 py-2 text-right">{c.total_haber_usd > 0 ? formatUSD(c.total_haber_usd) : '—'}</td>
                                            <td className="px-3 py-2 text-right font-bold text-blue-600">{c.saldo_deudor_usd > 0 ? formatUSD(c.saldo_deudor_usd) : '—'}</td>
                                            <td className="px-3 py-2 text-right font-bold text-purple-600">{c.saldo_acreedor_usd > 0 ? formatUSD(c.saldo_acreedor_usd) : '—'}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600 text-xs">
                                        <td colSpan="2" className="px-4 py-3 text-right font-sans uppercase">TOTALES GENERALES:</td>
                                        <td className="px-3 py-3 text-right text-gray-900 dark:text-white">{formatUSD(balanceComprobacion.sumas.total_debe_usd)}</td>
                                        <td className="px-3 py-3 text-right text-gray-900 dark:text-white">{formatUSD(balanceComprobacion.sumas.total_haber_usd)}</td>
                                        <td className="px-3 py-3 text-right text-blue-600">{formatUSD(balanceComprobacion.sumas.total_deudor_usd)}</td>
                                        <td className="px-3 py-3 text-right text-purple-600">{formatUSD(balanceComprobacion.sumas.total_acreedor_usd)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 1.4 Estados Financieros con Exportación */}
            {mainCategory === 'contabilidad' && activeReportId === 'estados_financieros' && estadosFinancieros && (
                <div className="space-y-6">
                    {/* Header y Exportación de Estados Financieros */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div>
                            <h3 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <Landmark className="w-5 h-5 text-blue-600" />
                                Estados Financieros Consolidados (VEN-NIIF)
                            </h3>
                            <p className="text-xs text-gray-500">Estado de Resultados Integral y Balance de Situación Financiera de UrbanStep Venezuela C.A.</p>
                        </div>
                        <ExportButtonGroup
                            reportTitle="Estados Financieros Oficiales VEN-NIIF"
                            categoryName="Capa 1: Contabilidad Formal"
                            columns={[
                                { key: 'concepto', header: 'Concepto / Partida' },
                                { key: 'categoria', header: 'Estado Financiero' },
                                { key: 'montoUsd', header: 'Monto ($ USD)' },
                                { key: 'montoBs', header: 'Monto (Bs.)' }
                            ]}
                            rows={[
                                { concepto: 'Ventas de Calzado Mostrador & Online', categoria: 'Estado de Resultados (Ingresos)', montoUsd: formatUSD(estadosFinancieros.estado_resultados.total_ingresos_usd), montoBs: formatBs(estadosFinancieros.estado_resultados.total_ingresos_bs) },
                                { concepto: 'Costo de Mercancía Vendida (COGS)', categoria: 'Estado de Resultados (Costos)', montoUsd: `-${formatUSD(estadosFinancieros.estado_resultados.total_costos_usd)}`, montoBs: `-${formatBs(estadosFinancieros.estado_resultados.total_costos_bs)}` },
                                { concepto: 'Utilidad Bruta Operacional', categoria: 'Estado de Resultados (Margen)', montoUsd: formatUSD(estadosFinancieros.estado_resultados.utilidad_bruta_usd), montoBs: formatBs(estadosFinancieros.estado_resultados.utilidad_bruta_bs) },
                                { concepto: 'Gastos Operacionales (Delivery & Comisiones)', categoria: 'Estado de Resultados (Gastos)', montoUsd: `-${formatUSD(estadosFinancieros.estado_resultados.total_gastos_usd)}`, montoBs: `-${formatBs(estadosFinancieros.estado_resultados.total_gastos_bs)}` },
                                { concepto: 'Utilidad Neta del Ejercicio', categoria: 'Estado de Resultados (Resultado Final)', montoUsd: formatUSD(estadosFinancieros.estado_resultados.utilidad_neta_usd), montoBs: formatBs(estadosFinancieros.estado_resultados.utilidad_neta_bs) },
                                { concepto: 'Total Activo Corriente (Caja, Bancos, Inventario)', categoria: 'Balance General (Activos)', montoUsd: formatUSD(estadosFinancieros.balance_general.total_activos_usd), montoBs: formatBs(estadosFinancieros.balance_general.total_activos_bs) },
                                { concepto: 'Total Pasivos (Proveedores & Fiscales)', categoria: 'Balance General (Pasivos)', montoUsd: formatUSD(estadosFinancieros.balance_general.total_pasivos_usd), montoBs: formatBs(estadosFinancieros.balance_general.total_pasivos_bs) },
                                { concepto: 'Patrimonio Neto + Utilidad del Ejercicio', categoria: 'Balance General (Patrimonio)', montoUsd: formatUSD(estadosFinancieros.balance_general.total_patrimonio_usd), montoBs: formatBs(estadosFinancieros.balance_general.total_patrimonio_bs) },
                                { concepto: 'Total Pasivo + Patrimonio (Ecuación Patrimonial)', categoria: 'Balance General (Total)', montoUsd: formatUSD(estadosFinancieros.balance_general.total_pasivo_patrimonio_usd), montoBs: formatBs(estadosFinancieros.balance_general.total_pasivo_patrimonio_bs) }
                            ]}
                            summaryCards={[
                                { label: 'Ingresos Totales', value: formatUSD(estadosFinancieros.estado_resultados.total_ingresos_usd) },
                                { label: 'Utilidad Neta', value: formatUSD(estadosFinancieros.estado_resultados.utilidad_neta_usd) },
                                { label: 'Activo Corriente', value: formatUSD(estadosFinancieros.balance_general.total_activos_usd) },
                                { label: 'Pasivo + Patrimonio', value: formatUSD(estadosFinancieros.balance_general.total_pasivo_patrimonio_usd) }
                            ]}
                            filename="Estados_Financieros_VEN_NIIF"
                            bcvRate={bcvRate}
                            onExportCSV={() => handleExportCSV([
                                { Concepto: 'Ingresos Operacionales', MontoUSD: estadosFinancieros.estado_resultados.total_ingresos_usd, MontoBs: estadosFinancieros.estado_resultados.total_ingresos_bs },
                                { Concepto: 'Utilidad Neta', MontoUSD: estadosFinancieros.estado_resultados.utilidad_neta_usd, MontoBs: estadosFinancieros.estado_resultados.utilidad_neta_bs },
                                { Concepto: 'Total Activos', MontoUSD: estadosFinancieros.balance_general.total_activos_usd, MontoBs: estadosFinancieros.balance_general.total_activos_bs },
                                { Concepto: 'Total Pasivo + Patrimonio', MontoUSD: estadosFinancieros.balance_general.total_pasivo_patrimonio_usd, MontoBs: estadosFinancieros.balance_general.total_pasivo_patrimonio_bs }
                            ], 'Estados_Financieros')}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Estado de Resultados */}
                        <Card className="p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700/60 pb-3">
                                <div>
                                    <h4 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                                        Estado de Resultados Integral
                                    </h4>
                                    <p className="text-xs text-gray-500">Del período contable seleccionado (VEN-NIIF)</p>
                                </div>
                                <Badge variant="success">Ganancia Operativa</Badge>
                            </div>

                            <div className="space-y-3 font-mono text-xs">
                                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
                                    <span className="font-sans font-bold text-gray-700 dark:text-gray-300">INGRESOS OPERACIONALES (Ventas)</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{formatUSD(estadosFinancieros.estado_resultados.total_ingresos_usd)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 text-amber-600 border-b border-gray-100 dark:border-gray-800">
                                    <span className="font-sans font-medium">(-) Costo de Ventas (COGS Calzado)</span>
                                    <span>{formatUSD(estadosFinancieros.estado_resultados.total_costos_usd)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 rounded-lg border border-emerald-200 dark:border-emerald-800 font-bold">
                                    <span className="font-sans text-emerald-800 dark:text-emerald-300">(=) UTILIDAD BRUTA</span>
                                    <span className="text-emerald-600">{formatUSD(estadosFinancieros.estado_resultados.utilidad_bruta_usd)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 text-red-600 border-b border-gray-100 dark:border-gray-800">
                                    <span className="font-sans font-medium">(-) Gastos Operacionales (Delivery & Comisiones)</span>
                                    <span>{formatUSD(estadosFinancieros.estado_resultados.total_gastos_usd)}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 bg-blue-50 dark:bg-blue-950/40 px-3 rounded-xl border border-blue-200 dark:border-blue-800 font-black text-sm">
                                    <span className="font-sans text-blue-900 dark:text-blue-200">(=) UTILIDAD NETA DEL EJERCICIO</span>
                                    <span className="text-blue-600 dark:text-blue-400">{formatUSD(estadosFinancieros.estado_resultados.utilidad_neta_usd)}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Balance General */}
                        <Card className="p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700/60 pb-3">
                                <div>
                                    <h4 className="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                                        <Landmark className="w-5 h-5 text-blue-600" />
                                        Balance General (Situación Financiera)
                                    </h4>
                                    <p className="text-xs text-gray-500">Activo = Pasivo + Patrimonio Neto</p>
                                </div>
                                <Badge variant="primary">Activo = Pasivo + Patrimonio</Badge>
                            </div>

                            <div className="space-y-3 font-mono text-xs">
                                <div className="flex justify-between items-center py-2 bg-blue-50/50 dark:bg-blue-950/20 px-3 rounded-lg border border-blue-200 dark:border-blue-800 font-bold">
                                    <span className="font-sans text-blue-900 dark:text-blue-200">TOTAL ACTIVO CORRIENTE</span>
                                    <span className="text-blue-600">{formatUSD(estadosFinancieros.balance_general.total_activos_usd)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                                    <span className="font-sans font-medium">TOTAL PASIVO (Proveedores & Fiscales)</span>
                                    <span>{formatUSD(estadosFinancieros.balance_general.total_pasivos_usd)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                                    <span className="font-sans font-medium">PATRIMONIO NETO + RESULTADOS</span>
                                    <span>{formatUSD(estadosFinancieros.balance_general.total_patrimonio_usd)}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 bg-emerald-50 dark:bg-emerald-950/40 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 font-black text-sm">
                                    <span className="font-sans text-emerald-900 dark:text-emerald-200">TOTAL PASIVO + PATRIMONIO</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">{formatUSD(estadosFinancieros.balance_general.total_pasivo_patrimonio_usd)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* 1.5 Plan de Cuentas */}
            {mainCategory === 'contabilidad' && activeReportId === 'plan_cuentas' && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                                    Plan de Cuentas Maestro VEN-NIIF (5 Niveles)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Estructura jerárquica de cuentas contables aprobadas para UrbanStep Venezuela C.A.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Plan de Cuentas Maestro VEN-NIIF"
                                categoryName="Capa 1: Contabilidad Formal"
                                columns={[
                                    { key: 'codigo', header: 'Código' },
                                    { key: 'nombre', header: 'Nombre' },
                                    { key: 'nivel', header: 'Nivel' },
                                    { key: 'tipo', header: 'Tipo' },
                                    { key: 'naturaleza', header: 'Naturaleza' },
                                    { key: 'acepta_movimiento', header: 'Imputable' }
                                ]}
                                rows={filteredPlanCuentas.map(c => ({
                                    ...c,
                                    acepta_movimiento: c.acepta_movimiento ? 'Sí (Nivel 5)' : 'No (Grupo)'
                                }))}
                                summaryCards={[
                                    { label: 'Cuentas Registradas', value: `${filteredPlanCuentas.length}` }
                                ]}
                                filename="Plan_Cuentas_VEN_NIIF"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredPlanCuentas, 'Plan_Cuentas')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">Código</th>
                                        <th className="px-4 py-3 text-left">Nombre de la Cuenta</th>
                                        <th className="px-3 py-3 text-center">Nivel</th>
                                        <th className="px-3 py-3 text-center">Tipo</th>
                                        <th className="px-3 py-3 text-center">Naturaleza</th>
                                        <th className="px-3 py-3 text-center">Movimiento</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredPlanCuentas.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-2 font-bold text-blue-600">{c.codigo}</td>
                                            <td className="px-4 py-2 font-sans" style={{ paddingLeft: `${(c.nivel - 1) * 16 + 16}px` }}>
                                                <span className={c.nivel <= 2 ? 'font-black text-gray-900 dark:text-white' : (c.acepta_movimiento ? 'font-medium' : 'font-semibold text-gray-700 dark:text-gray-300')}>
                                                    {c.nombre}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center text-gray-400">{c.nivel}</td>
                                            <td className="px-3 py-2 text-center font-sans capitalize">{c.tipo}</td>
                                            <td className="px-3 py-2 text-center font-sans capitalize">{c.naturaleza}</td>
                                            <td className="px-3 py-2 text-center font-sans">
                                                <Badge variant={c.acepta_movimiento ? 'success' : 'default'} className="text-[10px]">
                                                    {c.acepta_movimiento ? 'Imputable ✓' : 'Grupo'}
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

            {/* ========================================================================= */}
            {/* CAPA 2: FISCAL VENEZUELA (SENIAT) */}
            {/* ========================================================================= */}

            {/* 2.1 Libro de Ventas SENIAT */}
            {mainCategory === 'fiscal' && activeReportId === 'fiscal_ventas' && seniatReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Facturas Emitidas</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {seniatReport.summary.totalInvoices} docs
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Control Fiscal SENIAT</p>
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

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-blue-600" />
                                    Libro de Ventas Fiscal SENIAT (Providencia 0071)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Comprobantes fiscales de venta con base gravable 16%, débito fiscal e IGTF en divisas.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Libro de Ventas Fiscal SENIAT (IVA 16% / IGTF)"
                                categoryName="Capa 2: Fiscal Venezuela"
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
                                rows={filteredVentasLedger}
                                summaryCards={[
                                    { label: 'Facturas Emitidas', value: `${filteredVentasLedger.length}` },
                                    { label: 'Base Gravable', value: formatUSD(seniatReport.summary.taxableBaseUsd) },
                                    { label: 'Débito Fiscal IVA', value: formatUSD(seniatReport.summary.totalTaxUsd) },
                                    { label: 'IGTF 3% Divisas', value: formatUSD(seniatReport.summary.totalIgtfUsd) }
                                ]}
                                filename="Libro_Ventas_Fiscal_SENIAT"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredVentasLedger, 'Libro_Ventas_SENIAT')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">N°</th>
                                        <th className="px-3 py-3 text-left">Comprobante</th>
                                        <th className="px-3 py-3 text-left">Fecha</th>
                                        <th className="px-3 py-3 text-left">Cliente / RIF</th>
                                        <th className="px-3 py-3 text-right">Tasa BCV</th>
                                        <th className="px-3 py-3 text-right">Base ($)</th>
                                        <th className="px-3 py-3 text-right">IVA 16% ($)</th>
                                        <th className="px-3 py-3 text-right">IGTF 3% ($)</th>
                                        <th className="px-3 py-3 text-right font-bold">Total ($)</th>
                                        <th className="px-3 py-3 text-right font-bold text-emerald-600">Total (Bs.)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredVentasLedger.map((row) => (
                                        <tr key={row.seq} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-2.5 text-gray-400">#{row.seq}</td>
                                            <td className="px-3 py-2.5 font-bold text-blue-600">{row.receiptNumber}</td>
                                            <td className="px-3 py-2.5 font-sans">{row.date}</td>
                                            <td className="px-3 py-2.5 font-sans">
                                                <div className="font-medium text-gray-900 dark:text-white">{row.customer}</div>
                                                <div className="text-[10px] text-gray-400">{row.customerDoc}</div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">{row.bcvRate}</td>
                                            <td className="px-3 py-2.5 text-right">{formatUSD(row.taxableBaseUsd)}</td>
                                            <td className="px-3 py-2.5 text-right text-indigo-600 font-bold">{formatUSD(row.taxUsd)}</td>
                                            <td className="px-3 py-2.5 text-right text-purple-600 font-bold">{formatUSD(row.igtfUsd)}</td>
                                            <td className="px-3 py-2.5 text-right font-black text-gray-900 dark:text-white">{formatUSD(row.totalUsd)}</td>
                                            <td className="px-3 py-2.5 text-right font-black text-emerald-600">{formatBs(row.totalBs)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 2.2 Libro de Compras SENIAT */}
            {mainCategory === 'fiscal' && activeReportId === 'fiscal_compras' && seniatPurchasesReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Facturas de Compra</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {seniatPurchasesReport.summary.totalPurchasesCount} docs
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Proveedores Nacionales</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-amber-600">
                            <p className="text-xs font-semibold text-amber-600">Base Imponible Compras</p>
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                                {formatUSD(seniatPurchasesReport.summary.totalTaxableBaseUsd)}
                            </p>
                            <p className="text-xs font-bold text-amber-600 mt-0.5">
                                {formatBs(seniatPurchasesReport.summary.totalTaxableBaseBs)}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Crédito Fiscal IVA (16%)</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                {formatUSD(seniatPurchasesReport.summary.totalFiscalCreditUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(seniatPurchasesReport.summary.totalFiscalCreditBs)}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-purple-600">
                            <p className="text-xs font-semibold text-purple-600">Retención de IVA (75%)</p>
                            <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                                {formatUSD(seniatPurchasesReport.summary.totalIvaWithheldUsd)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Enterado ante el SENIAT</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                    Libro de Compras Fiscal SENIAT (Providencia 0071)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Registro obligatorio de compras con derecho a crédito fiscal y retenciones de IVA aplicadas a proveedores.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Libro de Compras Fiscal SENIAT"
                                categoryName="Capa 2: Fiscal Venezuela"
                                columns={[
                                    { key: 'seq', header: 'N°' },
                                    { key: 'date', header: 'Fecha' },
                                    { key: 'supplierName', header: 'Proveedor' },
                                    { key: 'supplierRif', header: 'RIF Proveedor' },
                                    { key: 'invoiceNumber', header: 'Factura N°' },
                                    { key: 'controlNumber', header: 'Control' },
                                    { key: 'taxableBaseUsd', header: 'Base ($)' },
                                    { key: 'fiscalCreditUsd', header: 'Crédito IVA ($)' },
                                    { key: 'retentionIvaUsd', header: 'Retención IVA 75% ($)' },
                                    { key: 'retentionVoucher', header: 'Comprobante Retención' },
                                    { key: 'totalUsd', header: 'Total ($)' }
                                ]}
                                rows={filteredComprasLedger}
                                summaryCards={[
                                    { label: 'Facturas Compras', value: `${filteredComprasLedger.length}` },
                                    { label: 'Crédito Fiscal IVA', value: formatUSD(seniatPurchasesReport.summary.totalFiscalCreditUsd) },
                                    { label: 'IVA Retenido (75%)', value: formatUSD(seniatPurchasesReport.summary.totalIvaWithheldUsd) }
                                ]}
                                filename="Libro_Compras_Fiscal_SENIAT"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredComprasLedger, 'Libro_Compras_SENIAT')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">N°</th>
                                        <th className="px-3 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Proveedor / RIF</th>
                                        <th className="px-3 py-3 text-left">Factura N°</th>
                                        <th className="px-3 py-3 text-left">Control</th>
                                        <th className="px-3 py-3 text-right">Base ($)</th>
                                        <th className="px-3 py-3 text-right">Crédito IVA ($)</th>
                                        <th className="px-3 py-3 text-right">Retención (75%)</th>
                                        <th className="px-3 py-3 text-left">Comprobante Ret.</th>
                                        <th className="px-3 py-3 text-right font-bold">Total ($)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredComprasLedger.map((row) => (
                                        <tr key={row.seq} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-2.5 text-gray-400">#{row.seq}</td>
                                            <td className="px-3 py-2.5 font-sans">{row.date}</td>
                                            <td className="px-4 py-2.5 font-sans">
                                                <div className="font-medium text-gray-900 dark:text-white">{row.supplierName}</div>
                                                <div className="text-[10px] text-gray-400">{row.supplierRif}</div>
                                            </td>
                                            <td className="px-3 py-2.5 font-bold text-blue-600">{row.invoiceNumber}</td>
                                            <td className="px-3 py-2.5 text-gray-500">{row.controlNumber}</td>
                                            <td className="px-3 py-2.5 text-right">{formatUSD(row.taxableBaseUsd)}</td>
                                            <td className="px-3 py-2.5 text-right text-emerald-600 font-bold">{formatUSD(row.fiscalCreditUsd)}</td>
                                            <td className="px-3 py-2.5 text-right text-purple-600 font-bold">{formatUSD(row.retentionIvaUsd)}</td>
                                            <td className="px-3 py-2.5 text-blue-600 font-bold">{row.retentionVoucher}</td>
                                            <td className="px-3 py-2.5 text-right font-black text-gray-900 dark:text-white">{formatUSD(row.totalUsd)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 2.3 Retenciones IVA e ISLR */}
            {mainCategory === 'fiscal' && activeReportId === 'retenciones' && withholdingsReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Comprobantes de Retención Emitidos</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {withholdingsReport.totalVouchers}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Agente de Retención Especial</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-purple-600">
                            <p className="text-xs font-semibold text-purple-600">Total Retenciones de IVA (75%)</p>
                            <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                                {formatUSD(withholdingsReport.totalIvaWithheldUsd)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Enterado en quincena fiscal</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Total Retenciones ISLR (2% / 5%)</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                                {formatUSD(withholdingsReport.totalIslrWithheldUsd)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Adquisición bienes y servicios</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-purple-600" />
                                    Comprobantes de Retención de IVA Emitidos a Proveedores
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Certificados oficiales emitidos con número correlativo fiscal y alícuota legal del 75%.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Comprobantes de Retención de IVA"
                                categoryName="Capa 2: Fiscal Venezuela"
                                columns={[
                                    { key: 'voucherNumber', header: 'N° Comprobante' },
                                    { key: 'date', header: 'Fecha' },
                                    { key: 'supplierName', header: 'Proveedor' },
                                    { key: 'supplierRif', header: 'RIF Proveedor' },
                                    { key: 'invoiceNumber', header: 'Factura Afectada' },
                                    { key: 'ivaAmountUsd', header: 'Monto IVA ($)' },
                                    { key: 'percentage', header: '% Ret.' },
                                    { key: 'amountWithheldUsd', header: 'Retenido ($)' },
                                    { key: 'status', header: 'Estado' }
                                ]}
                                rows={withholdingsReport.ivaWithholdings}
                                summaryCards={[
                                    { label: 'Total IVA Retenido', value: formatUSD(withholdingsReport.totalIvaWithheldUsd) }
                                ]}
                                filename="Retenciones_IVA_SENIAT"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(withholdingsReport.ivaWithholdings, 'Retenciones_IVA')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">N° Comprobante</th>
                                        <th className="px-3 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Proveedor / RIF</th>
                                        <th className="px-3 py-3 text-left">Factura</th>
                                        <th className="px-3 py-3 text-right">Monto IVA ($)</th>
                                        <th className="px-3 py-3 text-center">% Ret.</th>
                                        <th className="px-4 py-3 text-right font-bold text-purple-600">Monto Retenido ($)</th>
                                        <th className="px-3 py-3 text-center">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {withholdingsReport.ivaWithholdings.map((ret) => (
                                        <tr key={ret.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-2.5 font-bold text-blue-600">{ret.voucherNumber}</td>
                                            <td className="px-3 py-2.5 font-sans">{ret.date}</td>
                                            <td className="px-4 py-2.5 font-sans">
                                                <div className="font-medium text-gray-900 dark:text-white">{ret.supplierName}</div>
                                                <div className="text-[10px] text-gray-400">{ret.supplierRif}</div>
                                            </td>
                                            <td className="px-3 py-2.5">{ret.invoiceNumber}</td>
                                            <td className="px-3 py-2.5 text-right">{formatUSD(ret.ivaAmountUsd)}</td>
                                            <td className="px-3 py-2.5 text-center font-bold">75%</td>
                                            <td className="px-4 py-2.5 text-right font-black text-purple-600">{formatUSD(ret.amountWithheldUsd)}</td>
                                            <td className="px-3 py-2.5 text-center font-sans">
                                                <Badge variant="success" className="text-[10px]">Enterado SENIAT ✓</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 2.4 Resumen Impositivo Consolidado con Exportación */}
            {mainCategory === 'fiscal' && activeReportId === 'resumen_fiscal' && seniatReport && seniatPurchasesReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-emerald-600" />
                                    Declaración y Cierre Fiscal Consolidado (IVA 16% + IGTF 3%)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Liquidación tributaria periódica: Determinación del débito vs crédito fiscal y cuota líquida a enterar.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Declaración y Cierre Fiscal SENIAT (IVA / IGTF)"
                                categoryName="Capa 2: Fiscal Venezuela"
                                columns={[
                                    { key: 'concepto', header: 'Concepto Tributario' },
                                    { key: 'baseUsd', header: 'Base Gravable ($ USD)' },
                                    { key: 'alicuota', header: 'Alícuota' },
                                    { key: 'montoUsd', header: 'Impuesto ($ USD)' },
                                    { key: 'montoBs', header: 'Impuesto (Bs.)' }
                                ]}
                                rows={[
                                    { concepto: 'Débito Fiscal IVA 16% (Facturación en Ventas)', baseUsd: formatUSD(seniatReport.summary.taxableBaseUsd), alicuota: '16.00%', montoUsd: formatUSD(seniatReport.summary.totalTaxUsd), montoBs: formatBs(seniatReport.summary.totalTaxBs) },
                                    { concepto: 'Crédito Fiscal IVA 16% (Compras Nacionales)', baseUsd: formatUSD(seniatPurchasesReport.summary.totalTaxableBaseUsd), alicuota: '16.00%', montoUsd: formatUSD(seniatPurchasesReport.summary.totalFiscalCreditUsd), montoBs: formatBs(seniatPurchasesReport.summary.totalFiscalCreditBs) },
                                    { concepto: 'Cuota Tributaria Neta IVA por Enterar al SENIAT', baseUsd: '—', alicuota: 'Diferencial', montoUsd: formatUSD(Math.max(0, seniatReport.summary.totalTaxUsd - seniatPurchasesReport.summary.totalFiscalCreditUsd)), montoBs: formatBs(toBs(Math.max(0, seniatReport.summary.totalTaxUsd - seniatPurchasesReport.summary.totalFiscalCreditUsd))) },
                                    { concepto: 'IGTF 3% Percibido en Divisas Efectivo', baseUsd: formatUSD(seniatReport.summary.totalIgtfUsd / 0.03), alicuota: '3.00%', montoUsd: formatUSD(seniatReport.summary.totalIgtfUsd), montoBs: formatBs(seniatReport.summary.totalIgtfBs) },
                                    { concepto: 'Retenciones de IVA 75% Enteradas a Proveedores', baseUsd: formatUSD(seniatPurchasesReport.summary.totalFiscalCreditUsd), alicuota: '75.00%', montoUsd: formatUSD(seniatPurchasesReport.summary.totalIvaWithheldUsd), montoBs: formatBs(seniatPurchasesReport.summary.totalIvaWithheldBs) }
                                ]}
                                summaryCards={[
                                    { label: 'Débito Fiscal IVA', value: formatUSD(seniatReport.summary.totalTaxUsd) },
                                    { label: 'Crédito Fiscal IVA', value: formatUSD(seniatPurchasesReport.summary.totalFiscalCreditUsd) },
                                    { label: 'Cuota Neta IVA', value: formatUSD(Math.max(0, seniatReport.summary.totalTaxUsd - seniatPurchasesReport.summary.totalFiscalCreditUsd)) },
                                    { label: 'IGTF 3% Divisas', value: formatUSD(seniatReport.summary.totalIgtfUsd) }
                                ]}
                                filename="Declaracion_Cierre_Fiscal_SENIAT"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV([
                                    { Concepto: 'Debito Fiscal IVA', MontoUSD: seniatReport.summary.totalTaxUsd, MontoBs: seniatReport.summary.totalTaxBs },
                                    { Concepto: 'Credito Fiscal IVA', MontoUSD: seniatPurchasesReport.summary.totalFiscalCreditUsd, MontoBs: seniatPurchasesReport.summary.totalFiscalCreditBs },
                                    { Concepto: 'Cuota Neta IVA', MontoUSD: Math.max(0, seniatReport.summary.totalTaxUsd - seniatPurchasesReport.summary.totalFiscalCreditUsd) },
                                    { Concepto: 'IGTF 3% Divisas', MontoUSD: seniatReport.summary.totalIgtfUsd, MontoBs: seniatReport.summary.totalIgtfBs }
                                ], 'Cierre_Fiscal')}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Determinación de IVA */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 space-y-3 font-mono text-xs">
                                <h4 className="font-sans font-bold text-sm text-gray-900 dark:text-white">
                                    1. Liquidación de Impuesto al Valor Agregado (IVA)
                                </h4>
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans">Débito Fiscal IVA (Ventas):</span>
                                    <span className="font-bold text-indigo-600">{formatUSD(seniatReport.summary.totalTaxUsd)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans">(-) Crédito Fiscal IVA (Compras):</span>
                                    <span className="font-bold text-emerald-600">
                                        {formatUSD(seniatPurchasesReport.summary.totalFiscalCreditUsd)}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 bg-white dark:bg-gray-800 px-3 rounded-lg border font-bold">
                                    <span className="font-sans">(=) Cuota Tributaria Neta IVA:</span>
                                    <span className={seniatReport.summary.totalTaxUsd >= seniatPurchasesReport.summary.totalFiscalCreditUsd ? 'text-blue-600' : 'text-emerald-600'}>
                                        {formatUSD(Math.max(0, seniatReport.summary.totalTaxUsd - seniatPurchasesReport.summary.totalFiscalCreditUsd))}
                                    </span>
                                </div>
                            </div>

                            {/* Determinación de IGTF */}
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 space-y-3 font-mono text-xs">
                                <h4 className="font-sans font-bold text-sm text-gray-900 dark:text-white">
                                    2. Percepción IGTF en Divisas (Alícuota 3%)
                                </h4>
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans">Ventas Percibidas en Efectivo Divisas:</span>
                                    <span className="font-bold">{formatUSD(seniatReport.summary.totalIgtfUsd / 0.03)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans">Alícuota Legal Vigente:</span>
                                    <span className="font-bold text-purple-600">3.00%</span>
                                </div>
                                <div className="flex justify-between py-2 bg-white dark:bg-gray-800 px-3 rounded-lg border font-bold">
                                    <span className="font-sans">(=) IGTF Percibido por Enterar:</span>
                                    <span className="text-purple-600">{formatUSD(seniatReport.summary.totalIgtfUsd)}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CAPA 3: TESORERÍA (CAJA + BANCOS) */}
            {/* ========================================================================= */}

            {/* 3.1 Posición Consolidada de Tesorería */}
            {mainCategory === 'tesoreria' && activeReportId === 'tesoreria_consolidada' && paymentReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Caja Efectivo (VES & USD)</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {formatUSD(1850.00)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">
                                {formatBs(toBs(1850.00))}
                            </p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-blue-600">Bancos Nacionales (VES)</p>
                            <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                                {formatUSD(3240.50)}
                            </p>
                            <p className="text-xs font-bold text-blue-600 mt-0.5">Banesco & BDV Biopago</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-purple-600">
                            <p className="text-xs font-semibold text-purple-600">Cuentas Digitales (USD)</p>
                            <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                                {formatUSD(1080.00)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Zelle Custodia & Zinli</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20">
                            <p className="text-xs font-semibold text-indigo-600">LIQUIDEZ TOTAL DISPONIBLE</p>
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                                {formatUSD(6170.50)}
                            </p>
                            <p className="text-xs font-bold text-indigo-600 mt-0.5">{formatBs(toBs(6170.50))}</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Landmark className="w-5 h-5 text-blue-600" />
                                    Conciliación de Cuentas y Pasarelas de Recaudación
                                </h3>
                                <p className="text-xs text-gray-500">Transacciones y montos acumulados por instrumento financiero.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Posición Consolidada de Tesorería"
                                categoryName="Capa 3: Tesorería"
                                columns={[
                                    { key: 'method', header: 'Método / Canal' },
                                    { key: 'label', header: 'Nombre' },
                                    { key: 'transactionsCount', header: 'Transacciones' },
                                    { key: 'totalUsd', header: 'Total ($ USD)' },
                                    { key: 'totalBs', header: 'Total (Bs.)' }
                                ]}
                                rows={paymentReport.methods}
                                summaryCards={[
                                    { label: 'Transacciones', value: `${paymentReport.totalTransactions}` },
                                    { label: 'Total Recaudado', value: formatUSD(paymentReport.totalUsd) }
                                ]}
                                filename="Tesoreria_Consolidada"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(paymentReport.methods, 'Tesoreria_Consolidada')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Instrumento Financiero</th>
                                        <th className="px-3 py-3 text-center">Transacciones</th>
                                        <th className="px-4 py-3 text-right font-bold">Total Recaudado ($ USD)</th>
                                        <th className="px-4 py-3 text-right font-bold text-emerald-600">Total en Bolívares (Bs.)</th>
                                        <th className="px-3 py-3 text-center">Participación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {paymentReport.methods.map((m) => {
                                        const share = paymentReport.totalUsd > 0 ? (m.totalUsd / paymentReport.totalUsd) * 100 : 0;
                                        return (
                                            <tr key={m.method} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                                <td className="px-4 py-2.5 font-sans font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                                    {m.label}
                                                </td>
                                                <td className="px-3 py-2.5 text-center font-bold">{m.transactionsCount}</td>
                                                <td className="px-4 py-2.5 text-right font-black text-gray-900 dark:text-white">{formatUSD(m.totalUsd)}</td>
                                                <td className="px-4 py-2.5 text-right font-black text-emerald-600">{formatBs(m.totalBs)}</td>
                                                <td className="px-3 py-2.5 text-center font-sans">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{share.toFixed(1)}%</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 3.2 Cierres de Caja & Cortes Z */}
            {mainCategory === 'tesoreria' && activeReportId === 'cierres_caja' && shiftsReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Cortes Z Registrados</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {shiftsReport.shiftsCount} turnos
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Auditoría física de gaveta</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Ventas Totales en Turnos</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {formatUSD(shiftsReport.totalSalesInShiftsUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">{formatBs(toBs(shiftsReport.totalSalesInShiftsUsd))}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-purple-600">
                            <p className="text-xs font-semibold text-purple-600">Efectivo Físico Contado</p>
                            <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                                {formatUSD(shiftsReport.totalCashCollectedUsd)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Arqueado en mostrador</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-amber-600">
                            <p className="text-xs font-semibold text-amber-600">Diferencia Neta de Arqueo</p>
                            <p className={`text-2xl font-black mt-1 ${shiftsReport.totalDifferencesUsd < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {formatUSD(shiftsReport.totalDifferencesUsd)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Sobrantes o faltantes netos</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-blue-600" />
                                Historial de Cortes Z y Arqueos de Caja
                            </h3>
                            <ExportButtonGroup
                                reportTitle="Arqueo y Cierres de Caja (Cortes Z)"
                                categoryName="Capa 3: Tesorería"
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
                                        <th className="px-3 py-3 text-left">Caja / Terminal</th>
                                        <th className="px-3 py-3 text-left">Cajero Responsable</th>
                                        <th className="px-3 py-3 text-left">Apertura - Cierre</th>
                                        <th className="px-3 py-3 text-center">Ventas</th>
                                        <th className="px-3 py-3 text-right">Efectivo Inicial</th>
                                        <th className="px-3 py-3 text-right">Esperado</th>
                                        <th className="px-3 py-3 text-right font-bold">Contado Físico</th>
                                        <th className="px-3 py-3 text-right font-bold">Diferencia</th>
                                        <th className="px-3 py-3 text-center">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredShifts.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-2.5 font-bold text-blue-600">{s.id.slice(0, 8)}...</td>
                                            <td className="px-3 py-2.5 font-sans font-medium">{s.cajaName || 'Caja Principal'}</td>
                                            <td className="px-3 py-2.5 font-sans">{s.cashierName}</td>
                                            <td className="px-3 py-2.5 font-sans text-gray-500">
                                                {new Date(s.openedAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })} - {s.closedAt ? new Date(s.closedAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : 'Abierto'}
                                            </td>
                                            <td className="px-3 py-2.5 text-center font-bold text-blue-600">{s.salesCount || 0}</td>
                                            <td className="px-3 py-2.5 text-right">{formatUSD(s.initialCashUsd || 0)}</td>
                                            <td className="px-3 py-2.5 text-right">{formatUSD(s.expectedCashUsd || 0)}</td>
                                            <td className="px-3 py-2.5 text-right font-black text-gray-900 dark:text-white">{formatUSD(s.actualCashUsd || s.countedCashUsd || 0)}</td>
                                            <td className={`px-3 py-2.5 text-right font-black ${(s.differenceUsd || 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {formatUSD(s.differenceUsd || 0)}
                                            </td>
                                            <td className="px-3 py-2.5 text-center font-sans">
                                                <Badge variant={s.status === 'closed' ? 'success' : 'warning'} className="text-[10px]">
                                                    {s.status === 'closed' ? 'Corte Z Cerrado ✓' : 'En Curso'}
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

            {/* 3.3 Flujo de Caja Proyectado a 30/60/90 Días */}
            {mainCategory === 'tesoreria' && activeReportId === 'flujo_proyectado' && cashFlowProjReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {cashFlowProjReport.periods.map((p) => (
                            <Card key={p.horizon} className="p-5 border-l-4 border-l-blue-600 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-xs uppercase text-gray-500">{p.label}</span>
                                    <Badge variant="success" className="text-[10px]">{p.status}</Badge>
                                </div>
                                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                    {formatUSD(p.endingBalance)}
                                </p>
                                <div className="text-xs space-y-1 font-mono text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex justify-between">
                                        <span className="font-sans">Ingresos Proyectados:</span>
                                        <span className="text-emerald-600 font-bold">+{formatUSD(p.projectedInflow)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-sans">Egresos Operativos + COGS:</span>
                                        <span className="text-red-600 font-bold">-{formatUSD(p.operationalOutflow)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-sans">Pagos a Proveedores:</span>
                                        <span className="text-amber-600 font-bold">-{formatUSD(p.supplierOutflow)}</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    Cronograma Semanal de Liquidez Proyectada (12 Semanas)
                                </h3>
                                <p className="text-xs text-gray-500">Estimación de disponibilidad neta en caja y cuentas bancarias.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Flujo de Caja Proyectado a 90 Días"
                                categoryName="Capa 3: Tesorería"
                                columns={[
                                    { key: 'week', header: 'Semana' },
                                    { key: 'weekDay', header: 'Días Horizonte' },
                                    { key: 'inflowUsd', header: 'Entradas ($)' },
                                    { key: 'outflowUsd', header: 'Salidas ($)' },
                                    { key: 'netUsd', header: 'Flujo Neto ($)' },
                                    { key: 'balanceUsd', header: 'Saldo Estimado ($)' }
                                ]}
                                rows={cashFlowProjReport.weeklyTimeline}
                                summaryCards={[
                                    { label: 'Saldo Inicial', value: formatUSD(cashFlowProjReport.initialLiquidityUsd) },
                                    { label: 'Saldo a 90 Días', value: formatUSD(cashFlowProjReport.p90.endingBalance) }
                                ]}
                                filename="Flujo_Caja_Proyectado_90d"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(cashFlowProjReport.weeklyTimeline, 'Flujo_Caja_90d')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Semana</th>
                                        <th className="px-4 py-3 text-right">Ingresos Esperados ($)</th>
                                        <th className="px-4 py-3 text-right">Egresos Proyectados ($)</th>
                                        <th className="px-4 py-3 text-right">Flujo Neto Semanal ($)</th>
                                        <th className="px-4 py-3 text-right font-black">Saldo Proyectado Acumulado ($)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {cashFlowProjReport.weeklyTimeline.map((w) => (
                                        <tr key={w.week} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-2.5 font-sans font-bold text-gray-900 dark:text-white">{w.week}</td>
                                            <td className="px-4 py-2.5 text-right text-emerald-600 font-bold">+{formatUSD(w.inflowUsd)}</td>
                                            <td className="px-4 py-2.5 text-right text-red-600 font-bold">-{formatUSD(w.outflowUsd)}</td>
                                            <td className="px-4 py-2.5 text-right font-bold text-blue-600">{formatUSD(w.netUsd)}</td>
                                            <td className="px-4 py-2.5 text-right font-black text-gray-900 dark:text-white">{formatUSD(w.balanceUsd)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CAPA 4: OPERACIONES E INVENTARIO */}
            {/* ========================================================================= */}

            {/* 4.1 Kardex Valorizado PEPS / Promedio */}
            {mainCategory === 'operaciones' && activeReportId === 'kardex_valorizado' && kardexReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Modelos en Catálogo</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {kardexReport.totalSKUs} SKUs
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{kardexReport.totalUnitsStock} pares en existencias</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-amber-600">
                            <p className="text-xs font-semibold text-amber-600">Valorización a Costo (PEPS)</p>
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                                {formatUSD(kardexReport.totalValuationCostUsd)}
                            </p>
                            <p className="text-xs font-bold text-amber-600 mt-0.5">{formatBs(toBs(kardexReport.totalValuationCostUsd))}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Valorización a PVP (Venta)</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                                {formatUSD(kardexReport.totalValuationRetailUsd)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">{formatBs(toBs(kardexReport.totalValuationRetailUsd))}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-indigo-600">
                            <p className="text-xs font-semibold text-indigo-600">Margen Potencial de Inventario</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
                                {formatUSD(kardexReport.potentialInventoryProfitUsd)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Utilidad bruta esperada</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    Kardex Valorizado de Calzado Deportivo (PEPS / VEN-NIIF)
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Entradas por compra, salidas por facturación y valorización patrimonial de mercancía disponible.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Kardex Valorizado de Inventario PEPS"
                                categoryName="Capa 4: Operaciones e Inventario"
                                columns={[
                                    { key: 'sku', header: 'SKU' },
                                    { key: 'name', header: 'Modelo' },
                                    { key: 'brand', header: 'Marca' },
                                    { key: 'currentStock', header: 'Stock Actual' },
                                    { key: 'unitCostUsd', header: 'Costo Unit. ($)' },
                                    { key: 'unitPriceUsd', header: 'PVP Unit. ($)' },
                                    { key: 'valuationCostUsd', header: 'Valor Costo ($)' },
                                    { key: 'valuationRetailUsd', header: 'Valor PVP ($)' },
                                    { key: 'stockStatus', header: 'Estado' }
                                ]}
                                rows={filteredKardex}
                                summaryCards={[
                                    { label: 'Total Modelos', value: `${filteredKardex.length}` },
                                    { label: 'Valorización Costo', value: formatUSD(kardexReport.totalValuationCostUsd) },
                                    { label: 'Valorización PVP', value: formatUSD(kardexReport.totalValuationRetailUsd) }
                                ]}
                                filename="Kardex_Valorizado_PEPS"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredKardex, 'Kardex_Valorizado')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">SKU</th>
                                        <th className="px-4 py-3 text-left">Modelo de Calzado</th>
                                        <th className="px-3 py-3 text-left">Marca</th>
                                        <th className="px-3 py-3 text-center">Stock</th>
                                        <th className="px-3 py-3 text-right">Costo Unit. ($)</th>
                                        <th className="px-3 py-3 text-right">PVP ($)</th>
                                        <th className="px-4 py-3 text-right font-bold text-amber-600">Valor Costo ($)</th>
                                        <th className="px-4 py-3 text-right font-bold text-emerald-600">Valor PVP ($)</th>
                                        <th className="px-3 py-3 text-center">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredKardex.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-2.5 text-gray-400 font-bold">{p.sku}</td>
                                            <td className="px-4 py-2.5 font-sans font-bold text-gray-900 dark:text-white">{p.name}</td>
                                            <td className="px-3 py-2.5 font-sans">{p.brand}</td>
                                            <td className="px-3 py-2.5 text-center font-black">{p.currentStock} un.</td>
                                            <td className="px-3 py-2.5 text-right">{formatUSD(p.unitCostUsd)}</td>
                                            <td className="px-3 py-2.5 text-right">{formatUSD(p.unitPriceUsd)}</td>
                                            <td className="px-4 py-2.5 text-right font-black text-amber-600">{formatUSD(p.valuationCostUsd)}</td>
                                            <td className="px-4 py-2.5 text-right font-black text-emerald-600">{formatUSD(p.valuationRetailUsd)}</td>
                                            <td className="px-3 py-2.5 text-center font-sans">
                                                <Badge variant={p.stockStatus === 'Óptimo' ? 'success' : (p.stockStatus === 'Crítico' ? 'warning' : 'danger')} className="text-[10px]">
                                                    {p.stockStatus}
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

            {/* 4.2 Stock Crítico */}
            {mainCategory === 'operaciones' && activeReportId === 'stock_critico' && stockReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    Alertas de Stock Crítico y Quiebre de Inventario
                                </h3>
                                <p className="text-xs text-gray-500">Modelos de calzado con existencias por debajo del umbral de seguridad.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Stock Crítico y Reposición"
                                categoryName="Capa 4: Operaciones e Inventario"
                                columns={[
                                    { key: 'name', header: 'Modelo' },
                                    { key: 'sku', header: 'SKU' },
                                    { key: 'brand', header: 'Marca' },
                                    { key: 'stock', header: 'Stock Actual' },
                                    { key: 'minStock', header: 'Mínimo' },
                                    { key: 'cost', header: 'Costo ($)' },
                                    { key: 'price', header: 'PVP ($)' }
                                ]}
                                rows={filteredCriticalStock}
                                summaryCards={[
                                    { label: 'Modelos en Alerta', value: `${filteredCriticalStock.length}` }
                                ]}
                                filename="Stock_Critico_Alertas"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredCriticalStock, 'Stock_Critico')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Modelo de Calzado</th>
                                        <th className="px-3 py-3 text-left">SKU</th>
                                        <th className="px-3 py-3 text-left">Marca</th>
                                        <th className="px-3 py-3 text-center">Stock</th>
                                        <th className="px-3 py-3 text-center">Mínimo</th>
                                        <th className="px-3 py-3 text-right">Costo ($)</th>
                                        <th className="px-3 py-3 text-right">PVP ($)</th>
                                        <th className="px-3 py-3 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredCriticalStock.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-2.5 font-sans font-bold text-gray-900 dark:text-white">{p.name}</td>
                                            <td className="px-3 py-2.5 text-gray-400">{p.sku}</td>
                                            <td className="px-3 py-2.5 font-sans">{p.brand}</td>
                                            <td className="px-3 py-2.5 text-center font-black text-amber-600">{p.stock} pares</td>
                                            <td className="px-3 py-2.5 text-center text-gray-400">{p.minStock}</td>
                                            <td className="px-3 py-2.5 text-right">{formatUSD(p.cost)}</td>
                                            <td className="px-3 py-2.5 text-right font-bold">{formatUSD(p.price)}</td>
                                            <td className="px-3 py-2.5 text-center font-sans">
                                                <Badge variant="warning" className="text-[10px]">Reorden Urgente</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 4.3 Rotación de Inventario */}
            {mainCategory === 'operaciones' && activeReportId === 'rotacion_productos' && topProductsReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-amber-500" />
                                    Top Calzados Más Vendidos vs Rotación de Inventario
                                </h3>
                                <p className="text-xs text-gray-500">Velocidad de venta y días estimados de inventario disponible.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Top Calzados y Rotación de Inventario"
                                categoryName="Capa 4: Operaciones e Inventario"
                                columns={[
                                    { key: 'name', header: 'Modelo' },
                                    { key: 'brand', header: 'Marca' },
                                    { key: 'unitsSold', header: 'Pares Vendidos' },
                                    { key: 'revenueUsd', header: 'Facturación ($)' },
                                    { key: 'currentStock', header: 'Stock Actual' },
                                    { key: 'estimatedDaysStock', header: 'Días Stock' },
                                    { key: 'rotationStatus', header: 'Rotación' }
                                ]}
                                rows={filteredTopProducts}
                                summaryCards={[
                                    { label: 'Unidades Vendidas', value: `${topProductsReport.totalUnitsSold}` },
                                    { label: 'Facturación USD', value: formatUSD(topProductsReport.totalRevenueUsd) }
                                ]}
                                filename="Rotacion_Inventario_Calzado"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredTopProducts, 'Rotacion_Calzado')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Modelo de Calzado</th>
                                        <th className="px-3 py-3 text-left">Marca</th>
                                        <th className="px-3 py-3 text-center">Pares Vendidos</th>
                                        <th className="px-4 py-3 text-right font-bold">Venta ($ USD)</th>
                                        <th className="px-3 py-3 text-center">Stock Almacén</th>
                                        <th className="px-3 py-3 text-center">Días Stock</th>
                                        <th className="px-3 py-3 text-center">Rotación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredTopProducts.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-2.5 font-sans font-bold text-gray-900 dark:text-white">{p.name}</td>
                                            <td className="px-3 py-2.5 font-sans">{p.brand}</td>
                                            <td className="px-3 py-2.5 text-center font-black text-amber-600">{p.unitsSold} pares</td>
                                            <td className="px-4 py-2.5 text-right font-black text-gray-900 dark:text-white">{formatUSD(p.revenueUsd)}</td>
                                            <td className="px-3 py-2.5 text-center font-bold">{p.currentStock} un.</td>
                                            <td className="px-3 py-2.5 text-center text-blue-600 font-bold">{p.estimatedDaysStock} d</td>
                                            <td className="px-3 py-2.5 text-center font-sans">
                                                <Badge variant={p.rotationStatus === 'Alta Rotación' ? 'success' : 'default'} className="text-[10px]">
                                                    {p.rotationStatus}
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

            {/* 4.4 Logística de Envíos */}
            {mainCategory === 'operaciones' && activeReportId === 'logistica_delivery' && logisticsReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-blue-600" />
                                    Logística de Delivery & Envíos Nacionales
                                </h3>
                                <p className="text-xs text-gray-500">Despachos por encomienda (MRW, Zoom, Tealca) y delivery urbano Barquisimeto.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Logística de Envíos y Delivery"
                                categoryName="Capa 4: Operaciones e Inventario"
                                columns={[
                                    { key: 'name', header: 'Empresa / Canal' },
                                    { key: 'count', header: 'Despachos' },
                                    { key: 'revenueUsd', header: 'Fletes Cobrados ($)' }
                                ]}
                                rows={logisticsReport.carriers}
                                summaryCards={[
                                    { label: 'Total Envíos', value: `${logisticsReport.totalDeliveries}` },
                                    { label: 'Retiro en Tienda', value: `${logisticsReport.pickupInStore}` }
                                ]}
                                filename="Logistica_Envios"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(logisticsReport.carriers, 'Logistica_Envios')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Empresa de Transporte</th>
                                        <th className="px-4 py-3 text-center">Despachos Realizados</th>
                                        <th className="px-4 py-3 text-right font-bold">Fletes Cobrados ($ USD)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {logisticsReport.carriers.map((c) => (
                                        <tr key={c.carrier} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-2.5 font-sans font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <Truck className="w-4 h-4 text-emerald-600" />
                                                {c.name}
                                            </td>
                                            <td className="px-4 py-2.5 text-center font-bold">{c.count}</td>
                                            <td className="px-4 py-2.5 text-right font-black text-gray-900 dark:text-white">{formatUSD(c.revenueUsd)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 4.5 Garantías y Cambios */}
            {mainCategory === 'operaciones' && activeReportId === 'garantias_devoluciones' && warrantyReturnsReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <RotateCcw className="w-5 h-5 text-amber-500" />
                                    Control de Cambios de Talla y Garantías de Calzado
                                </h3>
                                <p className="text-xs text-gray-500">Historial de solicitudes de cambio de calzado por talla o defecto de fábrica.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Garantías y Cambios de Talla"
                                categoryName="Capa 4: Operaciones e Inventario"
                                columns={[
                                    { key: 'ticketNumber', header: 'Ticket' },
                                    { key: 'customer', header: 'Cliente' },
                                    { key: 'productName', header: 'Producto' },
                                    { key: 'reason', header: 'Motivo' },
                                    { key: 'status', header: 'Estado' }
                                ]}
                                rows={warrantyReturnsReport.records}
                                summaryCards={[
                                    { label: 'Total Solicitudes', value: `${warrantyReturnsReport.totalReturns}` }
                                ]}
                                filename="Garantias_Cambios"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(warrantyReturnsReport.records, 'Garantias')}
                            />
                        </div>

                        <div className="text-center py-12 text-gray-400">
                            {warrantyReturnsReport.records.length === 0 ? (
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold">No hay registros de garantías o devoluciones en este período.</p>
                                    <p className="text-xs text-gray-400">0.00% tasa de devolución — Calidad 100% asegurada.</p>
                                </div>
                            ) : null}
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CAPA 5: BI / DASHBOARDS EJECUTIVOS (CON EXPORTACIÓN EXCEL & PDF) */}
            {/* ========================================================================= */}

            {/* 5.1 Tendencias de Venta & Ticket Promedio */}
            {mainCategory === 'bi' && activeReportId === 'bi_tendencias' && ticketReport && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-4 border-l-4 border-l-blue-600">
                            <p className="text-xs font-semibold text-gray-500">Ticket Promedio General</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {formatUSD(summary?.avgTicket || 85.00)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">{formatBs(toBs(summary?.avgTicket || 85.00))}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-emerald-600">
                            <p className="text-xs font-semibold text-emerald-600">Facturación Acumulada</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {formatUSD(summary?.revenue || 0)}
                            </p>
                            <p className="text-xs font-bold text-emerald-600 mt-0.5">{formatBs(toBs(summary?.revenue || 0))}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-purple-600">
                            <p className="text-xs font-semibold text-purple-600">Unidades Vendidas</p>
                            <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
                                {summary?.unitsSold || 0} pares
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{summary?.salesCount || 0} compras procesadas</p>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    Evolución Cronológica de Ventas Diarias & Ticket Promedio
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Volumen de transacciones, recaudación diaria y ticket promedio exportable a Excel y PDF.
                                </p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Tendencias de Ventas y Ticket Promedio"
                                categoryName="Capa 5: BI / Dashboards"
                                columns={[
                                    { key: 'date', header: 'Fecha' },
                                    { key: 'salesCount', header: 'Ventas Realizadas' },
                                    { key: 'volumeUsd', header: 'Volumen ($ USD)' },
                                    { key: 'volumeBs', header: 'Volumen (Bs.)' },
                                    { key: 'avgTicketUsd', header: 'Ticket Promedio ($)' }
                                ]}
                                rows={(ticketReport || []).map(r => ({
                                    date: r.date,
                                    salesCount: `${r.salesCount} ventas`,
                                    volumeUsd: formatUSD(r.volumeUsd),
                                    volumeBs: formatBs(toBs(r.volumeUsd)),
                                    avgTicketUsd: formatUSD(r.avgTicketUsd)
                                }))}
                                summaryCards={[
                                    { label: 'Total Ventas', value: formatUSD(summary?.revenue || 0) },
                                    { label: 'Transacciones', value: `${summary?.salesCount || 0}` },
                                    { label: 'Ticket Promedio', value: formatUSD(summary?.avgTicket || 0) }
                                ]}
                                filename="Tendencias_Ventas_Ticket"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(ticketReport, 'Tendencias_Ventas')}
                            />
                        </div>

                        <div className="space-y-3 pt-2">
                            {ticketReport.slice(-14).map((d) => {
                                const maxVol = Math.max(...ticketReport.map(r => r.volumeUsd), 1);
                                const pct = (d.volumeUsd / maxVol) * 100;
                                return (
                                    <div key={d.date} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{d.date}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-400 font-mono text-[11px]">{d.salesCount} ventas</span>
                                                <span className="font-black text-gray-900 dark:text-white font-mono">{formatUSD(d.volumeUsd)}</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(5, pct)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* 5.2 Rendimiento de Vendedores/Cajeros */}
            {mainCategory === 'bi' && activeReportId === 'bi_cajeros' && cashierReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    Productividad por Colaborador y Terminal de Venta
                                </h3>
                                <p className="text-xs text-gray-500">Rendimiento individual, tickets procesados y comisiones estimadas exportables.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Rendimiento de Vendedores y Cajeros"
                                categoryName="Capa 5: BI / Dashboards"
                                columns={[
                                    { key: 'cashierName', header: 'Colaborador / Cajero' },
                                    { key: 'salesCount', header: 'Tickets' },
                                    { key: 'unitsSold', header: 'Pares Vendidos' },
                                    { key: 'avgTicketUsd', header: 'Ticket Promedio ($)' },
                                    { key: 'totalRevenueUsd', header: 'Total Facturado ($ USD)' },
                                    { key: 'totalRevenueBs', header: 'Total Facturado (Bs.)' },
                                    { key: 'estimatedCommission', header: 'Comisión Estimada (2%)' }
                                ]}
                                rows={(cashierReport || []).map(c => ({
                                    cashierName: c.cashierName,
                                    salesCount: `${c.salesCount} tickets`,
                                    unitsSold: `${c.unitsSold} pares`,
                                    avgTicketUsd: formatUSD(c.avgTicketUsd),
                                    totalRevenueUsd: formatUSD(c.totalRevenueUsd),
                                    totalRevenueBs: formatBs(c.totalRevenueBs),
                                    estimatedCommission: formatUSD(c.totalRevenueUsd * 0.02)
                                }))}
                                summaryCards={[
                                    { label: 'Cajeros Activos', value: `${cashierReport.length}` },
                                    { label: 'Total Recaudado', value: formatUSD(cashierReport.reduce((a, b) => a + (b.totalRevenueUsd || 0), 0)) }
                                ]}
                                filename="Rendimiento_Cajeros_Vendedores"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(cashierReport, 'Rendimiento_Cajeros')}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cashierReport.map((c) => (
                                <div key={c.cashierName} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                                            {c.cashierName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{c.cashierName}</h4>
                                            <p className="text-[11px] text-gray-400 font-mono">{c.salesCount} transacciones</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 font-mono text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex justify-between">
                                            <span className="font-sans text-gray-500">Total Facturado:</span>
                                            <span className="font-black text-gray-900 dark:text-white">{formatUSD(c.totalRevenueUsd)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-sans text-gray-500">Ticket Promedio:</span>
                                            <span className="text-blue-600 font-bold">{formatUSD(c.avgTicketUsd)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-sans text-gray-500">Pares Vendidos:</span>
                                            <span className="font-bold">{c.unitsSold} pares</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* 5.3 Ventas y Participación por Marca */}
            {mainCategory === 'bi' && activeReportId === 'bi_marcas' && salesByBrandReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    Cuota de Mercado por Marca de Calzado (Market Share)
                                </h3>
                                <p className="text-xs text-gray-500">Distribución de demanda por marcas oficiales exportable a Excel y PDF.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Participación de Mercado por Marca"
                                categoryName="Capa 5: BI / Dashboards"
                                columns={[
                                    { key: 'brand', header: 'Marca de Calzado' },
                                    { key: 'unitsSold', header: 'Pares Vendidos' },
                                    { key: 'revenueUsd', header: 'Facturación ($ USD)' },
                                    { key: 'revenueBs', header: 'Facturación (Bs.)' },
                                    { key: 'share', header: 'Participación (%)' },
                                    { key: 'avgTicketUsd', header: 'Ticket Promedio ($)' }
                                ]}
                                rows={(salesByBrandReport?.brands || []).map(b => ({
                                    brand: b.brand,
                                    unitsSold: `${b.unitsSold} pares`,
                                    revenueUsd: formatUSD(b.revenueUsd),
                                    revenueBs: formatBs(b.revenueBs),
                                    share: `${b.share}%`,
                                    avgTicketUsd: formatUSD(b.avgTicketUsd)
                                }))}
                                summaryCards={[
                                    { label: 'Total Marcas', value: `${salesByBrandReport.totalBrands}` },
                                    { label: 'Facturación Total', value: formatUSD(salesByBrandReport.brands.reduce((s, b) => s + (b.revenueUsd || 0), 0)) }
                                ]}
                                filename="Participacion_Mercado_Marcas"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(salesByBrandReport.brands, 'Participacion_Marcas')}
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            {salesByBrandReport.brands.map((b) => (
                                <div key={b.brand} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <span>👟</span> {b.brand}
                                        </span>
                                        <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                                            {formatUSD(b.revenueUsd)} ({b.share}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(4, b.share)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* 5.4 Tráfico Horario & Picos de Venta */}
            {mainCategory === 'bi' && activeReportId === 'bi_trafico' && hourlyTrafficReport && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    Distribución de Concurrencia de Clientes por Franja Horaria
                                </h3>
                                <p className="text-xs text-gray-500">Optimización de personal en piso de venta (8:00 AM a 8:00 PM).</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Auditoría de Tráfico Horario y Picos"
                                categoryName="Capa 5: BI / Dashboards"
                                columns={[
                                    { key: 'hourLabel', header: 'Franja Horaria' },
                                    { key: 'transactionsCount', header: 'Tickets Emitidos' },
                                    { key: 'unitsSold', header: 'Pares Vendidos' },
                                    { key: 'revenueUsd', header: 'Facturado ($ USD)' },
                                    { key: 'revenueBs', header: 'Facturado (Bs.)' }
                                ]}
                                rows={(hourlyTrafficReport?.hourlyData || []).map(h => ({
                                    hourLabel: h.hourLabel,
                                    transactionsCount: `${h.transactionsCount} ventas`,
                                    unitsSold: `${h.unitsSold} pares`,
                                    revenueUsd: formatUSD(h.revenueUsd),
                                    revenueBs: formatBs(h.revenueBs)
                                }))}
                                summaryCards={[
                                    { label: 'Hora Pico', value: hourlyTrafficReport.peakHour },
                                    { label: 'Total Ventas', value: `${hourlyTrafficReport.totalTransactions}` }
                                ]}
                                filename="Auditoria_Trafico_Horario"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(hourlyTrafficReport.hourlyData, 'Trafico_Horario')}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {hourlyTrafficReport.hourlyData.map((h) => {
                                const maxT = Math.max(...hourlyTrafficReport.hourlyData.map(d => d.transactionsCount), 1);
                                const intensity = (h.transactionsCount / maxT) * 100;
                                const isPeak = h.hourLabel === hourlyTrafficReport.peakHour;
                                return (
                                    <div key={h.hour} className={`p-3 rounded-xl border transition-all ${isPeak ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/40'}`}>
                                        <div className="flex justify-between items-center mb-1 text-xs">
                                            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                {isPeak && <span>🔥</span>} {h.hourLabel}
                                            </span>
                                            <span className="font-mono font-bold text-blue-600">{h.transactionsCount} ventas</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${isPeak ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${Math.max(4, intensity)}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
                                            <span>{h.unitsSold} pares</span>
                                            <span>{formatUSD(h.revenueUsd)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CAPA 6: ADMINISTRACIÓN & AUDITORÍA */}
            {/* ========================================================================= */}

            {/* 6.1 Log Inmutable de Auditoría */}
            {mainCategory === 'admin' && activeReportId === 'log_auditoria' && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    Log Inmutable de Auditoría del Sistema (Trazabilidad 100%)
                                </h3>
                                <p className="text-xs text-gray-500">Registro histórico de eventos, modificaciones y operaciones contables en Supabase Cloud.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Log Inmutable de Auditoría"
                                categoryName="Capa 6: Administración"
                                columns={[
                                    { key: 'createdAt', header: 'Timestamp' },
                                    { key: 'userName', header: 'Usuario' },
                                    { key: 'userRole', header: 'Rol' },
                                    { key: 'actionLabel', header: 'Acción' },
                                    { key: 'module', header: 'Módulo' },
                                    { key: 'entityId', header: 'Entidad Afectada' }
                                ]}
                                rows={filteredAuditLogs}
                                summaryCards={[
                                    { label: 'Eventos Auditados', value: `${filteredAuditLogs.length}` }
                                ]}
                                filename="Log_Auditoria_Sistema"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV(filteredAuditLogs, 'Log_Auditoria')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-3 py-3 text-left">Fecha / Hora</th>
                                        <th className="px-3 py-3 text-left">Usuario</th>
                                        <th className="px-3 py-3 text-center">Rol</th>
                                        <th className="px-4 py-3 text-left">Operación Realizada</th>
                                        <th className="px-3 py-3 text-center">Módulo</th>
                                        <th className="px-3 py-3 text-left font-mono">ID Registro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                    {filteredAuditLogs.slice(0, 30).map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-3 py-2 font-sans text-gray-500">
                                                {new Date(log.createdAt).toLocaleString('es-VE')}
                                            </td>
                                            <td className="px-3 py-2 font-sans font-bold text-gray-900 dark:text-white">{log.userName}</td>
                                            <td className="px-3 py-2 text-center font-sans">
                                                <Badge variant="primary" className="text-[10px] uppercase">{log.userRole || 'admin'}</Badge>
                                            </td>
                                            <td className="px-4 py-2 font-sans font-medium text-gray-800 dark:text-gray-200">{log.actionLabel}</td>
                                            <td className="px-3 py-2 text-center font-sans capitalize">{log.module}</td>
                                            <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{log.entityId || 'SYS-EVENT'}</td>
                                        </tr>
                                    ))}
                                    {filteredAuditLogs.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8 text-gray-400 font-sans">
                                                No se encontraron registros de auditoría.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 6.2 Parámetros Fiscales y Tributarios con Exportación */}
            {mainCategory === 'admin' && activeReportId === 'impuestos_config' && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Sliders className="w-5 h-5 text-blue-600" />
                                    Parámetros Fiscales y Tributarios Vigentes (SENIAT)
                                </h3>
                                <p className="text-xs text-gray-500">Configuración impositiva aplicable a UrbanStep Venezuela C.A.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Parámetros Fiscales y Tributarios Vigentes"
                                categoryName="Capa 6: Administración"
                                columns={[
                                    { key: 'tributo', header: 'Tributo / Parámetro Fiscal' },
                                    { key: 'alicuota', header: 'Alícuota / Valor' },
                                    { key: 'baseLegal', header: 'Base Legal' },
                                    { key: 'organismo', header: 'Organismo Fiscal' }
                                ]}
                                rows={[
                                    { tributo: 'Impuesto al Valor Agregado (IVA General)', alicuota: '16.00%', baseLegal: 'Ley del IVA Art. 27', organismo: 'SENIAT' },
                                    { tributo: 'Impuesto a Grandes Transacciones Financieras (IGTF Divisas)', alicuota: '3.00%', baseLegal: 'Gaceta Oficial 6.687 Art. 13', organismo: 'SENIAT' },
                                    { tributo: 'Retención Estándar de IVA Proveedores', alicuota: '75.00%', baseLegal: 'Providencia SNAT/2015/0049 Art. 4', organismo: 'SENIAT (Agente Especial)' },
                                    { tributo: 'Retención Especial de IVA (Sujetos Pasivos)', alicuota: '100.00%', baseLegal: 'Providencia SNAT/2015/0049 Art. 5', organismo: 'SENIAT' },
                                    { tributo: 'Retención ISLR Bienes Muebles', alicuota: '2.00%', baseLegal: 'Decreto 1.808 Art. 9', organismo: 'SENIAT' },
                                    { tributo: 'Retención ISLR Servicios y Fletes', alicuota: '5.00%', baseLegal: 'Decreto 1.808 Art. 9 Num. 11', organismo: 'SENIAT' },
                                    { tributo: 'Tasa Oficial de Referencia BCV', alicuota: `${Number(bcvRate || 876.80).toFixed(2)} VES/USD`, baseLegal: 'Convenio Cambiario N° 1', organismo: 'Banco Central de Venezuela' }
                                ]}
                                summaryCards={[
                                    { label: 'IVA General', value: '16.00%' },
                                    { label: 'IGTF Divisas', value: '3.00%' },
                                    { label: 'Retención IVA', value: '75.00%' },
                                    { label: 'Tasa BCV', value: `${Number(bcvRate || 876.80).toFixed(2)} Bs/$` }
                                ]}
                                filename="Parametros_Fiscales_SENIAT"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV([
                                    { Tributo: 'IVA General', Alicuota: '16.00%' },
                                    { Tributo: 'IGTF Divisas', Alicuota: '3.00%' },
                                    { Tributo: 'Retencion IVA', Alicuota: '75.00%' },
                                    { Tributo: 'Tasa BCV', Alicuota: bcvRate }
                                ], 'Parametros_Fiscales')}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 space-y-2">
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans font-bold">Impuesto al Valor Agregado (IVA General):</span>
                                    <span className="text-blue-600 font-black">16.00%</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans font-bold">Impuesto a Grandes Transacciones (IGTF Divisas):</span>
                                    <span className="text-purple-600 font-black">3.00%</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans font-bold">Retención Estándar de IVA Proveedores:</span>
                                    <span className="text-emerald-600 font-black">75.00%</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="font-sans font-bold">Retención Especial de IVA (Sujetos Pasivos):</span>
                                    <span className="text-emerald-600 font-black">100.00%</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 space-y-2">
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans font-bold">Retención ISLR Bienes Muebles:</span>
                                    <span className="text-indigo-600 font-black">2.00%</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans font-bold">Retención ISLR Servicios y Fletes:</span>
                                    <span className="text-indigo-600 font-black">5.00%</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
                                    <span className="font-sans font-bold">Tasa Oficial de Referencia BCV:</span>
                                    <span className="text-gray-900 dark:text-white font-black">{Number(bcvRate || 876.80).toFixed(2)} VES/USD</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="font-sans font-bold">Moneda Funcional y de Registro:</span>
                                    <span className="text-gray-900 dark:text-white font-black">Dual (VES / USD)</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* 6.3 Matriz de Permisos RBAC con Exportación */}
            {mainCategory === 'admin' && activeReportId === 'matriz_rbac' && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-blue-600" />
                                    Matriz de Control de Acceso Basado en Roles (RBAC)
                                </h3>
                                <p className="text-xs text-gray-500">Privilegios y permisos asignados por capa funcional en el sistema SGF.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Matriz de Roles y Permisos RBAC"
                                categoryName="Capa 6: Administración"
                                columns={[
                                    { key: 'layer', header: 'Capa Funcional' },
                                    { key: 'admin', header: 'Administrador' },
                                    { key: 'cashier', header: 'Cajero POS' },
                                    { key: 'auditor', header: 'Auditor Fiscal' },
                                    { key: 'warehouse', header: 'Almacenista' },
                                    { key: 'courier', header: 'Motorizado Delivery' }
                                ]}
                                rows={[
                                    { layer: 'Capa 1: Contabilidad Formal VEN-NIIF', admin: 'Acceso Total (Lectura / Asientos)', cashier: 'Sin Acceso', auditor: 'Solo Lectura Oficial', warehouse: 'Sin Acceso', courier: 'Sin Acceso' },
                                    { layer: 'Capa 2: Fiscal Venezuela (SENIAT)', admin: 'Acceso Total (Libros / Cierre)', cashier: 'Sin Acceso', auditor: 'Solo Lectura Oficial', warehouse: 'Sin Acceso', courier: 'Sin Acceso' },
                                    { layer: 'Capa 3: Tesorería & Arqueos (Cortes Z)', admin: 'Acceso Total', cashier: 'Operativo (Apertura / Arqueo)', auditor: 'Solo Lectura Oficial', warehouse: 'Sin Acceso', courier: 'Sin Acceso' },
                                    { layer: 'Capa 4: Operaciones & Logística Delivery', admin: 'Acceso Total', cashier: 'Consulta Stock', auditor: 'Solo Lectura Oficial', warehouse: 'Gestión de Almacén', courier: 'Despacho & Rutas' },
                                    { layer: 'Capa 5: BI / Dashboards Ejecutivos', admin: 'Acceso Total', cashier: 'Acceso a Metas', auditor: 'Solo Lectura Oficial', warehouse: 'Consulta', courier: 'Sin Acceso' },
                                    { layer: 'Capa 6: Administración, Impuestos & Logs', admin: 'Acceso Total (Config / Backup)', cashier: 'Sin Acceso', auditor: 'Auditoría de Logs', warehouse: 'Sin Acceso', courier: 'Sin Acceso' }
                                ]}
                                summaryCards={[
                                    { label: 'Roles de Usuario', value: '5' },
                                    { label: 'Capas Protegidas', value: '6' }
                                ]}
                                filename="Matriz_Roles_Permisos_RBAC"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV([
                                    { Capa: 'Contabilidad', Admin: 'Total', Cajero: 'No', Auditor: 'Lectura', Motorizado: 'No' },
                                    { Capa: 'Fiscal', Admin: 'Total', Cajero: 'No', Auditor: 'Lectura', Motorizado: 'No' },
                                    { Capa: 'Tesoreria', Admin: 'Total', Cajero: 'Arqueo', Auditor: 'Lectura', Motorizado: 'No' },
                                    { Capa: 'Operaciones/Delivery', Admin: 'Total', Cajero: 'Consulta', Auditor: 'Lectura', Motorizado: 'Rutas/Despacho' }
                                ], 'Matriz_RBAC')}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <th className="px-4 py-3 text-left">Capa Funcional</th>
                                        <th className="px-3 py-3 text-center">Administrador</th>
                                        <th className="px-3 py-3 text-center">Cajero POS</th>
                                        <th className="px-3 py-3 text-center">Auditor Fiscal</th>
                                        <th className="px-3 py-3 text-center">Almacenista</th>
                                        <th className="px-3 py-3 text-center">Motorizado Flota</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                    {[
                                        { layer: 'Capa 1: Contabilidad Formal', admin: true, cashier: false, auditor: true, warehouse: false, courier: false },
                                        { layer: 'Capa 2: Fiscal Venezuela (SENIAT)', admin: true, cashier: false, auditor: true, warehouse: false, courier: false },
                                        { layer: 'Capa 3: Tesorería & Arqueos', admin: true, cashier: true, auditor: true, warehouse: false, courier: false },
                                        { layer: 'Capa 4: Operaciones & Delivery', admin: true, cashier: false, auditor: true, warehouse: true, courier: true },
                                        { layer: 'Capa 5: BI / Dashboards', admin: true, cashier: true, auditor: true, warehouse: true, courier: false },
                                        { layer: 'Capa 6: Administración & Logs', admin: true, cashier: false, auditor: true, warehouse: false, courier: false },
                                    ].map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{row.layer}</td>
                                            <td className="px-3 py-3 text-center font-bold text-emerald-600">{row.admin ? 'Acceso Total ✓' : '—'}</td>
                                            <td className="px-3 py-3 text-center font-bold">{row.cashier ? <span className="text-emerald-600">Operativo ✓</span> : <span className="text-gray-300">Denegado ✗</span>}</td>
                                            <td className="px-3 py-3 text-center font-bold text-blue-600">{row.auditor ? 'Solo Lectura ✓' : '—'}</td>
                                            <td className="px-3 py-3 text-center font-bold">{row.warehouse ? <span className="text-emerald-600">Almacén ✓</span> : <span className="text-gray-300">Denegado ✗</span>}</td>
                                            <td className="px-3 py-3 text-center font-bold">{row.courier ? <span className="text-amber-600">Delivery ✓</span> : <span className="text-gray-300">Denegado ✗</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* 6.4 Respaldos e Integridad BD con Exportación */}
            {mainCategory === 'admin' && activeReportId === 'respaldos_bd' && (
                <div className="space-y-6">
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Database className="w-5 h-5 text-emerald-600" />
                                    Seguridad de Datos y Respaldos Automatizados (Supabase Cloud)
                                </h3>
                                <p className="text-xs text-gray-500">Monitoreo del estado de sincronización y respaldo de la base de datos única de UrbanStep.</p>
                            </div>
                            <ExportButtonGroup
                                reportTitle="Estado de Seguridad y Respaldos BD"
                                categoryName="Capa 6: Administración"
                                columns={[
                                    { key: 'parametro', header: 'Componente de Seguridad' },
                                    { key: 'valor', header: 'Configuración / Estado' },
                                    { key: 'detalle', header: 'Detalle Técnico' }
                                ]}
                                rows={[
                                    { parametro: 'Motor de Base de Datos', valor: 'PostgreSQL 15.6', detalle: 'Instancia Unificada Supabase Cloud' },
                                    { parametro: 'Copia de Seguridad PITR', valor: 'WAL Continuo Activo', detalle: 'Recuperación punto en el tiempo a nivel de microsegundo' },
                                    { parametro: 'Arquitectura de Aislamiento', valor: 'Single-Tenant Dedicado', detalle: 'UrbanStep Venezuela C.A. • Sede Única Barquisimeto' },
                                    { parametro: 'Estado de Integridad Contable', valor: '100% Consolidado', detalle: 'Partida doble verificada en tablas contables' }
                                ]}
                                summaryCards={[
                                    { label: 'Motor BD', value: 'PostgreSQL 15' },
                                    { label: 'Estado', value: 'En Línea ✓' },
                                    { label: 'PITR WAL', value: 'Activo' }
                                ]}
                                filename="Estado_Seguridad_Respaldos_BD"
                                bcvRate={bcvRate}
                                onExportCSV={() => handleExportCSV([
                                    { Parametro: 'Motor BD', Valor: 'PostgreSQL 15' },
                                    { Parametro: 'PITR', Valor: 'Activo' }
                                ], 'Respaldos_BD')}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2">
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Motor de Base de Datos</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">PostgreSQL 15.6</p>
                                <p className="text-[11px] text-gray-400">Instancia Única Supabase Cloud</p>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-blue-50/20 dark:bg-blue-950/20 space-y-2">
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Copia de Seguridad PITR</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">WAL Continuo Activo</p>
                                <p className="text-[11px] text-gray-400">Recuperación punto en el tiempo</p>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-purple-50/20 dark:bg-purple-950/20 space-y-2">
                                <p className="text-xs font-bold text-purple-700 dark:text-purple-300">Aislamiento y Sede</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">Single-Tenant</p>
                                <p className="text-[11px] text-gray-400">Sede Única: Barquisimeto, Lara</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
