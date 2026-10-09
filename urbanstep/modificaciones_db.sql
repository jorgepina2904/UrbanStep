-- =============================================================================
-- URBANSTEP VENEZUELA - SCRIPT DE MODIFICACIONES DE BASE DE DATOS (SUPABASE / POSTGRESQL)
-- Versión: 2.5 - Full-Stack Architecture Update
-- Autor: Manager Full Stack Chief
-- Descripción:
--   1. Soporte para múltiples colores y variantes independientes por calzado (colores, variantes_color en tabla productos).
--   2. Vinculación con Proveedores en catálogo e inventario (proveedor_id, proveedor_nombre).
--   3. Tabla de Auditoría y Kardex de Movimientos de Inventario (movimientos_inventario).
--   4. Módulo Integral de Proveedores y Órdenes de Compra (proveedores, compras, detalles_compra).
--   5. Módulo de Métodos de Pago Dinámicos Configurables por el Admin (metodos_pago).
--   6. Actualización de vista de compatibilidad bilingüe 'products'.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SOPORTE DE COLORES DE MODELO, VARIANTES INDEPENDIENTES Y PROVEEDOR EN TABLA 'productos'
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'colores'
    ) THEN
        ALTER TABLE productos ADD COLUMN colores JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN productos.colores IS 'Array JSON con los nombres de los colores disponibles para el modelo';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'variantes_color'
    ) THEN
        ALTER TABLE productos ADD COLUMN variantes_color JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN productos.variantes_color IS 'Array JSON con las variantes de color y sus matrices de stock por talla: [{ "color": "Rojo", "sizes": ["38","39"], "sizeStock": {"38": 2, "39": 5}, "total": 7 }]';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'proveedor_id'
    ) THEN
        ALTER TABLE productos ADD COLUMN proveedor_id TEXT;
        COMMENT ON COLUMN productos.proveedor_id IS 'ID del proveedor principal asignado al calzado (referencia a proveedores)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'proveedor_nombre'
    ) THEN
        ALTER TABLE productos ADD COLUMN proveedor_nombre TEXT DEFAULT 'Distribuidora Deportiva Ávila C.A.';
        COMMENT ON COLUMN productos.proveedor_nombre IS 'Nombre comercial / Razón social del proveedor del calzado';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'categoria_tallas'
    ) THEN
        ALTER TABLE productos ADD COLUMN categoria_tallas TEXT DEFAULT 'caballero';
        COMMENT ON COLUMN productos.categoria_tallas IS 'Categoría de escala: caballero, dama, juvenil, infantil, unisex';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'tallas_stock'
    ) THEN
        ALTER TABLE productos ADD COLUMN tallas_stock JSONB DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN productos.tallas_stock IS 'Desglose de disponibilidad por talla { "40": 5, "41": 8 }';
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 2. TABLA KARDEX / AUDITORÍA DE MOVIMIENTOS DE INVENTARIO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id TEXT PRIMARY KEY,
    producto_id TEXT REFERENCES productos(id) ON DELETE SET NULL,
    nombre_producto TEXT NOT NULL,
    sku TEXT,
    stock_anterior INTEGER NOT NULL DEFAULT 0,
    stock_nuevo INTEGER NOT NULL DEFAULT 0,
    delta INTEGER NOT NULL DEFAULT 0,
    tipo TEXT NOT NULL CHECK (tipo IN ('edicion_producto', 'ajuste_manual', 'venta', 'devolucion', 'recepcion_compra', 'merma')),
    motivo TEXT,
    usuario_nombre TEXT DEFAULT 'Administrador',
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mov_inventario_producto ON movimientos_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_mov_inventario_fecha ON movimientos_inventario(creado_el DESC);
CREATE INDEX IF NOT EXISTS idx_mov_inventario_tipo ON movimientos_inventario(tipo);

