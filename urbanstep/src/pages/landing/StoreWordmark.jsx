import React from 'react';

/**
 * Logotipo oficial (emblema) con la tipografía del diseño Sportswear Elite.
 * `onDark` fuerza el texto claro (p. ej. en el pie de página, que siempre es oscuro).
 */
export default function StoreWordmark({ subtitle = 'PERFORMANCE • VZLA', onDark = false }) {
    return (
        <span className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-black border border-us-cyan/40 shadow-md shadow-cyan-500/20 p-1 flex items-center justify-center shrink-0">
                <img src="/brand/urbanstep-emblem.png" alt="" className="w-full h-full object-contain" />
            </span>
            <span className="flex flex-col">
                <span className={`font-us-display font-black text-lg tracking-tight uppercase leading-none ${onDark ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    URBAN<span className={onDark ? 'text-us-cyan' : 'text-sky-600 dark:text-us-cyan'}>STEP</span>
                </span>
                {subtitle && (
                    <span className={`font-us-mono text-[9px] tracking-widest uppercase ${onDark ? 'text-us-cyan' : 'text-sky-600 dark:text-us-cyan'}`}>{subtitle}</span>
                )}
            </span>
        </span>
    );
}
