import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { bcvService } from '../services/bcvService';

export const CurrencyContext = createContext(null);

export const CurrencyProvider = ({ children }) => {
    const [rateData, setRateData] = useState(() => bcvService.getRate());
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        // Escuchar cambios de tasa en cualquier parte de la app
        const handleRateChange = (event) => {
            if (event.detail) {
                setRateData(event.detail);
            }
        };
        window.addEventListener('bcv_rate_updated', handleRateChange);
        
        // Intentar actualizar tasa de forma silenciosa al arrancar
        bcvService.fetchOnlineRate().catch(() => {});

        return () => window.removeEventListener('bcv_rate_updated', handleRateChange);
    }, []);

    // Moneda primaria para visualización de precios: 'USD' (por defecto) o 'VES' (invertido)
    const [primaryCurrency, setPrimaryCurrencyState] = useState(() => {
        try {
            return localStorage.getItem('urbanstep_primary_currency') || 'USD';
        } catch {
            return 'USD';
        }
    });

    const primaryCurrencyRef = useRef(primaryCurrency);
    useEffect(() => {
        primaryCurrencyRef.current = primaryCurrency;
    }, [primaryCurrency]);

    const isSwapped = primaryCurrency === 'VES';

    const setPrimaryCurrency = useCallback((curr) => {
        const next = curr === 'VES' ? 'VES' : 'USD';
        primaryCurrencyRef.current = next;
        try {
            localStorage.setItem('urbanstep_primary_currency', next);
        } catch (e) {
            console.warn('Error saving primary currency:', e);
        }
        setPrimaryCurrencyState(next);
        window.dispatchEvent(new CustomEvent('urbanstep_currency_mode_changed', { detail: next }));
    }, []);

    const toggleCurrencyOrder = useCallback(() => {
        const next = primaryCurrencyRef.current === 'USD' ? 'VES' : 'USD';
        primaryCurrencyRef.current = next;
        try {
            localStorage.setItem('urbanstep_primary_currency', next);
        } catch (e) {
            console.warn('Error saving primary currency:', e);
        }
        setPrimaryCurrencyState(next);
        window.dispatchEvent(new CustomEvent('urbanstep_currency_mode_changed', { detail: next }));
    }, []);

    // Escuchar cambios de preferencia entre pestañas o módulos
    useEffect(() => {
        const handleCurrencyMode = (e) => {
            if (e.detail && (e.detail === 'USD' || e.detail === 'VES')) {
                if (e.detail !== primaryCurrencyRef.current) {
                    primaryCurrencyRef.current = e.detail;
                    setPrimaryCurrencyState(e.detail);
                }
            }
        };
        const handleStorage = (e) => {
            if (e.key === 'urbanstep_primary_currency' && (e.newValue === 'USD' || e.newValue === 'VES')) {
                if (e.newValue !== primaryCurrencyRef.current) {
                    primaryCurrencyRef.current = e.newValue;
                    setPrimaryCurrencyState(e.newValue);
                }
            }
        };
        window.addEventListener('urbanstep_currency_mode_changed', handleCurrencyMode);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('urbanstep_currency_mode_changed', handleCurrencyMode);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const updateRate = useCallback((newRate, source = 'Manual') => {
        const updated = bcvService.updateRate(newRate, source);
        setRateData(updated);
        return updated;
    }, []);

    const refreshRate = useCallback(async () => {
        setIsRefreshing(true);
        try {
            // Sincronización manual desde el panel: se guarda en Supabase si la tasa cambió
            const updated = await bcvService.fetchOnlineRate({ persist: true });
            setRateData(updated);
            return updated;
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    const toBs = useCallback((usdAmount) => {
        const num = Number(usdAmount) || 0;
        return num * rateData.rate;
    }, [rateData.rate]);

    const toUSD = useCallback((bsAmount) => {
        const num = Number(bsAmount) || 0;
        return rateData.rate > 0 ? num / rateData.rate : 0;
    }, [rateData.rate]);

    const formatBs = useCallback((bsAmount) => {
        const num = Number(bsAmount) || 0;
        return `Bs. ${new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num)}`;
    }, []);

    const formatUSD = useCallback((usdAmount) => {
        const num = Number(usdAmount) || 0;
        return `$ ${new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num)}`;
    }, []);

    const formatDual = useCallback((usdAmount) => {
        const usd = Number(usdAmount) || 0;
        const bs = toBs(usd);
        return {
            usd: formatUSD(usd),
            bs: formatBs(bs),
            combined: isSwapped ? `${formatBs(bs)} / ${formatUSD(usd)}` : `${formatUSD(usd)} / ${formatBs(bs)}`
        };
    }, [toBs, formatUSD, formatBs, isSwapped]);

    /**
     * Monto principal y secundario según la moneda elegida en el conversor ($ ⇄ Bs.).
     * `bsAmount` permite mostrar el equivalente histórico de una venta (su tasa del día) en lugar
     * de recalcularlo con la tasa actual.
     */
    const bsOf = useCallback((usdAmount, bsAmount) => (Number(bsAmount) > 0 ? Number(bsAmount) : toBs(usdAmount)), [toBs]);

    const primaryAmount = useCallback((usdAmount, bsAmount) => (
        isSwapped ? formatBs(bsOf(usdAmount, bsAmount)) : formatUSD(usdAmount)
    ), [isSwapped, formatBs, formatUSD, bsOf]);

    const secondaryAmount = useCallback((usdAmount, bsAmount) => (
        isSwapped ? formatUSD(usdAmount) : formatBs(bsOf(usdAmount, bsAmount))
    ), [isSwapped, formatBs, formatUSD, bsOf]);

    /**
     * Retorna los textos formateados grande y pequeño respetando la inversión de moneda configurada
     */
    const renderDualPrice = useCallback((usdAmount) => {
        const usd = Number(usdAmount) || 0;
        const bs = toBs(usd);
        if (isSwapped) {
            return {
                primary: formatBs(bs),
                secondary: formatUSD(usd),
                isBsPrimary: true,
                usdFormatted: formatUSD(usd),
                bsFormatted: formatBs(bs)
            };
        }
        return {
            primary: formatUSD(usd),
            secondary: formatBs(bs),
            isBsPrimary: false,
            usdFormatted: formatUSD(usd),
            bsFormatted: formatBs(bs)
        };
    }, [toBs, formatBs, formatUSD, isSwapped]);

    return (
        <CurrencyContext.Provider value={{
            rate: rateData.rate,
            lastUpdated: rateData.lastUpdated,
            source: rateData.source,
            isRefreshing,
            primaryCurrency,
            isSwapped,
            setPrimaryCurrency,
            toggleCurrencyOrder,
            renderDualPrice,
            primaryAmount,
            secondaryAmount,
            updateRate,
            refreshRate,
            toBs,
            toUSD,
            formatBs,
            formatUSD,
            formatDual
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency debe usarse dentro de un CurrencyProvider');
    }
    return context;
};

export default CurrencyContext;
