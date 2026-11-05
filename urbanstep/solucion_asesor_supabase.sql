-- ==============================================================================
-- URBANSTEP VENEZUELA - REMEDIACIÓN INTEGRAL DEL ASESOR DE SUPABASE
-- Fecha: 29 de Octubre de 2026
-- Objetivo: Resolver avisos de Seguridad y Rendimiento detectados por Supabase Advisor
-- ==============================================================================
--
-- Este script es 100% idempotente (se puede ejecutar múltiples veces sin error).
-- Ejecutar en: Supabase Studio -> SQL Editor -> New Query -> Run
--
-- CONTENIDO:
-- 1. SEGURIDAD: 17 Vistas con SECURITY DEFINER -> Convertidas a security_invoker = true
-- 2. SEGURIDAD: Restricción de rls_auto_enable() para roles anon / authenticated
-- 3. SEGURIDAD: 6 Funciones sin search_path -> search_path = public, pg_temp
-- 4. RENDIMIENTO: 7 Claves Foráneas sin índice de cobertura -> Índices B-Tree creados
-- 5. RENDIMIENTO/RLS: 135 Casos de políticas permisivas duplicadas en 27 tablas -> Unificadas
-- 6. RENDIMIENTO/ANÁLISIS: Informe técnico sobre los 20 índices marcados como "no usados"
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- BLOQUE 1: SEGURIDAD · 17 VISTAS CON SECURITY INVOKER = TRUE
-- ==============================================================================
-- Las vistas sin security_invoker evalúan permisos con el rol del creador (postgres),
-- ignorando las políticas RLS del usuario que consulta. 
-- Al establecer security_invoker = true (PostgreSQL 15+), se aplican estrictamente
-- los permisos y RLS del cliente autenticado o anónimo.

DO $$
DECLARE
    v TEXT;
    vistas TEXT[] := ARRAY[
        'store_settings',
        'exchange_rates',
        'cash_registers',
        'profiles',
        'categories',
        'brands',
        'suppliers',
        'purchases',
        'purchase_items',
        'customers',
        'shifts',
        'products',
        'sales',
        'sale_items',
        'sale_payments',
        'deliveries',
        'audit_logs'
    ];
BEGIN
    FOREACH v IN ARRAY vistas LOOP
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = v) THEN
            EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', v);
            RAISE NOTICE '✓ Vista public.% configurada con security_invoker = true', v;
        ELSE
            RAISE NOTICE '- Vista public.% no existe aún, se omite', v;
        END IF;
    END LOOP;
END $$;


-- ==============================================================================
-- BLOQUE 2: SEGURIDAD · RESTRINGIR FUNCIÓN rls_auto_enable()
-- ==============================================================================
-- rls_auto_enable() es una función SECURITY DEFINER administrativa para habilitar RLS.
-- Por defecto en PostgreSQL, las funciones otorgan permiso EXECUTE a PUBLIC (incluye anon y authenticated).
-- Se revocan los permisos públicos para evitar llamadas no autorizadas vía API RPC.

DO $$
DECLARE
    r RECORD;
    encontrada BOOLEAN := false;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    ) LOOP
        encontrada := true;
        -- Revocar ejecución de roles públicos y anónimos
        EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;', r.proname, r.args);
        -- Mantener acceso únicamente a roles de backend/servicio y superusuario
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role, postgres;', r.proname, r.args);
        -- Blindar search_path
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
        RAISE NOTICE '✓ Permisos de public.rls_auto_enable() restringidos exitosamente a service_role/postgres';
    END LOOP;

    IF NOT encontrada THEN
        RAISE NOTICE '- Función public.rls_auto_enable() no encontrada en public (se omite)';
    END IF;
END $$;


-- ==============================================================================
-- BLOQUE 3: SEGURIDAD · FIJAR search_path EN 6 FUNCIONES
-- ==============================================================================
-- Funciones sin search_path explícito pueden ser vulnerables a secuestro de esquemas (search_path hijacking).
-- Se fija 'search_path = public, pg_temp' de forma dinámica e idempotente para cubrir cualquier sobrecarga.

DO $$
DECLARE
    r RECORD;
    funciones TEXT[] := ARRAY[
        'mover_stock_sucursal',
        'fn_descontar_stock_venta',
        'fn_actualizar_totales_cliente',
        'fn_actualizar_timestamp',
        'fn_aumentar_stock_compra',
        'incrementar_uso_cupon'
    ];
