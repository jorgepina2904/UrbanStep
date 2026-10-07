import { simulateNetworkDelay, db } from './api';
import { generateId } from '../utils/generateId';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { bcvService } from './bcvService';

export const saleService = {
    getAll: async () => {
        await simulateNetworkDelay(150);
        return [...db.sales];
    },

    getSales: async () => {
        await simulateNetworkDelay(150);
        return [...db.sales];
    },

    create: async (saleData) => {
        await simulateNetworkDelay(300);

        let customerId = saleData.customerId || null;
        let customerName = (saleData.customer || '').trim();
        let customerDoc = saleData.customerDoc || '';
        let customerPhone = saleData.customerPhone || '';

        const customer = db.customers.find(c => c.id === customerId);
        if (customer) {
            customerId = customer.id;
            customerName = customer.id === 'publico' ? 'Cliente General' : `${customer.firstName} ${customer.lastName}`.trim();
            customerDoc = customer.docNumber || '';
            customerPhone = customer.phone || '';
        } else if (!customerId) {
            customerId = 'publico';
            customerName = 'Cliente General';
        }

        const bcvRate = saleData.bcvRate || bcvService.getRate().rate;
        const subtotalUsd = Number(saleData.subtotal) || 0;
        const taxUsd = Number(saleData.tax) || 0;
        const igtfUsd = Number(saleData.igtf) || 0;
        const shippingCostUsd = Number(saleData.shippingCost) || 0;
        const totalUsd = Number(saleData.total) || 0;

        const toBs = (val) => Number((val * bcvRate).toFixed(2));

        const newSale = {
            id: generateId('SAL'),
            receiptNumber: `TKT-${new Date().getFullYear()}-${1000 + db.sales.length}`,
            customerId,
            customer: customerName,
            customerDoc,
            customerPhone,
            items: saleData.items || [],
            bcvRate,
            
            // Montos USD
            subtotal: subtotalUsd,
            tax: taxUsd,
            igtf: igtfUsd,
            shippingCost: shippingCostUsd,
            total: totalUsd,

            // Montos equivalentes en Bolívares
            subtotalBs: toBs(subtotalUsd),
            taxBs: toBs(taxUsd),
            igtfBs: toBs(igtfUsd),
            totalBs: toBs(totalUsd),

            // Pago
            paymentMethod: saleData.paymentMethod || 'pagomovil',
            paymentMethodLabel: saleData.paymentMethodLabel || 'Pago Móvil',
            paymentBank: saleData.paymentBank || '',
            paymentReference: saleData.paymentReference || '',
            cashReceived: saleData.cashReceived || null,
            cashChange: saleData.cashChange || 0,
            cashCurrency: saleData.cashCurrency || 'USD',

            // Envío
            shippingCarrier: saleData.shippingCarrier || 'retiro_tienda',
            shippingCarrierName: saleData.shippingCarrierName || 'Retiro en Tienda',

            cashier: saleData.cashier || 'Caja Principal',
            cajaId: saleData.cajaId || 'caja-1',
            cajaName: saleData.cajaName || 'Caja 1',
            shiftId: saleData.shiftId || null,
            date: new Date().toISOString()
        };

        db.sales.unshift(newSale);

        // Actualizar métricas del cliente
        if (customerId && customerId !== 'publico') {
            const c = db.customers.find(cust => cust.id === customerId);
            if (c) {
                c.totalSpent = (c.totalSpent || 0) + newSale.total;
                c.purchasesCount = (c.purchasesCount || 0) + 1;
            }
        }

        // Actualizar stock de productos (no permite negativos y auto-deshabilita al agotarse)
        for (const item of newSale.items) {
            const product = db.products.find(p => p.id === item.productId || p.id === item.id || p.name === item.name);
            if (product) {
                product.stock = Math.max(0, (product.stock || 0) - (item.quantity || 1));
                if (product.stock <= 0) {
                    product.status = 'out_of_stock';
                    product.disabled = true;
                    product.active = false;
                } else {
                    product.status = product.stock > product.minStock ? 'in_stock' : 'low_stock';
                }
            }
        }

        db.save('products');
        db.save('sales');
        db.save('customers');

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('products_updated', { detail: [...db.products] }));
            window.dispatchEvent(new CustomEvent('customers_updated', { detail: [...db.customers] }));
            window.dispatchEvent(new CustomEvent('sales_updated', { detail: [...db.sales] }));
        }

        // Sincronizar en Supabase si está disponible
        if (isSupabaseConfigured()) {
            try {
                await supabase.from('sales').insert({
                    id: newSale.id,
                    receipt_number: newSale.receiptNumber,
                    customer_id: customerId === 'publico' ? null : customerId,
                    customer_name: newSale.customer,
                    cashier_name: newSale.cashier,
                    bcv_rate: bcvRate,
                    subtotal_usd: newSale.subtotal,
                    tax_usd: newSale.tax,
                    igtf_usd: newSale.igtf,
                    total_usd: newSale.total,
                    subtotal_bs: newSale.subtotalBs,
                    tax_bs: newSale.taxBs,
                    igtf_bs: newSale.igtfBs,
                    total_bs: newSale.totalBs,
                    primary_payment_method: newSale.paymentMethod,
                    shipping_carrier: newSale.shippingCarrier,
                });
            } catch (err) {
                console.warn('Error guardando venta en Supabase:', err);
            }
        }

        return newSale;
    },

    createSale: async (saleData) => {
        return saleService.create(saleData);
    },

    getStats: async () => {
        await simulateNetworkDelay(100);
        const today = new Date().toISOString().split('T')[0];
        const todaySalesList = db.sales.filter(s => s.date && s.date.startsWith(today));
        const todayRevenue = todaySalesList.reduce((sum, s) => sum + (s.total || 0), 0);

        return {
            todaySales: todaySalesList.length || db.sales.length,
            todayRevenue: todayRevenue || db.sales.reduce((sum, s) => sum + (s.total || 0), 0),
            totalSalesCount: db.sales.length
        };
    }
};

export default saleService;