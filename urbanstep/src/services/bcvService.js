/**
 * bcvService.js — Servicio de gestión y sincronización de la Tasa Oficial del BCV
 */

const STORAGE_KEY = 'urbanstep_bcv_rate';
const HISTORY_KEY = 'urbanstep_bcv_history';
const DEFAULT_RATE = 42.50;

export const bcvService = {
    /**
     * Obtiene la tasa activa actual
     */
    getRate: () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.rate > 0) return parsed;
            }
        } catch (e) {
            console.error('Error al leer tasa BCV de localStorage:', e);
        }

        const initial = {
            rate: DEFAULT_RATE,
            lastUpdated: new Date().toISOString(),
            source: 'Oficial BCV (Inicial)'
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
    },

    /**
     * Actualiza manualmente la tasa del BCV
     */
    updateRate: (newRate, source = 'Ajuste Manual') => {
        const rateNum = parseFloat(newRate);
        if (isNaN(rateNum) || rateNum <= 0) {
            throw new Error('La tasa debe ser un número positivo válido');
        }

        const updatedData = {
            rate: rateNum,
            lastUpdated: new Date().toISOString(),
            source
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));

        // Guardar en histórico
        try {
            const rawHistory = localStorage.getItem(HISTORY_KEY);
            const history = rawHistory ? JSON.parse(rawHistory) : [];
            history.unshift({ ...updatedData, id: Date.now().toString() });
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
        } catch (e) {
            console.error('Error guardando histórico BCV:', e);
        }

        // Emitir evento para reactividad inmediata entre componentes
        window.dispatchEvent(new CustomEvent('bcv_rate_updated', { detail: updatedData }));

        return updatedData;
    },

    /**
     * Intenta consultar la tasa oficial en vivo desde la API pública de Venezuela
     * Si no hay internet o la API falla, mantiene la tasa actual de forma segura.
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
     * Obtiene el histórico de tasas registradas
     */
    getHistory: () => {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }
};

export default bcvService;
