import { simulateNetworkDelay, db } from './api';
import { generateId } from '../utils/generateId';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const PUBLIC_CUSTOMER_ID = 'publico';

export const customerService = {
    getAll: async () => {
        await simulateNetworkDelay(50);
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase.from('clientes').select('*');
                if (!error && Array.isArray(data)) {
                    const mapped = data.map(c => ({
                        id: c.id,
                        docType: c.tipo_documento || c.doc_type || 'V',
                        docNumber: `${c.tipo_documento || c.doc_type || 'V'}-${c.numero_documento || c.doc_number || '00000000'}`,
                        firstName: c.nombres || c.first_name || '',
                        lastName: c.apellidos || c.last_name || '',
                        email: c.correo || c.email || '',
                        phone: c.telefono || c.phone || '',
                        state: c.estado || c.state || 'Distrito Capital',
                        city: c.ciudad || c.city || 'Caracas',
                        address: c.direccion || c.address || '',
                        totalSpent: Number(c.total_comprado_usd ?? c.total_spent_usd ?? 0),
                        purchasesCount: Number(c.cantidad_compras ?? c.purchases_count ?? 0),
                    }));
                    db.customers = mapped;
                    db.save('customers');
                    return mapped;
                }
            } catch (err) {
                console.warn('Fallo Supabase clientes, usando datos locales:', err);
            }
        }
        return [...db.customers];
    },

    getById: async (id) => {
        await simulateNetworkDelay(50);
        let customer = db.customers.find(c => c.id === id);
        if (!customer && isSupabaseConfigured() && supabase) {
            try {
                const { data } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle();
                if (data) {
                    customer = {
                        id: data.id,
                        docType: data.tipo_documento || 'V',
                        docNumber: `${data.tipo_documento || 'V'}-${data.numero_documento || '00000000'}`,
                        firstName: data.nombres || '',
                        lastName: data.apellidos || '',
                        email: data.correo || '',
                        phone: data.telefono || '',
                        state: data.estado || 'Distrito Capital',
                        city: data.ciudad || 'Caracas',
                        address: data.direccion || '',
                        totalSpent: Number(data.total_comprado_usd || 0),
                        purchasesCount: Number(data.cantidad_compras || 0)
                    };
                }
            } catch (err) {
                console.warn('Error consultando cliente en Supabase:', err);
            }
        }
        if (!customer) throw new Error('Cliente no encontrado');
        return { ...customer };
    },

    create: async (data) => {
        await simulateNetworkDelay(100);
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

        if (isSupabaseConfigured() && supabase) {
            try {
                const { error: cliErr } = await supabase.from('clientes').insert({
                    id: newCustomer.id,
                    tipo_documento: newCustomer.docType,
                    numero_documento: newCustomer.docNumber.replace(/^[VEJGP]-/, ''),
                    nombres: newCustomer.firstName,
                    apellidos: newCustomer.lastName,
                    correo: newCustomer.email,
                    telefono: newCustomer.phone,
                    estado: newCustomer.state,
                    ciudad: newCustomer.city,
                    direccion: newCustomer.address,
                    total_comprado_usd: 0,
                    cantidad_compras: 0
                });

                if (cliErr) {
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
                }
            } catch (err) {
                console.warn('Error insertando cliente en Supabase:', err);
            }
        }

        return { ...newCustomer };
    },

    update: async (id, data) => {
        await simulateNetworkDelay(100);
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

        if (isSupabaseConfigured() && supabase) {
            try {
                const { error: upCliErr } = await supabase.from('clientes').update({
                    tipo_documento: updated.docType,
                    numero_documento: updated.docNumber.replace(/^[VEJGP]-/, ''),
                    nombres: updated.firstName,
                    apellidos: updated.lastName,
                    correo: updated.email,
                    telefono: updated.phone,
                    estado: updated.state,
                    ciudad: updated.city,
                    direccion: updated.address
                }).eq('id', id);

                if (upCliErr) {
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
                }
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
        await simulateNetworkDelay(100);
        if (id === PUBLIC_CUSTOMER_ID) throw new Error('El cliente público general no puede ser eliminado');
        const index = db.customers.findIndex(c => c.id === id);

        if (index !== -1) {
            db.customers.splice(index, 1);
            if (typeof window !== 'undefined') {
                db.save('customers');
                window.dispatchEvent(new CustomEvent('customers_updated', { detail: [...db.customers] }));
            }
        }

        if (isSupabaseConfigured() && supabase) {
            try {
                const { error: delErr } = await supabase.from('clientes').delete().eq('id', id);
                if (delErr) {
                    await supabase.from('clientes').update({ disabled: true }).eq('id', id);
                }
            } catch (err) {
                console.warn('Error borrando cliente en Supabase:', err);
            }
        }

        return true;
    },

    getPurchaseHistory: async (customerId) => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('ventas')
                    .select('*')
                    .eq('cliente_id', customerId)
                    .order('creado_el', { ascending: false });

                if (!error && Array.isArray(data)) {
                    return data.map(v => ({
                        id: v.id,
                        receiptNumber: v.numero_recibo,
                        total: Number(v.total_usd) || 0,
                        totalBs: Number(v.total_bs) || 0,
                        date: v.creado_el,
                        paymentMethod: v.metodo_pago_principal
                    }));
                }
            } catch (err) {
                console.warn('Error consultando historial de compras en Supabase:', err);
            }
        }
        return [];
    }
};

export default customerService;
