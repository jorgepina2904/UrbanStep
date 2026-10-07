import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { shiftService } from '../services/shiftService';

export const ShiftContext = createContext(null);

export const ShiftProvider = ({ children }) => {
    const [activeShift, setActiveShift] = useState(() => shiftService.getCurrentShift());
    const [lastSale, setLastSaleState] = useState(() => shiftService.getLastSale());

    useEffect(() => {
        const handleShiftChange = (event) => {
            setActiveShift(event.detail);
        };
        window.addEventListener('shift_status_changed', handleShiftChange);
        return () => window.removeEventListener('shift_status_changed', handleShiftChange);
    }, []);

    const openShift = useCallback(async (data) => {
        const newShift = await shiftService.openShift(data);
        setActiveShift(newShift);
        return newShift;
    }, []);

    const closeShift = useCallback(async (data) => {
        const closed = await shiftService.closeShift(data);
        setActiveShift(null);
        return closed;
    }, []);

    const setLastSale = useCallback((sale) => {
        shiftService.saveLastSale(sale);
        setLastSaleState(sale);
    }, []);

    return (
        <ShiftContext.Provider value={{
            activeShift,
            isOpen: Boolean(activeShift && activeShift.status === 'open'),
            openShift,
            closeShift,
            lastSale,
            setLastSale,
            getShiftSummary: shiftService.getShiftSummary,
        }}>
            {children}
        </ShiftContext.Provider>
    );
};

export const useShift = () => {
    const context = useContext(ShiftContext);
    if (!context) {
        throw new Error('useShift debe usarse dentro de un ShiftProvider');
    }
    return context;
};

export default ShiftContext;
