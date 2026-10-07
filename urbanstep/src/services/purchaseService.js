import { db, simulateNetworkDelay } from './api';
import { generateId } from '../utils/generateId';

export const purchaseService = {
    /**
     * Obtener todas las compras registradas
     */
    getAll: async () => {
        await simulateNetworkDelay(150);
        return [...db.purchases];
    },

    /**
     * Obtener lista de proveedores
     */
    getSuppliers: async () => {
        await simulateNetworkDelay(100);
        return [...db.suppliers];
    },

    /**
     * Registrar una nueva orden de compra o recepción de mercancía
     */
    create: async (purchaseData) => {
        await simulateNetworkDelay(250);

        const newPurchase = {
            id: generateId('CMP'),
            invoiceNumber: purchaseData.invoiceNumber || `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            controlNumber: purchaseData.controlNumber || `00-${Math.floor(10000 + Math.random() * 90000)}`,
            supplierId: purchaseData.supplierId || 'PRV-101',
            supplierName: purchaseData.supplierName || 'Distribuidora Deportiva Ávila C.A.',
            supplierRif: purchaseData.supplierRif || 'J-31245678-9',
            date: purchaseData.date || new Date().toISOString(),
            status: purchaseData.status || 'recibida',
            paymentMethod: purchaseData.paymentMethod || 'transferencia',
            paymentBank: purchaseData.paymentBank || '0134 - Banesco',
            bcvRate: Number(purchaseData.bcvRate) || 42.50,
            subtotalUsd: Number(purchaseData.subtotalUsd) || 0,
            taxUsd: Number(purchaseData.taxUsd) || 0,
            totalUsd: Number(purchaseData.totalUsd) || 0,
            subtotalBs: Number(purchaseData.subtotalBs) || 0,
            taxBs: Number(purchaseData.taxBs) || 0,
            totalBs: Number(purchaseData.totalBs) || 0,
            itemsCount: (purchaseData.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0),
            items: purchaseData.items || [],
            receivedBy: purchaseData.receivedBy || 'Almacén Central',
            notes: purchaseData.notes || '',
        };

        db.purchases.unshift(newPurchase);

        // Si la compra fue recibida, actualizar el stock de los productos comprados
        if (newPurchase.status === 'recibida') {
            for (const item of newPurchase.items) {
                const product = db.products.find(p => p.id === item.productId || p.name === item.name);
                if (product) {
                    product.stock += Number(item.quantity) || 0;
                    if (item.unitCostUsd) {
                        product.cost = Number(item.unitCostUsd);
                        product.purchasePrice = Number(item.unitCostUsd);
                    }
                    product.status = product.stock > product.minStock ? 'in_stock' : product.stock > 0 ? 'low_stock' : 'out_of_stock';
                }
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
