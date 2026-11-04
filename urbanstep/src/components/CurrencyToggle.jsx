import React from 'react';
import { ArrowLeftRight, DollarSign } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

export default function CurrencyToggle({ compact = false, showLabel = true, className = '' }) {
    const { isSwapped, toggleCurrencyOrder, primaryCurrency } = useCurrency();

    return (
        <button
            type="button"
            onClick={toggleCurrencyOrder}
            className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 select-none ${
                isSwapped
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-sm'
                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 shadow-sm'
            } ${className}`}
            title={`Modo actual: ${isSwapped ? 'Bs. grande / $ pequeño' : '$ grande / Bs. pequeño'}. Clic para invertir posiciones de visualización en todos los módulos.`}
            aria-label="Invertir moneda principal $ y Bs."
        >
            <div className="flex items-center gap-1 font-mono">
                <span className={`px-1 py-0.5 rounded text-[11px] font-black transition-transform ${
                    !isSwapped
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 opacity-70'
                }`}>
                    $
                </span>
                
                <ArrowLeftRight className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180 ${
                    isSwapped ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                }`} />

                <span className={`px-1 py-0.5 rounded text-[11px] font-black transition-transform ${
                    isSwapped
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 opacity-70'
                }`}>
                    Bs
                </span>
            </div>

            {showLabel && !compact && (
                <span className="hidden sm:inline-block text-[10px] font-medium opacity-80 border-l border-current/20 pl-1.5 ml-0.5">
                    {isSwapped ? 'Bs. Principal' : '$ Principal'}
                </span>
            )}
        </button>
    );
}
