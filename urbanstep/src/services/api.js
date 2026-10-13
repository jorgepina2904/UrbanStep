import { mockUsers } from '../data/mockUsers';
import { mockSuppliers } from '../data/mockPurchases';

// Cliente general por defecto para venta en mostrador
export const DEFAULT_PUBLIC_CUSTOMER = {
    id: 'publico',
    docType: 'V',
    docNumber: 'V-00000000',
    firstName: 'Venta al',
    lastName: 'Público General',
    email: 'publico@urbanstep.com.ve',
    phone: '0412-0000000',
    state: 'Distrito Capital',
    city: 'Caracas',
    address: 'Mostrador Tienda Principal',
    totalSpent: 0,
    purchasesCount: 0
};

// Helper to safely load collection from localStorage
const loadStorage = (key, fallback) => {
    if (typeof window === 'undefined') return [...fallback];
    try {
        const item = localStorage.getItem(key);
        if (item !== null) {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn(`Error reading ${key} from localStorage:`, e);
    }
    return [...fallback];
};

const saveStorage = (key, data) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn(`Error saving ${key} to localStorage:`, e);
    }
};

// Database with local persistence and cross-tab/cross-module sync
class InMemoryDB {
    constructor() {
        this.users = loadStorage('urbanstep_users', mockUsers);
        this.products = loadStorage('urbanstep_products', []);
        this.customers = loadStorage('urbanstep_customers', [DEFAULT_PUBLIC_CUSTOMER]);
        this.sales = loadStorage('urbanstep_sales', []);
        this.purchases = loadStorage('urbanstep_purchases', []);
        this.suppliers = loadStorage('urbanstep_suppliers', mockSuppliers);

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (e) => {
                if (e.key === 'urbanstep_products') this.products = loadStorage('urbanstep_products', []);
                if (e.key === 'urbanstep_sales') this.sales = loadStorage('urbanstep_sales', []);
                if (e.key === 'urbanstep_purchases') this.purchases = loadStorage('urbanstep_purchases', []);
                if (e.key === 'urbanstep_customers') this.customers = loadStorage('urbanstep_customers', [DEFAULT_PUBLIC_CUSTOMER]);
                if (e.key === 'urbanstep_users') this.users = loadStorage('urbanstep_users', mockUsers);
            });
        }
    }

    save(collection) {
        if (this[collection] !== undefined) {
            saveStorage(`urbanstep_${collection}`, this[collection]);
        }
    }
}

export const db = new InMemoryDB();

/**
 * Limpia y vacía el almacenamiento local para iniciar con base limpia
 */
export const clearAllLocalData = (keepAuth = true) => {
    if (typeof window === 'undefined') return;

    const keysToPurge = [
        'urbanstep_products',
        'urbanstep_sales',
        'urbanstep_purchases',
        'urbanstep_stock_movements',
        'urbanstep_deliveries',
        'urbanstep_shifts',
        'urbanstep_audit_logs',
        'urbanstep_cart_storage',
        'urbanstep_orders'
    ];

    if (!keepAuth) {
        keysToPurge.push('urbanstep_users');
        keysToPurge.push('urbanstep_customers');
    }

    keysToPurge.forEach(k => {
        try {
            localStorage.removeItem(k);
        } catch {}
    });

    // Resetear en memoria
    db.products = [];
    db.sales = [];
    db.purchases = [];
    db.customers = [DEFAULT_PUBLIC_CUSTOMER];

    // Persistir estado vacío limpio
    db.save('products');
    db.save('sales');
    db.save('purchases');
    db.save('customers');

    // Notificar reactivamente a toda la aplicación
    window.dispatchEvent(new CustomEvent('products_updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('sales_updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('purchases_updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('customers_updated', { detail: [DEFAULT_PUBLIC_CUSTOMER] }));
    window.dispatchEvent(new CustomEvent('stock_movements_updated', { detail: [] }));
};

// Simulated network delay
export const simulateNetworkDelay = async (ms = 100) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};