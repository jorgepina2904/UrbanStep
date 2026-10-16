import React from 'react';
import { AlertTriangle } from 'lucide-react';

/** Aviso cuando falta ejecutar modificaciones_fase3_sucursales.sql en Supabase. */
export default function SetupBanner({ detail }) {
    return (
        <p role="alert" className="flex items-start gap-2 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
                Falta activar el módulo multi-sucursal. Ejecuta <code>modificaciones_fase3_sucursales.sql</code> en el SQL Editor de Supabase y recarga.
                {detail ? <span className="block opacity-70 mt-1">Detalle: {detail}</span> : null}
            </span>
        </p>
    );
}

export const selectClass = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm py-2.5 px-3';
