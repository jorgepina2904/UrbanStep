/**
 * bcvService.js — Servicio de gestión y sincronización de la Tasa Oficial del BCV
 * Conectado 100% a 'configuracion_tienda' y 'tasas_cambio' en Supabase.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';

const DEFAULT_RATE = 42.50;

let _cachedRate = {
    rate: DEFAULT_RATE,
    lastUpdated: new Date().toISOString(),
    source: 'Oficial BCV (Inicial)'
};

// Carga inicial reactiva desde Supabase Cloud
const initRateFromCloud = async () => {
    if (isSupabaseConfigured() && supabase) {
        try {
            const { data } = await supabase
                .from('configuracion_tienda')
                .select('tasa_bcv, actualizado_el')
                .limit(1)
                .single();

            if (data && Number(data.tasa_bcv) > 0) {
                _cachedRate = {
                    rate: Number(data.tasa_bcv),
                    lastUpdated: data.actualizado_el || new Date().toISOString(),
                    source: 'Configuración Tienda Supabase'
                };
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('bcv_rate_updated', { detail: _cachedRate }));
                }
            }
        } catch (e) {
            console.warn('Aviso cargando tasa BCV de Supabase:', e);
        }
    }
};

if (typeof window !== 'undefined') {
    setTimeout(initRateFromCloud, 10);
}

export const bcvService = {
    /**
     * Obtiene la tasa activa actual sincrónicamente desde la memoria activa
     */
    getRate: () => {
        return { ..._cachedRate };
    },

    /**
     * Obtiene la tasa activa fresca directamente de Supabase
     */
    fetchRateFromCloud: async () => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('configuracion_tienda')
                    .select('tasa_bcv, actualizado_el')
                    .limit(1)
                    .single();

                if (!error && data && Number(data.tasa_bcv) > 0) {
                    _cachedRate = {
                        rate: Number(data.tasa_bcv),
                        lastUpdated: data.actualizado_el || new Date().toISOString(),
                        source: 'Configuración Tienda Supabase'
                    };
                    return { ..._cachedRate };
                }
            } catch (err) {
                console.error('Error consultando tasa BCV en Supabase:', err);
            }
        }
        return { ..._cachedRate };
    },

    /**
     * Actualiza la tasa del BCV en la base de datos Supabase y registra en historial
     */
    updateRate: (newRate, source = 'Ajuste Manual') => {
        const rateNum = parseFloat(newRate);
        if (isNaN(rateNum) || rateNum <= 0) {
            throw new Error('La tasa debe ser un número positivo válido');
        }

        const nowIso = new Date().toISOString();
        const updatedData = {
            rate: rateNum,
            lastUpdated: nowIso,
            source
        };

        _cachedRate = updatedData;

        // Persistir en Supabase de forma asíncrona sin bloquear la UI
        if (isSupabaseConfigured() && supabase) {
            (async () => {
                try {
                    // 1. Actualizar tasa en configuracion_tienda
                    await supabase
                        .from('configuracion_tienda')
                        .update({
                            tasa_bcv: rateNum,
                            actualizado_el: nowIso
                        })
                        .neq('id', '00000000-0000-0000-0000-000000000000');

                    // 2. Registrar en histórico tasas_cambio
                    await supabase
                        .from('tasas_cambio')
                        .insert({
                            tasa: rateNum,
                            moneda_origen: 'USD',
                            moneda_destino: 'VES',
                            fuente: source,
                            registrado_por: 'Administrador',
                            creado_el: nowIso
                        });
                } catch (err) {
                    console.error('Error persistiendo tasa BCV en Supabase:', err);
                }
            })();
        }

        // Emitir evento reactivo para toda la aplicación
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('bcv_rate_updated', { detail: updatedData }));
        }

        return updatedData;
    },

    /**
     * Intenta consultar la tasa oficial en vivo desde la API pública de Venezuela
     */
    fetchOnlineRate: async () => {
        try {
            const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const data = await response.json();
            if (data && data.promedio && Number(data.promedio) > 0) {
                return bcvService.updateRate(data.promedio, 'DolarAPI / BCV En Vivo');
            }
        } catch (err) {
            console.warn('No se pudo sincronizar automáticamente con la API del BCV (usando tasa almacenada):', err);
        }
        return bcvService.getRate();
    },

    /**
     * Obtiene el histórico de tasas registradas desde Supabase Cloud
     */
    getHistory: async () => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('tasas_cambio')
                    .select('*')
                    .order('creado_el', { ascending: false })
                    .limit(30);

                if (!error && Array.isArray(data)) {
                    return data.map(r => ({
                        id: r.id,
                        rate: Number(r.tasa),
                        lastUpdated: r.creado_el,
                        source: r.fuente || 'BCV Oficial'
                    }));
                }
            } catch (err) {
                console.error('Error obteniendo historial de tasas en Supabase:', err);
            }
        }
        return [_cachedRate];
    }
};

export default bcvService;
