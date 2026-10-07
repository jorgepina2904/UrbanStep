import { mockUsers } from '../data/mockUsers';
import { mockProducts } from '../data/mockProducts';
import { mockCustomers } from '../data/mockCustomers';
import { mockSales } from '../data/mockSales';
import { mockPurchases, mockSuppliers } from '../data/mockPurchases';

// Simulador de API con latencia
export const simulateNetworkDelay = async (ms = 300) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

// Base de datos en memoria (Singleton pattern para la sesión)
class InMemoryDB {
    constructor() {
        this.users = [...mockUsers];
        this.products = [...mockProducts];
        this.customers = [...mockCustomers];
        this.sales = [...mockSales];
        this.purchases = [...mockPurchases];
        this.suppliers = [...mockSuppliers];
    }
}

export const db = new InMemoryDB();