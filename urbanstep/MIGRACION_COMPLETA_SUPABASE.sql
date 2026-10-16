-- ==============================================================================
-- 🚀 MIGRACIÓN INTEGRAL SUPABASE - URBANSTEP SGF ERP (FASES 1, 3, 5 y 6)
-- ==============================================================================
-- INSTRUCCIONES:
-- 1. Abre tu panel de Supabase: https://supabase.com/dashboard/project/xcrqaebceegeikniytfy/sql/new
-- 2. Pega todo el contenido de este archivo en el SQL Editor.
-- 3. Haz clic en "RUN" (o presiona Ctrl + Enter).
-- 4. Es 100% IDEMPOTENTE: Puedes ejecutarlo tantas veces como desees sin riesgo.
-- ==============================================================================

-- ==============================================================================
-- BLOQUE 1: FASE 6 · Costo Histórico Inmutable y Homologación del Kardex
-- ==============================================================================
-- 1) Costo Promedio Ponderado vigente al momento de la venta (inmutable; NIIF Pymes sección 13)
ALTER TABLE detalles_venta ADD COLUMN IF NOT EXISTS costo_unitario_usd NUMERIC(12, 2);
COMMENT ON COLUMN detalles_venta.costo_unitario_usd IS 'CPP unitario en USD congelado al emitir la venta';

-- 2) Kardex: columnas que escribe stockMovementService y catálogo de tipos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimientos_inventario' AND column_name = 'tipo')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimientos_inventario' AND column_name = 'tipo_movimiento') THEN
        ALTER TABLE movimientos_inventario RENAME COLUMN tipo TO tipo_movimiento;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimientos_inventario' AND column_name = 'delta')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimientos_inventario' AND column_name = 'cantidad_delta') THEN
        ALTER TABLE movimientos_inventario RENAME COLUMN delta TO cantidad_delta;
    END IF;
END $$;

ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS talla VARCHAR(20);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS referencia_id VARCHAR(60);

-- Reemplaza cualquier CHECK previo sobre el tipo por uno que acepta los valores históricos y los homologados
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'movimientos_inventario'::regclass AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%tipo_movimiento%'
    LOOP
        EXECUTE format('ALTER TABLE movimientos_inventario DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_tipo_chk CHECK (tipo_movimiento IN (
    'edicion_producto', 'ajuste_manual', 'venta', 'devolucion', 'recepcion_compra', 'merma',
    'entrada_compra', 'salida_venta', 'entrada_devolucion', 'baja_merma_dano', 'traslado_origen', 'traslado_destino'
));

-- ==============================================================================
-- BLOQUE 2: FASE 1 · eCommerce — Cupones, Promociones y Reseñas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS cupones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(40) UNIQUE,
    descripcion VARCHAR(200),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo', 'envio_gratis', 'dos_por_uno')),
    valor NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
    compra_minima_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (compra_minima_usd >= 0),
    productos_ids TEXT[],
    automatico BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    inicia_el TIMESTAMPTZ,
    vence_el TIMESTAMPTZ,
    usos_maximos INTEGER CHECK (usos_maximos IS NULL OR usos_maximos > 0),
    usos_actuales INTEGER NOT NULL DEFAULT 0,
    creado_el TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cupon_codigo_o_auto CHECK (automatico OR codigo IS NOT NULL)
);

CREATE OR REPLACE FUNCTION incrementar_uso_cupon(p_id UUID)
RETURNS VOID AS $$
    UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id = p_id;
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS resenas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id VARCHAR(50) NOT NULL,
    usuario_id VARCHAR(80),
    nombre_usuario VARCHAR(120) NOT NULL DEFAULT 'Cliente',
    calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    titulo VARCHAR(120),
    comentario TEXT NOT NULL CHECK (char_length(comentario) >= 10),
    compra_verificada BOOLEAN NOT NULL DEFAULT FALSE,
    aprobada BOOLEAN NOT NULL DEFAULT FALSE,
    creado_el TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resenas_producto ON resenas(producto_id, aprobada);

