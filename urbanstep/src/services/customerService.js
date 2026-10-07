import { simulateNetworkDelay, db } from './api';
import { generateId } from '../utils/generateId';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const PUBLIC_CUSTOMER_ID = 'publico';

export const customerService = {
    getAll: async () => {
        await simulateNetworkDelay(150);
        if (isSupabaseConfigured()) {
            try {
                const { data, error } = await supabase.from('customers').select('*');
                if (!error && data && data.length > 0) {
                    return data.map(c => ({
                        id: c.id,
                        docType: c.doc_type,
                        docNumber: `${c.doc_type}-${c.doc_number}`,
                        firstName: c.first_name,
                        lastName: c.last_name,
                        email: c.email,
                        phone: c.phone,
                        state: c.state,
                        city: c.city,
                        address: c.address,
                        totalSpent: Number(c.total_spent_usd || 0),
                        purchasesCount: Number(c.purchases_count || 0),
                    }));
                }
            } catch (err) {
                console.warn('Fallo Supabase customers, usando datos locales:', err);
            }
        }
        return [...db.customers];
    },

    getById: async (id) => {
        await simulateNetworkDelay(100);
        const customer = db.customers.find(c => c.id === id);
        if (!customer) throw new Error('Cliente no encontrado');
        return { ...customer };
    },

    create: async (data) => {
        await simulateNetworkDelay(250);
        const newCustomer = {
            id: generateId('CLT'),
            docType:        data.docType || 'V',
            docNumber:      data.docNumber || `${data.docType || 'V'}-${data.rawDoc || '00000000'}`,
            firstName:      (data.firstName || '').trim(),
            lastName:       (data.lastName  || '').trim(),
            email:          (data.email     || '').trim(),
            phone:          (data.phone     || '').trim(),
            state:          data.state      || 'Distrito Capital',
            city:           data.city       || 'Caracas',
            address:        (data.address   || '').trim(),
            totalSpent:     0,
            purchasesCount: 0,
            registeredAt:   new Date().toISOString(),
        };
        
        db.customers.push(newCustomer);
        db.save('customers');

        if (isSupabaseConfigured()) {
            try {
                await supabase.from('customers').insert({
                    id: newCustomer.id,
                    doc_type: newCustomer.docType,
                    doc_number: newCustomer.docNumber.replace(/^[VEJGP]-/, ''),
                    first_name: newCustomer.firstName,
                    last_name: newCustomer.lastName,
                    email: newCustomer.email,
                    phone: newCustomer.phone,
                    state: newCustomer.state,
                    city: newCustomer.city,
                    address: newCustomer.address,
                    total_spent_usd: 0,
                    purchases_count: 0
                });
            } catch (err) {
                console.warn('Error insertando cliente en Supabase:', err);
            }
        }

        return { ...newCustomer };
    },

    update: async (id, data) => {
        await simulateNetworkDelay(250);
        if (id === PUBLIC_CUSTOMER_ID) throw new Error('El cliente público general no puede ser editado');

        const index = db.customers.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Cliente no encontrado');

        const updated = {
            ...db.customers[index],
            docType:   data.docType ?? db.customers[index].docType,
            docNumber: data.docNumber ?? db.customers[index].docNumber,
            firstName: (data.firstName ?? db.customers[index].firstName).trim(),
            lastName:  (data.lastName  ?? db.customers[index].lastName).trim(),
            email:     (data.email     ?? db.customers[index].email).trim(),
            phone:     (data.phone     ?? db.customers[index].phone).trim(),
            state:     data.state      ?? db.customers[index].state,
            city:      data.city       ?? db.customers[index].city,
            address:   (data.address   ?? db.customers[index].address).trim(),
        };
        db.customers[index] = updated;

        if (isSupabaseConfigured()) {
            try {
                await supabase.from('customers').update({
                    doc_type: updated.docType,
                    doc_number: updated.docNumber.replace(/^[VEJGP]-/, ''),
                    first_name: updated.firstName,
                    last_name: updated.lastName,
                    email: updated.email,
                    phone: updated.phone,
                    state: updated.state,
                    city: updated.city,
                    address: updated.address
                }).eq('id', id);
            } catch (err) {
                console.warn('Error actualizando cliente en Supabase:', err);
            }
        }

        if (typeof window !== 'undefined') {
            db.save('customers');
            window.dispatchEvent(new CustomEvent('customers_updated', { detail: [...db.customers] }));
        }

        return { ...updated };
    },

    /**
     * Alternar estado habilitado / deshabilitado del cliente
     */
    toggleStatus: async (id) => {
        await simulateNetworkDelay(150);
        if (id === PUBLIC_CUSTOMER_ID) throw new Error('El cliente público general no puede ser deshabilitado');
        const index = db.customers.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Cliente no encontrado');

        const current = db.customers[index];
        const updated = {
            ...current,
            disabled: !current.disabled,
            active: Boolean(current.disabled), // si estaba disabled, ahora active
            updatedAt: new Date().toISOString()
        };

        db.customers[index] = updated;

        if (typeof window !== 'undefined') {
            db.save('customers');
            window.dispatchEvent(new CustomEvent('customers_updated', { detail: [...db.customers] }));
        }

        return { ...updated };
    },

    delete: async (id) => {
        await simulateNetworkDelay(200);
        if (id === PUBLIC_CUSTOMER_ID) throw new Error('El cliente público general no puede ser eliminado');
        const index = db.customers.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Cliente no encontrado');

        const customer = db.customers[index];
        // Verificar si posee historial de compras en ventas registradas
        const hasSales = db.sales.some(s => s.customerId === id);
        const hasPurchasesCount = (customer.purchasesCount || 0) > 0;

        if (hasSales || hasPurchasesCount) {
            throw new Error(
                `No es posible eliminar al cliente "${customer.firstName} ${customer.lastName}" porque posee historial de compras registrado. ` +
                `Por normativa contable y auditoría, debes deshabilitarlo usando el botón correspondiente.`
            );
        }

        db.customers.splice(index, 1);
        if (isSupabaseConfigured()) {
            try {
                await supabase.from('customers').delete().eq('id', id);
            } catch (err) {
                console.warn('Error borrando cliente en Supabase:', err);
            }
        }

        if (typeof window !== 'undefined') {
            db.save('customers');
            window.dispatchEvent(new CustomEvent('customers_updated', { detail: [...db.customers] }));
        }

        return true;
    },

    getPurchaseHistory: async (customerId) => {
        await simulateNetworkDelay(150);
        const sales = db.sales.filter(s => s.customerId === customerId);
        return [...sales];
    }
};

export default customerService;
