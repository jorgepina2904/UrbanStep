-- ==============================================================================
-- URBANSTEP · SEGURIDAD DE USUARIOS Y VALIDACIONES ÚNICAS
-- Ejecutar completo en Supabase > SQL Editor. Es idempotente: puede correrse varias veces.
--
-- 1. Cifra con bcrypt todas las contraseñas de `usuarios` y las nuevas que se guarden.
-- 2. Verifica el inicio de sesión en el servidor (login_usuario) sin exponer el hash.
-- 3. Oculta la columna password_hash a la llave pública (anon / authenticated).
-- 4. Impide correos duplicados en usuarios y cédulas/correos duplicados en clientes.
--
-- IMPORTANTE: los usuarios sin contraseña guardada (p. ej. motorizados creados por SQL)
-- no podrán entrar hasta que un administrador les asigne una en Configuración > Usuarios.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. Cifrado automático de contraseñas (bcrypt)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usuarios_cifrar_password()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    IF NEW.password_hash IS NOT NULL AND btrim(NEW.password_hash) = '' THEN
        NEW.password_hash := NULL;
    ELSIF NEW.password_hash IS NOT NULL AND NEW.password_hash !~ '^\$2[aby]\$' THEN
        NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf', 10));
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_cifrar_password ON usuarios;
CREATE TRIGGER trg_usuarios_cifrar_password
    BEFORE INSERT OR UPDATE OF password_hash ON usuarios
    FOR EACH ROW EXECUTE FUNCTION public.usuarios_cifrar_password();

-- Cifra las contraseñas que hoy están en texto plano
UPDATE usuarios
SET password_hash = password_hash
WHERE password_hash IS NOT NULL AND password_hash !~ '^\$2[aby]\$';

-- ------------------------------------------------------------------------------
-- 2. Verificación de credenciales en el servidor
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.login_usuario(p_correo text, p_password text)
RETURNS TABLE (
    id uuid,
    nombre_completo text,
    correo text,
    rol text,
    sucursal text,
    caja_asignada_id text,
    telefono text,
    activo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT u.id, u.nombre_completo::text, u.correo::text, u.rol::text, u.sucursal::text,
           u.caja_asignada_id::text, u.telefono::text, u.activo
    FROM usuarios u
    WHERE lower(u.correo) = lower(btrim(p_correo))
      AND u.password_hash IS NOT NULL
      AND u.password_hash = crypt(p_password, u.password_hash)
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.login_usuario(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_usuario(text, text) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. La llave pública puede leer usuarios, pero nunca la columna password_hash
-- ------------------------------------------------------------------------------
REVOKE SELECT ON usuarios FROM anon, authenticated;
GRANT SELECT (
    id, usuario_auth_id, nombre_completo, correo, rol, sucursal, caja_asignada_id, activo,
    creado_el, actualizado_el, telefono, vehiculo, placa, rating, deliveries_count
) ON usuarios TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. Unicidad (si ya hay duplicados, se avisa y se omite: revisa las consultas del final)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_unico ON usuarios (lower(correo));
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay correos de usuarios repetidos (mayúsculas/minúsculas). Depúralos y vuelve a ejecutar.';
END $$;

DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS clientes_documento_unico
        ON clientes (tipo_documento, numero_documento)
        WHERE id <> 'publico' AND numero_documento <> '00000000';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay clientes con la misma cédula/RIF. Depúralos y vuelve a ejecutar.';
END $$;

DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS clientes_correo_unico
        ON clientes (lower(correo))
        WHERE correo IS NOT NULL AND correo <> '';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Hay clientes con el mismo correo. Depúralos y vuelve a ejecutar.';
END $$;

-- ------------------------------------------------------------------------------
-- Diagnóstico de duplicados (ejecutar aparte si apareció algún aviso)
-- ------------------------------------------------------------------------------
-- SELECT lower(correo) AS correo, count(*) FROM usuarios GROUP BY 1 HAVING count(*) > 1;
-- SELECT tipo_documento, numero_documento, count(*) FROM clientes
--   WHERE id <> 'publico' AND numero_documento <> '00000000' GROUP BY 1, 2 HAVING count(*) > 1;
-- SELECT lower(correo) AS correo, count(*) FROM clientes
--   WHERE correo IS NOT NULL AND correo <> '' GROUP BY 1 HAVING count(*) > 1;
--
-- Usuarios que hoy no pueden iniciar sesión por no tener contraseña:
-- SELECT nombre_completo, correo, rol FROM usuarios WHERE password_hash IS NULL;
