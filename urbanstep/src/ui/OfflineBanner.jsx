import React, { useEffect, useState, useCallback } from 'react';
import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPendingCount, syncPendingSales } from '../services/offlineSync';

/**
 * Indicador flotante de conexión: avisa cuando la caja trabaja sin internet y cuántas
 * ventas esperan subir a Supabase. Aparece solo si hay algo que informar.
 */
export default function OfflineBanner() {
    const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
    const [pending, setPending] = useState(0);
    const [syncing, setSyncing] = useState(false);

    const refresh = useCallback(async () => setPending(await getPendingCount()), []);

    useEffect(() => {
        const goOnline = () => setOnline(true);
        const goOffline = () => setOnline(false);
        const onQueue = (e) => setPending(e.detail?.pending ?? 0);
        const onSynced = (e) => toast.success(`${e.detail?.synced || 0} venta(s) sin conexión sincronizadas con la nube`);

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        window.addEventListener('offline_queue_changed', onQueue);
        window.addEventListener('offline_sales_synced', onSynced);
        refresh();
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('offline_queue_changed', onQueue);
            window.removeEventListener('offline_sales_synced', onSynced);
        };
    }, [refresh]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const { failed } = await syncPendingSales();
            if (failed > 0) toast.error(`${failed} venta(s) fueron rechazadas por el servidor; se reintentarán`);
        } finally {
            setSyncing(false);
        }
    };

    if (online && pending === 0) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-4 left-4 z-[60] flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-xl border print:hidden ${
                online
                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                    : 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800'
            }`}
        >
            {online ? <CloudUpload className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>
                {online ? 'Con conexión' : 'Sin conexión: la caja sigue cobrando'}
                {pending > 0 && ` · ${pending} venta(s) pendiente(s) de subir`}
            </span>
            {online && pending > 0 && (
                <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 disabled:opacity-60"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar
                </button>
            )}
        </div>
    );
}
