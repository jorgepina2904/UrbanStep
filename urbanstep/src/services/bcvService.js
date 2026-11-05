/**
 * bcvService.js — Servicio de gestión y sincronización de la Tasa Oficial del BCV
 * Conectado 100% a 'configuracion_tienda' y 'tasas_cambio' en Supabase.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';

const DEFAULT_RATE = Number(import.meta.env.VITE_DEFAULT_BCV_RATE) > 0 ? Number(import.meta.env.VITE_DEFAULT_BCV_RATE) : 42.50;

const RATE_STORAGE_KEY = 'urbanstep_last_bcv_rate';

const loadStoredRate = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(RATE_STORAGE_KEY) || 'null');
        if (stored && Number(stored.rate) > 0) return { ...stored, source: `${stored.source || 'BCV'} (última guardada)` };
    } catch { /* sin almacenamiento disponible */ }
    return null;
};

const storeRate = (data) => {
    try { localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(data)); } catch { /* sin almacenamiento disponible */ }
};

let _cachedRate = loadStoredRate() || {
    rate: DEFAULT_RATE,
    lastUpdated: new Date().toISOString(),
    source: 'Oficial BCV (Inicial)'
};

const emitRate = () => {
    storeRate(_cachedRate);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bcv_rate_updated', { detail: { ..._cachedRate } }));
    }
};

/**
 * Aplica la tasa guardada en Supabase solo si es más reciente que la que ya tiene la aplicación.
 * Antes, la lectura de la nube podía llegar después de la consulta en vivo y devolver una tasa vieja.
 */
const applyCloudRate = (row) => {
    if (!row || !(Number(row.tasa_bcv) > 0)) return false;
    const cloudTime = new Date(row.actualizado_el || 0).getTime();
    const currentTime = new Date(_cachedRate.lastUpdated || 0).getTime();
    const currentIsFallback = /Inicial|última guardada/.test(_cachedRate.source || '');
    if (!currentIsFallback && cloudTime < currentTime) return false;
    _cachedRate = {
        rate: Number(row.tasa_bcv),
        lastUpdated: row.actualizado_el || new Date().toISOString(),
        source: 'Configuración Tienda Supabase'
    };
    emitRate();
    return true;
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
            applyCloudRate(data);
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

                if (!error && data) {
                    applyCloudRate(data);
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
        storeRate(updatedData);

        // Persistir en Supabase mediante RPC seguro (o fallback directo)
        if (isSupabaseConfigured() && supabase) {
            (async () => {
                try {
                    const { error } = await supabase.rpc('actualizar_tasa_bcv', {
                        p_tasa: rateNum,
                        p_fuente: source
                    });
                    if (error) {
                        // Fallback si la función RPC aún no estuviese presente
                        await supabase
                            .from('configuracion_tienda')
                            .update({ tasa_bcv: rateNum, actualizado_el: nowIso })
                            .neq('id', '00000000-0000-0000-0000-000000000000');
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
                    }
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
     * Consulta la tasa oficial en vivo. Por defecto solo actualiza la pantalla (cualquier visitante de la
     * tienda la ejecuta al cargar); con `persist: true` (botón de sincronizar del panel) además la guarda
     * en Supabase y en el histórico, y solo si cambió, para no llenar el historial de registros repetidos.
     */
    fetchOnlineRate: async ({ persist = false } = {}) => {
        try {
            const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const data = await response.json();
            const online = Number(data?.promedio);
            if (online > 0) {
                const changed = Math.abs(online - _cachedRate.rate) >= 0.0001;
                if (persist && changed) return bcvService.updateRate(online, 'DolarAPI / BCV En Vivo');
                _cachedRate = {
                    rate: online,
                    lastUpdated: data.fechaActualizacion || new Date().toISOString(),
                    source: 'DolarAPI / BCV En Vivo'
                };
                emitRate();
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