-- Habilitar RLS y políticas públicas / autenticadas
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de movimientos de inventario" ON movimientos_inventario;
CREATE POLICY "Permitir lectura de movimientos de inventario" 
    ON movimientos_inventario FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion de movimientos de inventario" ON movimientos_inventario;
CREATE POLICY "Permitir insercion de movimientos de inventario" 
    ON movimientos_inventario FOR INSERT WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 3. MÓDULO DE PROVEEDORES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
    id TEXT PRIMARY KEY,
    rif TEXT UNIQUE NOT NULL,
    razon_social TEXT NOT NULL,
    nombre_comercial TEXT,
    contacto_nombre TEXT,
    telefono TEXT,
    correo TEXT,
    direccion TEXT,
    ciudad TEXT,
    estado TEXT,
    dias_credito_pactados INTEGER DEFAULT 15,
    activo BOOLEAN DEFAULT true,
    creado_el TIMESTAMPTZ DEFAULT NOW(),
    actualizado_el TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columna 'nombre' virtual en proveedores para compatibilidad total
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'proveedores' AND column_name = 'nombre'
    ) THEN
        ALTER TABLE proveedores ADD COLUMN nombre TEXT GENERATED ALWAYS AS (COALESCE(nombre_comercial, razon_social)) STORED;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proveedores_rif ON proveedores(rif);

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de proveedores" ON proveedores;
CREATE POLICY "Permitir lectura de proveedores" 
    ON proveedores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir administracion de proveedores" ON proveedores;
CREATE POLICY "Permitir administracion de proveedores" 
    ON proveedores FOR ALL USING (true);


