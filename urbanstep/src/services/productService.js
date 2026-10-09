import { simulateNetworkDelay, db } from './api';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { generateId } from '../utils/generateId';
import { 
    ensureSizeStock, 
    calculateTotalStock, 
    detectSizeCategory,
    ensureColorVariants,
    calculateVariantsTotalStock,
    getColorVariantSizeStock,
    getAvailableStockForItem
} from '../utils/shoeSizes';
import { stockMovementService } from './stockMovementService';

const notifyProductsChanged = () => {
    db.save('products');
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('products_updated', { detail: [...db.products] }));
    }
};

/**
 * Normaliza una fila proveniente de Supabase (tabla 'productos')
 * al formato estándar de la aplicación UrbanStep
 */
const mapSupabaseProduct = (row) => {
    let sizesArray = ['38', '39', '40', '41', '42', '43'];
    if (Array.isArray(row.tallas)) {
        sizesArray = row.tallas;
    } else if (typeof row.tallas === 'string') {
        try {
            sizesArray = JSON.parse(row.tallas);
        } catch {
            sizesArray = row.tallas.split(',').map(s => s.trim());
        }
    }

    const price = Number(row.precio_usd ?? row.price ?? 0);
    const cost = Number(row.costo_usd ?? row.cost ?? 0);
    const stock = Number(row.stock ?? 0);
    const minStock = Number(row.stock_minimo ?? row.minStock ?? 5);

    // Si el producto no tiene existencias o está deshabilitado por inventario agotado
    const isExplicitlyZero = stock <= 0 || row.estado === 'deshabilitado' || row.estado === 'out_of_stock';

    // Colores del modelo
    let modelColors = [];
    const rawColors = row.colores || row.colors;
    if (Array.isArray(rawColors)) {
        modelColors = rawColors;
    } else if (typeof rawColors === 'string') {
        try {
            modelColors = JSON.parse(rawColors);
        } catch {
            modelColors = rawColors.split(',').map(c => c.trim()).filter(Boolean);
        }
    }
    const primaryColor = row.color || 'Multicolor';
    if (modelColors.length === 0) {
        modelColors = [primaryColor];
    }

    // Variantes independientes de color y talla
    let rawVariants = row.variantes_color || row.color_variants || row.colorVariants;
    if (typeof rawVariants === 'string') {
        try {
            rawVariants = JSON.parse(rawVariants);
        } catch {
            rawVariants = null;
        }
    }

    // Desglose de disponibilidad por talla
    let sizeStock = null;
    const rawStock = row.tallas_stock || row.size_stock || row.sizeStock;
    if (rawStock && typeof rawStock === 'object' && Object.keys(rawStock).length > 0) {
        sizeStock = rawStock;
    } else if (typeof rawStock === 'string') {
        try {
            sizeStock = JSON.parse(rawStock);
            if (!sizeStock || Object.keys(sizeStock).length === 0) sizeStock = null;
        } catch {
            sizeStock = null;
        }
    }

    // Si tallas_stock viene vacío pero hay variantes de color, sincronizar con la primera variante
    if (!sizeStock && Array.isArray(rawVariants) && rawVariants[0]?.sizeStock) {
        sizeStock = rawVariants[0].sizeStock;
    }

    const finalSizeStock = isExplicitlyZero
        ? ensureSizeStock(sizesArray, 0)
        : ensureSizeStock(sizesArray, stock, sizeStock);
    const finalSizeCategory = row.categoria_tallas || row.sizeCategory || detectSizeCategory(sizesArray);

    let colorVariants = ensureColorVariants(modelColors, sizesArray, rawVariants, finalSizeStock);
    if (isExplicitlyZero) {
        colorVariants = colorVariants.map(v => ({
            ...v,
            sizeStock: ensureSizeStock(sizesArray, 0),
            total: 0
        }));
    }
    const totalVariantStock = calculateVariantsTotalStock(colorVariants);
    const computedStock = isExplicitlyZero ? 0 : (totalVariantStock > 0 ? totalVariantStock : stock);

    // Garantizar sincronización 100% entre sizeStock principal y la primera variante
    const synchronizedSizeStock = (Array.isArray(colorVariants) && colorVariants[0]?.sizeStock)
        ? { ...colorVariants[0].sizeStock }
        : finalSizeStock;

    const isOutOfStock = computedStock <= 0;
    const isDeshabilitado = row.estado === 'deshabilitado' || Boolean(row.disabled) || isOutOfStock;

    // Proveedor vinculado
    const supplierId = row.proveedor_id || row.supplierId || 'PRV-101';
    const supplierName = row.proveedor_nombre || row.supplierName || 'Distribuidora Deportiva Ávila C.A.';

    return {
        id: row.id,
        sku: row.sku,
        name: row.nombre || row.name,
        brand: row.marca_nombre || row.brand || 'UrbanStep',
        category: row.categoria_nombre || row.category || 'Zapatillas',
        description: row.descripcion || row.description || '',
        price,
        cost,
        salePrice: price,
        purchasePrice: cost,
        stock: computedStock,
        minStock,
        sizes: sizesArray,
        sizeCategory: finalSizeCategory,
        sizeStock: synchronizedSizeStock,
        color: primaryColor,
        colors: modelColors,
        colorVariants: colorVariants,
        colorHex: row.color_hex || '#3b82f6',
        supplierId,
        supplierName,
        imageUrl: row.imagen_url || row.imageUrl || row.image || '',
        image: row.imagen_url || row.imageUrl || row.image || '',
        status: isOutOfStock ? 'out_of_stock' : (computedStock > minStock ? 'in_stock' : 'low_stock'),
        disabled: isDeshabilitado,
        active: !isDeshabilitado && computedStock > 0,
        createdAt: row.creado_el || row.createdAt || new Date().toISOString()
    };
};

