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
