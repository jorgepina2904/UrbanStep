import { db } from './api';
import { generateId } from '../utils/generateId';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { isPlaceholder, normalizeDocument, normalizeEmail, validateDocument, validateEmail, validatePhoneVE } from '../utils/validators';

const PUBLIC_CUSTOMER_ID = 'publico';

const docKey = (c) => normalizeDocument(c.docType, c.docNumber);
const emailKey = (value) => (isPlaceholder(value) ? '' : normalizeEmail(value));

/**
 * Regla única de identidad del cliente: una cédula/RIF y un correo pertenecen a un solo cliente.
 * Se valida contra la lista fresca (Supabase si está configurado) antes de crear o editar.
 */
const validateCustomer = async (data, excludeId = null) => {
    if (!String(data.firstName || '').trim()) throw new Error('El nombre del cliente es obligatorio');
    if (!String(data.lastName || '').trim()) throw new Error('El apellido del cliente es obligatorio');
    const docError = validateDocument(data.docType, data.docNumber);
    if (docError) throw new Error(docError);
    if (!isPlaceholder(data.email)) {
        const emailError = validateEmail(data.email);
        if (emailError) throw new Error(emailError);
    }
    if (!isPlaceholder(data.phone)) {
        const phoneError = validatePhoneVE(data.phone);
        if (phoneError) throw new Error(phoneError);
    }

    const all = await customerService.getAll();
    const key = docKey(data);
    const email = emailKey(data.email);
    const sameDoc = all.find(c => c.id !== excludeId && c.id !== PUBLIC_CUSTOMER_ID && docKey(c) === key);
    if (sameDoc) throw new Error(`La cédula/RIF ${key} ya está registrada a nombre de ${`${sameDoc.firstName} ${sameDoc.lastName}`.trim()}`);
    const sameEmail = email && all.find(c => c.id !== excludeId && emailKey(c.email) === email);
    if (sameEmail) throw new Error(`El correo ${email} ya pertenece a otro cliente (${sameEmail.docNumber})`);
};

export const customerService = {
    getAll: async () => {
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

    /** Busca la ficha de un cliente por correo (para vincular su cuenta web). */
    findByEmail: async (email) => {
        const key = emailKey(email);
        if (!key) return null;
        return (await customerService.getAll()).find(c => emailKey(c.email) === key) || null;
    },

    /** Busca la ficha de un cliente por cédula/RIF normalizada. */
    findByDocument: async (docType, docNumber) => {
        const key = normalizeDocument(docType, docNumber);
        return (await customerService.getAll()).find(c => c.id !== PUBLIC_CUSTOMER_ID && docKey(c) === key) || null;
    },

    create: async (data) => {
        const docType = String(data.docType || 'V').toUpperCase();
        const docNumber = normalizeDocument(docType, data.docNumber || data.rawDoc);
        await validateCustomer({ ...data, docType, docNumber });

        const newCustomer = {
            id: generateId('CLT'),
            docType,
            docNumber,
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

                // Duplicado detectado por la base de datos (índices únicos): no se conserva la ficha local
                if (cliErr?.code === '23505') {
                    db.customers = db.customers.filter(c => c.id !== newCustomer.id);
                    db.save('customers');
                    throw new Error('Ya existe un cliente con esa cédula/RIF o ese correo');
                }
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
                if (err?.message?.startsWith('Ya existe un cliente')) throw err;
                console.warn('Error insertando cliente en Supabase:', err);
            }
        }

        return { ...newCustomer };
    },

    update: async (id, data) => {
        if (id === PUBLIC_CUSTOMER_ID) throw new Error('El cliente público general no puede ser editado');

        const existing = db.customers.find(c => c.id === id);
        if (!existing) throw new Error('Cliente no encontrado');

        const docType = String(data.docType ?? existing.docType).toUpperCase();
        const docNumber = normalizeDocument(docType, data.docNumber ?? existing.docNumber);
        await validateCustomer({ ...existing, ...data, docType, docNumber }, id);

        // La validación recarga la lista desde la nube: se ubica de nuevo el registro
        const index = db.customers.findIndex(c => c.id === id);
        if (index === -1) throw new Error('Cliente no encontrado');

        const updated = {
            ...db.customers[index],
            docType,
            docNumber,
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
        if (id === PUBLIC_CUSTOMER_ID) throw new Error('El cliente público general no puede ser eliminado');
        const index = db.customers.findIndex(c => c.id === id);

        // Providencia 0071: un cliente con facturas emitidas no se elimina físicamente, se archiva.
        let hasSales = (db.sales || []).some(s => s.customerId === id);
        if (!hasSales && isSupabaseConfigured() && supabase) {
            try {
                const { count } = await supabase
                    .from('ventas')
                    .select('id', { count: 'exact', head: true })
                    .eq('cliente_id', id);
                hasSales = (count || 0) > 0;
            } catch (err) {
                console.warn('No se pudo verificar historial del cliente; se archiva por seguridad:', err);
                hasSales = true;
            }
        }

        if (hasSales) {
            if (isSupabaseConfigured() && supabase) {
                const { error: archErr } = await supabase.from('clientes').update({ disabled: true }).eq('id', id);
                if (archErr) throw new Error(`No se pudo archivar el cliente: ${archErr.message}`);
            }
            if (index !== -1) db.customers.splice(index, 1);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('customers_updated', { detail: [...db.customers] }));
            }
            return true;
        }

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
