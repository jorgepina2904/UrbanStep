import { simulateNetworkDelay, db } from './api';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { generateId } from '../utils/generateId';
import { ensureSizeStock, calculateTotalStock, detectSizeCategory } from '../utils/shoeSizes';

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
    const isOutOfStock = stock <= 0;
    const isDeshabilitado = row.estado === 'deshabilitado' || Boolean(row.disabled) || isOutOfStock;

    // Desglose de disponibilidad por talla
    let sizeStock = null;
    const rawStock = row.tallas_stock || row.size_stock || row.sizeStock;
    if (rawStock && typeof rawStock === 'object') {
        sizeStock = rawStock;
    } else if (typeof rawStock === 'string') {
        try {
            sizeStock = JSON.parse(rawStock);
        } catch {
            sizeStock = null;
        }
    }
    const finalSizeStock = ensureSizeStock(sizesArray, stock, sizeStock);
    const finalSizeCategory = row.categoria_tallas || row.sizeCategory || detectSizeCategory(sizesArray);

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
        stock,
        minStock,
        sizes: sizesArray,
        sizeCategory: finalSizeCategory,
        sizeStock: finalSizeStock,
        color: row.color || 'Multicolor',
        colorHex: row.color_hex || '#3b82f6',
        imageUrl: row.imagen_url || row.imageUrl || row.image || '',
        image: row.imagen_url || row.imageUrl || row.image || '',
        status: isOutOfStock ? 'out_of_stock' : (stock > minStock ? 'in_stock' : 'low_stock'),
        disabled: isDeshabilitado,
        active: !isDeshabilitado,
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

    /**
     * Crear un nuevo producto en Supabase y localmente
     */
    create: async (productData) => {
        const sizes = Array.isArray(productData.sizes) && productData.sizes.length > 0 
            ? productData.sizes 
            : ['38', '39', '40', '41', '42', '43'];
        const sizeCategory = productData.sizeCategory || detectSizeCategory(sizes);
        const sizeStock = ensureSizeStock(sizes, parseInt(productData.stock) || 0, productData.sizeStock);
        const safeStock = productData.sizeStock !== undefined 
            ? calculateTotalStock(sizeStock) 
            : Math.max(0, parseInt(productData.stock) || 0);
        const minStock = Math.max(1, parseInt(productData.minStock) || 5);
        const isOutOfStock = safeStock <= 0;
        const generatedId = productData.id || generateId('PRD');
        const generatedSku = productData.sku || `US-${(productData.brand || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

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
            color: productData.color || 'Multicolor',
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
                    color: newProduct.color,
                    color_hex: newProduct.colorHex,
                    imagen_url: newProduct.imageUrl,
                    descripcion: newProduct.description,
                    estado: newProduct.disabled ? 'deshabilitado' : (newProduct.stock > 0 ? 'in_stock' : 'out_of_stock')
                });
            } catch (supErr) {
                console.warn('Error al guardar producto en Supabase:', supErr);
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
        const sizes = Array.isArray(productData.sizes) ? productData.sizes : current.sizes;
        const sizeCategory = productData.sizeCategory || current.sizeCategory || detectSizeCategory(sizes);
        let sizeStock = current.sizeStock;
        let nextStock = current.stock;

        if (productData.sizeStock !== undefined) {
            sizeStock = ensureSizeStock(sizes, 0, productData.sizeStock);
            nextStock = calculateTotalStock(sizeStock);
        } else if (productData.stock !== undefined) {
            nextStock = Math.max(0, parseInt(productData.stock) || 0);
            sizeStock = ensureSizeStock(sizes, nextStock, current.sizeStock);
        }

        const nextMinStock = productData.minStock !== undefined ? Math.max(1, parseInt(productData.minStock) || 5) : current.minStock;
        const isOutOfStock = nextStock <= 0;

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
            disabled: isOutOfStock ? true : (productData.disabled !== undefined ? Boolean(productData.disabled) : current.disabled),
            status: isOutOfStock ? 'out_of_stock' : (nextStock > nextMinStock ? 'in_stock' : 'low_stock'),
            imageUrl: productData.imageUrl !== undefined ? productData.imageUrl : current.imageUrl,
            image: productData.imageUrl !== undefined ? productData.imageUrl : current.image,
            updatedAt: new Date().toISOString()
        };

        updated.active = !updated.disabled && updated.stock > 0;

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
     * Soporta actualizar una talla específica o el total distribuido
     */
    updateStock: async (id, newStock, specificSize = null) => {
        const product = db.products.find(p => p.id === id);
        if (!product) throw new Error("Producto no encontrado");

        if (specificSize) {
            const s = String(specificSize);
            if (!product.sizeStock) {
                product.sizeStock = ensureSizeStock(product.sizes, product.stock);
            }
            product.sizeStock[s] = Math.max(0, parseInt(newStock) || 0);
            product.stock = calculateTotalStock(product.sizeStock);
        } else {
            const safeStock = Math.max(0, parseInt(newStock) || 0);
            product.stock = safeStock;
            product.sizeStock = ensureSizeStock(product.sizes, safeStock, product.sizeStock);
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

        if (isSupabaseConfigured() && supabase) {
            try {
                await supabase.from('productos').update({
                    stock: safeStock,
                    estado: product.disabled ? 'deshabilitado' : (safeStock > 0 ? 'in_stock' : 'out_of_stock'),
                    actualizado_el: new Date().toISOString()
                }).eq('id', id);
            } catch (e) {
                console.warn('Error updateStock Supabase:', e);
            }
        }

        notifyProductsChanged();
        return product;
    }
};

export default productService;