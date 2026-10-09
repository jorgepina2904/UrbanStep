import { mockUsers } from '../data/mockUsers';
import { mockProducts } from '../data/mockProducts';
import { mockCustomers } from '../data/mockCustomers';
import { mockSales } from '../data/mockSales';
import { mockPurchases, mockSuppliers } from '../data/mockPurchases';

// Helper to safely load collection from localStorage
const loadStorage = (key, fallback) => {
    if (typeof window === 'undefined') return [...fallback];
    try {
        const item = localStorage.getItem(key);
        if (item) {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Si la caché local tiene los antiguos datos de prueba aleatorios o modelos viejos desfasados, limpiar automáticamente
                if (key === 'urbanstep_products' && parsed.some(p => p.name?.includes('Sneaker Pro #') || p.name?.includes('Urban Hoodie #') || p.name?.includes('Chicago Lost & Found') || p.name?.includes('Panda') || p.name?.includes('Onyx'))) {
                    localStorage.setItem(key, JSON.stringify(fallback));
                    return [...fallback];
                }
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
        this.products = loadStorage('urbanstep_products', mockProducts);
        this.customers = loadStorage('urbanstep_customers', mockCustomers);
        this.sales = loadStorage('urbanstep_sales', mockSales);
        this.purchases = loadStorage('urbanstep_purchases', mockPurchases);
        this.suppliers = loadStorage('urbanstep_suppliers', mockSuppliers);

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (e) => {
                if (e.key === 'urbanstep_products') this.products = loadStorage('urbanstep_products', mockProducts);
                if (e.key === 'urbanstep_sales') this.sales = loadStorage('urbanstep_sales', mockSales);
                if (e.key === 'urbanstep_customers') this.customers = loadStorage('urbanstep_customers', mockCustomers);
                if (e.key === 'urbanstep_users') this.users = loadStorage('urbanstep_users', mockUsers);
            });
        }
    }

    save(collection) {
        if (this[collection]) {
            saveStorage(`urbanstep_${collection}`, this[collection]);
        }
    }
}

export const db = new InMemoryDB();

// Simulated network delay
export const simulateNetworkDelay = async (ms = 100) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};