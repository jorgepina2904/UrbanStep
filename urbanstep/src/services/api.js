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

/**
 * InMemoryDB — Adaptador de memoria volatil para desarrollo y fallback.
 * IMPORTANTE: Ya NO persiste en localStorage para evitar colisiones y datos cruzados
 * con la base de datos relacional de Supabase (Fuente Única de la Verdad).
 */
class InMemoryDB {
    constructor() {
        this.users = [...mockUsers];
        this.products = [];
        this.customers = [DEFAULT_PUBLIC_CUSTOMER];
        this.sales = [];
        this.purchases = [];
        this.suppliers = [...mockSuppliers];
    }

    // No-op seguro para llamadas legacy: no contamina localStorage
    save(collection) {
        // Mantiene datos solo en memoria de sesión si se llama
    }
}

export const db = new InMemoryDB();

/**
 * Limpia y purga totalmente cualquier residuo en localStorage para garantizar
 * que la aplicación opere 100% conectada a Supabase en la nube.
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
        'urbanstep_active_shift',
        'urbanstep_last_sale',
        'urbanstep_audit_logs',
        'urbanstep_cash_registers',
        'urbanstep_bcv_rate',
        'urbanstep_bcv_history',
        'urbanstep_system_users',
        'urbanstep_cart_storage',
        'urbanstep_orders',
        'urbanstep_suppliers',
        'urbanstep_customers'
    ];

    if (!keepAuth) {
        keysToPurge.push('urbanstep_users');
        keysToPurge.push('us_user');
        keysToPurge.push('us_token');
    }

    keysToPurge.forEach(k => {
        try {
            localStorage.removeItem(k);
        } catch {}
    });

    // Resetear memoria local
    db.products = [];
    db.sales = [];
    db.purchases = [];
    db.customers = [DEFAULT_PUBLIC_CUSTOMER];

    // Notificar reactivamente a toda la aplicación
    window.dispatchEvent(new CustomEvent('products_updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('sales_updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('purchases_updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('customers_updated', { detail: [DEFAULT_PUBLIC_CUSTOMER] }));
    window.dispatchEvent(new CustomEvent('stock_movements_updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('cash_registers_changed', { detail: [] }));
    window.dispatchEvent(new CustomEvent('deliveries_updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('shift_status_changed', { detail: null }));
};

// Retardo simulado para operaciones asíncronas
export const simulateNetworkDelay = (ms = 150) =>
    new Promise(resolve => setTimeout(resolve, ms));