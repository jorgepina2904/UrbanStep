/**
 * settingsService.js — Gestión de configuraciones de la tienda y SENIAT
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { simulateNetworkDelay } from './api';

const SETTINGS_KEY = 'urbanstep_store_settings';

export const DEFAULT_PAYMENT_METHODS = [
    {
        id: 'pagomovil',
        label: 'Pago Móvil',
        currency: 'VES',
        type: 'movil',
        bank: '0134 - Banesco Banco Universal',
        phone: '0414-2345678',
        rif: 'J-50123456-7',
        instructions: 'Transferir a tasa oficial BCV. Ingresar número de referencia bancaria.',
        requiresReference: true,
        active: true,
        isCustom: false,
    },
    {
        id: 'punto_venta',
        label: 'Punto / Débito',
        currency: 'VES',
        type: 'tarjeta',
        bank: 'Banesco / Mercantil / BDV',
        instructions: 'Cobro en el punto de venta de mostrador o inalámbrico al entregar.',
        requiresReference: false,
        active: true,
        isCustom: false,
    },
    {
        id: 'efectivo_usd',
        label: 'Efectivo $ USD',
        currency: 'USD',
        type: 'efectivo',
        instructions: 'Billetes en buen estado sin roturas ni marcas profundas.',
        requiresReference: false,
        active: true,
        isCustom: false,
    },
    {
        id: 'efectivo_bs',
        label: 'Efectivo Bs.',
        currency: 'VES',
        type: 'efectivo',
        instructions: 'Efectivo en moneda de curso legal según tasa oficial BCV.',
        requiresReference: false,
        active: true,
        isCustom: false,
    },
    {
        id: 'zelle',
        label: 'Zelle (USD)',
        currency: 'USD',
        type: 'digital',
        email: 'pagos@urbanstep.com.ve',
        holder: 'UrbanStep International LLC',
        instructions: 'Enviar comprobante con titular y correo emisor.',
        requiresReference: true,
        active: true,
        isCustom: false,
    },
    {
        id: 'transferencia',
        label: 'Transferencia Bancaria',
        currency: 'VES',
        type: 'banco',
        bank: '0102 - Banco de Venezuela',
        account: '0102-0001-00-1234567890',
        rif: 'J-50123456-7',
        instructions: 'Mismo banco o interbancaria inmediata con captura.',
        requiresReference: true,
        active: true,
        isCustom: false,
    }
];

const PAYMENT_METHODS_KEY = 'urbanstep_payment_methods';

export const DEFAULT_SETTINGS = {
    storeName: 'UrbanStep Venezuela',
    legalName: 'UrbanStep C.A.',
    rif: 'J-50123456-7',
    fiscalAddress: 'Av. Francisco de Miranda, Centro Lido, Nivel Galería, Chacao, Caracas',
    phone: '+58 212-951-4000',
    email: 'contacto@urbanstep.com.ve',
    
    // Impuestos de Venezuela (SENIAT)
    ivaRate: 0.16, // 16% IVA
    igtfRate: 0.03, // 3% IGTF divisas
    igtfActive: true,
    
    // Cuentas de Pago
    pagomovilBank: '0134 - Banesco Banco Universal',
    pagomovilPhone: '0414-2345678',
    pagomovilRif: 'J-50123456-7',
    
    zelleEmail: 'pagos@urbanstep.com.ve',
    zelleHolder: 'UrbanStep International LLC',
    
    transferBank: '0102 - Banco de Venezuela',
    transferAccount: '0102-0001-00-1234567890',
    
    // Formato de Ticket / Factura Proforma
    ticketPrefix: 'TKT',
    ticketFooter: '¡Gracias por su compra en UrbanStep! Para cambios de calzado dispone de 7 días continuos en su caja original.',
    
    // Envíos nacionales y geolocalización
    enabledCarriers: ['retiro_tienda', 'delivery_local', 'mrw', 'zoom', 'tealca'],
    localDeliveryCost: 3.50,
    storeLatitude: 10.068330144675503,
    storeLongitude: -69.28499381534304,

    // Métodos de pago
    paymentMethods: DEFAULT_PAYMENT_METHODS,
};

export const settingsService = {
    getPaymentMethods: () => {
        try {
            const raw = localStorage.getItem(PAYMENT_METHODS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Error leyendo métodos de pago:', e);
        }
        localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(DEFAULT_PAYMENT_METHODS));
        return [...DEFAULT_PAYMENT_METHODS];
    },

    savePaymentMethods: (methods) => {
        localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(methods));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('payment_methods_updated', { detail: methods }));
        }
        return methods;
    },

    addPaymentMethod: (newMethod) => {
        const methods = settingsService.getPaymentMethods();
        const id = newMethod.id || `custom_${Date.now()}`;
        const method = {
            id,
            label: newMethod.label.trim(),
            currency: newMethod.currency || 'USD',
            type: newMethod.type || 'digital',
            bank: newMethod.bank || '',
            phone: newMethod.phone || '',
            rif: newMethod.rif || '',
            email: newMethod.email || '',
            holder: newMethod.holder || '',
            account: newMethod.account || '',
            instructions: newMethod.instructions || '',
            requiresReference: Boolean(newMethod.requiresReference),
            active: true,
            isCustom: true,
            createdAt: new Date().toISOString()
        };
        const updated = [...methods, method];
        settingsService.savePaymentMethods(updated);
        return method;
    },

    updatePaymentMethod: (id, methodData) => {
        const methods = settingsService.getPaymentMethods();
        const index = methods.findIndex(m => m.id === id);
        if (index === -1) throw new Error('Método de pago no encontrado');

        methods[index] = {
            ...methods[index],
            ...methodData,
            label: methodData.label !== undefined ? methodData.label.trim() : methods[index].label
        };
        settingsService.savePaymentMethods(methods);
        return methods[index];
    },

    togglePaymentMethod: (id) => {
        const methods = settingsService.getPaymentMethods();
        const index = methods.findIndex(m => m.id === id);
        if (index === -1) throw new Error('Método de pago no encontrado');

        methods[index].active = !methods[index].active;
        settingsService.savePaymentMethods(methods);
        return methods[index];
    },

    deletePaymentMethod: (id) => {
        const methods = settingsService.getPaymentMethods();
        const target = methods.find(m => m.id === id);
        if (!target) throw new Error('Método de pago no encontrado');
        if (!target.isCustom) {
            throw new Error('No se pueden eliminar los métodos base del sistema. Puedes deshabilitarlo.');
        }

        const filtered = methods.filter(m => m.id !== id);
        settingsService.savePaymentMethods(filtered);
        return true;
    },

    getSettings: async () => {
        await simulateNetworkDelay(100);

        if (isSupabaseConfigured()) {
            try {
                const { data, error } = await supabase
                    .from('store_settings')
                    .select('*')
                    .limit(1)
                    .single();
                
                if (!error && data) {
                    const currentMethods = settingsService.getPaymentMethods();
                    return {
                        storeName: data.store_name,
                        legalName: data.legal_name,
                        rif: data.rif,
                        fiscalAddress: data.fiscal_address,
                        phone: data.phone,
                        email: data.email,
                        ivaRate: Number(data.iva_rate),
                        igtfRate: Number(data.igtf_rate),
                        igtfActive: data.igtf_active,
                        pagomovilBank: data.pagomovil_bank,
                        pagomovilPhone: data.pagomovil_phone,
                        pagomovilRif: data.pagomovil_rif,
                        zelleEmail: data.zelle_email,
                        zelleHolder: data.zelle_holder,
                        transferBank: data.transfer_bank,
                        transferAccount: data.transfer_account,
                        ticketFooter: data.ticket_footer_note,
                        enabledCarriers: DEFAULT_SETTINGS.enabledCarriers,
                        localDeliveryCost: DEFAULT_SETTINGS.localDeliveryCost,
                        paymentMethods: currentMethods,
                    };
                }
            } catch (err) {
                console.warn('Fallo al obtener settings de Supabase, usando localStorage:', err);
            }
        }

        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { 
                    ...DEFAULT_SETTINGS, 
                    ...parsed,
                    paymentMethods: settingsService.getPaymentMethods()
                };
            }
        } catch (e) {
            console.error('Error leyendo settings:', e);
        }

        const initial = { ...DEFAULT_SETTINGS, paymentMethods: settingsService.getPaymentMethods() };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(initial));
        return initial;
    },

    saveSettings: async (newSettings) => {
        await simulateNetworkDelay(200);
        const merged = { ...DEFAULT_SETTINGS, ...newSettings };
        
        if (newSettings.paymentMethods) {
            settingsService.savePaymentMethods(newSettings.paymentMethods);
        }

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));

        if (isSupabaseConfigured()) {
            try {
                await supabase.from('store_settings').upsert({
                    store_name: merged.storeName,
                    legal_name: merged.legalName,
                    rif: merged.rif,
                    fiscal_address: merged.fiscalAddress,
                    phone: merged.phone,
                    email: merged.email,
                    iva_rate: merged.ivaRate,
                    igtf_rate: merged.igtfRate,
                    igtf_active: merged.igtfActive,
                    pagomovil_bank: merged.pagomovilBank,
                    pagomovil_phone: merged.pagomovilPhone,
                    pagomovil_rif: merged.pagomovilRif,
                    zelle_email: merged.zelleEmail,
                    zelle_holder: merged.zelleHolder,
                    transfer_bank: merged.transferBank,
                    transfer_account: merged.transferAccount,
                    ticket_footer_note: merged.ticketFooter,
                });
            } catch (err) {
                console.warn('No se pudo sincronizar configuración con Supabase:', err);
            }
        }

        window.dispatchEvent(new CustomEvent('store_settings_updated', { detail: merged }));
        return merged;
    }
};

export default settingsService;

