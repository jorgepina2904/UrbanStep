import { lazy } from 'react';

const RELOAD_FLAG = 'urbanstep_chunk_reload';

/**
 * React.lazy con recuperación: si el archivo de la pantalla ya no existe (se publicó una versión nueva mientras la
 * pestaña seguía abierta), recarga la página una vez para tomar la versión actual en vez de quedarse en "Cargando".
 */
export const lazyWithRetry = (factory) => lazy(() =>
    factory()
        .then((mod) => {
            try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* sin sessionStorage */ }
            return mod;
        })
        .catch((error) => {
            try {
                if (!sessionStorage.getItem(RELOAD_FLAG)) {
                    sessionStorage.setItem(RELOAD_FLAG, '1');
                    window.location.reload();
                    return new Promise(() => {}); // la página se recarga; no resolver
                }
            } catch { /* sin sessionStorage */ }
            throw error;
        })
);

export default lazyWithRetry;
