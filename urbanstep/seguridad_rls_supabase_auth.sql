-- ==============================================================================
-- URBANSTEP · ACCESO CON SUPABASE AUTH Y POLÍTICAS RLS POR ROL
-- Ejecutar completo en Supabase > SQL Editor DESPUÉS de seguridad_usuarios_validaciones.sql.
-- Es idempotente: puede correrse varias veces. Todo corre en una sola transacción: si algo
-- falla (incluida la verificación final) no se aplica ningún cambio.
--
-- Qué hace:
--  1. Crea (o vincula) una cuenta de Supabase Auth para cada fila de `usuarios` y la enlaza en
--     usuarios.usuario_auth_id. Las contraseñas ya cifradas con bcrypt se trasladan tal cual:
--     cada persona sigue entrando con su correo y su contraseña. Desde aquí la contraseña vive
--     solo en Supabase Auth (usuarios.password_hash queda vacío).
--  2. public.rol_actual(): rol del usuario con sesión, leído SIEMPRE de la tabla `usuarios`
--     (nunca de user_metadata, que el propio usuario puede editar). Un usuario desactivado no
--     tiene rol y su cuenta de acceso queda bloqueada.
--  3. Reemplaza todas las políticas USING (true) por políticas por rol (mapa de
--     src/utils/permissions.js). La llave anónima solo lee el catálogo y los datos públicos de
--     la tienda; ventas, facturas y compras no se pueden borrar (Providencia SENIAT 0071).
--  4. Lleva al servidor lo que el navegador del cliente ya no puede hacer directamente:
--     descontar el stock del pedido web, numerarlo, registrar su ficha de cliente, guardar
--     carritos abandonados y actualizar la tasa BCV.
--
-- Después de ejecutarlo:
--  - Usuarios sin contraseña guardada (p. ej. motorizados creados por SQL): el administrador
--    les asigna una en Configuración > Usuarios, o usan "¿Olvidaste tu contraseña?".
--  - Revisa los avisos (NOTICE/WARNING) y las consultas de verificación del final.
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Funciones internas: fuera del esquema público, la API (PostgREST) no puede invocarlas
CREATE SCHEMA IF NOT EXISTS privado;
REVOKE ALL ON SCHEMA privado FROM PUBLIC;
DO $$
BEGIN
    EXECUTE 'REVOKE ALL ON SCHEMA privado FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 0. Estructura necesaria
-- ------------------------------------------------------------------------------
-- Los roles motorizado y cliente los agrega fix_usuarios_schema.sql (un valor nuevo de enum no
-- puede usarse en la misma transacción en que se crea)
DO $$
BEGIN
    IF (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'rol_usuario_enum' AND e.enumlabel IN ('motorizado', 'cliente')) < 2 THEN
        RAISE EXCEPTION 'Faltan los roles motorizado/cliente en rol_usuario_enum: ejecuta primero fix_usuarios_schema.sql';
    END IF;
END $$;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario_auth_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_usuario_auth_id_unico ON usuarios (usuario_auth_id) WHERE usuario_auth_id IS NOT NULL;

-- Vínculo de la ficha de cliente con su cuenta web (dueño de sus pedidos)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS usuario_auth_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS clientes_usuario_auth_id_unico ON clientes (usuario_auth_id) WHERE usuario_auth_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_envios_venta_id ON envios (venta_id);

-- Un correo repetido impediría saber a qué cuenta de acceso pertenece cada usuario
DO $$
DECLARE v_repetidos text;
BEGIN
    SELECT string_agg(correo, ', ') INTO v_repetidos
    FROM (SELECT lower(btrim(correo)) AS correo FROM usuarios GROUP BY 1 HAVING count(*) > 1) d;
    IF v_repetidos IS NOT NULL THEN
        RAISE EXCEPTION 'Hay correos repetidos en usuarios (%). Depúralos y vuelve a ejecutar el script.', v_repetidos;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Rol del usuario con sesión (SIEMPRE desde la tabla `usuarios`)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT u.rol::text
    FROM public.usuarios u
    WHERE u.usuario_auth_id = auth.uid()
      AND u.activo IS NOT FALSE
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.usuario_actual_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT u.id FROM public.usuarios u WHERE u.usuario_auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.tiene_rol(VARIADIC p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(public.rol_actual() = ANY (p_roles), false);
$$;

-- Grupos de roles (Supervisor = 'gerente'; 'almacenista' opera como Cajero, igual que en la app)
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT public.tiene_rol('admin'); $$;

CREATE OR REPLACE FUNCTION public.puede_gestionar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT public.tiene_rol('admin', 'gerente'); $$;

CREATE OR REPLACE FUNCTION public.puede_vender()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT public.tiene_rol('admin', 'gerente', 'cajero', 'almacenista'); $$;

CREATE OR REPLACE FUNCTION public.es_personal()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT public.tiene_rol('admin', 'gerente', 'cajero', 'almacenista', 'motorizado'); $$;

-- Propiedad de los datos del cliente web
CREATE OR REPLACE FUNCTION public.es_cliente_propio(p_cliente_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = p_cliente_id AND c.usuario_auth_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.es_venta_propia(p_venta_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.ventas v
        JOIN public.clientes c ON c.id = v.cliente_id
        WHERE v.id = p_venta_id AND c.usuario_auth_id = auth.uid()
    );
$$;

-- Pedido web del propio cliente recién creado: solo entonces admite renglones, pago y despacho
CREATE OR REPLACE FUNCTION public.es_pedido_web_abierto(p_venta_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.ventas v
        JOIN public.clientes c ON c.id = v.cliente_id
        WHERE v.id = p_venta_id
          AND c.usuario_auth_id = auth.uid()
          AND v.nombre_cajero = 'Ecommerce Web'
          AND v.creado_el > now() - interval '30 minutes'
    );
$$;

-- Reseña con "compra verificada": el servidor comprueba que el cliente compró el producto
CREATE OR REPLACE FUNCTION public.compro_producto(p_producto_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.detalles_venta d
        JOIN public.ventas v ON v.id = d.venta_id
        JOIN public.clientes c ON c.id = v.cliente_id
        WHERE d.producto_id = p_producto_id AND c.usuario_auth_id = auth.uid()
    );
$$;

-- ------------------------------------------------------------------------------
-- 2. Cuentas de Supabase Auth ligadas a `usuarios`
-- ------------------------------------------------------------------------------
-- Crea la cuenta de acceso (o reutiliza la que ya tenga ese correo, p. ej. un cliente de
-- Google) y devuelve su id. p_hash es un bcrypt ($2a$...), el mismo formato de Supabase Auth.
CREATE OR REPLACE FUNCTION privado.cuenta_auth_vincular(p_correo text, p_hash text, p_nombre text, p_activo boolean DEFAULT true)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_correo text := lower(btrim(p_correo));
    v_id uuid;
BEGIN
    IF v_correo IS NULL OR v_correo = '' THEN
        RAISE EXCEPTION 'El usuario necesita un correo para su cuenta de acceso';
    END IF;

    SELECT id INTO v_id FROM auth.users WHERE lower(email) = v_correo ORDER BY created_at LIMIT 1;

    IF v_id IS NULL THEN
        v_id := gen_random_uuid();
        -- origen=usuarios evita que el trigger de registro público cree una segunda fila de cliente
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_correo,
            COALESCE(p_hash, ''), now(),
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'origen', 'usuarios'),
            jsonb_build_object('full_name', p_nombre), now(), now(),
            '', '', '', ''
        );
        INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        VALUES (
            gen_random_uuid(), v_id, v_id::text,
            jsonb_build_object('sub', v_id::text, 'email', v_correo, 'email_verified', true),
            'email', now(), now(), now()
        );
    ELSIF p_hash IS NOT NULL THEN
        -- `usuarios` es la fuente de la contraseña del personal: la cuenta previa adopta la suya
        UPDATE auth.users SET encrypted_password = p_hash, updated_at = now() WHERE id = v_id;
        BEGIN
            DELETE FROM auth.sessions WHERE user_id = v_id;
        EXCEPTION WHEN undefined_table OR insufficient_privilege THEN NULL;
        END;
    END IF;

    UPDATE auth.users
    SET banned_until = CASE WHEN p_activo IS FALSE THEN 'infinity'::timestamptz END
    WHERE id = v_id;

    RETURN v_id;
