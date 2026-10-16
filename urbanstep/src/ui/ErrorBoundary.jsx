import React from 'react';

const CHUNK_ERROR = /Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i;
const RELOAD_FLAG = 'urbanstep_chunk_reload';

/**
 * Red de seguridad: si una pantalla falla al dibujarse, muestra un mensaje con opciones en lugar de dejar la
 * página en blanco o "colgada". Si la causa es un archivo de una versión anterior (pasa tras publicar una
 * actualización), recarga automáticamente una sola vez.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Error de pantalla capturado:', error, info?.componentStack);
        try {
            if (CHUNK_ERROR.test(String(error?.message || error)) && !sessionStorage.getItem(RELOAD_FLAG)) {
                sessionStorage.setItem(RELOAD_FLAG, '1');
                window.location.reload();
            }
        } catch { /* sin sessionStorage */ }
    }

    handleReset = async () => {
        // Limpia el service worker y su caché por si quedó una versión vieja de la aplicación
        try {
            const regs = await navigator.serviceWorker?.getRegistrations?.();
            await Promise.all((regs || []).map(r => r.unregister()));
            const keys = await caches?.keys?.();
            await Promise.all((keys || []).map(k => caches.delete(k)));
            sessionStorage.removeItem(RELOAD_FLAG);
        } catch { /* mejor esfuerzo */ }
        window.location.reload();
    };

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div role="alert" className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
                <div className="max-w-md w-full text-center space-y-4 p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
                    <p className="text-4xl" aria-hidden="true">🛠️</p>
                    <h1 className="text-lg font-black text-gray-900 dark:text-white">Algo no salió como esperábamos</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tus datos están a salvo. Intenta recargar; si vuelve a pasar, usa “Reiniciar la aplicación”.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button type="button" onClick={() => window.location.reload()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">Recargar</button>
                        <button type="button" onClick={this.handleReset} className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200">Reiniciar la aplicación</button>
                    </div>
                    <a href="/landing" className="block text-xs font-semibold text-blue-600">Ir a la tienda</a>
                    <p className="text-[11px] text-gray-400 break-words">{String(this.state.error?.message || this.state.error).slice(0, 160)}</p>
                </div>
            </div>
        );
    }
}
