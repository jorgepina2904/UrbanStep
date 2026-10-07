import { generateId } from '../utils/generateId';
import { mockProducts } from './mockProducts';
import { mockCustomers } from './mockCustomers';

export const mockSales = Array.from({ length: 20 }).map((_, i) => {
    const prod = mockProducts[i % mockProducts.length];
    const qty = Math.floor(Math.random() * 2) + 1;
    const price = prod.price || 100;
    const subtotal = price * qty;
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    const date = new Date();
    date.setHours(date.getHours() - i * 2);

    // FK del cliente: 'Cliente General' → 'publico'; 'Cliente #N' → índice N en mockCustomers
    // (mockCustomers[0] = público, mockCustomers[N] = "Cliente N")
    const isPublic = i % 2 === 0;
    const customerId = isPublic
        ? 'publico'
        : (mockCustomers[i + 1] ? mockCustomers[i + 1].id : null);

    return {
        id: `SAL-${1000 + i}`,
        receiptNumber: `TKT-${1000 + i}`,
        date: date.toISOString(),
        customerId,
        customer: isPublic ? 'Cliente General' : `Cliente #${i + 1}`,
        items: [{ productId: prod.id, name: prod.name, price: price, quantity: qty, size: '27' }],
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod: i % 2 === 0 ? 'cash' : 'card',
        cashier: 'Administrador General'
    };
});

export default mockSales;