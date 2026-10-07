import { simulateNetworkDelay, db } from './api';
import { generateId } from '../utils/generateId';

const notifyProductsChanged = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('products_updated', { detail: [...db.products] }));
    }
};

export const productService = {
    getAll: async () => {
        await simulateNetworkDelay(100);
        return [...db.products];
    },

    getProducts: async () => {
        await simulateNetworkDelay(100);
        return [...db.products];
    },

    getActive: async () => {
        await simulateNetworkDelay(100);
        return db.products.filter(p => !p.disabled && p.stock > 0);
    },

    getById: async (id) => {
        await simulateNetworkDelay(80);
        const product = db.products.find(p => p.id === id);
        if (!product) throw new Error("Producto no encontrado");
        return product;
    },

    getProductById: async (id) => {
        return productService.getById(id);
    },

    create: async (productData) => {
        await simulateNetworkDelay(250);
        const safeStock = Math.max(0, parseInt(productData.stock) || 0);
        const minStock = Math.max(1, parseInt(productData.minStock) || 5);
        const isOutOfStock = safeStock <= 0;

        const newProduct = {
            id: generateId('PRD'),
            sku: productData.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            name: productData.name?.trim(),
            brand: productData.brand || 'UrbanStep',
            category: productData.category || 'General',
            price: Math.max(0, Number(productData.price) || 0),
            cost: Math.max(0, Number(productData.cost) || 0),
            stock: safeStock,
            minStock: minStock,
            sizes: productData.sizes || ['38', '39', '40', '41', '42'],
            status: isOutOfStock ? 'out_of_stock' : (safeStock > minStock ? 'in_stock' : 'low_stock'),
            // Si el stock llega a cero, se deshabilita automáticamente
            disabled: isOutOfStock || Boolean(productData.disabled),
            active: !isOutOfStock && !Boolean(productData.disabled),
            color: productData.color || 'Multicolor',
            description: productData.description || '',
            imageUrl: productData.imageUrl || productData.image || '',
            image: productData.imageUrl || productData.image || '',
            createdAt: new Date().toISOString()
        };

        db.products.unshift(newProduct);
        notifyProductsChanged();
        return newProduct;
    },

    update: async (id, productData) => {
        await simulateNetworkDelay(250);
        const index = db.products.findIndex(p => p.id === id);
        if (index === -1) throw new Error("Producto no encontrado");

        const current = db.products[index];
        const nextStock = productData.stock !== undefined ? Math.max(0, parseInt(productData.stock) || 0) : current.stock;
        const nextMinStock = productData.minStock !== undefined ? Math.max(1, parseInt(productData.minStock) || 5) : current.minStock;
        const isOutOfStock = nextStock <= 0;

        const updated = {
            ...current,
            ...productData,
            price: Math.max(0, Number(productData.price ?? current.price)),
            cost: Math.max(0, Number(productData.cost ?? current.cost)),
            stock: nextStock,
            minStock: nextMinStock,
            // Deshabilitar automáticamente si el stock queda en 0
            disabled: isOutOfStock ? true : (productData.disabled !== undefined ? Boolean(productData.disabled) : current.disabled),
            status: isOutOfStock ? 'out_of_stock' : (nextStock > nextMinStock ? 'in_stock' : 'low_stock'),
            imageUrl: productData.imageUrl !== undefined ? productData.imageUrl : current.imageUrl,
            image: productData.imageUrl !== undefined ? productData.imageUrl : current.image,
            updatedAt: new Date().toISOString()
        };

        updated.active = !updated.disabled && updated.stock > 0;
        db.products[index] = updated;
        notifyProductsChanged();
        return updated;
    },

    /**
     * Alternar estado habilitado / deshabilitado
     */
    toggleStatus: async (id) => {
        await simulateNetworkDelay(150);
        const product = db.products.find(p => p.id === id);
        if (!product) throw new Error("Producto no encontrado");

        if (product.disabled && product.stock <= 0) {
            throw new Error("No se puede habilitar un producto con stock en 0. Primero añade unidades en inventario.");
        }

        product.disabled = !product.disabled;
        product.active = !product.disabled && product.stock > 0;
        product.status = product.stock <= 0 ? 'out_of_stock' : (product.stock > product.minStock ? 'in_stock' : 'low_stock');
        product.updatedAt = new Date().toISOString();

        notifyProductsChanged();
        return product;
    },

    /**
     * Eliminar producto protegiendo contra pérdida de historial
     */
    delete: async (id) => {
        await simulateNetworkDelay(200);
        const index = db.products.findIndex(p => p.id === id);
        if (index === -1) throw new Error("Producto no encontrado");

        // 1. Verificar si existe historial de ventas
        const hasSales = db.sales.some(s => 
            s.items && s.items.some(item => item.productId === id || item.id === id)
        );

        // 2. Verificar si existe historial de compras
        const hasPurchases = (db.purchases || []).some(p => 
            p.items && p.items.some(item => item.productId === id || item.id === id)
        );

        if (hasSales || hasPurchases) {
            throw new Error(
                `No es posible eliminar "${db.products[index].name}" porque posee historial registrado ` +
                `(${hasSales ? 'Ventas' : ''}${hasSales && hasPurchases ? ' y ' : ''}${hasPurchases ? 'Compras' : ''}). ` +
                `Por integridad contable y fiscal SENIAT, debes deshabilitarlo usando el botón correspondiente.`
            );
        }

        db.products.splice(index, 1);
        notifyProductsChanged();
        return true;
    },

    /**
     * Actualizar stock individual (nunca permite valores negativos)
     */
    updateStock: async (id, newStock) => {
        await simulateNetworkDelay(150);
        const product = db.products.find(p => p.id === id);
        if (!product) throw new Error("Producto no encontrado");

        const safeStock = Math.max(0, parseInt(newStock) || 0);
        product.stock = safeStock;
        
        // Si el stock llega a 0, se deshabilita automáticamente
        if (safeStock <= 0) {
            product.status = 'out_of_stock';
            product.disabled = true;
            product.active = false;
        } else {
            product.status = safeStock > product.minStock ? 'in_stock' : 'low_stock';
            // Si estaba deshabilitado solo por falta de stock, se rehabilita
            if (product.disabled && product.stockWasZero) {
                product.disabled = false;
            }
            product.active = !product.disabled;
        }

        product.updatedAt = new Date().toISOString();
        notifyProductsChanged();
        return product;
    }
};

export default productService;