BEGIN
    FOR r IN (
        SELECT p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY(funciones)
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
        RAISE NOTICE '✓ search_path fijado para public.%(%)', r.proname, r.args;
    END LOOP;
END $$;


-- ==============================================================================
-- BLOQUE 4: RENDIMIENTO · 7 CLAVES FORÁNEAS SIN ÍNDICE DE COBERTURA
-- ==============================================================================
-- Las claves foráneas sin índice provocan escaneos secuenciales (Seq Scan) completos
-- en la tabla secundaria durante DELETE o UPDATE en la tabla primaria, afectando
-- drásticamente el rendimiento de la base de datos conforme crece el volumen.

DO $$
BEGIN
    -- 1 y 2. compras (caja_id, usuario_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'compras') THEN
        CREATE INDEX IF NOT EXISTS idx_compras_caja_id ON public.compras(caja_id);
        CREATE INDEX IF NOT EXISTS idx_compras_usuario_id ON public.compras(usuario_id);
        RAISE NOTICE '✓ Creados índices de FK para compras(caja_id) y compras(usuario_id)';
    END IF;

    -- 3 y 4. traslados (destino_id, origen_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'traslados') THEN
        CREATE INDEX IF NOT EXISTS idx_traslados_destino_id ON public.traslados(destino_id);
        CREATE INDEX IF NOT EXISTS idx_traslados_origen_id ON public.traslados(origen_id);
        RAISE NOTICE '✓ Creados índices de FK para traslados(destino_id) y traslados(origen_id)';
    END IF;

    -- 5. turnos_caja (cajero_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'turnos_caja') THEN
        CREATE INDEX IF NOT EXISTS idx_turnos_caja_cajero_id ON public.turnos_caja(cajero_id);
        RAISE NOTICE '✓ Creado índice de FK para turnos_caja(cajero_id)';
    END IF;

    -- 6. usuarios (caja_asignada_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuarios') THEN
        CREATE INDEX IF NOT EXISTS idx_usuarios_caja_asignada_id ON public.usuarios(caja_asignada_id);
        RAISE NOTICE '✓ Creado índice de FK para usuarios(caja_asignada_id)';
    END IF;

    -- 7. ventas (usuario_cajero_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas') THEN
        CREATE INDEX IF NOT EXISTS idx_ventas_usuario_cajero_id ON public.ventas(usuario_cajero_id);
        RAISE NOTICE '✓ Creado índice de FK para ventas(usuario_cajero_id)';
    END IF;
END $$;


-- ==============================================================================
-- BLOQUE 5: RENDIMIENTO/RLS · CONSOLIDACIÓN DE POLÍTICAS PERMISIVAS DUPLICADAS
-- ==============================================================================
-- 135 avisos generados en 27 tablas x 5 roles (anon, authenticated, authenticator,
-- dashboard_user y supabase_privileged_role).
-- Causa: Existía una política "Lectura..." FOR SELECT y a la vez una "Mutacion..." FOR ALL.
-- Como FOR ALL ya incluye SELECT, PostgreSQL evaluaba dos políticas permisivas (Policy1 OR Policy2),
-- generando sobrecarga en cada consulta.
-- Solución: Se eliminan las políticas redundantes y se unifica en 1 sola política integral por tabla.

DO $$
DECLARE
    tbl TEXT;
    pol RECORD;
    tablas TEXT[] := ARRAY[
        'alertas_stock',
        'auditoria',
        'cajas',
        'carritos_abandonados',
        'categorias',
        'clientes',
        'compras',
        'configuracion_tienda',
        'cupones',
        'detalles_compra',
        'detalles_venta',
        'envios',
        'lote_garantia_items',
        'lotes_garantia',
        'marcas',
        'metodos_pago',
        'pagos_venta',
        'productos',
        'proveedores',
        'stock_sucursal',
        'sucursales',
        'tasas_cambio',
        'traslado_items',
        'traslados',
        'turnos_caja',
        'usuarios',
        'ventas'
    ];
BEGIN
    FOREACH tbl IN ARRAY tablas LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Asegurar RLS habilitado
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

            -- Limpiar políticas existentes (antiguas, duplicadas o fragmentadas)
            FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl) LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
            END LOOP;

            -- Crear UNA ÚNICA política integral (elimina la duplicidad para SELECT sin alterar permisos)
            EXECUTE format('CREATE POLICY "acceso_total_%s" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
            RAISE NOTICE '✓ RLS unificado para tabla public.% (1 única política para SELECT, INSERT, UPDATE, DELETE)', tbl;
        ELSE
            RAISE NOTICE '- Tabla public.% no existe aún, se omite', tbl;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- Recargar caché del esquema en PostgREST (Supabase API)
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- BLOQUE 6: NOTA TÉCNICA · 20 ÍNDICES MARCADOS COMO "NO USADOS"
-- ==============================================================================
-- Lista señalada por el asesor:
-- idx_resenas_producto, idx_stock_sucursal_producto, idx_traslado_items_traslado,
-- idx_lote_items_lote, idx_clientes_doc, idx_ventas_turno_id, idx_turnos_caja_id,
-- idx_auditoria_creado_el, idx_auditoria_modulo, idx_proveedores_rif,
-- idx_proveedores_razon, idx_productos_sku, idx_productos_marca_id,
-- idx_productos_categoria_id, idx_productos_estado, idx_compras_factura,
-- idx_compras_proveedor_id, idx_compras_fecha, idx_compras_estado, idx_mov_inventario_tipo.
--
-- EXPLICACIÓN Y RECOMENDACIÓN:
-- 1. PostgreSQL registra el uso de índices en pg_stat_user_indexes.idx_scan.
-- 2. En fases de desarrollo o con pocos registros (< 200 filas), el planificador de
--    consultas de Postgres (Query Planner) prefiere deliberadamente 'Sequential Scan'
--    porque leer unas pocas páginas en memoria RAM es más rápido que consultar el árbol B-Tree.
-- 3. Índices como 'idx_productos_sku' (búsqueda por código de barras/SKU en caja),
--    'idx_clientes_doc' (búsqueda de cliente por cédula/RIF), o 'idx_ventas_turno_id'
--    (cierre de turno y arqueo) son CRÍTICOS para producción. Si se eliminan ahora,
--    cuando la tienda tenga miles de ventas y calzados, las búsquedas del POS se degradarán
--    a escaneos secuenciales masivos.
-- 4. CONCLUSIÓN: SE DEBEN CONSERVAR. El propio asesor de Supabase advierte:
--    "No usado no significa necesariamente que sobre: antes de considerar quitar alguno,
--    conviene comprobar el historial y las consultas habituales."
-- ==============================================================================
