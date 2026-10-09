import { simulateNetworkDelay, db } from './api';
import { generateId } from '../utils/generateId';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { bcvService } from './bcvService';
import { ensureSizeStock, calculateTotalStock, ensureColorVariants, calculateVariantsTotalStock, getAvailableStockForItem } from '../utils/shoeSizes';
import { stockMovementService } from './stockMovementService';

export const saleService = {
    getAll: async () => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('ventas')
                    .select('*')
                    .order('creado_el', { ascending: false });

                if (!error && Array.isArray(data) && data.length > 0) {
                    const mapped = data.map(v => ({
                        id: v.id,
                        receiptNumber: v.numero_recibo,
                        fiscalControlNumber: v.numero_control_fiscal,
                        customerId: v.cliente_id || 'publico',
                        customer: v.nombre_cliente,
                        cashier: v.nombre_cajero,
                        bcvRate: Number(v.tasa_bcv),
                        subtotal: Number(v.subtotal_usd),
                        discount: Number(v.descuento_usd || 0),
                        tax: Number(v.iva_usd),
                        igtf: Number(v.igtf_usd),
                        shippingCost: Number(v.costo_delivery_usd || 0),
                        total: Number(v.total_usd),
                        subtotalBs: Number(v.subtotal_bs),
                        taxBs: Number(v.iva_bs),
                        igtfBs: Number(v.igtf_bs),
                        totalBs: Number(v.total_bs),
                        paymentMethod: v.metodo_pago_principal,
                        paymentMethodLabel: v.metodo_pago_principal,
                        shippingCarrier: v.empresa_envio,
                        date: v.creado_el,
                        items: []
                    }));
                    // Mantener sincronizado db.sales
                    db.sales = mapped;
                    db.save('sales');
                    return mapped;
                }
            } catch (err) {
                console.warn('Fallback a sales locales:', err);
            }
        }
        await simulateNetworkDelay(150);
        return [...db.sales];
    },

    getSales: async () => {
        return saleService.getAll();
    },

    getLastSale: () => {
        return db.sales[0] || null;
    },

    create: async (saleData) => {
        await simulateNetworkDelay(200);

        if (!saleData.items || !Array.isArray(saleData.items) || saleData.items.length === 0) {
            throw new Error("No hay artículos en la venta para procesar.");
        }

        // VALIDACIÓN ESTRICTA DE INVENTARIO: Verificar que exista stock real disponible
        // para cada artículo, talla y color ANTES de procesar la venta.
        for (const item of saleData.items) {
            const prodId = item.productId || item.id;
            const product = db.products.find(p => p.id === prodId || p.name === item.name);
            if (!product) {
                throw new Error(`El producto "${item.name}" no fue encontrado en el catálogo.`);
            }
            if (product.disabled) {
                throw new Error(`El producto "${product.name}" se encuentra deshabilitado para la venta.`);
            }

            const requestedQty = Math.max(1, parseInt(item.quantity) || 1);
            const itemSize = item.size || item.talla || 'N/A';
            const itemColor = item.color || product.color;
            const available = getAvailableStockForItem(product, itemSize, itemColor);

            if (available < requestedQty) {
                const detailMsg = `${itemColor ? `color ${itemColor} • ` : ''}${itemSize && itemSize !== 'N/A' ? `Talla ${itemSize}` : 'inventario general'}`;
                throw new Error(
                    `Stock insuficiente para "${product.name}" (${detailMsg}): ` +
                    `Disponible en inventario: ${available} par(es), Solicitado: ${requestedQty} par(es). ` +
                    `No es posible vender más unidades de las existentes ni quedar en negativo.`
                );
            }
        }

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
        const discountUsd = Number(saleData.discountAmount || saleData.discount) || 0;
        const taxUsd = Number(saleData.tax) || 0;
        const igtfUsd = Number(saleData.igtf) || 0;
        const shippingCostUsd = Number(saleData.shippingCost) || 0;
        const totalUsd = Number(saleData.total) || 0;

        const toBs = (val) => Number((val * bcvRate).toFixed(2));

        const newSale = {
            id: generateId('VEN'),
            receiptNumber: `TKT-${new Date().getFullYear()}-${1000 + db.sales.length}`,
            customerId,
            customer: customerName,
            customerDoc,
            customerPhone,
            items: saleData.items || [],
            bcvRate,
            
            // Montos USD
            subtotal: subtotalUsd,
            discount: discountUsd,
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

        // Actualizar stock de productos de forma segura y registrar Kardex
        for (const item of newSale.items) {
            const prodId = item.productId || item.id;
            const product = db.products.find(p => p.id === prodId || p.name === item.name);
            if (product) {
                const previousStock = product.stock;
                const qty = Math.max(1, parseInt(item.quantity) || 1);
                const itemSize = item.size || item.talla;
                const itemColor = item.color || product.color;

                if (!product.sizeStock) {
                    product.sizeStock = ensureSizeStock(product.sizes, product.stock);
                }

                // Descontar en la variante de color correspondiente
                if (!product.colorVariants || product.colorVariants.length === 0) {
                    product.colorVariants = ensureColorVariants(product.colors || [product.color || 'Negro'], product.sizes, null, product.sizeStock);
                }

                if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
                    const variant = (itemColor && product.colorVariants.find(v => (v.color || '').toLowerCase() === itemColor.toLowerCase())) || product.colorVariants[0];
                    if (variant && variant.sizeStock) {
                        const s = String(itemSize);
                        if (itemSize && itemSize !== 'N/A' && variant.sizeStock[s] !== undefined) {
                            variant.sizeStock[s] = Math.max(0, (variant.sizeStock[s] || 0) - qty);
                        } else {
                            // Si no hay talla específica o no coincide, descontar de las tallas disponibles
                            let rem = qty;
                            for (const sz of Object.keys(variant.sizeStock)) {
                                if (rem <= 0) break;
                                const cur = variant.sizeStock[sz] || 0;
                                const dec = Math.min(cur, rem);
                                variant.sizeStock[sz] = cur - dec;
                                rem -= dec;
                            }
                        }
                        variant.total = calculateTotalStock(variant.sizeStock);
                    }
                }

                // Descontar por talla si existe
                if (product.sizeStock) {
                    const s = String(itemSize);
                    if (itemSize && itemSize !== 'N/A' && product.sizeStock[s] !== undefined) {
                        product.sizeStock[s] = Math.max(0, (product.sizeStock[s] || 0) - qty);
                    } else {
                        let rem = qty;
                        for (const sz of Object.keys(product.sizeStock)) {
                            if (rem <= 0) break;
                            const cur = product.sizeStock[sz] || 0;
                            const dec = Math.min(cur, rem);
                            product.sizeStock[sz] = cur - dec;
                            rem -= dec;
                        }
                    }
                }

                const totalVariants = calculateVariantsTotalStock(product.colorVariants);
                if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
                    product.stock = Math.max(0, totalVariants);
                    if (product.colorVariants[0]?.sizeStock) {
                        product.sizeStock = { ...product.colorVariants[0].sizeStock };
                    }
                } else if (product.sizeStock) {
                    product.stock = Math.max(0, calculateTotalStock(product.sizeStock));
                } else {
                    product.stock = Math.max(0, (product.stock || 0) - qty);
                }

                if (product.stock <= 0) {
                    product.stock = 0;
                    product.status = 'out_of_stock';
                    product.disabled = true;
                    product.active = false;
                    if (Array.isArray(product.colorVariants)) {
                        product.colorVariants.forEach(v => {
                            if (v.sizeStock) {
                                Object.keys(v.sizeStock).forEach(k => { v.sizeStock[k] = 0; });
                            }
                            v.total = 0;
                        });
                    }
                    if (product.sizeStock) {
                        Object.keys(product.sizeStock).forEach(k => { product.sizeStock[k] = 0; });
                    }
                } else {
                    product.status = product.stock > product.minStock ? 'in_stock' : 'low_stock';
                }

                // Registrar movimiento en el Kardex
                try {
                    await stockMovementService.record({
                        productId: product.id,
                        productName: product.name,
                        sku: product.sku,
                        previousStock,
                        newStock: product.stock,
                        delta: -qty,
                        type: 'salida_venta',
                        reason: `Venta mostrador ${newSale.receiptNumber}`,
                        size: itemSize && itemSize !== 'N/A' ? itemSize : null,
                        color: itemColor || null,
                        userName: newSale.cashier || 'Cajero',
                        referenceId: newSale.receiptNumber
                    });
                } catch (kardexErr) {
                    console.warn('Error registrando kardex venta:', kardexErr);
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
        if (isSupabaseConfigured() && supabase) {
            try {
                const validEnums = ['pagomovil', 'zelle', 'punto_venta', 'efectivo_usd', 'efectivo_bs', 'transferencia', 'mixto'];
                const dbPaymentMethod = validEnums.includes(newSale.paymentMethod) ? newSale.paymentMethod : 'pagomovil';

                // 1. Insertar en tabla relacional 'ventas'
                const { error: saleErr } = await supabase.from('ventas').insert({
                    id: newSale.id,
                    numero_recibo: newSale.receiptNumber,
                    cliente_id: customerId === 'publico' ? null : customerId,
                    nombre_cliente: newSale.customer,
                    caja_id: newSale.cajaId || null,
                    turno_id: newSale.shiftId || null,
                    nombre_cajero: newSale.cashier,
                    tasa_bcv: bcvRate,
                    subtotal_usd: newSale.subtotal,
                    descuento_usd: newSale.discount,
                    iva_usd: newSale.tax,
                    igtf_usd: newSale.igtf,
                    costo_delivery_usd: newSale.shippingCost,
                    total_usd: newSale.total,
                    subtotal_bs: newSale.subtotalBs,
                    iva_bs: newSale.taxBs,
                    igtf_bs: newSale.igtfBs,
                    total_bs: newSale.totalBs,
                    metodo_pago_principal: dbPaymentMethod,
                    estado_pago: 'completado',
                    empresa_envio: newSale.shippingCarrier || 'retiro_tienda',
                    tiene_delivery: Boolean(newSale.shippingCarrier === 'delivery_local'),
                    observaciones: `${newSale.paymentMethodLabel}${newSale.paymentReference ? ` - Ref: ${newSale.paymentReference}` : ''}`
                });

                if (saleErr) {
                    console.warn('Aviso guardando en ventas Supabase:', saleErr);
                } else {
                    // 2. Insertar detalles_venta (dispara trigger de stock en Supabase)
                    if (newSale.items && newSale.items.length > 0) {
                        const itemsToInsert = newSale.items.map(item => ({
                            venta_id: newSale.id,
                            producto_id: item.productId || item.id,
                            nombre_producto: item.name,
                            marca: item.brand || 'UrbanStep',
                            talla: item.size || item.talla || '41',
                            color: item.color || 'Multicolor',
                            cantidad: Number(item.quantity) || 1,
                            precio_unitario_usd: Number(item.price) || 0,
                            precio_unitario_bs: Number((item.price * bcvRate).toFixed(2)) || 0,
                            subtotal_usd: Number((item.price * (item.quantity || 1)).toFixed(2)) || 0,
                            subtotal_bs: Number((item.price * (item.quantity || 1) * bcvRate).toFixed(2)) || 0
                        }));

                        await supabase.from('detalles_venta').insert(itemsToInsert);
                    }

                    // 3. Insertar pagos_venta
                    await supabase.from('pagos_venta').insert({
                        venta_id: newSale.id,
                        metodo_pago: dbPaymentMethod,
                        monto_usd: newSale.total,
                        monto_bs: newSale.totalBs,
                        banco_origen: newSale.paymentBank || null,
                        numero_referencia: newSale.paymentReference || null,
                        observaciones: newSale.paymentMethodLabel
                    });
                }

                // 4. Asegurar actualización directa del stock, variantes y estado en tabla 'productos' de Supabase
                const updatedProductsMap = new Map();
                for (const item of newSale.items) {
                    const prodId = item.productId || item.id;
                    const p = db.products.find(prod => prod.id === prodId || prod.name === item.name);
                    if (p) {
                        updatedProductsMap.set(p.id, p);
                    }
                }

                for (const p of updatedProductsMap.values()) {
                    await supabase.from('productos').update({
                        stock: p.stock,
                        tallas_stock: p.sizeStock,
                        variantes_color: p.colorVariants,
                        colores: p.colors || [p.color || 'Negro'],
                        estado: p.stock <= 0 ? 'deshabilitado' : (p.stock > p.minStock ? 'in_stock' : 'low_stock'),
                        actualizado_el: new Date().toISOString()
                    }).eq('id', p.id);
                }
            } catch (err) {
                console.warn('Error durante sincronización Supabase de venta:', err);
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