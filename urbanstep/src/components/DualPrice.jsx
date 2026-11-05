import React from 'react';
import { useCurrency } from '../contexts/CurrencyContext';

/**
 * Componente unificado para renderizar precios duales ($ y Bs.)
 * Respeta la inversión global configurada por el usuario (localStorage)
 */
export default function DualPrice({
    usd = 0,
    size = 'md', // 'sm' | 'md' | 'lg'
    className = '',
    primaryClassName = '',
    secondaryClassName = '',
    stacked = true
}) {
    const { renderDualPrice } = useCurrency();
    const { primary, secondary, isBsPrimary } = renderDualPrice(usd);

    const sizeStyles = {
        sm: {
            primary: 'text-sm font-bold',
            secondary: 'text-[10px] font-mono font-semibold'
        },
        md: {
            primary: 'text-base sm:text-lg font-bold',
            secondary: 'text-xs font-mono font-bold'
        },
        lg: {
            primary: 'text-xl sm:text-2xl font-black',
            secondary: 'text-xs sm:text-sm font-mono font-bold'
        }
    };

    const currentSize = sizeStyles[size] || sizeStyles.md;

    return (
        <div className={`min-w-0 ${stacked ? 'flex flex-col' : 'inline-flex items-baseline gap-1.5'} ${className}`}>
            <span
                className={`${currentSize.primary} text-gray-900 dark:text-white leading-tight tracking-tight truncate ${primaryClassName}`}
            >
                {primary}
            </span>
            <span
                className={`${currentSize.secondary} truncate ${
                    isBsPrimary
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                } ${secondaryClassName}`}
            >
                {secondary}
            </span>
        </div>
    );
}