END;
$$;

-- Cifra con bcrypt si llega en texto plano (la app envía la contraseña nueva por HTTPS)
CREATE OR REPLACE FUNCTION privado.bcrypt(p_password text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NULLIF(btrim(p_password), '') IS NULL THEN
        RETURN NULL;
    END IF;
    IF p_password ~ '^\$2[aby]\$' THEN
        RETURN p_password;
    END IF;
    RETURN crypt(p_password, gen_salt('bf', 10));
END;
$$;

-- Configuración > Usuarios sigue escribiendo en `usuarios`; este trigger mantiene la cuenta de
-- acceso al día: la crea al dar de alta, cambia contraseña y correo, y bloquea al desactivar.
CREATE OR REPLACE FUNCTION public.usuarios_sincronizar_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_hash text;
BEGIN
    NEW.correo := lower(btrim(NEW.correo));
    IF TG_OP = 'INSERT' OR NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
        v_hash := privado.bcrypt(NEW.password_hash);
    END IF;
    NEW.password_hash := NULL; -- la contraseña vive solo en Supabase Auth

    IF NEW.usuario_auth_id IS NULL THEN
        NEW.usuario_auth_id := privado.cuenta_auth_vincular(NEW.correo, v_hash, NEW.nombre_completo, NEW.activo IS NOT FALSE);
        RETURN NEW;
    END IF;

    IF v_hash IS NOT NULL THEN
        UPDATE auth.users SET encrypted_password = v_hash, updated_at = now() WHERE id = NEW.usuario_auth_id;
        BEGIN
            DELETE FROM auth.sessions WHERE user_id = NEW.usuario_auth_id;
        EXCEPTION WHEN undefined_table OR insufficient_privilege THEN NULL;
        END;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.correo IS DISTINCT FROM OLD.correo THEN
            UPDATE auth.users SET email = NEW.correo, updated_at = now() WHERE id = NEW.usuario_auth_id;
            UPDATE auth.identities
            SET identity_data = identity_data || jsonb_build_object('email', NEW.correo), updated_at = now()
            WHERE user_id = NEW.usuario_auth_id AND provider = 'email';
        END IF;
        IF NEW.activo IS DISTINCT FROM OLD.activo OR NEW.usuario_auth_id IS DISTINCT FROM OLD.usuario_auth_id THEN
            UPDATE auth.users
            SET banned_until = CASE WHEN NEW.activo IS FALSE THEN 'infinity'::timestamptz END
            WHERE id = NEW.usuario_auth_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Quien no es administrador solo cambia sus datos de contacto (nunca rol, estado, correo o caja)
CREATE OR REPLACE FUNCTION public.usuarios_proteger_campos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_editables text[] := ARRAY['nombre_completo', 'telefono', 'vehiculo', 'placa', 'actualizado_el'];
BEGIN
    IF auth.uid() IS NULL OR public.es_admin() THEN
        RETURN NEW;
    END IF;
    IF (to_jsonb(NEW) - v_editables) IS DISTINCT FROM (to_jsonb(OLD) - v_editables) THEN
        RAISE EXCEPTION 'Solo el administrador puede cambiar rol, estado, correo, sucursal o contraseña de un usuario'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

-- Al borrar un usuario se elimina su cuenta de acceso (o se bloquea si otra tabla la referencia)
CREATE OR REPLACE FUNCTION public.usuarios_baja_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.usuario_auth_id IS NOT NULL THEN
        UPDATE public.clientes SET usuario_auth_id = NULL WHERE usuario_auth_id = OLD.usuario_auth_id;
        BEGIN
            DELETE FROM auth.users WHERE id = OLD.usuario_auth_id;
        EXCEPTION WHEN foreign_key_violation OR insufficient_privilege THEN
            UPDATE auth.users SET banned_until = 'infinity'::timestamptz WHERE id = OLD.usuario_auth_id;
        END;
    END IF;
    RETURN OLD;
END;
$$;

-- Registro público (correo o Google): cada cuenta nueva de Supabase Auth recibe su fila de
-- cliente. Nunca vincula una fila de personal: eso solo lo hace el administrador.
CREATE OR REPLACE FUNCTION public.auth_usuario_nuevo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id uuid;
    v_rol text;
    v_vinculo uuid;
BEGIN
    IF NEW.email IS NULL OR COALESCE(NEW.raw_app_meta_data ->> 'origen', '') = 'usuarios' THEN
        RETURN NEW;
    END IF;
    IF EXISTS (SELECT 1 FROM public.usuarios WHERE usuario_auth_id = NEW.id) THEN
        RETURN NEW;
    END IF;

    SELECT id, rol::text, usuario_auth_id INTO v_id, v_rol, v_vinculo
    FROM public.usuarios WHERE lower(correo) = lower(NEW.email) LIMIT 1;

    IF v_id IS NOT NULL THEN
        IF v_vinculo IS NULL AND v_rol = 'cliente' THEN
            UPDATE public.usuarios SET usuario_auth_id = NEW.id WHERE id = v_id;
        END IF;
        RETURN NEW;
    END IF;

    INSERT INTO public.usuarios (nombre_completo, correo, rol, sucursal, activo, usuario_auth_id)
    VALUES (
        COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
                 NULLIF(btrim(NEW.raw_user_meta_data ->> 'name'), ''),
                 split_part(NEW.email, '@', 1)),
        lower(NEW.email), 'cliente', 'Ecommerce Online', true, NEW.id
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Nunca se bloquea el registro: la app trata como cliente a una cuenta sin fila
    RAISE WARNING 'No se pudo crear la fila de cliente para %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_cifrar_password ON usuarios;
DROP FUNCTION IF EXISTS public.usuarios_cifrar_password();

DROP TRIGGER IF EXISTS trg_usuarios_proteger_campos ON usuarios;
CREATE TRIGGER trg_usuarios_proteger_campos
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION public.usuarios_proteger_campos();

DROP TRIGGER IF EXISTS trg_usuarios_sincronizar_auth ON usuarios;
CREATE TRIGGER trg_usuarios_sincronizar_auth
    BEFORE INSERT OR UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION public.usuarios_sincronizar_auth();

DROP TRIGGER IF EXISTS trg_usuarios_baja_auth ON usuarios;
CREATE TRIGGER trg_usuarios_baja_auth
    AFTER DELETE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION public.usuarios_baja_auth();

DROP TRIGGER IF EXISTS urbanstep_usuario_nuevo ON auth.users;
CREATE TRIGGER urbanstep_usuario_nuevo
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auth_usuario_nuevo();

-- ------------------------------------------------------------------------------
-- 3. Migración: cada fila de `usuarios` queda con su cuenta de acceso
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r record;
    v_auth uuid;
    v_creadas integer := 0;
BEGIN
    FOR r IN
        SELECT id, correo, password_hash, nombre_completo, activo
        FROM usuarios WHERE usuario_auth_id IS NULL ORDER BY creado_el
    LOOP
        v_auth := privado.cuenta_auth_vincular(r.correo, privado.bcrypt(r.password_hash), r.nombre_completo, r.activo IS NOT FALSE);
        UPDATE usuarios SET usuario_auth_id = v_auth WHERE id = r.id;
        v_creadas := v_creadas + 1;
    END LOOP;
    RAISE NOTICE 'Usuarios vinculados con Supabase Auth en esta ejecución: %', v_creadas;
END $$;

-- La contraseña ya está en Supabase Auth
UPDATE usuarios SET password_hash = NULL WHERE password_hash IS NOT NULL AND usuario_auth_id IS NOT NULL;

-- Cuentas de Supabase Auth sin fila (clientes de Google previos): reciben su fila de cliente
INSERT INTO usuarios (nombre_completo, correo, rol, sucursal, activo, usuario_auth_id)
SELECT COALESCE(NULLIF(btrim(a.raw_user_meta_data ->> 'full_name'), ''), NULLIF(btrim(a.raw_user_meta_data ->> 'name'), ''), split_part(a.email, '@', 1)),
       lower(a.email), 'cliente', 'Ecommerce Online', true, a.id
FROM auth.users a
WHERE a.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.usuario_auth_id = a.id)
  AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE lower(u.correo) = lower(a.email));