-- -----------------------------------------------------------------------------
-- 4. MÓDULO DE COMPRAS (ORDENES DE COMPRA A PROVEEDORES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compras (
    id TEXT PRIMARY KEY,
    numero_factura TEXT NOT NULL,
    proveedor_id TEXT REFERENCES proveedores(id) ON DELETE SET NULL,
    proveedor_nombre TEXT NOT NULL,
    proveedor_rif TEXT,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_recepcion TIMESTAMPTZ,
    subtotal_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_bs NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tasa_bcv NUMERIC(10, 4) NOT NULL DEFAULT 36.50,
    estado TEXT DEFAULT 'recibida' CHECK (estado IN ('pendiente', 'recibida', 'cancelada')),
    metodo_pago TEXT DEFAULT 'transferencia_usd',
    comprador_nombre TEXT DEFAULT 'Administrador',
    items_count INTEGER DEFAULT 0,
    total_pares INTEGER DEFAULT 0,
    notas TEXT,
    creado_el TIMESTAMPTZ DEFAULT NOW(),
    actualizado_el TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalles_compra (
    id TEXT PRIMARY KEY,
    compra_id TEXT REFERENCES compras(id) ON DELETE CASCADE,
    producto_id TEXT REFERENCES productos(id) ON DELETE SET NULL,
    sku TEXT,
    nombre_producto TEXT NOT NULL,
    costo_unitario_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cantidad_pares INTEGER NOT NULL DEFAULT 1,
    tallas_desglose JSONB DEFAULT '{}'::jsonb,
    subtotal_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
    creado_el TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(creado_el DESC);
CREATE INDEX IF NOT EXISTS idx_detalles_compra_compra ON detalles_compra(compra_id);

ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en compras" ON compras;
CREATE POLICY "Permitir todo en compras" ON compras FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir todo en detalles_compra" ON detalles_compra;
CREATE POLICY "Permitir todo en detalles_compra" ON detalles_compra FOR ALL USING (true);


-- -----------------------------------------------------------------------------
-- 5. MÓDULO DE MÉTODOS DE PAGO DINÁMICOS (ADMINISTRABLES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metodos_pago (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    moneda TEXT NOT NULL CHECK (moneda IN ('USD', 'VES')),
    banco TEXT,
    telefono TEXT,
    rif TEXT,
    correo TEXT,
    titular TEXT,
    numero_cuenta TEXT,
    instrucciones TEXT,
    requiere_referencia BOOLEAN DEFAULT true,
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    creado_el TIMESTAMPTZ DEFAULT NOW(),
    actualizado_el TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica de metodos de pago" ON metodos_pago;
CREATE POLICY "Permitir lectura publica de metodos de pago" 
    ON metodos_pago FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir administracion de metodos de pago" ON metodos_pago;
CREATE POLICY "Permitir administracion de metodos de pago" 
    ON metodos_pago FOR ALL USING (true);

-- Semilla de métodos de pago venezolanos oficiales
INSERT INTO metodos_pago (id, nombre, tipo, moneda, banco, telefono, rif, correo, titular, instrucciones, requiere_referencia, activo, orden)
VALUES
    ('pagomovil', 'Pago Móvil BDV / Banesco', 'pagomovil', 'VES', 'Banco de Venezuela (0102)', '0414-5551234', 'J-50123456-7', 'pagos@urbanstep.com.ve', 'UrbanStep Venezuela C.A.', 'Enviar captura y los últimos 6 dígitos de la referencia bancaria.', true, true, 1),
    ('punto_venta', 'Punto de Venta Inalámbrico (Débito/Crédito)', 'punto_venta', 'VES', 'Banesco / BDV', NULL, 'J-50123456-7', NULL, 'UrbanStep Venezuela C.A.', 'Cobro directo con tarjeta física o Biopago.', false, true, 2),
    ('efectivo_usd', 'Efectivo Dólares ($ Cash)', 'efectivo', 'USD', NULL, NULL, NULL, NULL, NULL, 'Billetes en buen estado sin tachaduras ni roturas severas.', false, true, 3),
    ('efectivo_bs', 'Efectivo Bolívares (Bs. Cash)', 'efectivo', 'VES', NULL, NULL, NULL, NULL, NULL, 'Calculado según la Tasa Oficial BCV del día.', false, true, 4),
    ('zelle', 'Zelle Corporativo', 'zelle', 'USD', 'Chase / Wells Fargo', NULL, NULL, 'zelle@urbanstep.com', 'UrbanStep LLC', 'Colocar en el concepto únicamente el número de factura o nombre del cliente.', true, true, 5),
    ('binance', 'Binance Pay (USDT)', 'cripto', 'USD', 'Binance Pay ID', NULL, NULL, 'binance@urbanstep.com', 'UrbanStep Store', 'Enviar pago a nuestro Pay ID o escanear QR en caja.', true, true, 6),
    ('zinli', 'Zinli Wallet', 'billetera', 'USD', NULL, NULL, NULL, 'zinli@urbanstep.com', 'UrbanStep Store', 'Transferencia entre cuentas Zinli.', true, true, 7),
    ('transferencia_bs', 'Transferencia Bancaria Nacional (Bs.)', 'transferencia', 'VES', 'Banesco (0134)', NULL, 'J-50123456-7', 'pagos@urbanstep.com.ve', 'UrbanStep Venezuela C.A.', 'Acreditación inmediata para el mismo banco.', true, true, 8)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 6. ACTUALIZACIÓN DE VISTA DE COMPATIBILIDAD BILINGÜE 'products'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW products AS
SELECT 
    id,
    sku,
    nombre AS name,
    marca_nombre AS brand,
    marca_id,
    categoria_nombre AS category,
    categoria_id,
    proveedor_id,
    descripcion AS description,
    color,
    color_hex,
    costo_usd AS cost_usd,
    precio_usd AS price_usd,
    stock,
    stock_minimo AS min_stock,
    tallas AS sizes,
    imagen_url AS image_url,
    estado AS status,
    creado_el AS created_at,
    actualizado_el AS updated_at,
    proveedor_nombre AS supplier_name,
    colores AS colors,
    variantes_color AS color_variants,
    tallas_stock AS size_stock,
    categoria_tallas AS size_category
FROM productos;

-- Notificar a PostgREST para recargar la caché de esquemas
NOTIFY pgrst, 'reload schema';
