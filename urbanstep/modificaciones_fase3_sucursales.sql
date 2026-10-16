-- ==============================================================================
-- FASE 3 · Multi-sucursal y logística de almacén
-- Ejecutar UNA VEZ en Supabase > SQL Editor. Es idempotente.
--
-- MODELO: el inventario de la "Tienda Principal" sigue viviendo en `productos` (lo que usa el POS y
-- el catálogo web). Las demás ubicaciones (otras tiendas, depósito) guardan sus existencias por
-- producto/color/talla en `stock_sucursal`. Un traslado mueve pares entre ambas fuentes.
-- ==============================================================================

-- 1) Sucursales y depósitos
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
-- Una sola sucursal principal
CREATE UNIQUE INDEX IF NOT EXISTS ux_sucursal_principal ON sucursales (es_principal) WHERE es_principal;

INSERT INTO sucursales (id, nombre, tipo, es_principal) VALUES
    ('SUC-PRINCIPAL', 'Tienda Principal', 'tienda', TRUE),
    ('SUC-DEPOSITO', 'Depósito Central', 'deposito', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2) Existencias por sucursal (variantes talla x color) — excluye la sucursal principal
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

-- Movimiento atómico: nunca deja la cantidad en negativo (lanza error si no alcanza)
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

-- 3) Traslados entre ubicaciones
CREATE TABLE IF NOT EXISTS traslados (
    id VARCHAR(30) PRIMARY KEY,                                   -- TRF-2026-0001
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

-- 4) Lotes de garantía para reclamar al proveedor (calzado con falla de fábrica)
CREATE TABLE IF NOT EXISTS lotes_garantia (
    id VARCHAR(30) PRIMARY KEY,                                   -- GAR-2026-0001
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
    nota_credito VARCHAR(30),                                     -- NC-2026-0001 que originó el ingreso
    motivo TEXT
);
CREATE INDEX IF NOT EXISTS idx_lote_items_lote ON lote_garantia_items (lote_id);

-- 5) Seguridad (mismo criterio del resto del esquema)
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

NOTIFY pgrst, 'reload schema';
