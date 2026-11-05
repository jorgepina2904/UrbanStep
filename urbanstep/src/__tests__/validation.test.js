import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    normalizeDocument, normalizePhoneVE, validateDocument, validateEmail, validatePassword,
    validatePersonName, validatePhoneVE, isPlaceholder
} from '../utils/validators';

// Modo local: sin Supabase, todo vive en memoria (db)
vi.mock('../services/supabaseClient', () => ({
    supabase: null,
    isSupabaseConfigured: () => false,
    testSupabaseConnection: async () => ({ ok: false })
}));

const { db } = await import('../services/api');
const { saleService } = await import('../services/saleServices');
const { customerService } = await import('../services/customerService');

describe('validadores venezolanos', () => {
    it('cédula, RIF y pasaporte con sus longitudes', () => {
        expect(validateDocument('V', '12.345.678')).toBeNull();
        expect(validateDocument('V', '123')).toMatch(/entre 6 y 9/);
        expect(validateDocument('V', '00000000')).toMatch(/no es válido/);
        expect(validateDocument('J', '501234567')).toBeNull();
        expect(validateDocument('J', '1234')).toMatch(/RIF/);
        expect(validateDocument('P', 'PA12345')).toBeNull();
    });

    it('normaliza el documento con o sin prefijo', () => {
        expect(normalizeDocument('V', 'v-12.345.678')).toBe('V-12345678');
        expect(normalizeDocument('E', '81234567')).toBe('E-81234567');
        expect(normalizeDocument('P', 'pa-123 45')).toBe('P-PA12345');
    });

    it('teléfonos móviles y fijos, también con +58', () => {
        expect(validatePhoneVE('0414-555 1234')).toBeNull();
        expect(validatePhoneVE('+58 412 5551234')).toBeNull();
        expect(validatePhoneVE('0251-2345678')).toBeNull();
        expect(validatePhoneVE('0400-1234567')).toMatch(/inválido/);
        expect(validatePhoneVE('', { required: false })).toBeNull();
        expect(normalizePhoneVE('+58 424-7778899')).toBe('04247778899');
    });

    it('correo, nombre y contraseña', () => {
        expect(validateEmail('cliente@urbanstep.com')).toBeNull();
        expect(validateEmail('cliente@urbanstep')).toMatch(/formato/);
        expect(validatePersonName('María González')).toBeNull();
        expect(validatePersonName('María')).toMatch(/apellido/);
        expect(validatePassword('cajero123')).toBeNull();
        expect(validatePassword('1234')).toMatch(/8 caracteres/);
        expect(validatePassword('solamenteletras')).toMatch(/letras y números/);
        expect(isPlaceholder('-')).toBe(true);
    });
});

const product = (over = {}) => ({
    id: 'P1', name: 'Air Max', sku: 'NK-1', brand: 'Nike', price: 50, cost: 20, stock: 10, minStock: 2, status: 'in_stock',
    colors: ['Negro'], color: 'Negro', sizes: ['41'], sizeStock: { 41: 10 },
    colorVariants: [{ color: 'Negro', sizeStock: { 41: 10 }, total: 10 }], ...over
});

describe('reglas de venta', () => {
    beforeEach(() => {
        db.sales = [];
        db.products = [product()];
    });

    const item = (over = {}) => ({ productId: 'P1', name: 'Air Max', size: '41', color: 'Negro', price: 50, quantity: 1, ...over });

    it('rechaza cantidades fraccionadas, negativas o cero', async () => {
        for (const quantity of [0, -2, 1.5, 'abc']) {
            await expect(saleService.create({ items: [item({ quantity })], subtotal: 50, total: 50, cashier: 'Ana' })).rejects.toThrow(/Cantidad inválida/);
        }
    });

    it('rechaza un descuento mayor que el subtotal', async () => {
        await expect(saleService.create({ items: [item()], subtotal: 50, discount: 80, total: 0, cashier: 'Ana' })).rejects.toThrow(/descuento/);
    });

    it('un pedido web con precio alterado se rechaza', async () => {
        await expect(saleService.create({ items: [item({ price: 1 })], subtotal: 1, total: 1, cashier: 'Ecommerce Web' })).rejects.toThrow(/precio/i);
    });

    it('un pedido web cuyo total no cuadra con sus conceptos se rechaza', async () => {
        await expect(saleService.create({ items: [item()], subtotal: 50, shippingCost: 3, total: 20, cashier: 'Ecommerce Web' })).rejects.toThrow(/total/);
    });

    it('un pedido web correcto se registra', async () => {
        const sale = await saleService.create({ items: [item({ quantity: 2 })], subtotal: 100, discount: 5, shippingCost: 3, total: 98, cashier: 'Ecommerce Web', bcvRate: 800 });
        expect(sale.total).toBe(98);
    });
});

describe('identidad única de clientes', () => {
    beforeEach(() => {
        db.customers = [{ id: 'publico', docType: 'V', docNumber: 'V-00000000', firstName: 'Cliente', lastName: 'General' }];
    });

    const base = { firstName: 'Ana', lastName: 'Pérez', docType: 'V', docNumber: '12345678', email: 'ana@correo.com', phone: '0414-1234567' };

    it('no permite repetir cédula aunque cambie el formato', async () => {
        await customerService.create(base);
        await expect(customerService.create({ ...base, docNumber: 'V-12.345.678', email: 'otra@correo.com' })).rejects.toThrow(/ya está registrada/);
    });

    it('no permite repetir el correo con otra cédula', async () => {
        await customerService.create(base);
        await expect(customerService.create({ ...base, docNumber: '87654321', email: 'ANA@correo.com' })).rejects.toThrow(/ya pertenece/);
    });

    it('rechaza datos inválidos antes de guardar', async () => {
        await expect(customerService.create({ ...base, docNumber: '12' })).rejects.toThrow(/cédula/);
        await expect(customerService.create({ ...base, phone: '123' })).rejects.toThrow(/Teléfono/);
    });
});
