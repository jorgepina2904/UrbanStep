import { db, simulateNetworkDelay } from './api';
import { generateId } from '../utils/generateId';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { bcvService } from './bcvService';
import { stockMovementService } from './stockMovementService';
import { ensureSizeStock, calculateTotalStock, ensureColorVariants, calculateVariantsTotalStock } from '../utils/shoeSizes';

export const purchaseService = {
    /**
     * Obtener todas las compras registradas
     */
    getAll: async () => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('compras')
                    .select('*')
                    .order('creado_el', { ascending: false });

                if (!error && Array.isArray(data) && data.length > 0) {
                    const mapped = data.map(c => ({
                        id: c.id,
                        invoiceNumber: c.numero_factura,
                        controlNumber: c.numero_control,
                        supplierId: c.proveedor_id,
                        supplierName: c.proveedor_nombre || 'Proveedor',
                        date: c.fecha_emision || c.creado_el,
                        status: c.estado || 'recibido',
                        paymentMethod: c.metodo_pago,
                        paymentBank: c.banco_pago,
                        bcvRate: Number(c.tasa_bcv),
                        subtotalUsd: Number(c.subtotal_usd),
                        taxUsd: Number(c.iva_usd),
                        totalUsd: Number(c.total_usd),
                        subtotalBs: Number(c.subtotal_bs),
                        taxBs: Number(c.iva_bs),
                        totalBs: Number(c.total_bs),
                        receivedBy: c.recibido_por,
                        notes: c.observaciones,
                        itemsCount: 0,
                        items: []
                    }));
                    db.purchases = mapped;
                    db.save('purchases');
                    return mapped;
                }
            } catch (err) {
                console.warn('Aviso leyendo compras Supabase:', err);
            }
        }
        await simulateNetworkDelay(100);
        return [...db.purchases];
    },

    /**
     * Obtener lista de proveedores
     */
    getSuppliers: async () => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('proveedores')
                    .select('*')
                    .order('razon_social', { ascending: true });

                if (!error && Array.isArray(data) && data.length > 0) {
                    const mapped = data.map(p => ({
                        id: p.id,
                        rif: p.rif,
                        name: p.razon_social,
                        companyName: p.razon_social,
                        commercialName: p.nombre_comercial || p.razon_social,
                        contactName: p.contacto_nombre || '',
                        phone: p.telefono || '',
                        email: p.correo || '',
                        address: p.direccion || '',
                        city: p.ciudad || 'Caracas',
                        state: p.estado || 'Distrito Capital',
                        creditDays: p.dias_credito_pactados || 0,
                        active: p.activo !== false,
                        purchasesCount: db.purchases.filter(pur => pur.supplierId === p.id).length
                    }));
                    db.suppliers = mapped;
                    db.save('suppliers');
                    return mapped;
                }
            } catch (err) {
                console.warn('Aviso leyendo proveedores Supabase:', err);
            }
        }
        await simulateNetworkDelay(100);
        return [...db.suppliers];
    },

    /**
     * Crear nuevo proveedor
     */
    createSupplier: async (supplierData) => {
        const id = supplierData.id || generateId('PRV');
        const newSupplier = {
            id,
            rif: (supplierData.rif || 'J-00000000-0').trim(),
            name: supplierData.name?.trim() || supplierData.companyName?.trim() || 'Nuevo Proveedor',
            companyName: supplierData.companyName?.trim() || supplierData.name?.trim() || 'Nuevo Proveedor',
            commercialName: supplierData.commercialName?.trim() || supplierData.name?.trim() || '',
            contactName: supplierData.contactName?.trim() || '',
            phone: supplierData.phone?.trim() || '',
            email: supplierData.email?.trim() || '',
            address: supplierData.address?.trim() || '',
            city: supplierData.city || 'Caracas',
            state: supplierData.state || 'Distrito Capital',
            creditDays: parseInt(supplierData.creditDays) || 0,
            active: true,
            purchasesCount: 0,
            createdAt: new Date().toISOString()
        };

        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('proveedores').insert({
                    id: newSupplier.id,
                    rif: newSupplier.rif,
                    razon_social: newSupplier.companyName,
                    nombre_comercial: newSupplier.commercialName,
                    contacto_nombre: newSupplier.contactName,
                    telefono: newSupplier.phone,
                    correo: newSupplier.email,
                    direccion: newSupplier.address,
                    ciudad: newSupplier.city,
                    estado: newSupplier.state,
                    dias_credito_pactados: newSupplier.creditDays,
                    activo: true
                });
            } catch (supErr) {
                console.warn('Aviso guardar proveedor Supabase:', supErr);
            }
        }

        db.suppliers.unshift(newSupplier);
        db.save('suppliers');

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('suppliers_updated', { detail: [...db.suppliers] }));
        }

        return newSupplier;
    },

    /**
     * Actualizar proveedor
     */
    updateSupplier: async (id, supplierData) => {
        const index = db.suppliers.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Proveedor no encontrado');

        const current = db.suppliers[index];
        const updated = {
            ...current,
            ...supplierData,
            name: supplierData.name || supplierData.companyName || current.name,
            companyName: supplierData.companyName || supplierData.name || current.companyName,
        };

        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('proveedores').update({
                    rif: updated.rif,
                    razon_social: updated.companyName,
                    nombre_comercial: updated.commercialName,
                    contacto_nombre: updated.contactName,
                    telefono: updated.phone,
                    correo: updated.email,
                    direccion: updated.address,
                    ciudad: updated.city,
                    estado: updated.state,
                    dias_credito_pactados: updated.creditDays,
                    actualizado_el: new Date().toISOString()
                }).eq('id', id);
            } catch (supErr) {
                console.warn('Aviso actualizar proveedor Supabase:', supErr);
            }
        }

        db.suppliers[index] = updated;
        db.save('suppliers');

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('suppliers_updated', { detail: [...db.suppliers] }));
        }

        return updated;
    },

    /**
     * Registrar una nueva orden de compra o recepción de mercancía
     */
    create: async (purchaseData) => {
        await simulateNetworkDelay(200);

        const bcvRate = Number(purchaseData.bcvRate) || bcvService.getRate().rate;
        const subtotalUsd = Number(purchaseData.subtotalUsd) || 0;
        const taxUsd = Number(purchaseData.taxUsd) || 0;
        const totalUsd = Number(purchaseData.totalUsd) || (subtotalUsd + taxUsd);

        const toBs = (v) => Number((v * bcvRate).toFixed(2));

        const newPurchase = {
            id: generateId('CMP'),
            invoiceNumber: purchaseData.invoiceNumber || `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            controlNumber: purchaseData.controlNumber || `00-${Math.floor(10000 + Math.random() * 90000)}`,
            supplierId: purchaseData.supplierId || 'PRV-101',
            supplierName: purchaseData.supplierName || 'Distribuidora Ávila C.A.',
            supplierRif: purchaseData.supplierRif || 'J-31245678-9',
            date: purchaseData.date || new Date().toISOString(),
            status: purchaseData.status || 'recibido',
            paymentMethod: purchaseData.paymentMethod || 'transferencia',
            paymentBank: purchaseData.paymentBank || '0134 - Banesco',
            bcvRate,
            subtotalUsd,
            taxUsd,
            totalUsd,
            subtotalBs: toBs(subtotalUsd),
            taxBs: toBs(taxUsd),
            totalBs: toBs(totalUsd),
            itemsCount: (purchaseData.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0),
            items: purchaseData.items || [],
            receivedBy: purchaseData.receivedBy || 'Almacén Central',
            notes: purchaseData.notes || '',
        };

        db.purchases.unshift(newPurchase);

        // Si la compra fue recibida, incrementar inventario de los productos y registrar Kardex
        if (newPurchase.status === 'recibido' || newPurchase.status === 'recibida') {
            for (const item of newPurchase.items) {
                const prodId = item.productId || item.id;
                const product = db.products.find(p => p.id === prodId || p.name === item.name);
                if (product) {
                    const previousStock = product.stock;
                    const qty = Math.max(1, parseInt(item.quantity) || 1);
                    const itemSize = item.size || item.talla;

                    // Vincular proveedor al producto si aún no está asignado o es genérico
                    if (!product.supplierId || product.supplierId === 'PRV-101') {
                        product.supplierId = newPurchase.supplierId;
                        product.supplierName = newPurchase.supplierName;
                    }

                    // Asegurar variantes de color
                    if (!product.colorVariants || product.colorVariants.length === 0) {
                        product.colorVariants = ensureColorVariants(
                            product.colors || [product.color || 'Negro'],
                            product.sizes,
                            null,
                            product.sizeStock
                        );
                    }

                    const targetColor = item.color || product.color || (product.colors && product.colors[0]) || 'Negro';
                    let variant = product.colorVariants.find(v => (v.color || '').toLowerCase() === targetColor.toLowerCase());
                    if (!variant) {
                        variant = {
                            color: targetColor,
                            sizes: [...(product.sizes || ['38', '39', '40', '41', '42', '43'])],
                            sizeStock: ensureSizeStock(product.sizes, 0),
                            total: 0
                        };
                        product.colorVariants.push(variant);
                        if (!product.colors) product.colors = [];
                        if (!product.colors.includes(targetColor)) product.colors.push(targetColor);
                    }

                    if (itemSize) {
                        const s = String(itemSize);
                        if (!variant.sizeStock) variant.sizeStock = ensureSizeStock(product.sizes, 0);
                        variant.sizeStock[s] = (variant.sizeStock[s] || 0) + qty;
                        variant.total = calculateTotalStock(variant.sizeStock);

                        if (!product.sizeStock) {
                            product.sizeStock = ensureSizeStock(product.sizes, product.stock);
                        }
                        product.sizeStock[s] = (product.sizeStock[s] || 0) + qty;
                    }

                    const totalVariantStock = calculateVariantsTotalStock(product.colorVariants);
                    if (totalVariantStock > 0) {
                        product.stock = totalVariantStock;
                    } else if (itemSize && product.sizeStock) {
                        product.stock = calculateTotalStock(product.sizeStock);
                    } else {
                        product.stock += qty;
                    }

                    if (item.unitCostUsd) {
                        product.cost = Number(item.unitCostUsd);
                        product.purchasePrice = Number(item.unitCostUsd);
                    }

                    product.status = product.stock > product.minStock ? 'in_stock' : product.stock > 0 ? 'low_stock' : 'out_of_stock';
                    product.disabled = false;
                    product.active = true;

                    // Registrar en Kardex con detalle de color y talla
                    try {
                        await stockMovementService.record({
                            productId: product.id,
                            productName: product.name,
                            sku: product.sku,
                            previousStock,
                            newStock: product.stock,
                            delta: qty,
                            type: 'recepcion_compra',
                            reason: `Recepción de compra ${newPurchase.invoiceNumber} (${newPurchase.supplierName})${targetColor ? ` • Color: ${targetColor}` : ''}`,
                            size: itemSize || null,
                            userName: newPurchase.receivedBy || 'Almacén Central',
                            referenceId: newPurchase.invoiceNumber
                        });
                    } catch (kErr) {
                        console.warn('Aviso kardex recepcion compra:', kErr);
                    }

                    // Sincronizar stock en Supabase
                    if (isSupabaseConfigured() && supabase) {
                        try {
                            await supabase.from('productos').update({
                                stock: product.stock,
                                costo_usd: product.cost,
                                tallas_stock: product.sizeStock,
                                variantes_color: product.colorVariants,
                                colores: product.colors || [product.color || 'Negro'],
                                estado: product.stock > 0 ? 'in_stock' : 'out_of_stock',
                                actualizado_el: new Date().toISOString()
                            }).eq('id', product.id);
                        } catch (supErr) {
                            console.warn('Aviso update stock Supabase compra:', supErr);
                        }
                    }
                }
            }
        }

        db.save('purchases');
        db.save('products');

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('purchases_updated', { detail: [...db.purchases] }));
            window.dispatchEvent(new CustomEvent('products_updated', { detail: [...db.products] }));
        }

        // Sincronizar compra en Supabase si está disponible
        if (isSupabaseConfigured() && supabase) {
            try {
                const { error: compErr } = await supabase.from('compras').insert({
                    id: newPurchase.id,
                    numero_factura: newPurchase.invoiceNumber,
                    numero_control: newPurchase.controlNumber,
                    proveedor_id: newPurchase.supplierId,
                    fecha_emision: new Date().toISOString().split('T')[0],
                    tasa_bcv: bcvRate,
                    subtotal_usd: newPurchase.subtotalUsd,
                    iva_usd: newPurchase.taxUsd,
                    total_usd: newPurchase.totalUsd,
                    subtotal_bs: newPurchase.subtotalBs,
                    iva_bs: newPurchase.taxBs,
                    total_bs: newPurchase.totalBs,
                    metodo_pago: 'transferencia',
                    estado: 'recibido',
                    recibido_por: newPurchase.receivedBy,
                    observaciones: newPurchase.notes
                });

                if (!compErr && newPurchase.items && newPurchase.items.length > 0) {
                    const itemsToInsert = newPurchase.items.map(item => ({
                        compra_id: newPurchase.id,
                        producto_id: item.productId || item.id,
                        nombre_producto: item.name,
                        talla: item.size || '41',
                        color: item.color || 'Multicolor',
                        cantidad: Number(item.quantity) || 1,
                        costo_unitario_usd: Number(item.unitCostUsd || item.cost || 0),
                        costo_unitario_bs: Number(((item.unitCostUsd || item.cost || 0) * bcvRate).toFixed(2)),
                        subtotal_usd: Number(((item.unitCostUsd || item.cost || 0) * (item.quantity || 1)).toFixed(2)),
                        subtotal_bs: Number(((item.unitCostUsd || item.cost || 0) * (item.quantity || 1) * bcvRate).toFixed(2))
                    }));
                    await supabase.from('detalles_compra').insert(itemsToInsert);
                }
            } catch (err) {
                console.warn('Aviso sincronización compra Supabase:', err);
            }
        }

        return newPurchase;
    },

    /**
     * Resumen de compras y reposición
     */
    getSummary: async () => {
        await simulateNetworkDelay(100);
        const totalPurchasedUsd = db.purchases.reduce((sum, p) => sum + (p.totalUsd || 0), 0);
        const totalItemsCount = db.purchases.reduce((sum, p) => sum + (p.itemsCount || 0), 0);
        const suppliersCount = db.suppliers.length;

        return {
            totalPurchasedUsd,
            totalPurchasesCount: db.purchases.length,
            totalItemsCount,
            suppliersCount,
            purchases: [...db.purchases]
        };
    }
};

export default purchaseService;