ALTER TABLE cupones ENABLE ROW LEVEL SECURITY;
ALTER TABLE resenas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura cupones" ON cupones;
DROP POLICY IF EXISTS "Mutacion cupones" ON cupones;
DROP POLICY IF EXISTS "Lectura resenas" ON resenas;
DROP POLICY IF EXISTS "Insercion resenas" ON resenas;
DROP POLICY IF EXISTS "Moderacion resenas" ON resenas;

CREATE POLICY "Lectura cupones" ON cupones FOR SELECT USING (true);
CREATE POLICY "Mutacion cupones" ON cupones FOR ALL USING (true);
CREATE POLICY "Lectura resenas" ON resenas FOR SELECT USING (true);
CREATE POLICY "Insercion resenas" ON resenas FOR INSERT WITH CHECK (true);
CREATE POLICY "Moderacion resenas" ON resenas FOR UPDATE USING (true);

-- ==============================================================================
-- BLOQUE 3: FASE 3 · Multi-sucursal y Logística de Almacén
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sucursales (
    id VARCHAR(40) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    tipo VARCHAR(12) NOT NULL DEFAULT 'tienda' CHECK (tipo IN ('tienda', 'deposito')),
    direccion TEXT,
    telefono VARCHAR(30),
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_el TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sucursal_principal ON sucursales (es_principal) WHERE es_principal;

INSERT INTO sucursales (id, nombre, tipo, es_principal) VALUES
    ('SUC-PRINCIPAL', 'Tienda Principal', 'tienda', TRUE),
    ('SUC-DEPOSITO', 'Depósito Central', 'deposito', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS stock_sucursal (
    sucursal_id VARCHAR(40) NOT NULL REFERENCES sucursales(id),
    producto_id VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(200),
    sku VARCHAR(60),
    color VARCHAR(60) NOT NULL DEFAULT '',
    talla VARCHAR(20) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    actualizado_el TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (sucursal_id, producto_id, color, talla)
);
CREATE INDEX IF NOT EXISTS idx_stock_sucursal_producto ON stock_sucursal (producto_id);

CREATE OR REPLACE FUNCTION mover_stock_sucursal(
    p_sucursal VARCHAR, p_producto VARCHAR, p_nombre VARCHAR, p_sku VARCHAR,
    p_color VARCHAR, p_talla VARCHAR, p_delta INTEGER
) RETURNS INTEGER AS $$
DECLARE nueva INTEGER;
BEGIN
    INSERT INTO stock_sucursal (sucursal_id, producto_id, nombre_producto, sku, color, talla, cantidad)
    VALUES (p_sucursal, p_producto, p_nombre, p_sku, COALESCE(p_color, ''), p_talla, GREATEST(p_delta, 0))
    ON CONFLICT (sucursal_id, producto_id, color, talla)
    DO UPDATE SET cantidad = stock_sucursal.cantidad + p_delta, actualizado_el = NOW()
    RETURNING cantidad INTO nueva;
    IF nueva < 0 THEN
        RAISE EXCEPTION 'Existencia insuficiente en la sucursal % para % talla %', p_sucursal, p_producto, p_talla;
    END IF;
    RETURN nueva;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS traslados (
    id VARCHAR(30) PRIMARY KEY,
    origen_id VARCHAR(40) NOT NULL REFERENCES sucursales(id),
    destino_id VARCHAR(40) NOT NULL REFERENCES sucursales(id),
    estado VARCHAR(30) NOT NULL DEFAULT 'solicitado'
        CHECK (estado IN ('solicitado', 'en_transito', 'recibido', 'recibido_con_diferencias', 'cancelado')),
    solicitado_por VARCHAR(120),
    despachado_por VARCHAR(120),
    recibido_por VARCHAR(120),
    notas TEXT,
    creado_el TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    despachado_el TIMESTAMPTZ,
    recibido_el TIMESTAMPTZ,
    CHECK (origen_id <> destino_id)
);

CREATE TABLE IF NOT EXISTS traslado_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traslado_id VARCHAR(30) NOT NULL REFERENCES traslados(id) ON DELETE CASCADE,
    producto_id VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(200),
    sku VARCHAR(60),
    color VARCHAR(60) NOT NULL DEFAULT '',
    talla VARCHAR(20) NOT NULL,
    cantidad_enviada INTEGER NOT NULL CHECK (cantidad_enviada > 0),
    cantidad_recibida INTEGER CHECK (cantidad_recibida IS NULL OR cantidad_recibida >= 0)
);
CREATE INDEX IF NOT EXISTS idx_traslado_items_traslado ON traslado_items (traslado_id);

CREATE TABLE IF NOT EXISTS lotes_garantia (
    id VARCHAR(30) PRIMARY KEY,
    proveedor_id VARCHAR(50),
    proveedor_nombre VARCHAR(200),
    estado VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'enviado', 'resuelto')),
    resolucion VARCHAR(30) CHECK (resolucion IS NULL OR resolucion IN ('reposicion', 'nota_credito_proveedor', 'rechazado')),
    notas TEXT,
    creado_por VARCHAR(120),
    creado_el TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enviado_el TIMESTAMPTZ,
    resuelto_el TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lote_garantia_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id VARCHAR(30) NOT NULL REFERENCES lotes_garantia(id) ON DELETE CASCADE,
    producto_id VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(200),
    sku VARCHAR(60),
    color VARCHAR(60) NOT NULL DEFAULT '',
    talla VARCHAR(20),
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    nota_credito VARCHAR(30),
    motivo TEXT
);
CREATE INDEX IF NOT EXISTS idx_lote_items_lote ON lote_garantia_items (lote_id);

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['sucursales', 'stock_sucursal', 'traslados', 'traslado_items', 'lotes_garantia', 'lote_garantia_items'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Lectura %1$s" ON %1$I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Mutacion %1$s" ON %1$I', t);
        EXECUTE format('CREATE POLICY "Lectura %1$s" ON %1$I FOR SELECT USING (true)', t);
        EXECUTE format('CREATE POLICY "Mutacion %1$s" ON %1$I FOR ALL USING (true)', t);
    END LOOP;
END $$;

-- ==============================================================================
-- BLOQUE 4: FASE 5 · Marketing y Fidelización (Carritos y Alertas de Talla)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS carritos_abandonados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150),
    telefono VARCHAR(30) NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
    estado VARCHAR(15) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'contactado', 'recuperado', 'convertido')),
    contactos INTEGER NOT NULL DEFAULT 0,
    creado_el TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_el TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contactado_el TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_carritos_estado ON carritos_abandonados (estado, actualizado_el);

CREATE TABLE IF NOT EXISTS alertas_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(200),
    color VARCHAR(60) NOT NULL DEFAULT '',
    talla VARCHAR(20) NOT NULL,
    nombre VARCHAR(150),
    contacto VARCHAR(120) NOT NULL,
    creado_el TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notificado_el TIMESTAMPTZ,
    UNIQUE (producto_id, color, talla, contacto)
);
CREATE INDEX IF NOT EXISTS idx_alertas_pendientes ON alertas_stock (producto_id) WHERE notificado_el IS NULL;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['carritos_abandonados', 'alertas_stock'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Lectura %1$s" ON %1$I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Mutacion %1$s" ON %1$I', t);
        EXECUTE format('CREATE POLICY "Lectura %1$s" ON %1$I FOR SELECT USING (true)', t);
        EXECUTE format('CREATE POLICY "Mutacion %1$s" ON %1$I FOR ALL USING (true)', t);
    END LOOP;
END $$;

-- Recarga final del esquema en PostgREST
NOTIFY pgrst, 'reload schema';
