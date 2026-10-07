import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

    const updateRate = useCallback((newRate, source = 'Manual') => {
        const updated = bcvService.updateRate(newRate, source);
        setRateData(updated);
        return updated;
    }, []);

    const refreshRate = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const updated = await bcvService.fetchOnlineRate();
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
            combined: `${formatUSD(usd)} / ${formatBs(bs)}`
        };
    }, [toBs, formatUSD, formatBs]);

    return (
        <CurrencyContext.Provider value={{
            rate: rateData.rate,
            lastUpdated: rateData.lastUpdated,
            source: rateData.source,
            isRefreshing,
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
