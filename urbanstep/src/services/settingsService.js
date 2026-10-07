/**
 * settingsService.js — Gestión de configuraciones de la tienda y SENIAT
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { simulateNetworkDelay } from './api';

const SETTINGS_KEY = 'urbanstep_store_settings';

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
    
    // Envíos nacionales
    enabledCarriers: ['retiro_tienda', 'delivery_local', 'mrw', 'zoom', 'tealca'],
    localDeliveryCost: 3.50,
};

export const settingsService = {
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
                    };
                }
            } catch (err) {
                console.warn('Fallo al obtener settings de Supabase, usando localStorage:', err);
            }
        }

        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        } catch (e) {
            console.error('Error leyendo settings:', e);
        }

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        return { ...DEFAULT_SETTINGS };
    },

    saveSettings: async (newSettings) => {
        await simulateNetworkDelay(200);
        const merged = { ...DEFAULT_SETTINGS, ...newSettings };
        
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
