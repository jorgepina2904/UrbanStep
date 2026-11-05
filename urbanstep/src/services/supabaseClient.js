import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
    return Boolean(
        supabaseUrl && 
        supabaseAnonKey && 
        supabaseUrl.startsWith('http') && 
        supabaseAnonKey.length > 20
    );
};

export const supabase = isSupabaseConfigured()
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Registra un suscriptor que se ejecuta cuando hay una sesión activa de Supabase
 * (al inicio de sesión o al restaurar la sesión), para que los servicios recarguen sus cachés autorizadas.
 */
const sessionListeners = new Set();

export const onCloudSession = (callback) => {
    if (typeof callback !== 'function') return () => {};
    sessionListeners.add(callback);

    if (isSupabaseConfigured() && supabase) {
        supabase.auth.getSession().then(({ data }) => {
            if (data?.session?.user) {
                try { callback(data.session); } catch (e) { console.warn('Error en callback onCloudSession:', e); }
            }
        }).catch(() => {});
    }

    return () => { sessionListeners.delete(callback); };
};

export const triggerCloudSession = (session) => {
    sessionListeners.forEach(cb => {
        try { cb(session); } catch (e) { console.warn('Error ejecutando listener de sesión:', e); }
    });
};

if (isSupabaseConfigured() && supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
            triggerCloudSession(session);
        }
    });
}

/**
 * Prueba la conectividad con Supabase
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const testSupabaseConnection = async () => {
    if (!isSupabaseConfigured()) {
        return {
            success: false,
            message: 'Supabase no está configurado. Operando en Modo Local (LocalStorage / Cache). Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env o en Vercel.'
        };
    }
    
    try {
        const { error } = await supabase.from('store_settings').select('store_name').limit(1);
        if (error) {
            return {
                success: false,
                message: `Error al conectar con Supabase: ${error.message}. Asegúrate de haber ejecutado el script 'supabase_schema.sql' en el SQL Editor.`
            };
        }
        return {
            success: true,
            message: '¡Conexión exitosa con la base de datos de Supabase!'
        };
    } catch (err) {
        return {
            success: false,
            message: `Fallo de red al conectar con Supabase: ${err.message}`
        };
    }
};