-- Fichas de cliente: se vinculan con la cuenta del mismo correo (solo si el correo es único)
UPDATE clientes c
SET usuario_auth_id = u.usuario_auth_id
FROM usuarios u
WHERE c.usuario_auth_id IS NULL
  AND c.id <> 'publico'
  AND u.usuario_auth_id IS NOT NULL
  AND lower(btrim(c.correo)) = lower(u.correo)
  AND (SELECT count(*) FROM clientes c2 WHERE lower(btrim(c2.correo)) = lower(u.correo)) = 1
  AND NOT EXISTS (SELECT 1 FROM clientes c3 WHERE c3.usuario_auth_id = u.usuario_auth_id);

-- El inicio de sesión contra la tabla `usuarios` queda retirado: solo Supabase Auth
DROP FUNCTION IF EXISTS public.login_usuario(text, text);

-- ------------------------------------------------------------------------------
-- 4. Reglas de negocio que ahora corren en el servidor
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION privado.entero(p_valor text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN btrim(COALESCE(p_valor, '')) ~ '^-?\d+(\.\d+)?$' THEN floor(btrim(p_valor)::numeric)::integer
        ELSE 0
    END;
$$;

CREATE OR REPLACE FUNCTION privado.total_tallas(p_tallas jsonb)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT COALESCE(sum(GREATEST(0, privado.entero(t.value))), 0)::integer
    FROM jsonb_each_text(CASE WHEN jsonb_typeof(p_tallas) = 'object' THEN p_tallas ELSE '{}'::jsonb END) t;
$$;

-- Descuenta una talla de la matriz {"40": 5, ...}; sin talla reconocida descuenta en orden (igual que la caja)
CREATE OR REPLACE FUNCTION privado.descontar_tallas(p_tallas jsonb, p_talla text, p_cantidad integer)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_resultado jsonb := p_tallas;
    v_resto integer := p_cantidad;
    v_actual integer;
    v_quita integer;
    t record;
BEGIN
    IF jsonb_typeof(p_tallas) IS DISTINCT FROM 'object' THEN
        RETURN p_tallas;
    END IF;
    IF p_talla <> '' AND upper(p_talla) <> 'N/A' AND p_tallas ? p_talla THEN
        RETURN jsonb_set(p_tallas, ARRAY[p_talla], to_jsonb(GREATEST(0, privado.entero(p_tallas ->> p_talla) - p_cantidad)));
    END IF;
    FOR t IN SELECT key, value FROM jsonb_each_text(p_tallas) LOOP
        EXIT WHEN v_resto <= 0;
        v_actual := GREATEST(privado.entero(t.value), 0);
        v_quita := LEAST(v_actual, v_resto);
        v_resultado := jsonb_set(v_resultado, ARRAY[t.key], to_jsonb(v_actual - v_quita));
        v_resto := v_resto - v_quita;
    END LOOP;
    RETURN v_resultado;
END;
$$;

-- Stock de un renglón de pedido web: variante de color, talla, existencia total, estado y Kardex.
-- Misma regla que saleService.create en la caja; el cliente no puede escribir en `productos`.
CREATE OR REPLACE FUNCTION privado.descontar_stock_pedido_web(p_producto text, p_talla text, p_color text, p_cantidad integer, p_referencia text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_fila jsonb;
    v_talla text := btrim(COALESCE(p_talla, ''));
    v_cantidad integer := GREATEST(COALESCE(p_cantidad, 0), 0);
    v_anterior integer;
    v_minimo integer;
    v_variantes jsonb;
    v_variante jsonb;
    v_tallas jsonb;
    v_idx integer;
    v_stock integer;
    v_estado text;
BEGIN
    SELECT to_jsonb(p) INTO v_fila FROM public.productos p WHERE p.id = p_producto FOR UPDATE;
    IF v_fila IS NULL OR v_cantidad = 0 THEN
        RETURN;
    END IF;

    v_anterior := privado.entero(v_fila ->> 'stock');
    v_minimo := COALESCE(NULLIF(v_fila ->> 'stock_minimo', '')::integer, 5);
    v_variantes := CASE WHEN jsonb_typeof(v_fila -> 'variantes_color') = 'array' THEN v_fila -> 'variantes_color' ELSE '[]'::jsonb END;
    v_tallas := CASE WHEN jsonb_typeof(v_fila -> 'tallas_stock') = 'object' THEN v_fila -> 'tallas_stock' END;

    -- 1. Variante del color pedido (o la primera si no aparece)
    IF jsonb_array_length(v_variantes) > 0 THEN
        SELECT e.i - 1 INTO v_idx
        FROM jsonb_array_elements(v_variantes) WITH ORDINALITY AS e(val, i)
        WHERE lower(COALESCE(e.val ->> 'color', '')) = lower(COALESCE(NULLIF(p_color, ''), v_fila ->> 'color', ''))
        ORDER BY e.i
        LIMIT 1;
        v_idx := COALESCE(v_idx, 0);
        v_variante := v_variantes -> v_idx;
        IF jsonb_typeof(v_variante -> 'sizeStock') = 'object' THEN
            v_variante := jsonb_set(v_variante, '{sizeStock}', privado.descontar_tallas(v_variante -> 'sizeStock', v_talla, v_cantidad));
            v_variante := jsonb_set(v_variante, '{total}', to_jsonb(privado.total_tallas(v_variante -> 'sizeStock')));
            v_variantes := jsonb_set(v_variantes, ARRAY[v_idx::text], v_variante);
        END IF;
    END IF;

    -- 2. Matriz general por talla
    IF v_tallas IS NOT NULL THEN
        v_tallas := privado.descontar_tallas(v_tallas, v_talla, v_cantidad);
    END IF;

    -- 3. Existencia total
    IF jsonb_array_length(v_variantes) > 0 THEN
        SELECT COALESCE(sum(privado.total_tallas(e.val -> 'sizeStock')), 0)::integer INTO v_stock
        FROM jsonb_array_elements(v_variantes) AS e(val);
        IF jsonb_typeof(v_variantes -> 0 -> 'sizeStock') = 'object' THEN
            v_tallas := v_variantes -> 0 -> 'sizeStock';
        END IF;
    ELSIF v_tallas IS NOT NULL THEN
        v_stock := privado.total_tallas(v_tallas);
    ELSE
        v_stock := GREATEST(0, v_anterior - v_cantidad);
    END IF;
    v_estado := CASE WHEN v_stock <= 0 THEN 'deshabilitado' WHEN v_stock > v_minimo THEN 'in_stock' ELSE 'low_stock' END;

    BEGIN
        UPDATE public.productos
        SET stock = v_stock,
            estado = v_estado,
            tallas_stock = COALESCE(v_tallas, tallas_stock),
            variantes_color = CASE WHEN jsonb_array_length(v_variantes) > 0 THEN v_variantes ELSE variantes_color END,
            actualizado_el = now()
        WHERE id = p_producto;
    EXCEPTION WHEN undefined_column THEN
        UPDATE public.productos SET stock = v_stock, estado = v_estado, actualizado_el = now() WHERE id = p_producto;
    END;

    -- 4. Kardex (si la tabla aún no tiene las columnas homologadas, la venta no se detiene)
    BEGIN
        INSERT INTO public.movimientos_inventario (
            id, producto_id, nombre_producto, sku, stock_anterior, stock_nuevo, cantidad_delta,
            tipo_movimiento, motivo, talla, usuario_nombre, referencia_id
        ) VALUES (
            'MOV-WEB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
            p_producto, COALESCE(v_fila ->> 'nombre', p_producto), v_fila ->> 'sku', v_anterior, v_stock, -v_cantidad,
            'salida_venta', 'Pedido web ' || COALESCE(p_referencia, ''), NULLIF(v_talla, ''), 'Ecommerce Web', p_referencia
        );
    EXCEPTION WHEN undefined_table OR undefined_column OR check_violation OR not_null_violation THEN
        RAISE NOTICE 'Kardex del pedido web % no registrado: %', p_referencia, SQLERRM;
    END;
END;
$$;

-- Venta de caja: el trigger de siempre (stock - cantidad). Pedido web: descuento completo en el servidor.
CREATE OR REPLACE FUNCTION fn_descontar_stock_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cajero text;
    v_recibo text;
BEGIN
    SELECT nombre_cajero, numero_recibo INTO v_cajero, v_recibo FROM public.ventas WHERE id = NEW.venta_id;
    IF v_cajero = 'Ecommerce Web' THEN
        PERFORM privado.descontar_stock_pedido_web(NEW.producto_id, NEW.talla, NEW.color, NEW.cantidad, v_recibo);
        RETURN NEW;
    END IF;

    UPDATE productos
    SET
        stock = GREATEST(0, stock - NEW.cantidad),
        estado = CASE
            WHEN (stock - NEW.cantidad) > stock_minimo THEN 'in_stock'
            WHEN (stock - NEW.cantidad) > 0 THEN 'low_stock'
            ELSE 'out_of_stock'
        END,
        actualizado_el = NOW()
    WHERE id = NEW.producto_id;

    RETURN NEW;
END;
$$;

-- Los acumulados del cliente los actualiza el servidor (el cliente no edita su ficha directamente)
CREATE OR REPLACE FUNCTION fn_actualizar_totales_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.cliente_id IS NOT NULL AND NEW.cliente_id <> 'publico' THEN
        UPDATE clientes
        SET
            total_comprado_usd = total_comprado_usd + NEW.total_usd,
            cantidad_compras = cantidad_compras + 1,
            actualizado_el = NOW()
        WHERE id = NEW.cliente_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Pedido web hecho por un cliente: fecha y correlativo los pone el servidor (el cliente solo ve
-- sus propias ventas y no puede calcular el siguiente número sin chocar con otros pedidos)
CREATE OR REPLACE FUNCTION public.ventas_pedido_web()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_anio text := to_char(now() AT TIME ZONE 'America/Caracas', 'YYYY');
    v_n bigint;
BEGIN
    IF NEW.nombre_cajero IS DISTINCT FROM 'Ecommerce Web' OR public.puede_vender() THEN
        RETURN NEW;
    END IF;
    NEW.creado_el := now();
    NEW.caja_id := NULL;
    NEW.turno_id := NULL;
    NEW.usuario_cajero_id := NULL;

    PERFORM pg_advisory_xact_lock(hashtext('urbanstep_numero_recibo'));
    SELECT 1000 + count(*) INTO v_n FROM public.ventas;
    WHILE EXISTS (SELECT 1 FROM public.ventas WHERE numero_recibo = format('TKT-%s-%s', v_anio, v_n)) LOOP
        v_n := v_n + 1;
    END LOOP;
    NEW.numero_recibo := format('TKT-%s-%s', v_anio, v_n);
    RETURN NEW;
END;
$$;

-- Renglón de pedido web hecho por un cliente: el precio se compara con el catálogo en el servidor
CREATE OR REPLACE FUNCTION public.detalles_venta_pedido_web()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_precio numeric;
    v_costo numeric;
BEGIN
    IF public.puede_vender() THEN
        RETURN NEW;
    END IF;
    SELECT precio_usd, costo_usd INTO v_precio, v_costo FROM public.productos WHERE id = NEW.producto_id;
    IF v_precio IS NULL THEN
        RAISE EXCEPTION 'El producto "%" ya no está en el catálogo', NEW.nombre_producto;
    END IF;
    IF NEW.cantidad IS NULL OR NEW.cantidad <= 0 THEN
        RAISE EXCEPTION 'Cantidad inválida para "%"', NEW.nombre_producto;
    END IF;
    IF abs(round(NEW.precio_unitario_usd, 2) - round(v_precio, 2)) > 0.009 THEN
        RAISE EXCEPTION 'El precio de "%" cambió a $%. Actualiza tu bolsa e intenta de nuevo.', NEW.nombre_producto, round(v_precio, 2);
    END IF;
    NEW.subtotal_usd := round(v_precio * NEW.cantidad, 2);
    BEGIN
        NEW.costo_unitario_usd := CASE WHEN v_costo > 0 THEN round(v_costo, 2) END;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
    RETURN NEW;
END;
$$;

-- Un cajero mueve existencias; precio, costo y datos del calzado solo los cambia Admin o Supervisor
CREATE OR REPLACE FUNCTION public.productos_proteger_precios()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_libres text[] := ARRAY['stock', 'tallas_stock', 'variantes_color', 'colores', 'estado', 'actualizado_el'];
BEGIN
    IF auth.uid() IS NULL OR public.puede_gestionar() THEN
        RETURN NEW;
    END IF;
    IF (to_jsonb(NEW) - v_libres) IS DISTINCT FROM (to_jsonb(OLD) - v_libres) THEN
        RAISE EXCEPTION 'Solo un administrador o supervisor puede cambiar precio, costo o datos de "%"', OLD.nombre
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ventas_pedido_web ON ventas;
CREATE TRIGGER trg_ventas_pedido_web
    BEFORE INSERT ON ventas
    FOR EACH ROW EXECUTE FUNCTION public.ventas_pedido_web();

DROP TRIGGER IF EXISTS trg_detalles_venta_pedido_web ON detalles_venta;
CREATE TRIGGER trg_detalles_venta_pedido_web
    BEFORE INSERT ON detalles_venta
    FOR EACH ROW EXECUTE FUNCTION public.detalles_venta_pedido_web();

DROP TRIGGER IF EXISTS trg_detalles_venta_stock ON detalles_venta;
CREATE TRIGGER trg_detalles_venta_stock
    AFTER INSERT ON detalles_venta
    FOR EACH ROW EXECUTE FUNCTION fn_descontar_stock_venta();

DROP TRIGGER IF EXISTS trg_ventas_cliente_totales ON ventas;
CREATE TRIGGER trg_ventas_cliente_totales
    AFTER INSERT ON ventas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_totales_cliente();

DROP TRIGGER IF EXISTS trg_productos_proteger_precios ON productos;
CREATE TRIGGER trg_productos_proteger_precios
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION public.productos_proteger_precios();

-- ------------------------------------------------------------------------------
-- 5. Funciones públicas (RPC) que reemplazan escrituras directas desde el navegador
-- ------------------------------------------------------------------------------
-- Ficha de cliente de la cuenta con sesión. Regla única de identidad: una cédula/RIF y un
-- correo pertenecen a un solo cliente; si ya compró en la tienda física se vincula esa ficha.
CREATE OR REPLACE FUNCTION public.registrar_ficha_cliente(
    p_tipo_documento text,
    p_numero_documento text,
    p_nombres text,
    p_apellidos text,
    p_telefono text,
    p_direccion text DEFAULT NULL,
    p_estado text DEFAULT 'Lara',
    p_ciudad text DEFAULT 'Barquisimeto'
)
RETURNS clientes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_correo text;
    v_tipo text := upper(btrim(COALESCE(p_tipo_documento, 'V')));
    v_numero text := upper(btrim(COALESCE(p_numero_documento, '')));
    v_telefono text := NULLIF(btrim(COALESCE(p_telefono, '')), '');
    v_direccion text := NULLIF(btrim(COALESCE(p_direccion, '')), '');
    v_ficha clientes;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Inicia sesión para registrar tus datos de cliente' USING ERRCODE = '42501';
    END IF;
    SELECT lower(email) INTO v_correo FROM auth.users WHERE id = v_uid;
    IF v_correo IS NULL THEN
        RAISE EXCEPTION 'Tu cuenta no tiene un correo registrado';
    END IF;

    IF v_numero ~ '^[VEJGP]\s*-\s*' THEN
        v_tipo := substr(v_numero, 1, 1);
        v_numero := regexp_replace(v_numero, '^[VEJGP]\s*-\s*', '');
    END IF;
    IF v_tipo NOT IN ('V', 'E', 'J', 'G', 'P') THEN
        RAISE EXCEPTION 'Tipo de documento inválido';
    END IF;
    v_numero := CASE WHEN v_tipo = 'P' THEN regexp_replace(v_numero, '[^A-Z0-9]', '', 'g') ELSE regexp_replace(v_numero, '\D', '', 'g') END;
    IF length(v_numero) < 5 OR length(v_numero) > 20 OR v_numero = '00000000' THEN
        RAISE EXCEPTION 'Número de cédula/RIF inválido';
    END IF;
    IF NULLIF(btrim(COALESCE(p_nombres, '')), '') IS NULL THEN
        RAISE EXCEPTION 'El nombre es obligatorio';
    END IF;

    -- ¿La cuenta ya tiene su ficha? Se actualizan los datos de contacto
    SELECT * INTO v_ficha FROM clientes WHERE usuario_auth_id = v_uid LIMIT 1;
    IF FOUND THEN
        IF v_ficha.tipo_documento::text <> v_tipo OR v_ficha.numero_documento <> v_numero THEN
            RAISE EXCEPTION 'Tu cuenta ya está vinculada a la cédula/RIF %-%', v_ficha.tipo_documento, v_ficha.numero_documento;
        END IF;
        UPDATE clientes
        SET correo = v_correo, telefono = COALESCE(v_telefono, telefono), direccion = COALESCE(v_direccion, direccion)
        WHERE id = v_ficha.id
        RETURNING * INTO v_ficha;
    ELSE
        SELECT * INTO v_ficha FROM clientes
        WHERE id <> 'publico' AND tipo_documento::text = v_tipo AND numero_documento = v_numero
        LIMIT 1;
        IF FOUND THEN
            IF v_ficha.usuario_auth_id IS NOT NULL
               OR (lower(btrim(COALESCE(v_ficha.correo, ''))) NOT IN ('', '-', 'n/a', 'por confirmar')
                   AND lower(btrim(v_ficha.correo)) <> v_correo) THEN
                RAISE EXCEPTION 'Esa cédula/RIF ya está registrada con otro correo. Si es tuya, escríbenos para vincularla.';
            END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM clientes WHERE id <> 'publico' AND id IS DISTINCT FROM v_ficha.id AND lower(btrim(correo)) = v_correo) THEN
            RAISE EXCEPTION 'Ese correo ya está asociado a otra cédula/RIF.';
        END IF;

        IF v_ficha.id IS NOT NULL THEN
            -- Ya compró en la tienda física: se vincula su ficha en lugar de duplicarla
            UPDATE clientes
            SET usuario_auth_id = v_uid, correo = v_correo,
                telefono = COALESCE(v_telefono, telefono), direccion = COALESCE(v_direccion, direccion)
            WHERE id = v_ficha.id
            RETURNING * INTO v_ficha;
        ELSE
            INSERT INTO clientes (id, tipo_documento, numero_documento, nombres, apellidos, correo, telefono, estado, ciudad, direccion, usuario_auth_id)
            VALUES (
                'CLT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
                v_tipo::tipo_documento_enum, v_numero,
                left(btrim(p_nombres), 100), left(btrim(COALESCE(p_apellidos, '')), 100),
                v_correo, v_telefono,
                COALESCE(NULLIF(btrim(p_estado), ''), 'Lara'), COALESCE(NULLIF(btrim(p_ciudad), ''), 'Barquisimeto'),
                COALESCE(v_direccion, 'Barquisimeto, Estado Lara'), v_uid
            )
            RETURNING * INTO v_ficha;
        END IF;
    END IF;

    UPDATE usuarios
    SET nombre_completo = left(btrim(concat_ws(' ', btrim(p_nombres), NULLIF(btrim(p_apellidos), ''))), 150),
        telefono = COALESCE(v_telefono, telefono)
    WHERE usuario_auth_id = v_uid AND rol::text = 'cliente';
    RETURN v_ficha;
END;
$$;

-- Carritos abandonados: el visitante guarda y recupera solo el carrito cuyo id conoce
CREATE OR REPLACE FUNCTION public.guardar_carrito(p_id uuid, p_nombre text, p_telefono text, p_items jsonb, p_total_usd numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_telefono text := regexp_replace(COALESCE(p_telefono, ''), '\D', '', 'g');
    v_id uuid;
BEGIN
    IF length(v_telefono) < 10 OR length(v_telefono) > 15 OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
        RETURN NULL;
    END IF;
    IF jsonb_array_length(p_items) > 50 OR length(p_items::text) > 20000 THEN
        RAISE EXCEPTION 'La bolsa es demasiado grande para guardarla';
    END IF;
    IF p_id IS NOT NULL THEN
        UPDATE carritos_abandonados
        SET nombre = left(NULLIF(btrim(p_nombre), ''), 150), telefono = v_telefono, items = p_items,
            total_usd = GREATEST(0, COALESCE(p_total_usd, 0)), estado = 'abierto', actualizado_el = now()
        WHERE id = p_id AND estado <> 'convertido'
        RETURNING id INTO v_id;
        IF v_id IS NOT NULL THEN
            RETURN v_id;
        END IF;
    END IF;
    INSERT INTO carritos_abandonados (nombre, telefono, items, total_usd)
    VALUES (left(NULLIF(btrim(p_nombre), ''), 150), v_telefono, p_items, GREATEST(0, COALESCE(p_total_usd, 0)))
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_carrito_convertido(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE carritos_abandonados SET estado = 'convertido', actualizado_el = now() WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recuperar_carrito(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_items jsonb;
BEGIN
    UPDATE carritos_abandonados SET estado = 'recuperado'
    WHERE id = p_id AND estado <> 'convertido'
    RETURNING items INTO v_items;
    RETURN v_items;
END;
$$;

-- Tasa BCV del día: cualquier persona de tienda la actualiza, sin tocar el resto de la configuración
CREATE OR REPLACE FUNCTION public.actualizar_tasa_bcv(p_tasa numeric, p_fuente text DEFAULT 'Ajuste Manual')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_nombre text;
BEGIN
    IF NOT public.puede_vender() THEN
        RAISE EXCEPTION 'Solo el personal de tienda puede actualizar la tasa BCV' USING ERRCODE = '42501';
    END IF;
    IF p_tasa IS NULL OR p_tasa <= 0 OR p_tasa > 100000000 THEN
        RAISE EXCEPTION 'La tasa debe ser un número positivo válido';
    END IF;
    SELECT nombre_completo INTO v_nombre FROM usuarios WHERE usuario_auth_id = auth.uid();
    UPDATE configuracion_tienda SET tasa_bcv = round(p_tasa, 4), actualizado_el = now() WHERE id IS NOT NULL;
    INSERT INTO tasas_cambio (tasa, moneda_origen, moneda_destino, fuente, registrado_por)
    VALUES (round(p_tasa, 4), 'USD', 'VES', left(COALESCE(NULLIF(btrim(p_fuente), ''), 'Ajuste Manual'), 50), left(COALESCE(v_nombre, 'Personal de tienda'), 100));
END;
$$;

-- Más vendidos para la portada: solo cantidades por producto, sin datos de ventas ni clientes
CREATE OR REPLACE FUNCTION public.productos_mas_vendidos(p_limite integer DEFAULT 6)
RETURNS TABLE (producto_id text, unidades bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT d.producto_id::text, sum(d.cantidad)::bigint
    FROM public.detalles_venta d
    WHERE d.producto_id IS NOT NULL
    GROUP BY d.producto_id
    ORDER BY 2 DESC, 1
    LIMIT LEAST(GREATEST(COALESCE(p_limite, 6), 1), 50);
$$;

-- Uso de cupón tras confirmar un pedido (el cliente no puede escribir en `cupones`)
CREATE OR REPLACE FUNCTION incrementar_uso_cupon(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id = p_id AND activo;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Vistas de compatibilidad: siempre con los permisos de quien consulta
-- ------------------------------------------------------------------------------
DO $$
DECLARE v record;
BEGIN
    FOR v IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relkind = 'v'
    LOOP
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.relname);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 7. Políticas RLS por rol
--    Lectura pública: catálogo y datos de la tienda. El resto exige sesión y el rol que lo usa.
--    Sin política DELETE en ventas, detalles_venta, pagos_venta, compras ni detalles_compra.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.reiniciar_politicas(p_tabla text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE pol record;
BEGIN
    IF to_regclass(format('public.%I', p_tabla)) IS NULL THEN
        RAISE NOTICE '- Tabla public.% no existe: se omite', p_tabla;
        RETURN;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_tabla);
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = p_tabla LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, p_tabla);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.politica(p_tabla text, p_nombre text, p_definicion text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    IF to_regclass(format('public.%I', p_tabla)) IS NOT NULL THEN
        EXECUTE format('CREATE POLICY %I ON public.%I %s', p_nombre, p_tabla, p_definicion);
    END IF;
END;
$$;

DO $pol$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'configuracion_tienda', 'tasas_cambio', 'metodos_pago', 'categorias', 'marcas', 'productos',
        'cupones', 'resenas', 'usuarios', 'cajas', 'turnos_caja', 'auditoria', 'movimientos_inventario',
        'proveedores', 'compras', 'detalles_compra', 'clientes', 'ventas', 'detalles_venta', 'pagos_venta',
        'envios', 'motorizados', 'sucursales', 'stock_sucursal', 'traslados', 'traslado_items',
        'lotes_garantia', 'lote_garantia_items', 'carritos_abandonados', 'alertas_stock'
    ] LOOP
        PERFORM pg_temp.reiniciar_politicas(t);
    END LOOP;

    -- Catálogo y datos públicos de la tienda ---------------------------------------
    PERFORM pg_temp.politica('configuracion_tienda', 'configuracion_lectura_publica', $d$FOR SELECT TO anon, authenticated USING (true)$d$);
    PERFORM pg_temp.politica('configuracion_tienda', 'configuracion_alta_admin', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.es_admin()))$d$);
    PERFORM pg_temp.politica('configuracion_tienda', 'configuracion_edicion_admin', $d$FOR UPDATE TO authenticated USING ((SELECT public.es_admin())) WITH CHECK ((SELECT public.es_admin()))$d$);

    PERFORM pg_temp.politica('tasas_cambio', 'tasas_lectura_publica', $d$FOR SELECT TO anon, authenticated USING (true)$d$);
    PERFORM pg_temp.politica('tasas_cambio', 'tasas_registro_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);

    PERFORM pg_temp.politica('metodos_pago', 'metodos_pago_lectura_publica', $d$FOR SELECT TO anon, authenticated USING (true)$d$);
    PERFORM pg_temp.politica('metodos_pago', 'metodos_pago_alta_admin', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.es_admin()))$d$);
    PERFORM pg_temp.politica('metodos_pago', 'metodos_pago_edicion_admin', $d$FOR UPDATE TO authenticated USING ((SELECT public.es_admin())) WITH CHECK ((SELECT public.es_admin()))$d$);
    PERFORM pg_temp.politica('metodos_pago', 'metodos_pago_baja_admin', $d$FOR DELETE TO authenticated USING ((SELECT public.es_admin()))$d$);

    FOREACH t IN ARRAY ARRAY['categorias', 'marcas'] LOOP
        PERFORM pg_temp.politica(t, t || '_lectura_publica', $d$FOR SELECT TO anon, authenticated USING (true)$d$);
        PERFORM pg_temp.politica(t, t || '_alta_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);
        PERFORM pg_temp.politica(t, t || '_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
        PERFORM pg_temp.politica(t, t || '_baja_admin', $d$FOR DELETE TO authenticated USING ((SELECT public.es_admin()))$d$);
    END LOOP;

    -- Productos: la caja descuenta existencias (precio y costo los protege trg_productos_proteger_precios)
    PERFORM pg_temp.politica('productos', 'productos_lectura_publica', $d$FOR SELECT TO anon, authenticated USING (true)$d$);
    PERFORM pg_temp.politica('productos', 'productos_alta_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('productos', 'productos_existencias_tienda', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_vender())) WITH CHECK ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('productos', 'productos_baja_admin', $d$FOR DELETE TO authenticated USING ((SELECT public.es_admin()))$d$);

    PERFORM pg_temp.politica('cupones', 'cupones_activos_publicos', $d$FOR SELECT TO anon, authenticated USING (activo OR (SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('cupones', 'cupones_alta_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('cupones', 'cupones_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('cupones', 'cupones_baja_gestion', $d$FOR DELETE TO authenticated USING ((SELECT public.puede_gestionar()))$d$);

    -- Reseñas: públicas las aprobadas; "compra verificada" y aprobación las comprueba el servidor
    PERFORM pg_temp.politica('resenas', 'resenas_lectura', $d$FOR SELECT TO anon, authenticated USING (
        aprobada
        OR (SELECT public.puede_gestionar())
        OR usuario_id IN ((SELECT auth.uid())::text, (SELECT public.usuario_actual_id())::text)
    )$d$);
    PERFORM pg_temp.politica('resenas', 'resenas_publicar', $d$FOR INSERT TO anon, authenticated WITH CHECK (
        (usuario_id IS NULL OR usuario_id IN ((SELECT auth.uid())::text, (SELECT public.usuario_actual_id())::text))
        AND (NOT compra_verificada OR public.compro_producto(producto_id))
        AND (NOT aprobada OR compra_verificada OR (SELECT public.puede_gestionar()))
    )$d$);
    PERFORM pg_temp.politica('resenas', 'resenas_moderacion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('resenas', 'resenas_baja_gestion', $d$FOR DELETE TO authenticated USING ((SELECT public.puede_gestionar()))$d$);

    -- Personal y operación de tienda ----------------------------------------------
    PERFORM pg_temp.politica('usuarios', 'usuarios_lectura', $d$FOR SELECT TO authenticated USING (
        usuario_auth_id = (SELECT auth.uid()) OR (SELECT public.es_personal())
    )$d$);
    PERFORM pg_temp.politica('usuarios', 'usuarios_alta_admin', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.es_admin()))$d$);
    PERFORM pg_temp.politica('usuarios', 'usuarios_edicion', $d$FOR UPDATE TO authenticated
        USING ((SELECT public.es_admin()) OR usuario_auth_id = (SELECT auth.uid()))
        WITH CHECK ((SELECT public.es_admin()) OR usuario_auth_id = (SELECT auth.uid()))$d$);
    PERFORM pg_temp.politica('usuarios', 'usuarios_baja_admin', $d$FOR DELETE TO authenticated USING ((SELECT public.es_admin()))$d$);

    PERFORM pg_temp.politica('cajas', 'cajas_lectura_tienda', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('cajas', 'cajas_alta_admin', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.es_admin()))$d$);
    PERFORM pg_temp.politica('cajas', 'cajas_edicion_admin', $d$FOR UPDATE TO authenticated USING ((SELECT public.es_admin())) WITH CHECK ((SELECT public.es_admin()))$d$);
    PERFORM pg_temp.politica('cajas', 'cajas_baja_admin', $d$FOR DELETE TO authenticated USING ((SELECT public.es_admin()))$d$);

    PERFORM pg_temp.politica('turnos_caja', 'turnos_lectura_tienda', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('turnos_caja', 'turnos_apertura_tienda', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('turnos_caja', 'turnos_cierre_tienda', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_vender())) WITH CHECK ((SELECT public.puede_vender()))$d$);

    -- Auditoría: todo el personal registra, Admin y Supervisor consultan; nadie edita ni borra
    PERFORM pg_temp.politica('auditoria', 'auditoria_lectura_gestion', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('auditoria', 'auditoria_registro_personal', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.es_personal()))$d$);

    PERFORM pg_temp.politica('movimientos_inventario', 'kardex_lectura_tienda', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('movimientos_inventario', 'kardex_registro_tienda', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('movimientos_inventario', 'kardex_baja_admin', $d$FOR DELETE TO authenticated USING ((SELECT public.es_admin()))$d$);

    -- Compras y proveedores: Admin y Supervisor (módulo purchases). Las compras no se borran.
    PERFORM pg_temp.politica('proveedores', 'proveedores_lectura_gestion', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('proveedores', 'proveedores_alta_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('proveedores', 'proveedores_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('proveedores', 'proveedores_baja_admin', $d$FOR DELETE TO authenticated USING ((SELECT public.es_admin()))$d$);

    PERFORM pg_temp.politica('compras', 'compras_lectura_gestion', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('compras', 'compras_registro_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('compras', 'compras_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);

    PERFORM pg_temp.politica('detalles_compra', 'detalles_compra_lectura_gestion', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('detalles_compra', 'detalles_compra_registro_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);

    -- Clientes y ventas: la tienda ve todo; el cliente web, solo lo suyo -----------
    PERFORM pg_temp.politica('clientes', 'clientes_lectura', $d$FOR SELECT TO authenticated USING (
        (SELECT public.puede_vender()) OR usuario_auth_id = (SELECT auth.uid())
    )$d$);
    PERFORM pg_temp.politica('clientes', 'clientes_alta_tienda', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('clientes', 'clientes_edicion_tienda', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_vender())) WITH CHECK ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('clientes', 'clientes_baja_sin_compras', $d$FOR DELETE TO authenticated USING (
        (SELECT public.puede_vender())
        AND id <> 'publico'
        AND NOT EXISTS (SELECT 1 FROM public.ventas v WHERE v.cliente_id = clientes.id)
    )$d$);

    PERFORM pg_temp.politica('ventas', 'ventas_lectura', $d$FOR SELECT TO authenticated USING (
        (SELECT public.puede_vender()) OR public.es_cliente_propio(cliente_id)
    )$d$);
    PERFORM pg_temp.politica('ventas', 'ventas_registro', $d$FOR INSERT TO authenticated WITH CHECK (
        (SELECT public.puede_vender())
        OR (public.es_cliente_propio(cliente_id)
            AND nombre_cajero = 'Ecommerce Web'
            AND caja_id IS NULL AND turno_id IS NULL AND usuario_cajero_id IS NULL)
    )$d$);
    PERFORM pg_temp.politica('ventas', 'ventas_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);

    PERFORM pg_temp.politica('detalles_venta', 'detalles_venta_lectura', $d$FOR SELECT TO authenticated USING (
        (SELECT public.puede_vender())
        OR public.es_venta_propia(venta_id)
        OR ((SELECT public.tiene_rol('motorizado')) AND EXISTS (SELECT 1 FROM public.envios e WHERE e.venta_id = detalles_venta.venta_id))
    )$d$);
    PERFORM pg_temp.politica('detalles_venta', 'detalles_venta_registro', $d$FOR INSERT TO authenticated WITH CHECK (
        (SELECT public.puede_vender()) OR public.es_pedido_web_abierto(venta_id)
    )$d$);

    PERFORM pg_temp.politica('pagos_venta', 'pagos_venta_lectura', $d$FOR SELECT TO authenticated USING (
        (SELECT public.puede_vender()) OR public.es_venta_propia(venta_id)
    )$d$);
    PERFORM pg_temp.politica('pagos_venta', 'pagos_venta_registro', $d$FOR INSERT TO authenticated WITH CHECK (
        (SELECT public.puede_vender()) OR public.es_pedido_web_abierto(venta_id)
    )$d$);

    -- Delivery: todo el personal ve y actualiza despachos; el cliente sigue los suyos
    PERFORM pg_temp.politica('envios', 'envios_lectura', $d$FOR SELECT TO authenticated USING (
        (SELECT public.es_personal()) OR public.es_venta_propia(venta_id)
    )$d$);
    PERFORM pg_temp.politica('envios', 'envios_registro', $d$FOR INSERT TO authenticated WITH CHECK (
        (SELECT public.puede_vender())
        OR (public.es_pedido_web_abierto(venta_id) AND estado = 'pendiente' AND nombre_repartidor IS NULL)
    )$d$);
    PERFORM pg_temp.politica('envios', 'envios_seguimiento_personal', $d$FOR UPDATE TO authenticated USING ((SELECT public.es_personal())) WITH CHECK ((SELECT public.es_personal()))$d$);
    PERFORM pg_temp.politica('envios', 'envios_baja_gestion', $d$FOR DELETE TO authenticated USING ((SELECT public.puede_gestionar()))$d$);

    PERFORM pg_temp.politica('motorizados', 'motorizados_lectura_personal', $d$FOR SELECT TO authenticated USING ((SELECT public.es_personal()))$d$);
    PERFORM pg_temp.politica('motorizados', 'motorizados_alta_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('motorizados', 'motorizados_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('motorizados', 'motorizados_baja_gestion', $d$FOR DELETE TO authenticated USING ((SELECT public.puede_gestionar()))$d$);

    -- Sucursales y almacén: la caja consulta y solicita traslados; Admin y Supervisor los gestionan
    PERFORM pg_temp.politica('sucursales', 'sucursales_lectura_personal', $d$FOR SELECT TO authenticated USING ((SELECT public.es_personal()))$d$);
    PERFORM pg_temp.politica('sucursales', 'sucursales_alta_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('sucursales', 'sucursales_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('sucursales', 'sucursales_baja_admin', $d$FOR DELETE TO authenticated USING ((SELECT public.es_admin()))$d$);

    PERFORM pg_temp.politica('stock_sucursal', 'stock_sucursal_lectura_tienda', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('stock_sucursal', 'stock_sucursal_alta_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('stock_sucursal', 'stock_sucursal_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('stock_sucursal', 'stock_sucursal_baja_gestion', $d$FOR DELETE TO authenticated USING ((SELECT public.puede_gestionar()))$d$);

    PERFORM pg_temp.politica('traslados', 'traslados_lectura_tienda', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('traslados', 'traslados_solicitud_tienda', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('traslados', 'traslados_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('traslados', 'traslados_baja', $d$FOR DELETE TO authenticated USING (
        (SELECT public.puede_gestionar()) OR ((SELECT public.puede_vender()) AND estado = 'solicitado')
    )$d$);

    PERFORM pg_temp.politica('traslado_items', 'traslado_items_lectura_tienda', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('traslado_items', 'traslado_items_solicitud_tienda', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_vender()))$d$);
    PERFORM pg_temp.politica('traslado_items', 'traslado_items_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('traslado_items', 'traslado_items_baja_gestion', $d$FOR DELETE TO authenticated USING ((SELECT public.puede_gestionar()))$d$);

    FOREACH t IN ARRAY ARRAY['lotes_garantia', 'lote_garantia_items'] LOOP
        PERFORM pg_temp.politica(t, t || '_lectura_gestion', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_gestionar()))$d$);
        PERFORM pg_temp.politica(t, t || '_alta_gestion', $d$FOR INSERT TO authenticated WITH CHECK ((SELECT public.puede_gestionar()))$d$);
        PERFORM pg_temp.politica(t, t || '_edicion_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
        PERFORM pg_temp.politica(t, t || '_baja_gestion', $d$FOR DELETE TO authenticated USING ((SELECT public.puede_gestionar()))$d$);
    END LOOP;

    -- Marketing: los visitantes escriben por RPC (carritos) o solo insertan (alertas de talla)
    PERFORM pg_temp.politica('carritos_abandonados', 'carritos_lectura_gestion', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('carritos_abandonados', 'carritos_seguimiento_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('carritos_abandonados', 'carritos_baja_gestion', $d$FOR DELETE TO authenticated USING ((SELECT public.puede_gestionar()))$d$);

    PERFORM pg_temp.politica('alertas_stock', 'alertas_suscripcion_publica', $d$FOR INSERT TO anon, authenticated WITH CHECK (notificado_el IS NULL)$d$);
    PERFORM pg_temp.politica('alertas_stock', 'alertas_lectura_gestion', $d$FOR SELECT TO authenticated USING ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('alertas_stock', 'alertas_aviso_gestion', $d$FOR UPDATE TO authenticated USING ((SELECT public.puede_gestionar())) WITH CHECK ((SELECT public.puede_gestionar()))$d$);
    PERFORM pg_temp.politica('alertas_stock', 'alertas_baja_gestion', $d$FOR DELETE TO authenticated USING ((SELECT public.puede_gestionar()))$d$);
END $pol$;

-- Segunda barrera: la llave anónima ni siquiera tiene permiso sobre las tablas privadas
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'usuarios', 'clientes', 'ventas', 'detalles_venta', 'pagos_venta', 'compras', 'detalles_compra',
        'proveedores', 'cajas', 'turnos_caja', 'auditoria', 'movimientos_inventario', 'envios', 'motorizados',
        'sucursales', 'stock_sucursal', 'traslados', 'traslado_items', 'lotes_garantia', 'lote_garantia_items',
        'carritos_abandonados'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
        END IF;
    END LOOP;
END $$;

-- La columna password_hash sigue oculta para la sesión autenticada
REVOKE SELECT ON usuarios FROM authenticated;
GRANT SELECT (
    id, usuario_auth_id, nombre_completo, correo, rol, sucursal, caja_asignada_id, activo,
    creado_el, actualizado_el, telefono, vehiculo, placa, rating, deliveries_count
) ON usuarios TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. Permisos de ejecución de funciones
-- ------------------------------------------------------------------------------
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA privado FROM PUBLIC;
DO $$
BEGIN
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA privado FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public.usuarios_sincronizar_auth(), public.usuarios_proteger_campos(), public.usuarios_baja_auth(),
        public.auth_usuario_nuevo(), public.ventas_pedido_web(), public.detalles_venta_pedido_web(),
        public.productos_proteger_precios(), public.fn_descontar_stock_venta(), public.fn_actualizar_totales_cliente()
        FROM PUBLIC, anon, authenticated';
    -- Las políticas las evalúan con el rol de quien consulta
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rol_actual(), public.usuario_actual_id(), public.tiene_rol(text[]),
        public.es_admin(), public.puede_gestionar(), public.puede_vender(), public.es_personal(),
        public.es_cliente_propio(text), public.es_venta_propia(text), public.es_pedido_web_abierto(text),
        public.compro_producto(text) TO anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public.registrar_ficha_cliente(text, text, text, text, text, text, text, text),
        public.actualizar_tasa_bcv(numeric, text), public.incrementar_uso_cupon(uuid) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.registrar_ficha_cliente(text, text, text, text, text, text, text, text),
        public.actualizar_tasa_bcv(numeric, text), public.incrementar_uso_cupon(uuid) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.guardar_carrito(uuid, text, text, jsonb, numeric),
        public.marcar_carrito_convertido(uuid), public.recuperar_carrito(uuid),
        public.productos_mas_vendidos(integer) TO anon, authenticated';
    IF to_regprocedure('public.mover_stock_sucursal(varchar, varchar, varchar, varchar, varchar, varchar, integer)') IS NOT NULL THEN
        EXECUTE 'REVOKE ALL ON FUNCTION public.mover_stock_sucursal(varchar, varchar, varchar, varchar, varchar, varchar, integer) FROM PUBLIC, anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.mover_stock_sucursal(varchar, varchar, varchar, varchar, varchar, varchar, integer) TO authenticated';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. Verificación automática: si falla, no se aplica nada
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    t text;
    v_n bigint;
    v_puede_simular boolean := true;
BEGIN
    BEGIN
        SET LOCAL ROLE anon;
        RESET ROLE;
    EXCEPTION WHEN insufficient_privilege THEN
        v_puede_simular := false;
        RAISE WARNING 'No se pudo simular la llave anónima desde este editor: ejecuta la verificación manual del final.';
    END;
    IF NOT v_puede_simular THEN
        RETURN;
    END IF;

    PERFORM set_config('request.jwt.claims', '', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    FOREACH t IN ARRAY ARRAY['usuarios', 'ventas', 'clientes', 'detalles_venta', 'pagos_venta', 'compras', 'auditoria', 'envios'] LOOP
        CONTINUE WHEN to_regclass(format('public.%I', t)) IS NULL;
        BEGIN
            SET LOCAL ROLE anon;
            EXECUTE format('SELECT count(*) FROM public.%I', t) INTO v_n;
            RESET ROLE;
        EXCEPTION WHEN insufficient_privilege THEN
            v_n := 0; -- sin permiso sobre la tabla: es lo esperado
        END;
        IF v_n > 0 THEN
            RAISE EXCEPTION 'La llave anónima todavía puede leer % (% filas). No se aplicó ningún cambio.', t, v_n;
        END IF;
    END LOOP;

    -- Una sesión válida sin fila en `usuarios` ni ficha de cliente tampoco ve datos privados
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    FOREACH t IN ARRAY ARRAY['usuarios', 'ventas', 'clientes', 'compras', 'auditoria'] LOOP
        CONTINUE WHEN to_regclass(format('public.%I', t)) IS NULL;
        SET LOCAL ROLE authenticated;
        EXECUTE format('SELECT count(*) FROM public.%I', t) INTO v_n;
        RESET ROLE;
        IF v_n > 0 THEN
            RAISE EXCEPTION 'Una sesión sin rol todavía puede leer % (% filas). No se aplicó ningún cambio.', t, v_n;
        END IF;
    END LOOP;
    PERFORM set_config('request.jwt.claims', '', true);
    RAISE NOTICE '✓ Verificado: sin sesión (o sin rol) no se leen usuarios, ventas ni clientes.';
END $$;

-- Aviso: contraseñas de demostración publicadas en el código (src/data/mockUsers.js)
DO $$
DECLARE
    r record;
    v_demo text[] := ARRAY['admin2914', 'super123', 'cajero123', 'moto123', 'admin123', '12345678', 'password'];
    p text;
BEGIN
    FOR r IN
        SELECT a.email, a.encrypted_password
        FROM auth.users a JOIN usuarios u ON u.usuario_auth_id = a.id
        WHERE u.rol::text <> 'cliente' AND a.encrypted_password LIKE '$2%'
    LOOP
        FOREACH p IN ARRAY v_demo LOOP
            IF extensions.crypt(p, r.encrypted_password) = r.encrypted_password THEN
                RAISE WARNING 'La cuenta % usa una contraseña de demostración pública: cámbiala ya en Configuración > Usuarios.', r.email;
            END IF;
        END LOOP;
    END LOOP;
EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
    NULL;
END $$;

COMMIT;

-- Recarga el esquema en PostgREST (funciones nuevas y eliminadas)
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- Verificación manual (ejecutar aparte; cada bloque deja todo como estaba)
-- ==============================================================================
-- 1) La llave anónima no lee datos privados (debe dar "permission denied" o 0):
-- BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM public.ventas; ROLLBACK;
-- BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM public.clientes; ROLLBACK;
-- BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM public.usuarios; ROLLBACK;
--
-- 2) Cada usuario con su cuenta de acceso y su rol:
-- SELECT u.nombre_completo, u.correo, u.rol, u.activo, a.id IS NOT NULL AS tiene_acceso,
--        a.encrypted_password <> '' AS tiene_contrasena, a.banned_until
-- FROM usuarios u LEFT JOIN auth.users a ON a.id = u.usuario_auth_id ORDER BY u.rol, u.correo;
--
-- 3) Políticas vigentes (no debería quedar ninguna con USING (true) fuera del catálogo):
-- SELECT tablename, policyname, cmd, roles, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
--
-- 4) Desde el navegador (consola, sin sesión) con la llave pública:
-- fetch(`${SUPABASE_URL}/rest/v1/ventas?select=id`, { headers: { apikey: ANON_KEY } }).then(r => r.status)
-- → 401/403 (permiso denegado) en lugar de 200 con datos.
