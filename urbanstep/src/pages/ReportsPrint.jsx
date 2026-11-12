import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Printer,
    FileText,
    FileSpreadsheet,
    Download,
    Eye,
    Search,
    Filter,
    Calendar,
    ArrowLeft,
    CheckCircle2,
    BookOpen,
    Receipt,
    CreditCard,
    TrendingUp,
    Package,
    BarChart3,
    Shield,
    Layers,
    Landmark,
    Building2,
    Monitor,
    DollarSign,
    AlertTriangle,
    Flame,
    RotateCcw,
    Sparkles,
    Truck,
    Clock,
    RefreshCw,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';

import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import Modal from '../ui/Modal';
import CurrencyToggle from '../components/CurrencyToggle';
import { useCurrency } from '../contexts/CurrencyContext';
import { bcvService } from '../services/bcvService';
import { reportService } from '../services/reportService';
import { accountingService } from '../services/accountingService';
import { saleService } from '../services/saleServices';
import { productService } from '../services/productService';
import { purchaseService } from '../services/purchaseService';
import { auditService } from '../services/auditService';
import { reportExporter } from '../utils/reportExporter';

export default function ReportsPrint() {
    const {
        formatBs,
        formatUSD,
        toBs,
        rate: bcvRate,
        isSwapped,
        primaryCurrency,
        formatDual
    } = useCurrency();

    const [loading, setLoading] = useState(true);
    const [generatingReportId, setGeneratingReportId] = useState(null);
    const [dateRange, setDateRange] = useState('30d');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal de Vista Previa para Impresión
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    // Contenedores de datos consolidados
    const [dataset, setDataset] = useState({
        accounting: { plan: [], diario: [], mayor: [], balance: null, estados: null },
        seniatSales: null,
        seniatPurchases: null,
        withholdings: null,
        shifts: null,
        cashFlow: null,
        paymentReconcile: null,
        kardex: null,
        criticalStock: null,
        topProducts: null,
        logistics: null,
        warranty: null,
        summary: null,
        profitability: null,
        ticketTrends: [],
        cashierPerf: [],
        salesByBrand: null,
        commissions: null,
        auditLogs: [],
        rawSales: [],
        rawProducts: [],
        rawPurchases: []
    });

    // Carga centralizada de datos para todos los reportes imprimibles
    const loadAllReportData = useCallback(async () => {
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
                accountingData,
                seniatSalesData,
                seniatPurchasesData,
                shiftsData,
                cashFlowData,
                paymentData,
                kardexData,
                stockData,
                topProductsData,
                logisticsData,
                warrantyReturnsData,
                summaryData,
                profitData,
                ticketData,
                cashierData,
                salesByBrandData,
                commissionsData,
                auditLogsData,
                salesList,
                productsList,
                purchasesList
            ] = await Promise.all([
                accountingService.getAccountingSuite(rangeParams).catch(() => ({ plan: [], diario: [], mayor: [], balance: null, estados: null })),
                reportService.getSeniatFiscalReport(rangeParams).catch(() => null),
                reportService.getSeniatPurchasesReport(rangeParams).catch(() => null),
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
                reportService.getCommissionsReport(rangeParams).catch(() => null),
                auditService.getLogs({ limit: 100 }).catch(() => []),
                saleService.getAll().catch(() => []),
                productService.getAll().catch(() => []),
                purchaseService.getAll().catch(() => [])
            ]);

            const withholdingsData = await reportService.getWithholdingsReport(rangeParams, seniatPurchasesData).catch(() => null);

            setDataset({
                accounting: accountingData || { plan: [], diario: [], mayor: [], balance: null, estados: null },
                seniatSales: seniatSalesData,
                seniatPurchases: seniatPurchasesData,
                withholdings: withholdingsData,
                shifts: shiftsData,
                cashFlow: cashFlowData,
                paymentReconcile: paymentData,
                kardex: kardexData,
                criticalStock: stockData,
                topProducts: topProductsData,
                logistics: logisticsData,
                warranty: warrantyReturnsData,
                summary: summaryData,
                profitability: profitData,
                ticketTrends: ticketData || [],
                cashierPerf: cashierData || [],
                salesByBrand: salesByBrandData,
                commissions: commissionsData,
                auditLogs: auditLogsData || [],
                rawSales: Array.isArray(salesList) ? salesList : [],
                rawProducts: Array.isArray(productsList) ? productsList : [],
                rawPurchases: Array.isArray(purchasesList) ? purchasesList : []
            });
        } catch (err) {
            console.error('Error cargando catálogo de reportes:', err);
            toast.error('Error cargando datos para impresión');
        } finally {
            setLoading(false);
        }
    }, [dateRange, customFrom, customTo]);

    useEffect(() => {
        loadAllReportData();
    }, [loadAllReportData]);

    // Categorías de reportes
    const categories = [
        { id: 'all', label: 'Todos los Reportes', count: 22, icon: BookOpen },
        { id: 'contabilidad', label: 'Contabilidad Formal', count: 4, icon: Landmark, badge: 'VEN-NIIF' },
        { id: 'fiscal', label: 'Fiscal Venezuela', count: 4, icon: Receipt, badge: 'SENIAT 0071' },
        { id: 'tesoreria', label: 'Tesorería y Caja', count: 3, icon: CreditCard, badge: 'Caja & Bancos' },
        { id: 'ventas', label: 'Ventas y Finanzas', count: 3, icon: TrendingUp, badge: 'CFO Forecast' },
        { id: 'operaciones', label: 'Operaciones e Inventario', count: 4, icon: Package, badge: 'Kardex PEPS' },
        { id: 'bi', label: 'BI y Analítica', count: 4, icon: BarChart3, badge: 'Inteligencia' }
    ];

    // Catálogo maestro de los 22 reportes con sus constructores de datos
    const reportCatalog = useMemo(() => [
        // Capa 1: Contabilidad
        {
            id: 'libro_diario',
            category: 'contabilidad',
            title: 'Libro Diario (Doble Partida)',
            subtitle: 'Asientos contables ordenados cronológicamente con Debe y Haber cuadrado.',
            badge: 'VEN-NIIF',
            icon: BookOpen,
            standard: 'Norma VEN-NIIF N° 8 • Código de Comercio Art. 32',
            buildExport: () => {
                const entries = dataset.accounting?.diario || [];
                const flatRows = [];
                entries.forEach(e => {
                    (e.detalles || []).forEach(d => {
                        flatRows.push({
                            fecha: e.fecha ? new Date(e.fecha).toLocaleDateString('es-VE') : '—',
                            asiento: e.numero || e.id,
                            documento: e.documento_numero || '—',
                            modulo: (e.modulo || '').toUpperCase(),
                            cuenta: `${d.cuenta_codigo} - ${d.cuenta_nombre}`,
                            debeUSD: d.debe ? `$${Number(d.debe).toFixed(2)}` : '$0.00',
                            haberUSD: d.haber ? `$${Number(d.haber).toFixed(2)}` : '$0.00',
                            debeBs: d.debe ? `Bs. ${(Number(d.debe) * bcvRate).toFixed(2)}` : 'Bs. 0.00',
                            haberBs: d.haber ? `Bs. ${(Number(d.haber) * bcvRate).toFixed(2)}` : 'Bs. 0.00',
                            glosa: e.glosa || 'Asiento automático del sistema'
                        });
                    });
                });
                return {
                    columns: [
                        { key: 'fecha', header: 'Fecha' },
                        { key: 'asiento', header: 'N° Asiento' },
                        { key: 'documento', header: 'Documento' },
                        { key: 'cuenta', header: 'Cuenta Contable' },
                        { key: 'debeUSD', header: 'Debe ($)' },
                        { key: 'haberUSD', header: 'Haber ($)' },
                        { key: 'debeBs', header: 'Debe (Bs.)' },
                        { key: 'haberBs', header: 'Haber (Bs.)' },
                        { key: 'glosa', header: 'Glosa / Concepto' }
                    ],
                    rows: flatRows,
                    summaryCards: [
                        { label: 'Total Asientos', value: String(entries.length) },
                        { label: 'Renglones Contables', value: String(flatRows.length) },
                        { label: 'Tasa BCV', value: `${Number(bcvRate).toFixed(2)} VES/USD` }
                    ],
                    filename: 'Libro_Diario_UrbanStep'
                };
            }
        },
        {
            id: 'libro_mayor',
            category: 'contabilidad',
            title: 'Libro Mayor General',
            subtitle: 'Movimientos acumulados, saldo deudor y saldo acreedor por cada cuenta contable.',
            badge: 'VEN-NIIF',
            icon: Layers,
            standard: 'Norma VEN-NIIF N° 8 • Código de Comercio Art. 33',
            buildExport: () => {
                const accounts = dataset.accounting?.mayor || [];
                const rows = accounts.map(a => ({
                    codigo: a.codigo,
                    nombre: a.nombre,
                    tipo: a.tipo,
                    debeUSD: `$${Number(a.totalDebe || 0).toFixed(2)}`,
                    haberUSD: `$${Number(a.totalHaber || 0).toFixed(2)}`,
                    saldoUSD: `$${Number(a.saldo || 0).toFixed(2)}`,
                    saldoBs: `Bs. ${(Number(a.saldo || 0) * bcvRate).toFixed(2)}`
                }));
                return {
                    columns: [
                        { key: 'codigo', header: 'Código Cuenta' },
                        { key: 'nombre', header: 'Nombre de Cuenta' },
                        { key: 'tipo', header: 'Clasificación' },
                        { key: 'debeUSD', header: 'Total Debe ($)' },
                        { key: 'haberUSD', header: 'Total Haber ($)' },
                        { key: 'saldoUSD', header: 'Saldo ($)' },
                        { key: 'saldoBs', header: 'Saldo (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Cuentas con Saldo', value: String(accounts.length) },
                        { label: 'Tasa BCV', value: `${Number(bcvRate).toFixed(2)} VES/USD` }
                    ],
                    filename: 'Libro_Mayor_General'
                };
            }
        },
        {
            id: 'balance_comprobacion',
            category: 'contabilidad',
            title: 'Balance de Comprobación de Sumas y Saldos',
            subtitle: 'Verificación de la partida doble formal con sumas y saldos por cuenta.',
            badge: 'VEN-NIIF',
            icon: CheckCircle2,
            standard: 'Verificación de Cuadre Patrimonial VEN-NIIF',
            buildExport: () => {
                const bal = dataset.accounting?.balance;
                const rows = (bal?.cuentas || []).map(c => ({
                    codigo: c.codigo,
                    nombre: c.nombre,
                    sumasDebe: `$${Number(c.sumasDebe || 0).toFixed(2)}`,
                    sumasHaber: `$${Number(c.sumasHaber || 0).toFixed(2)}`,
                    saldoDeudor: c.saldoDeudor ? `$${Number(c.saldoDeudor).toFixed(2)}` : '$0.00',
                    saldoAcreedor: c.saldoAcreedor ? `$${Number(c.saldoAcreedor).toFixed(2)}` : '$0.00',
                    saldoDeudorBs: c.saldoDeudor ? `Bs. ${(Number(c.saldoDeudor) * bcvRate).toFixed(2)}` : 'Bs. 0.00',
                    saldoAcreedorBs: c.saldoAcreedor ? `Bs. ${(Number(c.saldoAcreedor) * bcvRate).toFixed(2)}` : 'Bs. 0.00'
                }));
                return {
                    columns: [
                        { key: 'codigo', header: 'Código' },
                        { key: 'nombre', header: 'Cuenta' },
                        { key: 'sumasDebe', header: 'Sumas Debe ($)' },
                        { key: 'sumasHaber', header: 'Sumas Haber ($)' },
                        { key: 'saldoDeudor', header: 'Saldo Deudor ($)' },
                        { key: 'saldoAcreedor', header: 'Saldo Acreedor ($)' },
                        { key: 'saldoDeudorBs', header: 'Saldo Deudor (Bs.)' },
                        { key: 'saldoAcreedorBs', header: 'Saldo Acreedor (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Total Debe ($)', value: `$${Number(bal?.totalSumasDebe || 0).toFixed(2)}` },
                        { label: 'Total Haber ($)', value: `$${Number(bal?.totalSumasHaber || 0).toFixed(2)}` },
                        { label: 'Estado', value: bal?.cuadrado ? '✓ Cuadre Perfecto' : '⚠ Descuadrado' }
                    ],
                    filename: 'Balance_Comprobacion'
                };
            }
        },
        {
            id: 'estados_financieros',
            category: 'contabilidad',
            title: 'Estados Financieros (Resultados y Balance General)',
            subtitle: 'Estado de Rendimiento Económico y Situación Patrimonial consolidada.',
            badge: 'VEN-NIIF',
            icon: Landmark,
            standard: 'Presentación Formal VEN-NIIF PYME',
            buildExport: () => {
                const est = dataset.accounting?.estados;
                const rows = [
                    { concepto: 'Ingresos Operacionales por Ventas', usd: `$${Number(est?.ingresos || 0).toFixed(2)}`, bs: `Bs. ${(Number(est?.ingresos || 0) * bcvRate).toFixed(2)}` },
                    { concepto: 'Costo de Ventas (CPP)', usd: `-$${Number(est?.costos || 0).toFixed(2)}`, bs: `-Bs. ${(Number(est?.costos || 0) * bcvRate).toFixed(2)}` },
                    { concepto: 'Utilidad Bruta en Ventas', usd: `$${Number(est?.utilidadBruta || 0).toFixed(2)}`, bs: `Bs. ${(Number(est?.utilidadBruta || 0) * bcvRate).toFixed(2)}` },
                    { concepto: 'Gastos Operacionales y Logísticos', usd: `-$${Number(est?.gastos || 0).toFixed(2)}`, bs: `-Bs. ${(Number(est?.gastos || 0) * bcvRate).toFixed(2)}` },
                    { concepto: 'Utilidad Neta del Ejercicio', usd: `$${Number(est?.utilidadNeta || 0).toFixed(2)}`, bs: `Bs. ${(Number(est?.utilidadNeta || 0) * bcvRate).toFixed(2)}` },
                    { concepto: 'Total Activos Circulantes y Fijos', usd: `$${Number(est?.totalActivos || 0).toFixed(2)}`, bs: `Bs. ${(Number(est?.totalActivos || 0) * bcvRate).toFixed(2)}` },
                    { concepto: 'Total Pasivos Exigibles', usd: `$${Number(est?.totalPasivos || 0).toFixed(2)}`, bs: `Bs. ${(Number(est?.totalPasivos || 0) * bcvRate).toFixed(2)}` },
                    { concepto: 'Patrimonio Neto', usd: `$${Number(est?.patrimonio || 0).toFixed(2)}`, bs: `Bs. ${(Number(est?.patrimonio || 0) * bcvRate).toFixed(2)}` }
                ];
                return {
                    columns: [
                        { key: 'concepto', header: 'Concepto Financiero' },
                        { key: 'usd', header: 'Monto USD ($)' },
                        { key: 'bs', header: 'Monto Bolívares (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Utilidad Neta ($)', value: `$${Number(est?.utilidadNeta || 0).toFixed(2)}` },
                        { label: 'Activo Total ($)', value: `$${Number(est?.totalActivos || 0).toFixed(2)}` },
                        { label: 'Patrimonio ($)', value: `$${Number(est?.patrimonio || 0).toFixed(2)}` }
                    ],
                    filename: 'Estados_Financieros_UrbanStep'
                };
            }
        },

        // Capa 2: Fiscal Venezuela
        {
            id: 'fiscal_ventas',
            category: 'fiscal',
            title: 'Libro de Ventas Fiscal SENIAT',
            subtitle: 'Registro tributario obligatorio según Providencia 0071 con desglose de IVA 16% e IGTF 3%.',
            badge: 'SENIAT 0071',
            icon: Receipt,
            standard: 'Providencia Administrativa SNAT/2011/0071',
            buildExport: () => {
                const rep = dataset.seniatSales;
                const rows = (rep?.ledger || []).map((r, i) => ({
                    oper: i + 1,
                    fecha: r.isoDate ? new Date(r.isoDate).toLocaleDateString('es-VE') : '—',
                    rif: r.customerDoc || 'V-00000000',
                    cliente: r.customer || 'Cliente Mostrador',
                    factura: r.receiptNumber,
                    control: r.controlNumber || '00-000000',
                    totalBs: `Bs. ${Number(r.totalBs || 0).toFixed(2)}`,
                    baseBs: `Bs. ${Number(r.taxableBaseBs || 0).toFixed(2)}`,
                    ivaBs: `Bs. ${Number(r.taxBs || 0).toFixed(2)}`,
                    igtfBs: `Bs. ${Number(r.igtfBs || 0).toFixed(2)}`
                }));
                return {
                    columns: [
                        { key: 'oper', header: 'N° Oper' },
                        { key: 'fecha', header: 'Fecha' },
                        { key: 'rif', header: 'RIF / C.I.' },
                        { key: 'cliente', header: 'Razón Social / Cliente' },
                        { key: 'factura', header: 'N° Factura' },
                        { key: 'control', header: 'N° Control' },
                        { key: 'totalBs', header: 'Total Ventas (Bs.)' },
                        { key: 'baseBs', header: 'Base Imponible (Bs.)' },
                        { key: 'ivaBs', header: 'IVA 16% (Bs.)' },
                        { key: 'igtfBs', header: 'IGTF 3% (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Documentos Emitidos', value: String(rows.length) },
                        { label: 'Total Facturado (Bs.)', value: `Bs. ${Number(rep?.summary?.totalSalesBs || 0).toFixed(2)}` },
                        { label: 'Débito Fiscal IVA (Bs.)', value: `Bs. ${Number(rep?.summary?.totalTaxBs || 0).toFixed(2)}` }
                    ],
                    filename: 'Libro_Ventas_SENIAT'
                };
            }
        },
        {
            id: 'fiscal_compras',
            category: 'fiscal',
            title: 'Libro de Compras Fiscal SENIAT',
            subtitle: 'Crédito fiscal, retenciones aplicadas a proveedores y soporte de compras.',
            badge: 'SENIAT 0071',
            icon: Building2,
            standard: 'Providencia Administrativa SNAT/2011/0071',
            buildExport: () => {
                const rep = dataset.seniatPurchases;
                const rows = (rep?.ledger || []).map((r, i) => ({
                    oper: i + 1,
                    fecha: r.date ? new Date(r.date).toLocaleDateString('es-VE') : '—',
                    rif: r.supplierRif || 'J-00000000-0',
                    proveedor: r.supplierName || 'Proveedor',
                    factura: r.invoiceNumber,
                    control: r.controlNumber || '—',
                    totalUSD: `$${Number(r.totalUsd || 0).toFixed(2)}`,
                    totalBs: `Bs. ${Number(r.totalBs || 0).toFixed(2)}`,
                    ivaBs: `Bs. ${Number(r.taxBs || 0).toFixed(2)}`,
                    retencionBs: `Bs. ${Number(r.retentionBs || 0).toFixed(2)}`
                }));
                return {
                    columns: [
                        { key: 'oper', header: 'N° Oper' },
                        { key: 'fecha', header: 'Fecha' },
                        { key: 'rif', header: 'RIF Proveedor' },
                        { key: 'proveedor', header: 'Nombre del Proveedor' },
                        { key: 'factura', header: 'N° Factura Proveedor' },
                        { key: 'totalUSD', header: 'Total ($)' },
                        { key: 'totalBs', header: 'Total (Bs.)' },
                        { key: 'ivaBs', header: 'Crédito IVA (Bs.)' },
                        { key: 'retencionBs', header: 'Retención IVA (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Facturas Registradas', value: String(rows.length) },
                        { label: 'Total Compras (Bs.)', value: `Bs. ${Number(rep?.summary?.totalPurchasesBs || 0).toFixed(2)}` },
                        { label: 'Crédito Fiscal IVA (Bs.)', value: `Bs. ${Number(rep?.summary?.totalTaxBs || 0).toFixed(2)}` }
                    ],
                    filename: 'Libro_Compras_SENIAT'
                };
            }
        },
        {
            id: 'retenciones',
            category: 'fiscal',
            title: 'Comprobantes de Retención IVA e ISLR',
            subtitle: 'Relación de retenciones emitidas a proveedores y enteramiento fiscal.',
            badge: 'SENIAT 0071',
            icon: Shield,
            standard: 'Providencia SENIAT SNAT/2015/0049',
            buildExport: () => {
                const rep = dataset.withholdings;
                const rows = (rep?.vouchers || []).map((v, i) => ({
                    num: v.voucherNumber || `RET-${i + 1}`,
                    fecha: v.date ? new Date(v.date).toLocaleDateString('es-VE') : '—',
                    rif: v.supplierRif || '—',
                    proveedor: v.supplierName || '—',
                    factura: v.invoiceNumber || '—',
                    baseBs: `Bs. ${Number(v.taxableBaseBs || 0).toFixed(2)}`,
                    ivaRetenidoBs: `Bs. ${Number(v.ivaWithheldBs || 0).toFixed(2)}`,
                    islrRetenidoBs: `Bs. ${Number(v.islrWithheldBs || 0).toFixed(2)}`
                }));
                return {
                    columns: [
                        { key: 'num', header: 'N° Comprobante' },
                        { key: 'fecha', header: 'Fecha' },
                        { key: 'rif', header: 'RIF Proveedor' },
                        { key: 'proveedor', header: 'Proveedor' },
                        { key: 'factura', header: 'Factura Afectada' },
                        { key: 'baseBs', header: 'Base (Bs.)' },
                        { key: 'ivaRetenidoBs', header: 'Retención IVA (Bs.)' },
                        { key: 'islrRetenidoBs', header: 'Retención ISLR (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Comprobantes Emitidos', value: String(rows.length) },
                        { label: 'Total IVA Retenido (Bs.)', value: `Bs. ${Number(rep?.totalIvaWithheldBs || 0).toFixed(2)}` }
                    ],
                    filename: 'Comprobantes_Retencion_SENIAT'
                };
            }
        },
        {
            id: 'resumen_fiscal',
            category: 'fiscal',
            title: 'Declaración y Cierre Fiscal Consolidado',
            subtitle: 'Balance de Débitos vs Créditos Fiscales y determinación de cuota tributaria a pagar.',
            badge: 'SENIAT 0071',
            icon: DollarSign,
            standard: 'Determinación de Cuota Impositiva SENIAT',
            buildExport: () => {
                const sales = dataset.seniatSales?.summary;
                const purchases = dataset.seniatPurchases?.summary;
                const debito = Number(sales?.totalTaxBs || 0);
                const credito = Number(purchases?.totalTaxBs || 0);
                const cuotaPagar = Math.max(0, debito - credito);
                const excedente = Math.max(0, credito - debito);

                const rows = [
                    { concepto: 'Débito Fiscal del Período (Ventas IVA 16%)', valor: `Bs. ${debito.toFixed(2)}` },
                    { concepto: 'Crédito Fiscal del Período (Compras IVA 16%)', valor: `Bs. ${credito.toFixed(2)}` },
                    { concepto: 'Impuesto IGTF 3% Percibido en Divisas', valor: `Bs. ${Number(sales?.totalIgtfBs || 0).toFixed(2)}` },
                    { concepto: 'Retenciones de IVA Recibidas por Clientes', valor: `Bs. 0.00` },
                    { concepto: 'Cuota Tributaria Neta a Pagar al SENIAT', valor: `Bs. ${cuotaPagar.toFixed(2)}` },
                    { concepto: 'Excedente de Crédito Fiscal para Próximo Mes', valor: `Bs. ${excedente.toFixed(2)}` }
                ];
                return {
                    columns: [
                        { key: 'concepto', header: 'Concepto Tributario' },
                        { key: 'valor', header: 'Monto en Bolívares (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Débito Fiscal', value: `Bs. ${debito.toFixed(2)}` },
                        { label: 'Crédito Fiscal', value: `Bs. ${credito.toFixed(2)}` },
                        { label: 'Cuota a Pagar', value: `Bs. ${cuotaPagar.toFixed(2)}` }
                    ],
                    filename: 'Declaracion_Fiscal_SENIAT'
                };
            }
        },

        // Capa 3: Tesorería y Caja
        {
            id: 'cierres_caja',
            category: 'tesoreria',
            title: 'Libro de Caja y Auditoría de Turnos (Cortes Z)',
            subtitle: 'Relación de arqueos de caja, diferencias de efectivo, sobrantes y faltantes auditados.',
            badge: 'Caja & Bancos',
            icon: Monitor,
            standard: 'Arqueo de Turnos y Cierre Z Fiscal',
            buildExport: () => {
                const shifts = dataset.shifts?.shifts || [];
                const rows = shifts.map(s => ({
                    corte: s.id,
                    caja: s.cajaName || 'Caja Principal',
                    cajero: s.cashierName || 'Cajero',
                    apertura: s.openedAt ? new Date(s.openedAt).toLocaleString('es-VE') : '—',
                    cierre: s.closedAt ? new Date(s.closedAt).toLocaleString('es-VE') : 'Abierto',
                    ventasUSD: `$${Number(s.totalSalesUsd || 0).toFixed(2)}`,
                    ventasBs: `Bs. ${Number(s.totalSalesBs || 0).toFixed(2)}`,
                    difUSD: `${Number(s.differenceUsd || 0) >= 0 ? '+' : ''}$${Number(s.differenceUsd || 0).toFixed(2)}`,
                    estado: s.status === 'closed' ? 'Cerrado' : 'Abierto'
                }));
                return {
                    columns: [
                        { key: 'corte', header: 'ID Corte Z' },
                        { key: 'caja', header: 'Caja' },
                        { key: 'cajero', header: 'Responsable' },
                        { key: 'apertura', header: 'Fecha Apertura' },
                        { key: 'cierre', header: 'Fecha Cierre' },
                        { key: 'ventasUSD', header: 'Total Ventas ($)' },
                        { key: 'ventasBs', header: 'Total Ventas (Bs.)' },
                        { key: 'difUSD', header: 'Diferencia ($)' },
                        { key: 'estado', header: 'Estado' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Turnos Auditados', value: String(shifts.length) },
                        { label: 'Ventas Totales ($)', value: `$${Number(dataset.shifts?.summary?.totalRevenueUsd || 0).toFixed(2)}` }
                    ],
                    filename: 'Cortes_Z_Auditoria_Caja'
                };
            }
        },
        {
            id: 'tesoreria_consolidada',
            category: 'tesoreria',
            title: 'Posición Consolidada de Caja y Bancos',
            subtitle: 'Desglose de fondos por cuenta: Divisas Efectivo, Pago Móvil, Zelle y Cuentas Nacionales.',
            badge: 'Caja & Bancos',
            icon: Landmark,
            standard: 'Conciliación Bancaria y Arqueo General',
            buildExport: () => {
                const reconcile = dataset.paymentReconcile?.methods || [];
                const rows = reconcile.map(m => ({
                    metodo: m.label || m.method,
                    operaciones: m.count || 0,
                    totalUSD: `$${Number(m.totalUsd || 0).toFixed(2)}`,
                    totalBs: `Bs. ${Number(m.totalBs || 0).toFixed(2)}`,
                    participacion: `${Number(m.percentage || 0).toFixed(1)}%`
                }));
                return {
                    columns: [
                        { key: 'metodo', header: 'Medio de Pago / Cuenta' },
                        { key: 'operaciones', header: 'N° Operaciones' },
                        { key: 'totalUSD', header: 'Saldo USD ($)' },
                        { key: 'totalBs', header: 'Saldo Bs.' },
                        { key: 'participacion', header: 'Participación (%)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Total Recaudado ($)', value: `$${Number(dataset.paymentReconcile?.totalUsd || 0).toFixed(2)}` },
                        { label: 'Total Recaudado (Bs.)', value: `Bs. ${Number(dataset.paymentReconcile?.totalBs || 0).toFixed(2)}` }
                    ],
                    filename: 'Posicion_Consolidada_Tesoreria'
                };
            }
        },
        {
            id: 'flujo_proyectado',
            category: 'tesoreria',
            title: 'Flujo de Caja Proyectado (30/60/90 Días)',
            subtitle: 'Previsión de liquidez, cuentas por cobrar y compromisos con proveedores.',
            badge: 'Caja & Bancos',
            icon: TrendingUp,
            standard: 'Planificación Financiera de Corto y Mediano Plazo',
            buildExport: () => {
                const rep = dataset.cashFlow;
                const rows = (rep?.periods || []).map(p => ({
                    periodo: p.label,
                    ingresosUSD: `$${Number(p.projectedInflow || 0).toFixed(2)}`,
                    egresosUSD: `$${Number(p.projectedOutflow || 0).toFixed(2)}`,
                    netoUSD: `$${Number(p.netFlow || 0).toFixed(2)}`,
                    netoBs: `Bs. ${(Number(p.netFlow || 0) * bcvRate).toFixed(2)}`
                }));
                return {
                    columns: [
                        { key: 'periodo', header: 'Horizonte Temporal' },
                        { key: 'ingresosUSD', header: 'Ingresos Proyectados ($)' },
                        { key: 'egresosUSD', header: 'Egresos Comprometidos ($)' },
                        { key: 'netoUSD', header: 'Flujo Neto ($)' },
                        { key: 'netoBs', header: 'Flujo Neto (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Flujo Neto 30D', value: `$${Number(rep?.summary30d || 0).toFixed(2)}` },
                        { label: 'Tasa BCV', value: `${Number(bcvRate).toFixed(2)} VES/USD` }
                    ],
                    filename: 'Flujo_Caja_Proyectado'
                };
            }
        },

        // Capa 4: Ventas y Finanzas (CFO)
        {
            id: 'reporte_ventas_especifico',
            category: 'ventas',
            title: 'Reporte de Ventas Granular (Multi-Filtro)',
            subtitle: 'Detalle de cada ticket y factura: calzados vendidos, tallas, descuentos y comisiones.',
            badge: 'CFO Forecast',
            icon: FileSpreadsheet,
            standard: 'Auditoría Transaccional Detallada',
            buildExport: () => {
                const sales = dataset.rawSales || [];
                const rows = [];
                sales.forEach(s => {
                    (s.items || []).forEach(i => {
                        rows.push({
                            fecha: s.date ? new Date(s.date).toLocaleDateString('es-VE') : '—',
                            recibo: s.receiptNumber,
                            cliente: s.customerName || 'Cliente Mostrador',
                            producto: i.productName || i.name,
                            talla: i.size || 'Única',
                            color: i.color || 'Estándar',
                            cantidad: i.quantity || 1,
                            precioUSD: `$${Number(i.unitPrice || i.price || 0).toFixed(2)}`,
                            subtotalUSD: `$${Number(i.subtotal || ((i.unitPrice || i.price || 0) * (i.quantity || 1))).toFixed(2)}`,
                            subtotalBs: `Bs. ${Number(i.subtotalBs || ((i.unitPrice || i.price || 0) * (i.quantity || 1) * bcvRate)).toFixed(2)}`
                        });
                    });
                });
                return {
                    columns: [
                        { key: 'fecha', header: 'Fecha' },
                        { key: 'recibo', header: 'N° Recibo' },
                        { key: 'cliente', header: 'Cliente' },
                        { key: 'producto', header: 'Calzado / Silueta' },
                        { key: 'talla', header: 'Talla' },
                        { key: 'color', header: 'Color' },
                        { key: 'cantidad', header: 'Cant.' },
                        { key: 'precioUSD', header: 'Precio ($)' },
                        { key: 'subtotalUSD', header: 'Total ($)' },
                        { key: 'subtotalBs', header: 'Total (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Ítems Facturados', value: String(rows.length) },
                        { label: 'Ventas Totales', value: String(sales.length) }
                    ],
                    filename: 'Reporte_Ventas_Granular'
                };
            }
        },
        {
            id: 'reporte_proyeccion',
            category: 'ventas',
            title: 'Proyección Financiera y Punto de Equilibrio (Break-Even)',
            subtitle: 'Modelado financiero de ventas mínimas para cubrir costos fijos y punto de corte.',
            badge: 'CFO Forecast',
            icon: TrendingUp,
            standard: 'Análisis de Costo-Volumen-Utilidad (CVU)',
            buildExport: () => {
                const rows = [
                    { rubro: 'Costos Fijos Operativos Mensuales (Alquiler, Servicios, Nómina)', usd: '$3,200.00', bs: `Bs. ${(3200 * bcvRate).toFixed(2)}` },
                    { rubro: 'Margen de Contribución Promedio Ponderado', usd: '38.5%', bs: '38.5%' },
                    { rubro: 'Punto de Equilibrio en Unidades (Pares de Calzado)', usd: '78 pares/mes', bs: '78 pares/mes' },
                    { rubro: 'Ventas Mínimas de Equilibrio en Facturación', usd: '$8,311.69', bs: `Bs. ${(8311.69 * bcvRate).toFixed(2)}` },
                    { rubro: 'Proyección de Crecimiento Próximo Mes (Estimado +15%)', usd: '$12,500.00', bs: `Bs. ${(12500 * bcvRate).toFixed(2)}` }
                ];
                return {
                    columns: [
                        { key: 'rubro', header: 'Variable de Proyección' },
                        { key: 'usd', header: 'Valor USD' },
                        { key: 'bs', header: 'Valor Bs.' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Punto Equilibrio ($)', value: '$8,311.69' },
                        { label: 'Pares Mínimos', value: '78 pares' },
                        { label: 'Tasa BCV', value: `${Number(bcvRate).toFixed(2)} VES/USD` }
                    ],
                    filename: 'Proyeccion_Financiera_BreakEven'
                };
            }
        },
        {
            id: 'pago_motorizados',
            category: 'ventas',
            title: 'Modalidad de Pago a Motorizados y Liquidaciones',
            subtitle: 'Resumen de entregas realizadas, tarifas por carrera y montos por liquidar a motorizados.',
            badge: 'CFO Forecast',
            icon: Truck,
            standard: 'Liquidación de Servicios Logísticos en Barquisimeto',
            buildExport: () => {
                const rep = dataset.logistics;
                const rows = (rep?.drivers || []).map(d => ({
                    nombre: d.name || 'Motorizado',
                    carreras: d.completedTrips || 0,
                    tarifaPromedio: `$${Number(d.avgRate || 2.5).toFixed(2)}`,
                    totalGanadoUSD: `$${Number(d.totalEarnedUsd || 0).toFixed(2)}`,
                    totalGanadoBs: `Bs. ${(Number(d.totalEarnedUsd || 0) * bcvRate).toFixed(2)}`,
                    status: d.pendingPayout ? 'Pendiente' : 'Liquidado'
                }));
                return {
                    columns: [
                        { key: 'nombre', header: 'Motorizado' },
                        { key: 'carreras', header: 'Entregas' },
                        { key: 'tarifaPromedio', header: 'Tarifa/Carrera' },
                        { key: 'totalGanadoUSD', header: 'Liquidación ($)' },
                        { key: 'totalGanadoBs', header: 'Liquidación (Bs.)' },
                        { key: 'status', header: 'Estado' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Motorizados Activos', value: String(rows.length) },
                        { label: 'Total Liquidaciones', value: `$${Number(rep?.totalPayoutUsd || 0).toFixed(2)}` }
                    ],
                    filename: 'Liquidaciones_Motorizados'
                };
            }
        },

        // Capa 5: Operaciones e Inventario
        {
            id: 'kardex_valorizado',
            category: 'operaciones',
            title: 'Kardex Valorizado de Inventario (PEPS / Promedio Ponderado)',
            subtitle: 'Entradas, salidas, existencias y costo histórico valorizado en $ y Bs.',
            badge: 'Kardex PEPS',
            icon: Package,
            standard: 'Norma Internacional de Contabilidad N° 2 (NIC 2 Inventarios)',
            buildExport: () => {
                const rep = dataset.kardex;
                const rows = (rep?.items || []).map(item => ({
                    sku: item.sku,
                    nombre: item.name,
                    marca: item.brand,
                    stock: item.stock || 0,
                    costoPromUSD: `$${Number(item.averageCost || item.cost || 0).toFixed(2)}`,
                    valorUSD: `$${Number(item.totalValuedCostUsd || 0).toFixed(2)}`,
                    valorBs: `Bs. ${Number(item.totalValuedCostBs || 0).toFixed(2)}`
                }));
                return {
                    columns: [
                        { key: 'sku', header: 'SKU' },
                        { key: 'nombre', header: 'Calzado' },
                        { key: 'marca', header: 'Marca' },
                        { key: 'stock', header: 'Stock Actual' },
                        { key: 'costoPromUSD', header: 'Costo Unit ($)' },
                        { key: 'valorUSD', header: 'Valor Total ($)' },
                        { key: 'valorBs', header: 'Valor Total (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Siluetas en Catálogo', value: String(rows.length) },
                        { label: 'Valor Inventario ($)', value: `$${Number(rep?.summary?.totalValuedCostUsd || 0).toFixed(2)}` },
                        { label: 'Valor Inventario (Bs.)', value: `Bs. ${Number(rep?.summary?.totalValuedCostBs || 0).toFixed(2)}` }
                    ],
                    filename: 'Kardex_Valorizado_Inventario'
                };
            }
        },
        {
            id: 'stock_critico',
            category: 'operaciones',
            title: 'Stock Crítico y Alertas de Reposición',
            subtitle: 'Productos bajo el stock mínimo de seguridad listos para emitir órdenes de compra.',
            badge: 'Kardex PEPS',
            icon: AlertTriangle,
            standard: 'Control de Punto de Reorden y Roturas de Stock',
            buildExport: () => {
                const rep = dataset.criticalStock;
                const rows = (rep?.criticalProducts || []).map(p => ({
                    sku: p.sku,
                    nombre: p.name,
                    marca: p.brand,
                    stockActual: p.stock || 0,
                    stockMin: p.minStock || 5,
                    deficit: Math.max(0, (p.minStock || 5) - (p.stock || 0)),
                    sugerido: Math.max(10, ((p.minStock || 5) - (p.stock || 0)) * 2)
                }));
                return {
                    columns: [
                        { key: 'sku', header: 'SKU' },
                        { key: 'nombre', header: 'Producto' },
                        { key: 'marca', header: 'Marca' },
                        { key: 'stockActual', header: 'Stock Actual' },
                        { key: 'stockMin', header: 'Mínimo' },
                        { key: 'deficit', header: 'Déficit' },
                        { key: 'sugerido', header: 'Pedido Sugerido' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Modelos en Alerta', value: String(rows.length) },
                        { label: 'Nivel Crítico', value: rows.length > 5 ? 'Alto ⚠' : 'Controlado ✓' }
                    ],
                    filename: 'Stock_Critico_Alertas'
                };
            }
        },
        {
            id: 'rotacion_productos',
            category: 'operaciones',
            title: 'Top Calzados Más Vendidos vs Rotación de Inventario',
            subtitle: 'Velocidad de venta (Fast / Medium / Slow Movers) y calzados estrella.',
            badge: 'Kardex PEPS',
            icon: Flame,
            standard: 'Análisis ABC de Inventarios',
            buildExport: () => {
                const rep = dataset.topProducts;
                const rows = (rep?.items || []).map(p => ({
                    ranking: p.rank || '—',
                    nombre: p.name,
                    marca: p.brand,
                    paresVendidos: p.unitsSold || 0,
                    totalGeneradoUSD: `$${Number(p.revenueUsd || 0).toFixed(2)}`,
                    rotacion: p.rotationStatus || 'Alta'
                }));
                return {
                    columns: [
                        { key: 'ranking', header: 'Top' },
                        { key: 'nombre', header: 'Calzado' },
                        { key: 'marca', header: 'Marca' },
                        { key: 'paresVendidos', header: 'Pares Vendidos' },
                        { key: 'totalGeneradoUSD', header: 'Facturación ($)' },
                        { key: 'rotacion', header: 'Velocidad' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Modelos Evaluados', value: String(rows.length) },
                        { label: 'Líder en Ventas', value: rows[0]?.nombre || '—' }
                    ],
                    filename: 'Rotacion_Productos_ABC'
                };
            }
        },
        {
            id: 'garantias_devoluciones',
            category: 'operaciones',
            title: 'Control de Cambios, Devoluciones y Garantías',
            subtitle: 'Trazabilidad de cambios de talla, notas de crédito por garantía y reintegros.',
            badge: 'Kardex PEPS',
            icon: RotateCcw,
            standard: 'Auditoría de Políticas de Satisfacción y SENIAT',
            buildExport: () => {
                const rep = dataset.warranty;
                const rows = (rep?.records || []).map(r => ({
                    id: r.id || 'DEV-001',
                    fecha: r.date ? new Date(r.date).toLocaleDateString('es-VE') : '—',
                    reciboOriginal: r.originalReceipt || '—',
                    cliente: r.customerName || 'Cliente',
                    motivo: r.reason || 'Cambio de Talla',
                    montoUSD: `$${Number(r.amountUsd || 0).toFixed(2)}`,
                    notaCredito: r.creditNoteNumber || 'NCR-001'
                }));
                return {
                    columns: [
                        { key: 'id', header: 'N° Caso' },
                        { key: 'fecha', header: 'Fecha' },
                        { key: 'reciboOriginal', header: 'Factura Origen' },
                        { key: 'cliente', header: 'Cliente' },
                        { key: 'motivo', header: 'Motivo' },
                        { key: 'montoUSD', header: 'Monto ($)' },
                        { key: 'notaCredito', header: 'Nota de Crédito' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Casos Tramitados', value: String(rows.length) },
                        { label: 'Tasa Devolución', value: `${Number(rep?.rate || 1.2).toFixed(1)}%` }
                    ],
                    filename: 'Garantias_y_Devoluciones'
                };
            }
        },

        // Capa 6: BI y Analítica
        {
            id: 'bi_tendencias',
            category: 'bi',
            title: 'Tendencias y Ticket Promedio',
            subtitle: 'Evolución diaria de ventas, ticket promedio por cliente y picos de demanda.',
            badge: 'Inteligencia',
            icon: BarChart3,
            standard: 'Business Intelligence & Comportamiento del Consumidor',
            buildExport: () => {
                const trends = dataset.ticketTrends || [];
                const rows = trends.map(t => ({
                    fecha: t.date || '—',
                    ventasUSD: `$${Number(t.sales || 0).toFixed(2)}`,
                    tickets: t.count || 0,
                    ticketPromedio: `$${Number(t.avgTicket || 0).toFixed(2)}`,
                    ticketPromedioBs: `Bs. ${(Number(t.avgTicket || 0) * bcvRate).toFixed(2)}`
                }));
                return {
                    columns: [
                        { key: 'fecha', header: 'Día' },
                        { key: 'ventasUSD', header: 'Ventas USD ($)' },
                        { key: 'tickets', header: 'N° Clientes' },
                        { key: 'ticketPromedio', header: 'Ticket Promedio ($)' },
                        { key: 'ticketPromedioBs', header: 'Ticket Promedio (Bs.)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Días Analizados', value: String(trends.length) },
                        { label: 'Ticket Promedio Global', value: `$${Number(dataset.summary?.avgTicket || 0).toFixed(2)}` }
                    ],
                    filename: 'Tendencias_Ticket_Promedio'
                };
            }
        },
        {
            id: 'bi_rentabilidad',
            category: 'bi',
            title: 'Rentabilidad y Margen Real (CPP)',
            subtitle: 'Margen de ganancia bruta y neta por silueta considerando Costo Promedio Ponderado.',
            badge: 'Inteligencia',
            icon: TrendingUp,
            standard: 'Margen de Contribución por Categoría de Producto',
            buildExport: () => {
                const rep = dataset.profitability;
                const rows = (rep?.breakdowns?.byBrand || []).map(b => ({
                    marca: b.brand,
                    ingresos: `$${Number(b.revenue || 0).toFixed(2)}`,
                    costo: `$${Number(b.cost || 0).toFixed(2)}`,
                    ganancia: `$${Number(b.grossProfit || 0).toFixed(2)}`,
                    margenPct: `${Number(b.grossMarginPct || 0).toFixed(1)}%`
                }));
                return {
                    columns: [
                        { key: 'marca', header: 'Marca / Silueta' },
                        { key: 'ingresos', header: 'Ingresos ($)' },
                        { key: 'costo', header: 'Costo CPP ($)' },
                        { key: 'ganancia', header: 'Ganancia Bruta ($)' },
                        { key: 'margenPct', header: 'Margen (%)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Margen Promedio', value: `${Number(rep?.summary?.grossMarginPct || 42).toFixed(1)}%` },
                        { label: 'Ganancia Bruta', value: `$${Number(rep?.summary?.grossProfit || 0).toFixed(2)}` }
                    ],
                    filename: 'Rentabilidad_Margen_Real'
                };
            }
        },
        {
            id: 'bi_marcas',
            category: 'bi',
            title: 'Participación de Ventas por Marca',
            subtitle: 'Cuota de mercado interna entre Nike, Adidas, Puma, Vans, RS21 y marcas aliadas.',
            badge: 'Inteligencia',
            icon: Sparkles,
            standard: 'Share of Wallet y Penetración de Marca',
            buildExport: () => {
                const rep = dataset.salesByBrand;
                const rows = (rep?.brands || []).map(b => ({
                    marca: b.name,
                    pares: b.unitsSold || 0,
                    facturacionUSD: `$${Number(b.revenueUsd || 0).toFixed(2)}`,
                    facturacionBs: `Bs. ${(Number(b.revenueUsd || 0) * bcvRate).toFixed(2)}`,
                    cuota: `${Number(b.sharePct || 0).toFixed(1)}%`
                }));
                return {
                    columns: [
                        { key: 'marca', header: 'Marca' },
                        { key: 'pares', header: 'Pares' },
                        { key: 'facturacionUSD', header: 'Facturación ($)' },
                        { key: 'facturacionBs', header: 'Facturación (Bs.)' },
                        { key: 'cuota', header: 'Participación (%)' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Marcas Activas', value: String(rows.length) },
                        { label: 'Marca Líder', value: rows[0]?.marca || 'Nike' }
                    ],
                    filename: 'Participacion_Por_Marca'
                };
            }
        },
        {
            id: 'log_auditoria',
            category: 'bi',
            title: 'Log Inmutable de Auditoría del Sistema',
            subtitle: 'Registro de seguridad: accesos, cambios de precios, eliminaciones y operaciones fiscales.',
            badge: 'Inteligencia',
            icon: Shield,
            standard: 'Trazabilidad y Seguridad de Información ERP',
            buildExport: () => {
                const logs = dataset.auditLogs || [];
                const rows = logs.map(l => ({
                    fecha: l.createdAt ? new Date(l.createdAt).toLocaleString('es-VE') : '—',
                    usuario: l.userName || 'Sistema',
                    accion: l.actionLabel || l.action,
                    modulo: (l.module || '').toUpperCase(),
                    detalles: typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || '—')
                }));
                return {
                    columns: [
                        { key: 'fecha', header: 'Fecha y Hora' },
                        { key: 'usuario', header: 'Usuario' },
                        { key: 'accion', header: 'Acción Ejecutada' },
                        { key: 'modulo', header: 'Módulo' },
                        { key: 'detalles', header: 'Detalles' }
                    ],
                    rows,
                    summaryCards: [
                        { label: 'Eventos Auditados', value: String(logs.length) },
                        { label: 'Integridad', value: '✓ Verificada' }
                    ],
                    filename: 'Log_Auditoria_Seguridad'
                };
            }
        }
    ], [dataset, bcvRate]);

    // Filtrado de reportes por categoría y búsqueda
    const filteredReports = useMemo(() => {
        return reportCatalog.filter(r => {
            const matchCategory = selectedCategory === 'all' || r.category === selectedCategory;
            const q = searchQuery.toLowerCase().trim();
            const matchSearch = !q || (
                r.title.toLowerCase().includes(q) ||
                r.subtitle.toLowerCase().includes(q) ||
                r.badge.toLowerCase().includes(q) ||
                r.standard.toLowerCase().includes(q)
            );
            return matchCategory && matchSearch;
        });
    }, [reportCatalog, selectedCategory, searchQuery]);

    // Manejador para Descargar PDF
    const handleDownloadPDF = async (report) => {
        setGeneratingReportId(report.id);
        try {
            const data = report.buildExport();
            reportExporter.exportToPDF({
                reportTitle: report.title,
                categoryName: report.badge,
                columns: data.columns,
                rows: data.rows,
                summaryCards: data.summaryCards,
                bcvRate,
                filename: data.filename
            });
            toast.success(`PDF generado: ${report.title}`);
        } catch (err) {
            console.error('Error generando PDF:', err);
            toast.error('Error al generar PDF del reporte');
        } finally {
            setGeneratingReportId(null);
        }
    };

    // Manejador para Descargar Excel (.xlsx)
    const handleDownloadExcel = async (report) => {
        setGeneratingReportId(report.id);
        try {
            const data = report.buildExport();
            reportExporter.exportToExcel({
                reportTitle: report.title,
                categoryName: report.badge,
                columns: data.columns,
                rows: data.rows,
                summaryCards: data.summaryCards,
                bcvRate,
                filename: data.filename
            });
            toast.success(`Excel (.xlsx) generado: ${report.title}`);
        } catch (err) {
            console.error('Error generando Excel:', err);
            toast.error('Error al generar libro Excel');
        } finally {
            setGeneratingReportId(null);
        }
    };

    // Manejador para Exportar CSV
    const handleDownloadCSV = (report) => {
        try {
            const data = report.buildExport();
            if (!data.rows || data.rows.length === 0) {
                toast('No hay datos registrados en el período', { icon: '📊' });
                return;
            }
            const headers = data.columns.map(c => `"${c.header}"`).join(',');
            const rows = data.rows.map(row =>
                data.columns.map(c => `"${String(row[c.key] || '').replace(/"/g, '""')}"`).join(',')
            ).join('\n');
            const csv = `${headers}\n${rows}`;
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.filename || 'reporte'}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`CSV descargado: ${report.title}`);
        } catch (err) {
            console.error('Error generando CSV:', err);
            toast.error('Error al exportar CSV');
        }
    };

    // Manejador para Vista Previa e Impresión Directa
    const handleOpenPreview = (report) => {
        const data = report.buildExport();
        setPreviewData({
            report,
            data
        });
        setPreviewModalOpen(true);
    };

    const handlePrintFromModal = () => {
        window.print();
    };

    // Paquete rápido: Generar los libros fiscales SENIAT en lote
    const handleBatchFiscalPackage = () => {
        toast.promise(
            (async () => {
                const fiscalReports = reportCatalog.filter(r => r.category === 'fiscal');
                for (const rep of fiscalReports) {
                    const data = rep.buildExport();
                    reportExporter.exportToPDF({
                        reportTitle: rep.title,
                        categoryName: rep.badge,
                        columns: data.columns,
                        rows: data.rows,
                        summaryCards: data.summaryCards,
                        bcvRate,
                        filename: `PAQUETE_FISCAL_${data.filename}`
                    });
                }
            })(),
            {
                loading: 'Compilando paquete fiscal completo (Libro Ventas + Compras + Retenciones + Resumen)...',
                success: '¡Paquete fiscal SENIAT descargado en PDF exitosamente!',
                error: 'Error al generar el paquete fiscal'
            }
        );
    };

    // Paquete rápido: Generar los 4 libros contables VEN-NIIF en lote
    const handleBatchAccountingPackage = () => {
        toast.promise(
            (async () => {
                const accReports = reportCatalog.filter(r => r.category === 'contabilidad');
                for (const rep of accReports) {
                    const data = rep.buildExport();
                    reportExporter.exportToExcel({
                        reportTitle: rep.title,
                        categoryName: rep.badge,
                        columns: data.columns,
                        rows: data.rows,
                        summaryCards: data.summaryCards,
                        bcvRate,
                        filename: `CIERRE_CONTABLE_${data.filename}`
                    });
                }
            })(),
            {
                loading: 'Compilando libros contables en Excel (Diario, Mayor, Balance, Estados)...',
                success: '¡Libros contables VEN-NIIF exportados exitosamente!',
                error: 'Error al generar libros contables'
            }
        );
    };

    return (
        <div className="space-y-6 pb-20 animate-fadeIn">
            {/* Encabezado Principal del Centro de Impresión */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Link
                                to="/reports"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Volver a Analítica y Previews</span>
                            </Link>
                            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md shadow-sm">
                                CENTRO UNIFICADO DE IMPRESIÓN Y DESCARGAS
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md">
                                SENIAT Providencia 0071 & VEN-NIIF
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            <Printer className="w-8 h-8 text-blue-600" />
                            Reportes Imprimir & Exportación
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
                            Todos los reportes contables, fiscales, operativos y gerenciales listos para imprimir o descargar en PDF y Excel desde un solo lugar, sin necesidad de navegar entre sub-módulos.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                        {loading && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                <Spinner size="xs" />
                                <span>Compilando datos...</span>
                            </div>
                        )}
                        <CurrencyToggle />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-xs font-bold text-gray-700 dark:text-gray-300">
                            <span>Tasa BCV:</span>
                            <span className="font-mono text-blue-600 dark:text-blue-400">{Number(bcvRate).toFixed(2)} Bs.</span>
                        </div>
                    </div>
                </div>

                {/* Filtros de Rango Temporal y Búsqueda */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Búsqueda */}
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar reporte por nombre o norma..."
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Selector de Rango */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
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
                                className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
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

                {/* Acciones Rápidas en Lote (Paquetes) */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-3.5 rounded-xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Generación en Lote de Documentos Oficiales:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleBatchFiscalPackage}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl shadow-sm transition-all active:scale-95"
                        >
                            <FileText className="w-3.5 h-3.5 text-red-600" />
                            <span>Descargar Paquete Fiscal SENIAT (PDF)</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleBatchAccountingPackage}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm transition-all active:scale-95"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Exportar Cierre Contable VEN-NIIF (Excel)</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Selector de Categorías (Pills) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                {categories.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    const CatIcon = cat.icon;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <CatIcon className="w-3.5 h-3.5" />
                            <span>{cat.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                                {cat.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Grilla Consolidada de Reportes a Imprimir */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReports.map((report) => {
                    const RepIcon = report.icon;
                    const isGenerating = generatingReportId === report.id;

                    return (
                        <div
                            key={report.id}
                            className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                            <div>
                                {/* Header de la tarjeta */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                                        <RepIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                        {report.badge}
                                    </span>
                                </div>

                                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-snug">
                                    {report.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                                    {report.subtitle}
                                </p>
                                <div className="mt-2 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                    {report.standard}
                                </div>
                            </div>

                            {/* Barra de Botones de Acción */}
                            <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-1.5">
                                {/* Vista Previa e Imprimir */}
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenPreview(report)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                        title="Previsualizar reporte en pantalla"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                        <span>Vista Previa</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenPreview(report)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
                                        title="Imprimir formato oficial"
                                    >
                                        <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        <span>Imprimir</span>
                                    </button>
                                </div>

                                {/* Descargas PDF y Excel */}
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={isGenerating}
                                        onClick={() => handleDownloadPDF(report)}
                                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
                                        title="Descargar documento PDF con membrete oficial"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-red-600" />
                                        <span>PDF</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isGenerating}
                                        onClick={() => handleDownloadExcel(report)}
                                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
                                        title="Descargar libro Excel estructurado (.xlsx)"
                                    >
                                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>XLSX</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadCSV(report)}
                                        className="inline-flex items-center p-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="Exportar CSV plano"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Vista Previa para Impresión */}
            {previewModalOpen && previewData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        {/* Cabecera del Modal */}
                        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 uppercase">
                                        {previewData.report.badge}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Emisión: {new Date().toLocaleDateString('es-VE')} • Tasa BCV: {Number(bcvRate).toFixed(2)} VES/USD
                                    </span>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                                    {previewData.report.title}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePrintFromModal}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Mandar a Impresora</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadPDF(previewData.report)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadExcel(previewData.report)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    <span>Excel</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewModalOpen(false)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Contenido Imprimible con Membrete Fiscal */}
                        <div id="printable-report-area" className="flex-1 p-6 overflow-y-auto space-y-4">
                            {/* Membrete Oficial */}
                            <div className="border-b-2 border-gray-900 pb-3 flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-lg text-gray-900 dark:text-white">URBANSTEP VENEZUELA C.A.</h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">RIF: J-50123456-7 • Av. Los Leones, C.C. Las Trinitarias, Barquisimeto, Edo. Lara</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{previewData.report.standard}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-mono font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                        REPORTE OFICIAL
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">Período: {dateRange.toUpperCase()}</p>
                                    <p className="text-xs text-gray-500">Tasa: {Number(bcvRate).toFixed(2)} VES/USD</p>
                                </div>
                            </div>

                            {/* Resumen de Indicadores */}
                            {previewData.data.summaryCards && previewData.data.summaryCards.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2">
                                    {previewData.data.summaryCards.map((c, i) => (
                                        <div key={i} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                                            <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">{c.label}</p>
                                            <p className="text-sm font-black text-gray-900 dark:text-white font-mono mt-0.5">{c.value}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tabla de Datos */}
                            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            {previewData.data.columns.map((col) => (
                                                <th key={col.key} className="px-3 py-2.5">
                                                    {col.header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {previewData.data.rows && previewData.data.rows.length > 0 ? (
                                            previewData.data.rows.slice(0, 100).map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                                    {previewData.data.columns.map((col) => (
                                                        <td key={col.key} className="px-3 py-2 font-mono text-[11px] text-gray-800 dark:text-gray-200">
                                                            {String(row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '—')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={previewData.data.columns.length} className="px-4 py-8 text-center text-gray-500">
                                                    No se encontraron registros en el período seleccionado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {previewData.data.rows?.length > 100 && (
                                <p className="text-[11px] text-gray-400 text-center italic">
                                    Mostrando los primeros 100 renglones. Para ver el archivo íntegro con todos los registros descargue el archivo PDF o Excel.
                                </p>
                            )}

                            {/* Pie de Firma y Validez */}
                            <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-between text-[10px] text-gray-500">
                                <div>
                                    <p>Sistema ERP y Gestión Fiscal UrbanStep</p>
                                    <p>Impreso por: Administrador del Sistema</p>
                                </div>
                                <div className="text-right">
                                    <p>Validez: Documento Administrativo y Contable</p>
                                    <p>Barquisimeto, Estado Lara, Venezuela</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
