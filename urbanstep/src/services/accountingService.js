import { saleService } from './saleServices';
import { bcvService } from './bcvService';
import { productService } from './productService';
import { buildCostIndex, saleCostUsd } from '../utils/costing';
import { purchaseService } from './purchaseService';
import { shiftService } from './shiftService';
import { returnService } from './returnService';

/**
 * Plan de Cuentas Maestro VEN-NIIF para UrbanStep Venezuela C.A.
 * Sede Única: Barquisimeto, Estado Lara • RIF: J-50123456-7
 */
export const DEFAULT_PLAN_CUENTAS = [
    // 1. ACTIVO
    { id: '1', codigo: '1', nombre: 'ACTIVO', nivel: 1, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false },
    { id: '1.1', codigo: '1.1', nombre: 'ACTIVO CORRIENTE', nivel: 2, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1' },
    
    // 1.1.01 Efectivo y Equivalentes
    { id: '1.1.01', codigo: '1.1.01', nombre: 'Efectivo y Equivalentes de Efectivo', nivel: 3, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1' },
    { id: '1.1.01.01', codigo: '1.1.01.01', nombre: 'Caja General', nivel: 4, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1.01' },
    { id: '1.1.01.01.001', codigo: '1.1.01.01.001', nombre: 'Caja Principal Mostrador (VES)', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.01.01' },
    { id: '1.1.01.01.002', codigo: '1.1.01.01.002', nombre: 'Caja Moneda Extranjera (USD)', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.01.01' },
    
    // Bancos
    { id: '1.1.01.02', codigo: '1.1.01.02', nombre: 'Bancos Nacionales (VES)', nivel: 4, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1.01' },
    { id: '1.1.01.02.001', codigo: '1.1.01.02.001', nombre: 'Banesco Banco Universal (Pago Móvil / Transferencias)', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.01.02' },
    { id: '1.1.01.02.002', codigo: '1.1.01.02.002', nombre: 'Banco de Venezuela (Puntos de Venta Biopago)', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.01.02' },
    
    // Cuentas Divisas
    { id: '1.1.01.03', codigo: '1.1.01.03', nombre: 'Cuentas en Divisas y Billeteras Digitales', nivel: 4, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1.01' },
    { id: '1.1.01.03.001', codigo: '1.1.01.03.001', nombre: 'Zelle / Custodia Divisas', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.01.03' },
    { id: '1.1.01.03.002', codigo: '1.1.01.03.002', nombre: 'Zinli / Wally Tech', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.01.03' },
    
    // 1.1.02 Cuentas por Cobrar
    { id: '1.1.02', codigo: '1.1.02', nombre: 'Cuentas y Documentos por Cobrar', nivel: 3, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1' },
    { id: '1.1.02.01', codigo: '1.1.02.01', nombre: 'Clientes Comerciales', nivel: 4, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1.02' },
    { id: '1.1.02.01.001', codigo: '1.1.02.01.001', nombre: 'Cuentas por Cobrar Clientes Mostrador / Delivery', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.02.01' },
    
    // 1.1.03 Inventarios
    { id: '1.1.03', codigo: '1.1.03', nombre: 'Inventarios', nivel: 3, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1' },
    { id: '1.1.03.01', codigo: '1.1.03.01', nombre: 'Inventario de Mercancías', nivel: 4, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1.03' },
    { id: '1.1.03.01.001', codigo: '1.1.03.01.001', nombre: 'Inventario de Calzado Deportivo (Sneakers)', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.03.01' },
    { id: '1.1.03.01.002', codigo: '1.1.03.01.002', nombre: 'Inventario de Streetwear y Accesorios', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.03.01' },

    // 1.1.04 Créditos Fiscales
    { id: '1.1.04', codigo: '1.1.04', nombre: 'Créditos Fiscales y Pagos Anticipados', nivel: 3, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1' },
    { id: '1.1.04.01', codigo: '1.1.04.01', nombre: 'Crédito Fiscal IVA', nivel: 4, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: false, cuenta_padre_id: '1.1.04' },
    { id: '1.1.04.01.001', codigo: '1.1.04.01.001', nombre: 'Crédito Fiscal IVA 16% (Compras)', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.04.01' },
    { id: '1.1.04.02.001', codigo: '1.1.04.02.001', nombre: 'Retenciones de IVA Soportadas (Clientes Especiales)', nivel: 5, tipo: 'activo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '1.1.04' },

    // 2. PASIVO
    { id: '2', codigo: '2', nombre: 'PASIVO', nivel: 1, tipo: 'pasivo', naturaleza: 'acreedora', acepta_movimiento: false },
    { id: '2.1', codigo: '2.1', nombre: 'PASIVO CORRIENTE', nivel: 2, tipo: 'pasivo', naturaleza: 'acreedora', acepta_movimiento: false, cuenta_padre_id: '2' },
    { id: '2.1.01', codigo: '2.1.01', nombre: 'Cuentas por Pagar Comerciales', nivel: 3, tipo: 'pasivo', naturaleza: 'acreedora', acepta_movimiento: false, cuenta_padre_id: '2.1' },
    { id: '2.1.01.01.001', codigo: '2.1.01.01.001', nombre: 'Proveedores Nacionales de Calzado', nivel: 5, tipo: 'pasivo', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '2.1.01' },
    
    // Pasivos Fiscales
    { id: '2.1.02', codigo: '2.1.02', nombre: 'Tributos y Contribuciones por Pagar', nivel: 3, tipo: 'pasivo', naturaleza: 'acreedora', acepta_movimiento: false, cuenta_padre_id: '2.1' },
    { id: '2.1.02.01.001', codigo: '2.1.02.01.001', nombre: 'Débito Fiscal IVA 16% (Ventas)', nivel: 5, tipo: 'pasivo', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '2.1.02' },
    { id: '2.1.02.02.001', codigo: '2.1.02.02.001', nombre: 'IGTF 3% Percibido en Divisas por Pagar', nivel: 5, tipo: 'pasivo', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '2.1.02' },
    { id: '2.1.02.03.001', codigo: '2.1.02.03.001', nombre: 'Retenciones de IVA por Enterar al SENIAT (75%/100%)', nivel: 5, tipo: 'pasivo', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '2.1.02' },
    { id: '2.1.02.04.001', codigo: '2.1.02.04.001', nombre: 'Retenciones de ISLR por Enterar', nivel: 5, tipo: 'pasivo', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '2.1.02' },

    // 3. PATRIMONIO
    { id: '3', codigo: '3', nombre: 'PATRIMONIO', nivel: 1, tipo: 'patrimonio', naturaleza: 'acreedora', acepta_movimiento: false },
    { id: '3.1', codigo: '3.1', nombre: 'Capital Social', nivel: 2, tipo: 'patrimonio', naturaleza: 'acreedora', acepta_movimiento: false, cuenta_padre_id: '3' },
    { id: '3.1.01.01.001', codigo: '3.1.01.01.001', nombre: 'Capital Suscrito y Pagado', nivel: 5, tipo: 'patrimonio', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '3.1' },
    { id: '3.3', codigo: '3.3', nombre: 'Resultados Acumulados', nivel: 2, tipo: 'patrimonio', naturaleza: 'acreedora', acepta_movimiento: false, cuenta_padre_id: '3' },
    { id: '3.3.01.01.001', codigo: '3.3.01.01.001', nombre: 'Utilidad Neta del Ejercicio Actual', nivel: 5, tipo: 'patrimonio', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '3.3' },
    { id: '3.3.02.01.001', codigo: '3.3.02.01.001', nombre: 'Utilidades Retenidas de Ejercicios Anteriores', nivel: 5, tipo: 'patrimonio', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '3.3' },

    // 4. INGRESOS
    { id: '4', codigo: '4', nombre: 'INGRESOS', nivel: 1, tipo: 'ingreso', naturaleza: 'acreedora', acepta_movimiento: false },
    { id: '4.1', codigo: '4.1', nombre: 'Ingresos Operacionales', nivel: 2, tipo: 'ingreso', naturaleza: 'acreedora', acepta_movimiento: false, cuenta_padre_id: '4' },
    { id: '4.1.01.01.001', codigo: '4.1.01.01.001', nombre: 'Ventas de Calzado Mostrador POS', nivel: 5, tipo: 'ingreso', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '4.1' },
    { id: '4.1.01.01.002', codigo: '4.1.01.01.002', nombre: 'Ventas de Calzado Canal Tienda Online', nivel: 5, tipo: 'ingreso', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '4.1' },
    { id: '4.2.01.01.001', codigo: '4.2.01.01.001', nombre: 'Ganancia Cambiaria (Diferencial Tasa BCV)', nivel: 5, tipo: 'ingreso', naturaleza: 'acreedora', acepta_movimiento: true, cuenta_padre_id: '4' },

    // 5. COSTO DE VENTAS
    { id: '5', codigo: '5', nombre: 'COSTO DE VENTAS', nivel: 1, tipo: 'costo', naturaleza: 'deudora', acepta_movimiento: false },
    { id: '5.1.01.01.001', codigo: '5.1.01.01.001', nombre: 'Costo de Ventas - Calzado Deportivo', nivel: 5, tipo: 'costo', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '5' },

    // 6. GASTOS OPERACIONALES
    { id: '6', codigo: '6', nombre: 'GASTOS OPERACIONALES Y ADMINISTRATIVOS', nivel: 1, tipo: 'gasto', naturaleza: 'deudora', acepta_movimiento: false },
    { id: '6.1.01.01.001', codigo: '6.1.01.01.001', nombre: 'Gastos de Fletes y Despachos Delivery Lara', nivel: 5, tipo: 'gasto', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '6' },
    { id: '6.1.02.01.001', codigo: '6.1.02.01.001', nombre: 'Comisiones Bancarias y Costos de Puntos de Venta', nivel: 5, tipo: 'gasto', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '6' },
    { id: '6.1.03.01.001', codigo: '6.1.03.01.001', nombre: 'Mermas y Ajustes de Inventario', nivel: 5, tipo: 'gasto', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '6' },
    { id: '6.2.01.01.001', codigo: '6.2.01.01.001', nombre: 'Pérdida Cambiaria', nivel: 5, tipo: 'gasto', naturaleza: 'deudora', acepta_movimiento: true, cuenta_padre_id: '6' }
];

export const accountingService = {
    /**
     * Retorna el Plan de Cuentas completo
     */
    getPlanCuentas: async () => {
        return DEFAULT_PLAN_CUENTAS;
    },

    /**
     * Motor de Asientos Automáticos:
     * Genera el Libro Diario formal consolidando Ventas, Compras y Cierres Z reales con Partida Doble
     */
    getLibroDiario: async ({ from = null, to = null, modulo = 'all' } = {}) => {
        const [sales, purchases, shifts, creditNotes, products] = await Promise.all([
            saleService.getAll(),
            purchaseService.getAll(),
            shiftService.getAll(),
            returnService.getAll().catch(() => []),
            productService.getAll().catch(() => [])
        ]);
        const costIndex = buildCostIndex(products);

        const asientos = [];
        let asientoSeq = 10001;

        // 1. Asientos de Ventas
        (sales || []).forEach(sale => {
            const saleDate = sale.date || sale.created_at || new Date().toISOString();
            if (from && new Date(saleDate) < new Date(from)) return;
            if (to && new Date(saleDate) > new Date(to)) return;
            if (modulo !== 'all' && modulo !== 'ventas') return;

            const bcvRate = Number(sale.bcvRate || sale.bcv_rate) || bcvService.getRate().rate;
            const subtotalUsd = Number(sale.subtotal) || (Number(sale.total) / 1.16);
            const ivaUsd = Number(sale.iva) || (Number(sale.total) - subtotalUsd);
            const igtfUsd = Number(sale.igtf) || (sale.paymentMethod === 'efectivo_usd' ? subtotalUsd * 0.03 : 0.00);
            const totalUsd = Number(sale.total) + igtfUsd;

            const totalBs = Math.round(totalUsd * bcvRate * 100) / 100;
            const subtotalBs = Math.round(subtotalUsd * bcvRate * 100) / 100;
            const ivaBs = Math.round(ivaUsd * bcvRate * 100) / 100;
            const igtfBs = Math.round(igtfUsd * bcvRate * 100) / 100;

            // Determinar cuenta de cobro según método
            let cuentaCobroId = '1.1.01.01.001';
            let cuentaCobroNombre = 'Caja Principal Mostrador (VES)';
            if (sale.paymentMethod === 'efectivo_usd') {
                cuentaCobroId = '1.1.01.01.002';
                cuentaCobroNombre = 'Caja Moneda Extranjera (USD)';
            } else if (sale.paymentMethod === 'pagomovil') {
                cuentaCobroId = '1.1.01.02.001';
                cuentaCobroNombre = 'Banesco Banco Universal (Pago Móvil)';
            } else if (sale.paymentMethod === 'punto') {
                cuentaCobroId = '1.1.01.02.002';
                cuentaCobroNombre = 'Banco de Venezuela (Puntos de Venta)';
            } else if (sale.paymentMethod === 'zelle') {
                cuentaCobroId = '1.1.01.03.001';
                cuentaCobroNombre = 'Zelle / Custodia Divisas';
            }

            const renglones = [
                // DEBE
                {
                    renglon: 1,
                    cuenta_id: cuentaCobroId,
                    cuenta_nombre: cuentaCobroNombre,
                    concepto: `Cobro Factura ${sale.invoiceNumber || sale.id}`,
                    debe_bs: totalBs,
                    haber_bs: 0.00,
                    debe_usd: totalUsd,
                    haber_usd: 0.00
                },
                // HABER: Ventas
                {
                    renglon: 2,
                    cuenta_id: '4.1.01.01.001',
                    cuenta_nombre: 'Ventas de Calzado Mostrador POS',
                    concepto: `Ingreso por venta de sneakers Fact. ${sale.invoiceNumber || sale.id}`,
                    debe_bs: 0.00,
                    haber_bs: subtotalBs,
                    debe_usd: 0.00,
                    haber_usd: subtotalUsd
                },
                // HABER: Débito Fiscal IVA 16%
                {
                    renglon: 3,
                    cuenta_id: '2.1.02.01.001',
                    cuenta_nombre: 'Débito Fiscal IVA 16% (Ventas)',
                    concepto: `Débito fiscal IVA 16% SENIAT`,
                    debe_bs: 0.00,
                    haber_bs: ivaBs,
                    debe_usd: 0.00,
                    haber_usd: ivaUsd
                }
            ];

            // Renglón IGTF si aplica
            if (igtfUsd > 0) {
                renglones.push({
                    renglon: 4,
                    cuenta_id: '2.1.02.02.001',
                    cuenta_nombre: 'IGTF 3% Percibido en Divisas por Pagar',
                    concepto: `Percepción IGTF 3% Divisas Providencia 0038/0056`,
                    debe_bs: 0.00,
                    haber_bs: igtfBs,
                    debe_usd: 0.00,
                    haber_usd: igtfUsd
                });
            }

            asientos.push({
                id: `asiento-vta-${sale.id}`,
                numero_asiento: asientoSeq++,
                fecha: saleDate.split('T')[0],
                fecha_hora: saleDate,
                origen_modulo: 'ventas',
                documento_tipo: 'factura_venta',
                documento_numero: sale.invoiceNumber || `FAC-${sale.id.slice(0, 8)}`,
                descripcion: `Venta de Calzado a ${sale.customer?.name || 'Cliente de Mostrador'}`,
                usuario: sale.cashier || 'Administrador General',
                tasa_bcv: bcvRate,
                total_debe_bs: totalBs,
                total_haber_bs: totalBs,
                total_debe_usd: totalUsd,
                total_haber_usd: totalUsd,
                cuadrado: true,
                renglones
            });

            // Asiento paralelo de Costo de Ventas
            // Costo real por Costo Promedio Ponderado cuando todas las líneas tienen costo; si no, estimación del 52%
            const realCost = saleCostUsd(sale, costIndex);
            const costoEstimadoUsd = realCost.complete && realCost.costUsd > 0
                ? realCost.costUsd
                : Math.round(subtotalUsd * 0.52 * 100) / 100;
            const costoEstimadoBs = Math.round(costoEstimadoUsd * bcvRate * 100) / 100;

            asientos.push({
                id: `asiento-costo-${sale.id}`,
                numero_asiento: asientoSeq++,
                fecha: saleDate.split('T')[0],
                fecha_hora: saleDate,
                origen_modulo: 'inventario',
                documento_tipo: 'costo_mercancia',
                documento_numero: sale.invoiceNumber || `FAC-${sale.id.slice(0, 8)}`,
                descripcion: `Costo de Ventas y Descarga de Inventario Factura ${sale.invoiceNumber || sale.id}`,
                usuario: 'SISTEMA_KARDEX',
                tasa_bcv: bcvRate,
                total_debe_bs: costoEstimadoBs,
                total_haber_bs: costoEstimadoBs,
                total_debe_usd: costoEstimadoUsd,
                total_haber_usd: costoEstimadoUsd,
                cuadrado: true,
                renglones: [
                    {
                        renglon: 1,
                        cuenta_id: '5.1.01.01.001',
                        cuenta_nombre: 'Costo de Ventas - Calzado Deportivo',
                        concepto: `Costo de calzado entregado Fact. ${sale.invoiceNumber || sale.id}`,
                        debe_bs: costoEstimadoBs,
                        haber_bs: 0.00,
                        debe_usd: costoEstimadoUsd,
                        haber_usd: 0.00
                    },
                    {
                        renglon: 2,
                        cuenta_id: '1.1.03.01.001',
                        cuenta_nombre: 'Inventario de Calzado Deportivo (Sneakers)',
                        concepto: `Salida de almacén por venta`,
                        debe_bs: 0.00,
                        haber_bs: costoEstimadoBs,
                        debe_usd: 0.00,
                        haber_usd: costoEstimadoUsd
                    }
                ]
            });
        });

        // 1.1 Asientos de Devoluciones y Notas de Crédito Formales (SGF / VEN-NIIF)
        (creditNotes || []).forEach(nc => {
            const ncDate = nc.date || new Date().toISOString();
            if (from && new Date(ncDate) < new Date(from)) return;
            if (to && new Date(ncDate) > new Date(to)) return;
            if (modulo !== 'all' && modulo !== 'ventas') return;

            const bcvRate = Number(nc.bcvRate) || bcvService.getRate().rate;
            const subtotalUsd = Number(nc.subtotalUsd) || 0;
            const taxUsd = Number(nc.taxUsd) || 0;
            const totalUsd = Number(nc.totalUsd) || 0;

            const totalBs = Math.round(totalUsd * bcvRate * 100) / 100;
            const subtotalBs = Math.round(subtotalUsd * bcvRate * 100) / 100;
            const taxBs = Math.round(taxUsd * bcvRate * 100) / 100;

            let cuentaReembolsoId = '1.1.01.01.002';
            let cuentaReembolsoNombre = 'Caja Moneda Extranjera (USD)';
            if (nc.refundMethod === 'pagomovil') {
                cuentaReembolsoId = '1.1.01.02.001';
                cuentaReembolsoNombre = 'Banesco Banco Universal (Pago Móvil)';
            } else if (nc.refundMethod === 'efectivo_bs') {
                cuentaReembolsoId = '1.1.01.01.001';
                cuentaReembolsoNombre = 'Caja Principal Mostrador (VES)';
            }

            asientos.push({
                id: `asiento-nc-${nc.id}`,
                numero_asiento: asientoSeq++,
                fecha: ncDate.split('T')[0],
                fecha_hora: ncDate,
                origen_modulo: 'ventas',
                documento_tipo: 'nota_credito',
                documento_numero: nc.creditNoteNumber,
                descripcion: `Devolución y Nota de Crédito ${nc.creditNoteNumber} (Fact. Afectada ${nc.affectedInvoiceNumber}) - ${nc.reasonLabel || nc.reason}`,
                usuario: nc.authorizedBy || nc.cashier || 'Supervisor de Caja',
                tasa_bcv: bcvRate,
                total_debe_bs: totalBs,
                total_haber_bs: totalBs,
                total_debe_usd: totalUsd,
                total_haber_usd: totalUsd,
                cuadrado: true,
                renglones: [
                    {
                        renglon: 1,
                        cuenta_id: '4.1.01.01.001',
                        cuenta_nombre: 'Ventas de Calzado Mostrador POS (Reversión Devolución)',
                        concepto: `Reverso de ingreso por devolución ${nc.creditNoteNumber}`,
                        debe_bs: subtotalBs,
                        haber_bs: 0.00,
                        debe_usd: subtotalUsd,
                        haber_usd: 0.00
                    },
                    {
                        renglon: 2,
                        cuenta_id: '2.1.02.01.001',
                        cuenta_nombre: 'Débito Fiscal IVA 16% (Reversión Nota de Crédito SENIAT)',
                        concepto: `Ajuste débito fiscal IVA Providencia 0071`,
                        debe_bs: taxBs,
                        haber_bs: 0.00,
                        debe_usd: taxUsd,
                        haber_usd: 0.00
                    },
                    {
                        renglon: 3,
                        cuenta_id: cuentaReembolsoId,
                        cuenta_nombre: cuentaReembolsoNombre,
                        concepto: `Reembolso al cliente por devolución ${nc.creditNoteNumber}`,
                        debe_bs: 0.00,
                        haber_bs: totalBs,
                        debe_usd: 0.00,
                        haber_usd: totalUsd
                    }
                ]
            });
        });

        // 2. Asientos de Compras a Proveedores
        (purchases || []).forEach(compra => {
            const compraDate = compra.created_at || compra.fecha || new Date().toISOString();
            if (from && new Date(compraDate) < new Date(from)) return;
            if (to && new Date(compraDate) > new Date(to)) return;
            if (modulo !== 'all' && modulo !== 'compras') return;

            const bcvRate = Number(compra.tasa_bcv) || bcvService.getRate().rate;
            const subtotalUsd = Number(compra.subtotal_usd || compra.total_usd) || 1000;
            const ivaUsd = Math.round(subtotalUsd * 0.16 * 100) / 100;
            const totalConIvaUsd = subtotalUsd + ivaUsd;
            const retencionIvaUsd = Math.round(ivaUsd * 0.75 * 100) / 100; // 75% retención
            const netoPagarUsd = totalConIvaUsd - retencionIvaUsd;

            const subtotalBs = Math.round(subtotalUsd * bcvRate * 100) / 100;
            const ivaBs = Math.round(ivaUsd * bcvRate * 100) / 100;
            const retencionIvaBs = Math.round(retencionIvaUsd * bcvRate * 100) / 100;
            const netoPagarBs = Math.round(netoPagarUsd * bcvRate * 100) / 100;
            const totalBs = subtotalBs + ivaBs;

            asientos.push({
                id: `asiento-cmp-${compra.id}`,
                numero_asiento: asientoSeq++,
                fecha: compraDate.split('T')[0],
                fecha_hora: compraDate,
                origen_modulo: 'compras',
                documento_tipo: 'factura_compra',
                documento_numero: compra.numero_factura || `CMP-${compra.id.slice(0, 6)}`,
                descripcion: `Compra de Lote de Calzado a ${compra.proveedor_nombre || 'Distribuidora Deportiva Ávila'}`,
                usuario: compra.comprador_nombre || 'Administrador General',
                tasa_bcv: bcvRate,
                total_debe_bs: totalBs,
                total_haber_bs: totalBs,
                total_debe_usd: totalConIvaUsd,
                total_haber_usd: totalConIvaUsd,
                cuadrado: true,
                renglones: [
                    {
                        renglon: 1,
                        cuenta_id: '1.1.03.01.001',
                        cuenta_nombre: 'Inventario de Calzado Deportivo (Sneakers)',
                        concepto: `Entrada a almacén Fact. Compra ${compra.numero_factura || compra.id}`,
                        debe_bs: subtotalBs,
                        haber_bs: 0.00,
                        debe_usd: subtotalUsd,
                        haber_usd: 0.00
                    },
                    {
                        renglon: 2,
                        cuenta_id: '1.1.04.01.001',
                        cuenta_nombre: 'Crédito Fiscal IVA 16% (Compras)',
                        concepto: `Crédito fiscal IVA deducible SENIAT`,
                        debe_bs: ivaBs,
                        haber_bs: 0.00,
                        debe_usd: ivaUsd,
                        haber_usd: 0.00
                    },
                    {
                        renglon: 3,
                        cuenta_id: '2.1.02.03.001',
                        cuenta_nombre: 'Retenciones de IVA por Enterar al SENIAT (75%/100%)',
                        concepto: `Retención 75% IVA según Providencia 0071`,
                        debe_bs: 0.00,
                        haber_bs: retencionIvaBs,
                        debe_usd: 0.00,
                        haber_usd: retencionIvaUsd
                    },
                    {
                        renglon: 4,
                        cuenta_id: '2.1.01.01.001',
                        cuenta_nombre: 'Proveedores Nacionales de Calzado',
                        concepto: `Saldo por pagar a proveedor neto de retención`,
                        debe_bs: 0.00,
                        haber_bs: netoPagarBs,
                        debe_usd: 0.00,
                        haber_usd: netoPagarUsd
                    }
                ]
            });
        });

        // Ordenar cronológicamente descendente
        return asientos.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
    },

    /**
     * Libro Mayor: Sumas y Saldos por Cuenta
     */
    /**
     * Cálculo síncrono en memoria del Libro Mayor a partir de los asientos del Diario
     */
    computeLibroMayor: (diario = []) => {
        const mayorMap = {};

        // Inicializar con las cuentas del plan
        DEFAULT_PLAN_CUENTAS.filter(c => c.acepta_movimiento).forEach(c => {
            mayorMap[c.id] = {
                cuenta_id: c.id,
                codigo: c.codigo,
                nombre: c.nombre,
                tipo: c.tipo,
                naturaleza: c.naturaleza,
                saldo_inicial_bs: 0.00,
                saldo_inicial_usd: 0.00,
                total_debe_bs: 0.00,
                total_haber_bs: 0.00,
                total_debe_usd: 0.00,
                total_haber_usd: 0.00,
                saldo_final_bs: 0.00,
                saldo_final_usd: 0.00,
                movimientos: []
            };
        });

        // Acumular movimientos del diario
        (diario || []).forEach(asiento => {
            (asiento.renglones || []).forEach(r => {
                if (!mayorMap[r.cuenta_id]) {
                    mayorMap[r.cuenta_id] = {
                        cuenta_id: r.cuenta_id,
                        codigo: r.cuenta_id,
                        nombre: r.cuenta_nombre,
                        tipo: 'activo',
                        naturaleza: 'deudora',
                        saldo_inicial_bs: 0.00,
                        saldo_inicial_usd: 0.00,
                        total_debe_bs: 0.00,
                        total_haber_bs: 0.00,
                        total_debe_usd: 0.00,
                        total_haber_usd: 0.00,
                        saldo_final_bs: 0.00,
                        saldo_final_usd: 0.00,
                        movimientos: []
                    };
                }

                const c = mayorMap[r.cuenta_id];
                c.total_debe_bs += r.debe_bs;
                c.total_haber_bs += r.haber_bs;
                c.total_debe_usd += r.debe_usd;
                c.total_haber_usd += r.haber_usd;

                c.movimientos.push({
                    asiento_numero: asiento.numero_asiento,
                    fecha: asiento.fecha,
                    documento: asiento.documento_numero,
                    concepto: r.concepto,
                    debe_bs: r.debe_bs,
                    haber_bs: r.haber_bs,
                    debe_usd: r.debe_usd,
                    haber_usd: r.haber_usd
                });
            });
        });

        // Calcular saldo final según naturaleza
        Object.values(mayorMap).forEach(c => {
            if (c.naturaleza === 'deudora') {
                c.saldo_final_bs = Math.round((c.total_debe_bs - c.total_haber_bs) * 100) / 100;
                c.saldo_final_usd = Math.round((c.total_debe_usd - c.total_haber_usd) * 100) / 100;
            } else {
                c.saldo_final_bs = Math.round((c.total_haber_bs - c.total_debe_bs) * 100) / 100;
                c.saldo_final_usd = Math.round((c.total_haber_usd - c.total_debe_usd) * 100) / 100;
            }
        });

        return Object.values(mayorMap).filter(c => c.total_debe_bs > 0 || c.total_haber_bs > 0);
    },

    /**
     * Libro Mayor: Sumas y Saldos por Cuenta
     */
    getLibroMayor: async (params, existingDiario = null) => {
        const diario = existingDiario || await accountingService.getLibroDiario(params);
        return accountingService.computeLibroMayor(diario);
    },

    /**
     * Cálculo síncrono en memoria del Balance de Comprobación
     */
    computeBalanceComprobacion: (cuentasMayor = []) => {
        let sumDebeBs = 0;
        let sumHaberBs = 0;
        let sumDeudorBs = 0;
        let sumAcreedorBs = 0;

        let sumDebeUsd = 0;
        let sumHaberUsd = 0;
        let sumDeudorUsd = 0;
        let sumAcreedorUsd = 0;

        const filas = (cuentasMayor || []).map(c => {
            sumDebeBs += c.total_debe_bs;
            sumHaberBs += c.total_haber_bs;
            sumDebeUsd += c.total_debe_usd;
            sumHaberUsd += c.total_haber_usd;

            const saldoDeudorBs = c.naturaleza === 'deudora' ? Math.max(0, c.saldo_final_bs) : 0;
            const saldoAcreedorBs = c.naturaleza === 'acreedora' ? Math.max(0, c.saldo_final_bs) : 0;
            const saldoDeudorUsd = c.naturaleza === 'deudora' ? Math.max(0, c.saldo_final_usd) : 0;
            const saldoAcreedorUsd = c.naturaleza === 'acreedora' ? Math.max(0, c.saldo_final_usd) : 0;

            sumDeudorBs += saldoDeudorBs;
            sumAcreedorBs += saldoAcreedorBs;
            sumDeudorUsd += saldoDeudorUsd;
            sumAcreedorUsd += saldoAcreedorUsd;

            return {
                ...c,
                saldo_deudor_bs: saldoDeudorBs,
                saldo_acreedor_bs: saldoAcreedorBs,
                saldo_deudor_usd: saldoDeudorUsd,
                saldo_acreedor_usd: saldoAcreedorUsd
            };
        });

        return {
            cuentas: filas,
            sumas: {
                total_debe_bs: Math.round(sumDebeBs * 100) / 100,
                total_haber_bs: Math.round(sumHaberBs * 100) / 100,
                total_deudor_bs: Math.round(sumDeudorBs * 100) / 100,
                total_acreedor_bs: Math.round(sumAcreedorBs * 100) / 100,
                total_debe_usd: Math.round(sumDebeUsd * 100) / 100,
                total_haber_usd: Math.round(sumHaberUsd * 100) / 100,
                total_deudor_usd: Math.round(sumDeudorUsd * 100) / 100,
                total_acreedor_usd: Math.round(sumAcreedorUsd * 100) / 100,
                cuadrado: Math.abs(sumDebeBs - sumHaberBs) < 0.05
            }
        };
    },

    /**
     * Balance de Comprobación de Sumas y Saldos
     */
    getBalanceComprobacion: async (params, existingMayor = null) => {
        const cuentasMayor = existingMayor || await accountingService.getLibroMayor(params);
        return accountingService.computeBalanceComprobacion(cuentasMayor);
    },

    /**
     * Cálculo síncrono en memoria de los Estados Financieros Formales
     */
    computeEstadosFinancieros: (balanceComp) => {
        const cuentas = balanceComp?.cuentas || [];

        // Estado de Resultados
        const ingresos = cuentas.filter(c => c.tipo === 'ingreso');
        const costos = cuentas.filter(c => c.tipo === 'costo');
        const gastos = cuentas.filter(c => c.tipo === 'gasto');

        const totalIngresosUsd = ingresos.reduce((sum, c) => sum + c.saldo_acreedor_usd, 0);
        const totalCostosUsd = costos.reduce((sum, c) => sum + c.saldo_deudor_usd, 0);
        const utilidadBrutaUsd = totalIngresosUsd - totalCostosUsd;
        const totalGastosUsd = gastos.reduce((sum, c) => sum + c.saldo_deudor_usd, 0);
        const utilidadNetaUsd = utilidadBrutaUsd - totalGastosUsd;

        const totalIngresosBs = ingresos.reduce((sum, c) => sum + c.saldo_acreedor_bs, 0);
        const totalCostosBs = costos.reduce((sum, c) => sum + c.saldo_deudor_bs, 0);
        const utilidadBrutaBs = totalIngresosBs - totalCostosBs;
        const totalGastosBs = gastos.reduce((sum, c) => sum + c.saldo_deudor_bs, 0);
        const utilidadNetaBs = utilidadBrutaBs - totalGastosBs;

        // Balance General
        const activos = cuentas.filter(c => c.tipo === 'activo');
        const pasivos = cuentas.filter(c => c.tipo === 'pasivo');
        const patrimonio = cuentas.filter(c => c.tipo === 'patrimonio');

        const totalActivosUsd = activos.reduce((sum, c) => sum + c.saldo_deudor_usd, 0);
        const totalPasivosUsd = pasivos.reduce((sum, c) => sum + c.saldo_acreedor_usd, 0);
        const totalPatrimonioBaseUsd = patrimonio.reduce((sum, c) => sum + c.saldo_acreedor_usd, 0);
        const totalPatrimonioUsd = totalPatrimonioBaseUsd + utilidadNetaUsd;

        const totalActivosBs = activos.reduce((sum, c) => sum + c.saldo_deudor_bs, 0);
        const totalPasivosBs = pasivos.reduce((sum, c) => sum + c.saldo_acreedor_bs, 0);
        const totalPatrimonioBaseBs = patrimonio.reduce((sum, c) => sum + c.saldo_acreedor_bs, 0);
        const totalPatrimonioBs = totalPatrimonioBaseBs + utilidadNetaBs;

        return {
            estado_resultados: {
                ingresos,
                costos,
                gastos,
                total_ingresos_usd: Math.round(totalIngresosUsd * 100) / 100,
                total_costos_usd: Math.round(totalCostosUsd * 100) / 100,
                utilidad_bruta_usd: Math.round(utilidadBrutaUsd * 100) / 100,
                total_gastos_usd: Math.round(totalGastosUsd * 100) / 100,
                utilidad_neta_usd: Math.round(utilidadNetaUsd * 100) / 100,
                total_ingresos_bs: Math.round(totalIngresosBs * 100) / 100,
                total_costos_bs: Math.round(totalCostosBs * 100) / 100,
                utilidad_bruta_bs: Math.round(utilidadBrutaBs * 100) / 100,
                total_gastos_bs: Math.round(totalGastosBs * 100) / 100,
                utilidad_neta_bs: Math.round(utilidadNetaBs * 100) / 100
            },
            balance_general: {
                activos,
                pasivos,
                patrimonio,
                total_activos_usd: Math.round(totalActivosUsd * 100) / 100,
                total_pasivos_usd: Math.round(totalPasivosUsd * 100) / 100,
                total_patrimonio_usd: Math.round(totalPatrimonioUsd * 100) / 100,
                total_pasivo_patrimonio_usd: Math.round((totalPasivosUsd + totalPatrimonioUsd) * 100) / 100,
                total_activos_bs: Math.round(totalActivosBs * 100) / 100,
                total_pasivos_bs: Math.round(totalPasivosBs * 100) / 100,
                total_patrimonio_bs: Math.round(totalPatrimonioBs * 100) / 100,
                total_pasivo_patrimonio_bs: Math.round((totalPasivosBs + totalPatrimonioBs) * 100) / 100,
                cuadre_perfecto: Math.abs(totalActivosUsd - (totalPasivosUsd + totalPatrimonioUsd)) < 1.00
            }
        };
    },

    /**
     * Estados Financieros Formales: Balance General y Estado de Resultados
     */
    getEstadosFinancieros: async (params, existingBalance = null) => {
        const balanceComp = existingBalance || await accountingService.getBalanceComprobacion(params);
        return accountingService.computeEstadosFinancieros(balanceComp);
    },

    /**
     * Suite Completa Contable en un solo pase de alto rendimiento (0ms redundancia)
     */
    getAccountingSuite: async (params) => {
        const plan = DEFAULT_PLAN_CUENTAS;
        const diario = await accountingService.getLibroDiario(params);
        const mayor = accountingService.computeLibroMayor(diario);
        const balance = accountingService.computeBalanceComprobacion(mayor);
        const estados = accountingService.computeEstadosFinancieros(balance);

        return {
            plan,
            diario,
            mayor,
            balance,
            estados
        };
    }
};
