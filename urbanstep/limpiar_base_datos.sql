-- =============================================================================
-- URBANSTEP VENEZUELA - SCRIPT DE LIMPIEZA Y VACIAMIENTO TOTAL DE DATOS
-- =============================================================================
-- Este script:
-- 1. Agrega cualquier columna faltante a la tabla 'productos' si aún no existen.
-- 2. Crea la tabla 'movimientos_inventario' (Kardex) si aún no existe.
-- 3. Vacía de forma segura y relacional todas las ventas, pagos, compras, envíos y productos.
-- 4. Conserva intacta la configuración de la tienda, cajas, marcas, categorías y usuarios.
-- 5. Deja únicamente al cliente 'publico' para ventas rápidas en mostrador.
-- =============================================================================

-- PASO 1: Garantizar columnas de calzado (colores, tallas_stock, variantes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'colores') THEN
        ALTER TABLE productos ADD COLUMN colores JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'variantes_color') THEN
        ALTER TABLE productos ADD COLUMN variantes_color JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'tallas_stock') THEN
        ALTER TABLE productos ADD COLUMN tallas_stock JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'categoria_tallas') THEN
        ALTER TABLE productos ADD COLUMN categoria_tallas TEXT DEFAULT 'caballero';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'proveedor_nombre') THEN
        ALTER TABLE productos ADD COLUMN proveedor_nombre TEXT DEFAULT 'Distribuidora Deportiva Ávila C.A.';
    END IF;
END $$;

-- PASO 2: Garantizar tabla de Kardex y Movimientos de Inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id VARCHAR(50) PRIMARY KEY,
    producto_id VARCHAR(50) REFERENCES productos(id) ON DELETE SET NULL,
    nombre_producto VARCHAR(200) NOT NULL,
    sku VARCHAR(60),
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    cantidad_delta INTEGER NOT NULL,
    tipo_movimiento VARCHAR(50) NOT NULL,
    motivo TEXT,
    talla VARCHAR(20),
    color VARCHAR(60),
    usuario_nombre VARCHAR(150),
    referencia_id VARCHAR(100),
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 3: Vaciar tablas transaccionales y catálogo de productos (TRUNCATE CASCADE)
TRUNCATE TABLE pagos_venta CASCADE;
TRUNCATE TABLE detalles_venta CASCADE;
TRUNCATE TABLE ventas CASCADE;
TRUNCATE TABLE detalles_compra CASCADE;
TRUNCATE TABLE compras CASCADE;
TRUNCATE TABLE envios CASCADE;
TRUNCATE TABLE movimientos_inventario CASCADE;
TRUNCATE TABLE auditoria CASCADE;
TRUNCATE TABLE turnos_caja CASCADE;
TRUNCATE TABLE productos CASCADE;

-- PASO 4: Limpiar clientes de prueba conservando únicamente 'publico'
DELETE FROM clientes WHERE id <> 'publico';

-- Asegurar cliente 'publico' para ventas de mostrador
INSERT INTO clientes (id, tipo_documento, numero_documento, nombres, apellidos, correo, telefono, estado, ciudad, direccion, total_comprado_usd, cantidad_compras)
VALUES ('publico', 'V', '00000000', 'Venta al', 'Público General', 'publico@urbanstep.com.ve', '0412-0000000', 'Distrito Capital', 'Caracas', 'Mostrador Tienda Principal', 0.00, 0)
ON CONFLICT (id) DO UPDATE SET 
    nombres = 'Venta al', 
    apellidos = 'Público General', 
    total_comprado_usd = 0, 
    cantidad_compras = 0;

-- =============================================================================
-- ÉXITO: La base de datos ha sido vaciada. Ahora puedes agregar tus productos
-- uno a uno y realizar compras y ventas desde una base totalmente limpia.
-- =============================================================================