export const productService = {
    /**
     * Obtiene todos los productos (desde Supabase si está disponible, con fallback local)
     */
    getAll: async () => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('productos')
                    .select('*')
                    .order('creado_el', { ascending: false });

                if (!error && Array.isArray(data) && data.length > 0) {
                    const mapped = data.map(mapSupabaseProduct);
                    // Actualizar memoria y caché local
                    db.products = mapped;
                    db.save('products');
                    return mapped;
                }
            } catch (err) {
                console.warn('Supabase offline o sin tablas, usando caché local:', err);
            }
        }
        await simulateNetworkDelay(50);
        // Asegurar que cada producto local tenga proveedor y variantes de color
        db.products = db.products.map(p => {
            const supplierId = p.supplierId || 'PRV-101';
            const supplierName = p.supplierName || 'Distribuidora Deportiva Ávila C.A.';
            const colors = Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : [p.color || 'Negro'];
            const sizes = Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ['38', '39', '40', '41', '42'];
            const isZero = (p.stock || 0) <= 0 || p.disabled || p.status === 'out_of_stock';
            const colorVariants = isZero
                ? (p.colorVariants || []).map(v => ({ ...v, sizeStock: ensureSizeStock(sizes, 0), total: 0 }))
                : ensureColorVariants(colors, sizes, p.colorVariants, p.sizeStock);
            const totalStock = isZero ? 0 : (calculateVariantsTotalStock(colorVariants) || p.stock || 0);
            return {
                ...p,
                supplierId,
                supplierName,
                colors,
                colorVariants,
                stock: isZero ? 0 : totalStock,
                disabled: isZero || p.disabled,
                active: !isZero && !p.disabled && totalStock > 0
            };
        });
        return [...db.products];
    },

    getProducts: async () => {
        return productService.getAll();
    },

    /**
     * Obtiene solo productos activos y con inventario positivo
     */
    getActive: async () => {
        const all = await productService.getAll();
        return all.filter(p => !p.disabled && p.stock > 0);
    },

    getById: async (id) => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('productos')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!error && data) {
                    return mapSupabaseProduct(data);
                }
            } catch {
                // Fallback a memoria
            }
        }
        const product = db.products.find(p => p.id === id);
        if (!product) throw new Error("Producto no encontrado");
        return product;
    },

    getProductById: async (id) => {
        return productService.getById(id);
    },

    getColorSizeStock: (product, colorName) => {
        return getColorVariantSizeStock(product, colorName);
    },

    /**
     * Crear un nuevo producto en Supabase y localmente
     */
    create: async (productData) => {
        const sizes = Array.isArray(productData.sizes) && productData.sizes.length > 0 
            ? productData.sizes 
            : ['38', '39', '40', '41', '42', '43'];
        const sizeCategory = productData.sizeCategory || detectSizeCategory(sizes);
        const sizeStock = ensureSizeStock(sizes, parseInt(productData.stock) || 0, productData.sizeStock);
        
        const primaryColor = productData.color || (Array.isArray(productData.colors) && productData.colors[0]) || 'Multicolor';
        const colors = Array.isArray(productData.colors) && productData.colors.length > 0 
            ? productData.colors 
            : [primaryColor];

        // Variantes de color independientes
        const colorVariants = ensureColorVariants(
            colors, 
            sizes, 
            productData.colorVariants, 
            sizeStock
        );
        const totalVariantStock = calculateVariantsTotalStock(colorVariants);
        const safeStock = totalVariantStock > 0 
            ? totalVariantStock 
            : (productData.sizeStock !== undefined ? calculateTotalStock(sizeStock) : Math.max(0, parseInt(productData.stock) || 0));

        const minStock = Math.max(1, parseInt(productData.minStock) || 5);
        const isOutOfStock = safeStock <= 0;
        const generatedId = productData.id || generateId('PRD');
        const generatedSku = productData.sku || `US-${(productData.brand || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const supplierId = productData.supplierId || 'PRV-101';
        const supplierName = productData.supplierName || 'Distribuidora Deportiva Ávila C.A.';

        const newProduct = {
            id: generatedId,
            sku: generatedSku,
            name: productData.name?.trim(),
            brand: productData.brand || 'UrbanStep',
            category: productData.category || 'Zapatillas',
            price: Math.max(0, Number(productData.price) || 0),
            cost: Math.max(0, Number(productData.cost) || 0),
            salePrice: Math.max(0, Number(productData.price) || 0),
            purchasePrice: Math.max(0, Number(productData.cost) || 0),
            stock: safeStock,
            minStock: minStock,
            sizes,
            sizeCategory,
            sizeStock,
            status: isOutOfStock ? 'out_of_stock' : (safeStock > minStock ? 'in_stock' : 'low_stock'),
            disabled: isOutOfStock || Boolean(productData.disabled),
            active: !isOutOfStock && !Boolean(productData.disabled),
            color: primaryColor,
            colors: colors,
            colorVariants: colorVariants,
            supplierId,
            supplierName,
            colorHex: productData.colorHex || '#3b82f6',
            description: productData.description || '',
            imageUrl: productData.imageUrl || productData.image || '',
            image: productData.imageUrl || productData.image || '',
            createdAt: new Date().toISOString()
        };

        // Insertar en Supabase si está disponible
        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('productos').insert({
                    id: newProduct.id,
                    sku: newProduct.sku,
                    nombre: newProduct.name,
                    marca_nombre: newProduct.brand,
                    categoria_nombre: newProduct.category,
                    precio_usd: newProduct.price,
                    costo_usd: newProduct.cost,
                    stock: newProduct.stock,
                    stock_minimo: newProduct.minStock,
                    tallas: newProduct.sizes,
                    tallas_stock: newProduct.sizeStock,
                    colores: newProduct.colors,
                    categoria_tallas: newProduct.sizeCategory,
                    color: newProduct.color,
                    color_hex: newProduct.colorHex,
                    proveedor_id: newProduct.supplierId,
                    proveedor_nombre: newProduct.supplierName,
                    variantes_color: newProduct.colorVariants,
                    imagen_url: newProduct.imageUrl,
                    descripcion: newProduct.description,
                    estado: newProduct.disabled ? 'deshabilitado' : (newProduct.stock > 0 ? 'in_stock' : 'out_of_stock')
                });
            } catch (supErr) {
                console.warn('Error al guardar producto en Supabase:', supErr);
            }
        }

        // Si inicia con stock mayor a 0, registrar movimiento inicial
        if (safeStock > 0) {
            try {
                await stockMovementService.record({
                    productId: newProduct.id,
                    productName: newProduct.name,
                    sku: newProduct.sku,
                    previousStock: 0,
                    newStock: safeStock,
                    delta: safeStock,
                    type: 'edicion_producto',
                    reason: 'Carga inicial al crear producto con proveedor ' + supplierName,
                    userName: productData.userName || 'Administrador'
                });
            } catch (kErr) {
                console.warn('Aviso kardex create:', kErr);
            }
        }

        db.products.unshift(newProduct);
        notifyProductsChanged();
        return newProduct;
    },

    /**
     * Actualiza un producto existente en Supabase y localmente
     */
    update: async (id, productData) => {
        const index = db.products.findIndex(p => p.id === id);
        if (index === -1) throw new Error("Producto no encontrado");

        const current = db.products[index];
        const previousStock = current.stock;
        const sizes = Array.isArray(productData.sizes) ? productData.sizes : current.sizes;
        const sizeCategory = productData.sizeCategory || current.sizeCategory || detectSizeCategory(sizes);
        const primaryColor = productData.color || current.color || 'Multicolor';
        const colors = Array.isArray(productData.colors) && productData.colors.length > 0
            ? productData.colors
            : (current.colors || [primaryColor]);

        let sizeStock = current.sizeStock;
        if (productData.sizeStock !== undefined) {
            sizeStock = ensureSizeStock(sizes, 0, productData.sizeStock);
        }

        const colorVariants = ensureColorVariants(
            colors, 
            sizes, 
            productData.colorVariants !== undefined ? productData.colorVariants : current.colorVariants, 
            sizeStock
        );
        const totalVariantStock = calculateVariantsTotalStock(colorVariants);

        let nextStock = current.stock;
        if (totalVariantStock > 0) {
            nextStock = totalVariantStock;
        } else if (productData.sizeStock !== undefined) {
            nextStock = calculateTotalStock(sizeStock);
        } else if (productData.stock !== undefined) {
            nextStock = Math.max(0, parseInt(productData.stock) || 0);
            sizeStock = ensureSizeStock(sizes, nextStock, current.sizeStock);
        }

        const nextMinStock = productData.minStock !== undefined ? Math.max(1, parseInt(productData.minStock) || 5) : current.minStock;
        const isOutOfStock = nextStock <= 0;
        const supplierId = productData.supplierId || current.supplierId || 'PRV-101';
        const supplierName = productData.supplierName || current.supplierName || 'Distribuidora Deportiva Ávila C.A.';

        const updated = {
            ...current,
            ...productData,
            price: Math.max(0, Number(productData.price ?? current.price)),
            cost: Math.max(0, Number(productData.cost ?? current.cost)),
            salePrice: Math.max(0, Number(productData.price ?? current.price)),
            purchasePrice: Math.max(0, Number(productData.cost ?? current.cost)),
            stock: nextStock,
            minStock: nextMinStock,
            sizes,
            sizeCategory,
            sizeStock,
            color: primaryColor,
            colors: colors,
            colorVariants: colorVariants,
            supplierId,
            supplierName,
            colorHex: productData.colorHex || current.colorHex || '#3b82f6',
            disabled: isOutOfStock ? true : (productData.disabled !== undefined ? Boolean(productData.disabled) : current.disabled),
            status: isOutOfStock ? 'out_of_stock' : (nextStock > nextMinStock ? 'in_stock' : 'low_stock'),
            imageUrl: productData.imageUrl !== undefined ? productData.imageUrl : current.imageUrl,
            image: productData.imageUrl !== undefined ? productData.imageUrl : current.image,
            updatedAt: new Date().toISOString()
        };

        updated.active = !updated.disabled && updated.stock > 0;

        // Registrar movimiento en el Kardex si varió la cantidad de stock
        if (nextStock !== previousStock) {
            try {
                await stockMovementService.record({
                    productId: current.id,
                    productName: updated.name,
                    sku: updated.sku,
                    previousStock,
                    newStock: nextStock,
                    delta: nextStock - previousStock,
                    type: 'edicion_producto',
                    reason: productData.reason || 'Modificación de cantidad en edición de producto',
                    userName: productData.userName || 'Administrador'
                });
            } catch (kErr) {
                console.warn('Aviso kardex update:', kErr);
            }
        }

        // Actualizar en Supabase si está disponible
        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('productos').update({
                    nombre: updated.name,
                    sku: updated.sku,
                    marca_nombre: updated.brand,
                    categoria_nombre: updated.category,
                    precio_usd: updated.price,
                    costo_usd: updated.cost,
                    stock: updated.stock,
                    stock_minimo: updated.minStock,
                    tallas: updated.sizes,
                    tallas_stock: updated.sizeStock,
                    colores: updated.colors,
                    variantes_color: updated.colorVariants,
                    categoria_tallas: updated.sizeCategory,
                    proveedor_id: updated.supplierId,
                    proveedor_nombre: updated.supplierName,
                    color: updated.color,
                    color_hex: updated.colorHex,
                    imagen_url: updated.imageUrl,
                    descripcion: updated.description,
                    estado: updated.disabled ? 'deshabilitado' : (updated.stock > 0 ? 'in_stock' : 'out_of_stock'),
                    actualizado_el: new Date().toISOString()
                }).eq('id', id);
            } catch (supErr) {
                console.warn('Error al actualizar en Supabase:', supErr);
            }
        }

        db.products[index] = updated;
        notifyProductsChanged();
        return updated;
    },

    /**
     * Alternar estado habilitado / deshabilitado
     */
    toggleStatus: async (id) => {
        const product = db.products.find(p => p.id === id);
        if (!product) throw new Error("Producto no encontrado");

        if (product.disabled && product.stock <= 0) {
            throw new Error("No se puede habilitar un producto con stock en 0. Primero añade unidades en inventario.");
        }

        product.disabled = !product.disabled;
        product.active = !product.disabled && product.stock > 0;
        product.status = product.stock <= 0 ? 'out_of_stock' : (product.stock > product.minStock ? 'in_stock' : 'low_stock');
        product.updatedAt = new Date().toISOString();

        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('productos').update({
                    estado: product.disabled ? 'deshabilitado' : (product.stock > 0 ? 'in_stock' : 'out_of_stock'),
                    actualizado_el: new Date().toISOString()
                }).eq('id', id);
            } catch (e) {
                console.warn('Error toggle Supabase:', e);
            }
        }

        notifyProductsChanged();
        return product;
    },

    /**
     * Eliminar producto protegiendo contra pérdida de historial contable
     */
    delete: async (id) => {
        const index = db.products.findIndex(p => p.id === id);
        if (index === -1) throw new Error("Producto no encontrado");

        const hasSales = db.sales.some(s => 
            s.items && s.items.some(item => item.productId === id || item.id === id)
        );

        if (hasSales) {
            throw new Error(
                `No es posible eliminar "${db.products[index].name}" porque posee ventas registradas. ` +
                `Por integridad fiscal SENIAT, debes deshabilitarlo usando el botón correspondiente.`
            );
        }

        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('productos').delete().eq('id', id);
            } catch (e) {
                console.warn('Error delete Supabase:', e);
            }
        }

        db.products.splice(index, 1);
        notifyProductsChanged();
        return true;
    },

    /**
     * Actualizar stock individual (e.g. tras venta, compra o ajuste manual)
     * Soporta actualizar una talla específica o el total distribuido y registra Kardex
     */
    updateStock: async (id, newStock, specificSize = null, reason = 'Ajuste manual de inventario', userName = 'Administrador', specificColor = null) => {
        const product = db.products.find(p => p.id === id);
        if (!product) throw new Error("Producto no encontrado");

        const previousStock = product.stock;

        // Asegurar variantes de color
        if (!product.colorVariants || product.colorVariants.length === 0) {
            product.colorVariants = ensureColorVariants(product.colors || [product.color || 'Negro'], product.sizes, null, product.sizeStock);
        }

        if (specificSize) {
            const s = String(specificSize);
            const targetColor = specificColor || product.color || 'Negro';

            // Actualizar en la variante de color correspondiente
            const variant = product.colorVariants.find(v => (v.color || '').toLowerCase() === targetColor.toLowerCase()) || product.colorVariants[0];
            if (variant) {
                if (!variant.sizeStock) variant.sizeStock = ensureSizeStock(product.sizes, 0);
                variant.sizeStock[s] = Math.max(0, parseInt(newStock) || 0);
                variant.total = calculateTotalStock(variant.sizeStock);
            }

            if (!product.sizeStock) {
                product.sizeStock = ensureSizeStock(product.sizes, product.stock);
            }
            product.sizeStock[s] = Math.max(0, parseInt(newStock) || 0);
            product.stock = calculateVariantsTotalStock(product.colorVariants) || calculateTotalStock(product.sizeStock);
        } else {
            const safeStock = Math.max(0, parseInt(newStock) || 0);
            product.stock = safeStock;
            product.sizeStock = ensureSizeStock(product.sizes, safeStock, product.sizeStock);
            product.colorVariants = ensureColorVariants(product.colors, product.sizes, null, product.sizeStock);
        }
        
        const safeStock = product.stock;
        if (safeStock <= 0) {
            product.status = 'out_of_stock';
            product.disabled = true;
            product.active = false;
        } else {
            product.status = safeStock > product.minStock ? 'in_stock' : 'low_stock';
            if (product.disabled) {
                product.disabled = false;
            }
            product.active = !product.disabled;
        }

        product.updatedAt = new Date().toISOString();

        // Registrar en Kardex
        if (safeStock !== previousStock) {
            try {
                await stockMovementService.record({
                    productId: product.id,
                    productName: product.name,
                    sku: product.sku,
                    previousStock,
                    newStock: safeStock,
                    delta: safeStock - previousStock,
                    type: 'ajuste_manual',
                    reason: reason || 'Ajuste manual de existencias',
                    size: specificSize,
                    color: specificColor || product.color,
                    userName: userName || 'Administrador'
                });
            } catch (kErr) {
                console.warn('Aviso kardex updateStock:', kErr);
            }
        }

        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('productos').update({
                    stock: safeStock,
                    variantes_color: product.colorVariants,
                    tallas_stock: product.sizeStock,
                    colores: product.colors || [product.color || 'Negro'],
                    estado: product.disabled ? 'deshabilitado' : (safeStock > 0 ? 'in_stock' : 'out_of_stock'),
                    actualizado_el: new Date().toISOString()
                }).eq('id', id);
            } catch (e) {
                console.warn('Error updateStock Supabase:', e);
            }
        }

        notifyProductsChanged();
        return product;
    },

    /**
     * Calcula la disponibilidad exacta de inventario para un producto, talla y color
     */
    getAvailableStock: (productOrId, size = 'N/A', color = null) => {
        const product = typeof productOrId === 'string' 
            ? db.products.find(p => p.id === productOrId)
            : productOrId;
        return getAvailableStockForItem(product, size, color);
    }
};

export default productService;