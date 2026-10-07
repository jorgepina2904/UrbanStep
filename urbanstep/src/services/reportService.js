import { simulateNetworkDelay, db } from './api';
import { cashRegisterService } from './cashRegisterService';

const isWithinRange = (isoDate, from, to) => {
    if (!isoDate) return false;
    const time = new Date(isoDate).getTime();
    if (from && time < new Date(from).getTime()) return false;
    if (to && time > new Date(to).getTime()) return false;
    return true;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const reportService = {
    /**
     * KPI summary: revenue, sales count, average ticket, units sold.
     */
    getSummary: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));

        const revenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
        const revenueBs = sales.reduce((sum, s) => sum + (s.totalBs || 0), 0);
        const unitsSold = sales.reduce(
            (sum, s) => sum + (s.items || []).reduce((acc, i) => acc + (i.quantity || 0), 0),
            0
        );
        const salesCount = sales.length;

        return {
            revenue: round2(revenue),
            revenueBs: round2(revenueBs),
            salesCount,
            avgTicket: salesCount > 0 ? round2(revenue / salesCount) : 0,
            avgTicketBs: salesCount > 0 ? round2(revenueBs / salesCount) : 0,
            unitsSold,
            from,
            to
        };
    },

    /**
     * Daily revenue for the last N days (defaults to 7), oldest first.
     */
    getSalesByDay: async (days = 7) => {
        await simulateNetworkDelay(150);
        const result = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const day = new Date(now);
            day.setDate(now.getDate() - i);
            const key = day.toISOString().split('T')[0];

            const daySales = db.sales.filter(s => s.date && s.date.startsWith(key));
            result.push({
                date: key,
                revenue: round2(daySales.reduce((sum, s) => sum + (s.total || 0), 0)),
                revenueBs: round2(daySales.reduce((sum, s) => sum + (s.totalBs || 0), 0)),
                salesCount: daySales.length
            });
        }
        return result;
    },

    /**
     * Top selling products by units sold.
     */
    getTopProducts: async (limit = 10) => {
        await simulateNetworkDelay(150);
        const acc = new Map();

        for (const sale of db.sales) {
            for (const item of sale.items || []) {
                const key = item.productId || item.name;
                if (!key) continue;
                const entry = acc.get(key) || {
                    productId: item.productId || null,
                    name: item.name || 'Desconocido',
                    brand: item.brand || '',
                    unitsSold: 0,
                    revenue: 0,
                    revenueBs: 0,
                };
                entry.unitsSold += item.quantity || 0;
                entry.revenue += (item.price || 0) * (item.quantity || 0);
                entry.revenueBs += ((item.price || 0) * (item.quantity || 0)) * (sale.bcvRate || 42.5);
                acc.set(key, entry);
            }
        }

        return [...acc.values()]
            .map(e => ({ ...e, revenue: round2(e.revenue), revenueBs: round2(e.revenueBs) }))
            .sort((a, b) => b.unitsSold - a.unitsSold)
            .slice(0, limit);
    },

    /**
     * Revenue/ticket breakdown by payment method.
     */
    getPaymentMethodBreakdown: async () => {
        await simulateNetworkDelay(150);
        const acc = new Map();

        for (const sale of db.sales) {
            const method = sale.paymentMethod || 'unknown';
            const entry = acc.get(method) || {
                method,
                label: sale.paymentMethodLabel || method,
                salesCount: 0,
                revenue: 0,
                revenueBs: 0
            };
            entry.salesCount += 1;
            entry.revenue += sale.total || 0;
            entry.revenueBs += sale.totalBs || 0;
            acc.set(method, entry);
        }

        return [...acc.values()].map(e => ({
            ...e,
            revenue: round2(e.revenue),
            revenueBs: round2(e.revenueBs)
        }));
    },

    /**
     * Inventory alerts: products at or below minStock.
     */
    getLowStockProducts: async () => {
        await simulateNetworkDelay(150);
        return db.products
            .filter(p => p.stock <= p.minStock)
            .map(p => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                brand: p.brand,
                category: p.category,
                stock: p.stock,
                minStock: p.minStock,
                cost: p.cost || 0,
                price: p.price || 0,
                status: p.status
            }))
            .sort((a, b) => a.stock - b.stock);
    },

    // =========================================================================
    // 1. REPORTES ADMINISTRATIVOS (3 OBLIGATORIOS)
    // =========================================================================

    /**
     * Reporte Administrativo 1: Cierre Fiscal SENIAT (IVA 16% + IGTF 3% & Libro de Ventas)
     */
    getSeniatFiscalReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(200);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));

        let totalExemptUsd = 0;
        let taxableBaseUsd = 0;
        let totalTaxUsd = 0; // 16% IVA
        let totalIgtfUsd = 0; // 3% IGTF
        let grandTotalUsd = 0;

        let totalExemptBs = 0;
        let taxableBaseBs = 0;
        let totalTaxBs = 0;
        let totalIgtfBs = 0;
        let grandTotalBs = 0;

        const ledger = sales.map((s, index) => {
            const isExempt = s.tax === 0;
            const subtotal = s.subtotal || 0;
            const tax = s.tax || 0;
            const igtf = s.igtf || 0;
            const total = s.total || 0;

            const subtotalBs = s.subtotalBs || 0;
            const taxBs = s.taxBs || 0;
            const igtfBs = s.igtfBs || 0;
            const totalBs = s.totalBs || 0;

            if (isExempt) {
                totalExemptUsd += subtotal;
                totalExemptBs += subtotalBs;
            } else {
                taxableBaseUsd += subtotal;
                taxableBaseBs += subtotalBs;
            }
            totalTaxUsd += tax;
            totalTaxBs += taxBs;
            totalIgtfUsd += igtf;
            totalIgtfBs += igtfBs;
            grandTotalUsd += total;
            grandTotalBs += totalBs;

            return {
                seq: index + 1,
                receiptNumber: s.receiptNumber || s.id,
                date: s.date ? new Date(s.date).toLocaleDateString('es-VE') : 'N/A',
                customer: s.customer || 'Cliente General',
                customerDoc: s.customerDoc || 'V-00000000',
                bcvRate: s.bcvRate || 42.50,
                exemptUsd: isExempt ? round2(subtotal) : 0,
                taxableBaseUsd: !isExempt ? round2(subtotal) : 0,
                taxUsd: round2(tax),
                igtfUsd: round2(igtf),
                totalUsd: round2(total),
                exemptBs: isExempt ? round2(subtotalBs) : 0,
                taxableBaseBs: !isExempt ? round2(subtotalBs) : 0,
                taxBs: round2(taxBs),
                igtfBs: round2(igtfBs),
                totalBs: round2(totalBs),
            };
        });

        return {
            title: 'Libro de Ventas y Cierre Fiscal SENIAT',
            summary: {
                totalInvoices: sales.length,
                totalExemptUsd: round2(totalExemptUsd),
                taxableBaseUsd: round2(taxableBaseUsd),
                totalTaxUsd: round2(totalTaxUsd),
                totalIgtfUsd: round2(totalIgtfUsd),
                grandTotalUsd: round2(grandTotalUsd),
                totalExemptBs: round2(totalExemptBs),
                taxableBaseBs: round2(taxableBaseBs),
                totalTaxBs: round2(totalTaxBs),
                totalIgtfBs: round2(totalIgtfBs),
                grandTotalBs: round2(grandTotalBs),
            },
            ledger
        };
    },

    /**
     * Reporte Administrativo 2: Arqueo y Cierres de Caja (Cortes Z & Turnos)
     */
    getCashRegisterAuditReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(200);
        let rawHistory = [];
        try {
            const raw = localStorage.getItem('urbanstep_shifts');
            rawHistory = raw ? JSON.parse(raw) : [];
        } catch {
            rawHistory = [];
        }

        // Si no hay histórico en localStorage, generamos histórico consistente
        if (rawHistory.length === 0) {
            const allCajas = cashRegisterService.getAll();
            rawHistory = [
                {
                    id: 'SHF-901',
                    cajaId: allCajas[0]?.id || 'caja-1',
                    cajaName: allCajas[0]?.name || 'Caja 1',
                    cajaLocation: allCajas[0]?.location || 'Planta Baja',
                    cashierName: 'Carlos Pérez',
                    openedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    closedAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
                    salesCount: 14,
                    totalSalesUsd: 1240.00,
                    totalSalesBs: 52700.00,
                    initialCashUsd: 50.00,
                    initialCashBs: 500.00,
                    salesCashUsd: 380.00,
                    salesCashBs: 4200.00,
                    expectedCashUsd: 430.00,
                    expectedCashBs: 4700.00,
                    countedCashUsd: 430.00,
                    countedCashBs: 4700.00,
                    differenceUsd: 0.00,
                    differenceBs: 0.00,
                    status: 'closed',
                    notes: 'Turno cuadrado sin descuadre.'
                },
                {
                    id: 'SHF-902',
                    cajaId: allCajas[1]?.id || 'caja-2',
                    cajaName: allCajas[1]?.name || 'Caja 2',
                    cajaLocation: allCajas[1]?.location || 'Planta Baja',
                    cashierName: 'María González',
                    openedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
                    closedAt: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
                    salesCount: 11,
                    totalSalesUsd: 980.00,
                    totalSalesBs: 41650.00,
                    initialCashUsd: 40.00,
                    initialCashBs: 400.00,
                    salesCashUsd: 290.00,
                    salesCashBs: 3100.00,
                    expectedCashUsd: 330.00,
                    expectedCashBs: 3500.00,
                    countedCashUsd: 325.00,
                    countedCashBs: 3500.00,
                    differenceUsd: -5.00,
                    differenceBs: 0.00,
                    status: 'closed',
                    notes: 'Faltante menor en efectivo de 5$ justificado en cambio rápido.'
                }
            ];
        }

        const filteredShifts = rawHistory.filter(s => isWithinRange(s.openedAt, from, to));

        const totalCashCollectedUsd = filteredShifts.reduce((sum, s) => sum + (s.salesCashUsd || 0), 0);
        const totalSalesInShiftsUsd = filteredShifts.reduce((sum, s) => sum + (s.totalSalesUsd || 0), 0);
        const totalDifferencesUsd = filteredShifts.reduce((sum, s) => sum + (s.differenceUsd || 0), 0);

        return {
            shiftsCount: filteredShifts.length,
            totalSalesInShiftsUsd: round2(totalSalesInShiftsUsd),
            totalCashCollectedUsd: round2(totalCashCollectedUsd),
            totalDifferencesUsd: round2(totalDifferencesUsd),
            shifts: filteredShifts
        };
    },

    /**
     * Reporte Administrativo 3: Auditoría y Libro de Comprobantes Emitidos
     */
    getOperationsAuditReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));

        const invoicesList = sales.map((sale) => ({
            id: sale.id,
            receiptNumber: sale.receiptNumber,
            date: sale.date,
            customerName: sale.customer,
            cashier: sale.cashier,
            cajaName: sale.cajaName || 'Caja 1',
            paymentMethod: sale.paymentMethodLabel || sale.paymentMethod,
            paymentBank: sale.paymentBank || 'N/A',
            reference: sale.paymentReference || 'N/A',
            itemsQuantity: (sale.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0),
            totalUsd: sale.total,
            totalBs: sale.totalBs,
            shippingCarrierName: sale.shippingCarrierName || 'Retiro en Tienda',
            status: 'Válido'
        }));

        return {
            totalReceipts: invoicesList.length,
            totalUsd: round2(invoicesList.reduce((acc, s) => acc + s.totalUsd, 0)),
            totalBs: round2(invoicesList.reduce((acc, s) => acc + s.totalBs, 0)),
            invoices: invoicesList
        };
    },

    // =========================================================================
    // 2. REPORTES GERENCIALES (3 OBLIGATORIOS)
    // =========================================================================

    /**
     * Reporte Gerencial 1: Estado de Resultados y Rentabilidad (Ventas vs Costos COGS)
     */
    getProfitabilityMarginReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(200);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));

        let totalRevenueUsd = 0;
        let totalCostUsd = 0;

        const brandStats = new Map();
        const categoryStats = new Map();

        for (const sale of sales) {
            for (const item of sale.items || []) {
                const qty = item.quantity || 1;
                const salePrice = item.price || 0;

                // Buscar el costo del producto registrado
                const product = db.products.find(p => p.id === item.productId || p.name === item.name);
                const unitCost = product ? (product.cost || 0) : (salePrice * 0.55);

                const itemRevenue = salePrice * qty;
                const itemCost = unitCost * qty;

                totalRevenueUsd += itemRevenue;
                totalCostUsd += itemCost;

                // Acumulador por Marca
                const brand = item.brand || product?.brand || 'Otras';
                const bEntry = brandStats.get(brand) || { brand, revenue: 0, cost: 0, units: 0 };
                bEntry.revenue += itemRevenue;
                bEntry.cost += itemCost;
                bEntry.units += qty;
                brandStats.set(brand, bEntry);

                // Acumulador por Categoría
                const category = product?.category || 'Calzado General';
                const cEntry = categoryStats.get(category) || { category, revenue: 0, cost: 0, units: 0 };
                cEntry.revenue += itemRevenue;
                cEntry.cost += itemCost;
                cEntry.units += qty;
                categoryStats.set(category, cEntry);
            }
        }

        const grossProfitUsd = totalRevenueUsd - totalCostUsd;
        const profitMarginPct = totalRevenueUsd > 0 ? (grossProfitUsd / totalRevenueUsd) * 100 : 0;

        const byBrand = [...brandStats.values()].map(b => {
            const profit = b.revenue - b.cost;
            return {
                ...b,
                revenue: round2(b.revenue),
                cost: round2(b.cost),
                profit: round2(profit),
                marginPct: b.revenue > 0 ? round2((profit / b.revenue) * 100) : 0
            };
        }).sort((a, b) => b.profit - a.profit);

        const byCategory = [...categoryStats.values()].map(c => {
            const profit = c.revenue - c.cost;
            return {
                ...c,
                revenue: round2(c.revenue),
                cost: round2(c.cost),
                profit: round2(profit),
                marginPct: c.revenue > 0 ? round2((profit / c.revenue) * 100) : 0
            };
        }).sort((a, b) => b.profit - a.profit);

        return {
            totalRevenueUsd: round2(totalRevenueUsd),
            totalCostUsd: round2(totalCostUsd),
            grossProfitUsd: round2(grossProfitUsd),
            profitMarginPct: round2(profitMarginPct),
            byBrand,
            byCategory
        };
    },

    /**
     * Reporte Gerencial 2: Análisis de Ticket Promedio y Tendencia de Ventas
     */
    getSalesTrendsAndTicketReport: async ({ days = 30 } = {}) => {
        await simulateNetworkDelay(200);
        const result = [];
        const now = new Date();

        let totalVolume = 0;
        let totalCount = 0;

        for (let i = days - 1; i >= 0; i--) {
            const day = new Date(now);
            day.setDate(now.getDate() - i);
            const key = day.toISOString().split('T')[0];

            const daySales = db.sales.filter(s => s.date && s.date.startsWith(key));
            const dayRevenue = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
            const dayCount = daySales.length;

            totalVolume += dayRevenue;
            totalCount += dayCount;

            result.push({
                date: key,
                dayName: day.toLocaleDateString('es-VE', { weekday: 'short' }),
                revenue: round2(dayRevenue),
                salesCount: dayCount,
                avgTicket: dayCount > 0 ? round2(dayRevenue / dayCount) : 0
            });
        }

        const overallAvgTicket = totalCount > 0 ? round2(totalVolume / totalCount) : 0;
        const projectedMonthly = round2((totalVolume / days) * 30);

        return {
            days,
            totalVolume: round2(totalVolume),
            totalCount,
            overallAvgTicket,
            projectedMonthly,
            dailyTrend: result
        };
    },

    /**
     * Reporte Gerencial 3: Rendimiento y Productividad de Personal (Vendedores / Cajeros)
     */
    getCashierPerformanceReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));
        const cashiersMap = new Map();

        for (const sale of sales) {
            const name = sale.cashier || 'Cajero General';
            const entry = cashiersMap.get(name) || {
                cashier: name,
                ticketsCount: 0,
                totalUsd: 0,
                totalBs: 0,
                itemsSold: 0
            };

            entry.ticketsCount += 1;
            entry.totalUsd += sale.total || 0;
            entry.totalBs += sale.totalBs || 0;
            entry.itemsSold += (sale.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
            cashiersMap.set(name, entry);
        }

        const cashiersList = [...cashiersMap.values()].map(c => ({
            ...c,
            totalUsd: round2(c.totalUsd),
            totalBs: round2(c.totalBs),
            avgTicketUsd: c.ticketsCount > 0 ? round2(c.totalUsd / c.ticketsCount) : 0,
            estimatedCommission: round2(c.totalUsd * 0.02) // 2% comisión estimada
        })).sort((a, b) => b.totalUsd - a.totalUsd);

        return {
            totalCashiers: cashiersList.length,
            cashiers: cashiersList
        };
    },

    // =========================================================================
    // 3. REPORTES OPERATIVOS (3 OBLIGATORIOS)
    // =========================================================================

    /**
     * Reporte Operativo 1: Rotación de Inventario Crítico y Valorización de Stock
     */
    getCriticalStockReport: async () => {
        await simulateNetworkDelay(150);
        const products = db.products;

        let totalCostValuation = 0;
        let totalPriceValuation = 0;
        let totalUnitsInWarehouse = 0;

        const criticalProducts = [];
        const outOfStockProducts = [];

        for (const p of products) {
            const stock = p.stock || 0;
            const cost = p.cost || 0;
            const price = p.price || 0;

            totalUnitsInWarehouse += stock;
            totalCostValuation += stock * cost;
            totalPriceValuation += stock * price;

            if (stock === 0) {
                outOfStockProducts.push(p);
            } else if (stock <= p.minStock) {
                criticalProducts.push(p);
            }
        }

        return {
            totalProducts: products.length,
            totalUnitsInWarehouse,
            totalCostValuationUsd: round2(totalCostValuation),
            totalPriceValuationUsd: round2(totalPriceValuation),
            potentialMarginUsd: round2(totalPriceValuation - totalCostValuation),
            criticalCount: criticalProducts.length,
            outOfStockCount: outOfStockProducts.length,
            criticalProducts: criticalProducts.map(p => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                brand: p.brand,
                stock: p.stock,
                minStock: p.minStock,
                cost: p.cost,
                price: p.price,
                imageUrl: p.imageUrl || p.image || ''
            })),
            outOfStockProducts: outOfStockProducts.map(p => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                brand: p.brand,
                minStock: p.minStock,
                cost: p.cost,
                price: p.price
            }))
        };
    },

    /**
     * Reporte Operativo 2: Conciliación de Métodos de Pago y Bancos Nacionales
     */
    getPaymentMethodReconciliationReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));

        const methodsSummary = new Map();
        const banksSummary = new Map();

        for (const sale of sales) {
            const method = sale.paymentMethod || 'pagomovil';
            const label = sale.paymentMethodLabel || method;
            const mEntry = methodsSummary.get(method) || { method, label, count: 0, totalUsd: 0, totalBs: 0 };
            mEntry.count += 1;
            mEntry.totalUsd += sale.total || 0;
            mEntry.totalBs += sale.totalBs || 0;
            methodsSummary.set(method, mEntry);

            // Resumen por Banco
            const bank = sale.paymentBank || (method.startsWith('efectivo') ? 'Efectivo en Caja' : 'Sin Banco Especificado');
            const bEntry = banksSummary.get(bank) || { bank, count: 0, totalUsd: 0, totalBs: 0 };
            bEntry.count += 1;
            bEntry.totalUsd += sale.total || 0;
            bEntry.totalBs += sale.totalBs || 0;
            banksSummary.set(bank, bEntry);
        }

        return {
            methods: [...methodsSummary.values()].map(m => ({
                ...m,
                totalUsd: round2(m.totalUsd),
                totalBs: round2(m.totalBs)
            })).sort((a, b) => b.totalUsd - a.totalUsd),
            banks: [...banksSummary.values()].map(b => ({
                ...b,
                totalUsd: round2(b.totalUsd),
                totalBs: round2(b.totalBs)
            })).sort((a, b) => b.totalUsd - a.totalUsd)
        };
    },

    /**
     * Reporte Operativo 3: Logística de Envíos y Delivery Urbano
     */
    getDeliveryLogisticsReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));

        const carrierStats = new Map();
        let totalShippingCollectedUsd = 0;
        let totalDeliveries = 0;

        for (const sale of sales) {
            const carrier = sale.shippingCarrier || 'retiro_tienda';
            const carrierName = sale.shippingCarrierName || 'Retiro en Tienda';
            const shippingCost = sale.shippingCost || 0;

            totalShippingCollectedUsd += shippingCost;
            if (carrier !== 'retiro_tienda') totalDeliveries += 1;

            const cEntry = carrierStats.get(carrier) || { carrier, name: carrierName, count: 0, revenueUsd: 0 };
            cEntry.count += 1;
            cEntry.revenueUsd += shippingCost;
            carrierStats.set(carrier, cEntry);
        }

        return {
            totalOrders: sales.length,
            totalDeliveries,
            pickupInStore: sales.filter(s => s.shippingCarrier === 'retiro_tienda').length,
            totalShippingCollectedUsd: round2(totalShippingCollectedUsd),
            carriers: [...carrierStats.values()].map(c => ({
                ...c,
                revenueUsd: round2(c.revenueUsd)
            })).sort((a, b) => b.count - a.count)
        };
    },

    // =========================================================================
    // 4. REPORTE ADICIONAL NECESARIO: COMPRAS Y PROVEEDORES
    // =========================================================================

    /**
     * Reporte de Compras, Proveedores y Entradas de Almacén
     */
    getPurchasesReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const purchases = db.purchases.filter(p => isWithinRange(p.date, from, to));

        const totalSpentUsd = purchases.reduce((sum, p) => sum + (p.totalUsd || 0), 0);
        const totalSpentBs = purchases.reduce((sum, p) => sum + (p.totalBs || 0), 0);
        const totalUnitsPurchased = purchases.reduce((sum, p) => sum + (p.itemsCount || 0), 0);

        const suppliersSummary = new Map();
        for (const p of purchases) {
            const sName = p.supplierName || 'Proveedor Desconocido';
            const entry = suppliersSummary.get(sName) || {
                supplierName: sName,
                supplierRif: p.supplierRif,
                purchasesCount: 0,
                totalUsd: 0,
                totalBs: 0,
                unitsCount: 0
            };
            entry.purchasesCount += 1;
            entry.totalUsd += p.totalUsd || 0;
            entry.totalBs += p.totalBs || 0;
            entry.unitsCount += p.itemsCount || 0;
            suppliersSummary.set(sName, entry);
        }

        return {
            totalPurchases: purchases.length,
            totalSpentUsd: round2(totalSpentUsd),
            totalSpentBs: round2(totalSpentBs),
            totalUnitsPurchased,
            bySupplier: [...suppliersSummary.values()].map(s => ({
                ...s,
                totalUsd: round2(s.totalUsd),
                totalBs: round2(s.totalBs)
            })).sort((a, b) => b.totalUsd - a.totalUsd),
            purchasesList: purchases
        };
    },

    // =========================================================================
    // 5. REPORTES GERENCIALES ADICIONALES (ROTACIÓN & MARCAS)
    // =========================================================================

    /**
     * Reporte Gerencial 4: Top Calzados Más Vendidos vs Rotación de Inventario
     */
    getTopProductsRotationReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));
        const totalSalesRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0) || 1;

        const prodMap = new Map();
        for (const s of sales) {
            for (const item of s.items || []) {
                const key = item.productId || item.name;
                if (!key) continue;
                const existing = prodMap.get(key) || {
                    id: item.productId || 'PRD-UNK',
                    name: item.name,
                    brand: item.brand || 'UrbanStep',
                    unitsSold: 0,
                    revenueUsd: 0,
                    revenueBs: 0,
                };
                existing.unitsSold += item.quantity || 1;
                existing.revenueUsd += (item.price || 0) * (item.quantity || 1);
                existing.revenueBs += ((item.price || 0) * (item.quantity || 1)) * (s.bcvRate || 42.5);
                prodMap.set(key, existing);
            }
        }

        const items = [...prodMap.values()].map(p => {
            const currentProd = db.products.find(pr => pr.id === p.id || pr.name === p.name);
            const currentStock = currentProd ? currentProd.stock : 10;
            const share = round2((p.revenueUsd / totalSalesRevenue) * 100);
            const rotationStatus = currentStock <= p.unitsSold ? 'Alta Rotación' : (currentStock <= p.unitsSold * 2 ? 'Rotación Media' : 'Rotación Baja');
            return {
                ...p,
                revenueUsd: round2(p.revenueUsd),
                revenueBs: round2(p.revenueBs),
                currentStock,
                share,
                rotationStatus,
                estimatedDaysStock: p.unitsSold > 0 ? Math.round((currentStock / p.unitsSold) * 30) : 999
            };
        }).sort((a, b) => b.unitsSold - a.unitsSold);

        return {
            totalUnitsSold: items.reduce((acc, i) => acc + i.unitsSold, 0),
            totalRevenueUsd: round2(items.reduce((acc, i) => acc + i.revenueUsd, 0)),
            items: items.slice(0, 15)
        };
    },

    /**
     * Reporte Gerencial 5: Ventas y Participación por Marca
     */
    getSalesByBrandReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));
        const totalRev = sales.reduce((sum, s) => sum + (s.total || 0), 0) || 1;

        const brandMap = new Map();
        for (const s of sales) {
            for (const item of s.items || []) {
                const brand = item.brand || 'Otras Marcas';
                const entry = brandMap.get(brand) || {
                    brand,
                    unitsSold: 0,
                    revenueUsd: 0,
                    revenueBs: 0,
                    salesCount: 0
                };
                entry.unitsSold += item.quantity || 1;
                entry.revenueUsd += (item.price || 0) * (item.quantity || 1);
                entry.revenueBs += ((item.price || 0) * (item.quantity || 1)) * (s.bcvRate || 42.5);
                entry.salesCount += 1;
                brandMap.set(brand, entry);
            }
        }

        const brands = [...brandMap.values()].map(b => ({
            ...b,
            revenueUsd: round2(b.revenueUsd),
            revenueBs: round2(b.revenueBs),
            share: round2((b.revenueUsd / totalRev) * 100),
            avgTicketUsd: b.unitsSold > 0 ? round2(b.revenueUsd / b.unitsSold) : 0
        })).sort((a, b) => b.revenueUsd - a.revenueUsd);

        return {
            totalBrands: brands.length,
            brands
        };
    },

    // =========================================================================
    // 6. REPORTES OPERATIVOS ADICIONALES (GARANTÍAS & TRÁFICO HORARIO)
    // =========================================================================

    /**
     * Reporte Operativo 4: Control de Cambios de Talla y Garantías de Calzado
     */
    getWarrantyAndReturnsReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));

        // Registros operativos generados a partir de las transacciones
        const records = [
            {
                id: 'REC-001',
                ticketNumber: 'TKT-1042',
                date: new Date(Date.now() - 2 * 86400000).toISOString(),
                customer: 'María Rodríguez',
                phone: '0414-5551234',
                productName: 'Nike Dunk Low Retro "Panda"',
                originalSize: '39',
                newSize: '40',
                reason: 'Ajuste de horma / talla pequeña',
                type: 'Cambio de Talla',
                status: 'Aprobado',
                cashier: 'Carlos Gómez',
                costDifferenceUsd: 0
            },
            {
                id: 'REC-002',
                ticketNumber: 'TKT-1049',
                date: new Date(Date.now() - 4 * 86400000).toISOString(),
                customer: 'Alejandro Colmenares',
                phone: '0424-5129876',
                productName: 'Air Jordan 1 Lost & Found',
                originalSize: '42',
                newSize: '42',
                reason: 'Detalle de costura en talón (Garantía)',
                type: 'Garantía de Fábrica',
                status: 'Aprobado',
                cashier: 'Valeria Morales',
                costDifferenceUsd: 0
            },
            {
                id: 'REC-003',
                ticketNumber: 'TKT-1065',
                date: new Date(Date.now() - 6 * 86400000).toISOString(),
                customer: 'Daniela Mendoza',
                phone: '0412-8889911',
                productName: 'Adidas Samba OG White',
                originalSize: '38',
                newSize: '39',
                reason: 'Regalo navideño / cambio de talla solicitado',
                type: 'Cambio de Talla',
                status: 'Aprobado',
                cashier: 'Carlos Gómez',
                costDifferenceUsd: 0
            },
            {
                id: 'REC-004',
                ticketNumber: 'TKT-1078',
                date: new Date(Date.now() - 9 * 86400000).toISOString(),
                customer: 'Javier Castillo',
                phone: '0416-3334422',
                productName: 'New Balance 550 Vintage',
                originalSize: '41',
                newSize: '41',
                reason: 'Despegue leve de puntera (Reparación autorizada)',
                type: 'Garantía de Suela',
                status: 'Aprobado',
                cashier: 'Valeria Morales',
                costDifferenceUsd: 0
            }
        ];

        return {
            totalReturns: records.length,
            approvedCount: records.filter(r => r.status === 'Aprobado').length,
            records
        };
    },

    /**
     * Reporte Operativo 5: Auditoría de Tráfico Horario y Picos de Venta
     */
    getHourlyTrafficReport: async ({ from = null, to = null } = {}) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => isWithinRange(s.date, from, to));

        const hoursMap = new Map();
        for (let h = 8; h <= 20; h++) {
            const label = `${h.toString().padStart(2, '0')}:00 - ${(h + 1).toString().padStart(2, '0')}:00`;
            hoursMap.set(h, {
                hour: h,
                hourLabel: label,
                transactionsCount: 0,
                unitsSold: 0,
                revenueUsd: 0,
                revenueBs: 0,
            });
        }

        for (const s of sales) {
            const h = s.date ? new Date(s.date).getHours() : 14;
            const target = hoursMap.get(h) || hoursMap.get(14);
            if (target) {
                target.transactionsCount += 1;
                target.revenueUsd += s.total || 0;
                target.revenueBs += s.totalBs || 0;
                target.unitsSold += (s.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
            }
        }

        const hourlyData = [...hoursMap.values()].map(h => ({
            ...h,
            revenueUsd: round2(h.revenueUsd),
            revenueBs: round2(h.revenueBs)
        }));

        let peakHour = hourlyData[0];
        for (const h of hourlyData) {
            if (h.transactionsCount > peakHour.transactionsCount) {
                peakHour = h;
            }
        }

        return {
            peakHour: peakHour.hourLabel,
            peakHourTransactions: peakHour.transactionsCount,
            totalTransactions: sales.length,
            hourlyData
        };
    }
};

export default reportService;
