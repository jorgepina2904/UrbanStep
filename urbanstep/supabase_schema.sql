-- ==============================================================================
-- URBANSTEP VENEZUELA - ESQUEMA RELACIONAL Y NORMALIZADO EN ESPAÑOL (v4.0)
-- PostgreSQL / Supabase para Retail de Calzado y Moda Urbana en Venezuela
-- Soporta:
--   1. Multimoneda Dual (USD y VES con Tasa Oficial BCV).
--   2. Cumplimiento Fiscal SENIAT (IVA 16%, IGTF 3%, N° Factura y N° Control).
--   3. Módulo de Compras a Proveedores (3NF, RIF, Órdenes y Recepción de Stock).
--   4. Módulo de Cajas Registradoras (PIN de Seguridad, Arqueos y Turnos).
--   5. Gestión Integral de Inventario de Zapatos (Tallas, Marcas, Colores, Imagen).
--   6. Logística de Delivery con Coordenadas y Tracking de Envíos Nacionales.
--   7. Auditoría Completa de Operaciones (Trazabilidad de Cajeros y Admins).
--   8. Vistas de Compatibilidad Bilingüe (Retrocompatibilidad total con código previo).
-- ==============================================================================

-- 1. EXTENSIONES DE POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TIPOS PERSONALIZADOS Y ENUMERACIONES EN ESPAÑOL
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE rol_usuario_enum AS ENUM ('admin', 'cajero', 'gerente', 'almacenista');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_documento_enum AS ENUM ('V', 'E', 'J', 'G', 'P');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE metodo_pago_enum AS ENUM (
        'pagomovil', 'zelle', 'punto_venta', 'efectivo_usd', 'efectivo_bs', 'transferencia', 'mixto'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE empresa_envio_enum AS ENUM (
        'retiro_tienda', 'delivery_local', 'mrw', 'zoom', 'tealca', 'domesa'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE estado_envio_enum AS ENUM (
        'pendiente', 'asignado', 'en_camino', 'entregado', 'cancelado'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE estado_compra_enum AS ENUM (
        'borrador', 'ordenado', 'recibido', 'anulado'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE condicion_pago_enum AS ENUM (
        'contado', 'credito'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE estado_turno_enum AS ENUM (
        'abierto', 'cerrado'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE accion_auditoria_enum AS ENUM (
        'inicio_sesion', 'cierre_sesion', 'creacion', 'actualizacion', 'eliminacion',
        'apertura_turno', 'cierre_turno', 'venta_creada', 'venta_anulada',
        'compra_creada', 'compra_recibida', 'producto_creado', 'producto_actualizado',
        'ajuste_inventario', 'cambio_configuracion', 'envio_creado', 'actualizacion_tasa'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==============================================================================
-- 3. TABLA: CONFIGURACIÓN DE TIENDA Y PARÁMETROS FISCALES SENIAT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS configuracion_tienda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_tienda VARCHAR(150) NOT NULL DEFAULT 'UrbanStep Venezuela',
    razon_social VARCHAR(200) NOT NULL DEFAULT 'UrbanStep C.A.',
    rif VARCHAR(25) NOT NULL DEFAULT 'J-50123456-7',
    direccion_fiscal TEXT NOT NULL DEFAULT 'Av. Francisco de Miranda, Centro Lido, Torre B, Chacao, Caracas, Venezuela',
    telefono VARCHAR(30) NOT NULL DEFAULT '+58 212-951-4000',
    correo VARCHAR(120) NOT NULL DEFAULT 'contacto@urbanstep.com.ve',
    tasa_bcv NUMERIC(12, 4) NOT NULL DEFAULT 42.5000 CHECK (tasa_bcv > 0),
    tasa_iva NUMERIC(5, 4) NOT NULL DEFAULT 0.1600 CHECK (tasa_iva >= 0), -- 16% IVA SENIAT
    tasa_igtf NUMERIC(5, 4) NOT NULL DEFAULT 0.0300 CHECK (tasa_igtf >= 0), -- 3% IGTF Divisas
    igtf_activo BOOLEAN NOT NULL DEFAULT true,

    -- Cuentas receptoras de fondos en Venezuela
    pagomovil_banco VARCHAR(80) DEFAULT '0134 - Banesco',
    pagomovil_telefono VARCHAR(20) DEFAULT '0414-2345678',
    pagomovil_rif VARCHAR(25) DEFAULT 'J-50123456-7',

    zelle_correo VARCHAR(120) DEFAULT 'pagos@urbanstep.com.ve',
    zelle_titular VARCHAR(150) DEFAULT 'UrbanStep International LLC',

    transferencia_banco VARCHAR(80) DEFAULT '0102 - Banco de Venezuela',
    transferencia_cuenta VARCHAR(30) DEFAULT '0102-0001-00-1234567890',

    -- Parámetros de Logística y Delivery
    delivery_tarifa_base_usd NUMERIC(10, 2) DEFAULT 2.00 CHECK (delivery_tarifa_base_usd >= 0),
    delivery_costo_km_usd NUMERIC(10, 4) DEFAULT 0.5000 CHECK (delivery_costo_km_usd >= 0),
    delivery_distancia_max_km NUMERIC(10, 2) DEFAULT 30.00 CHECK (delivery_distancia_max_km > 0),
    latitud_tienda NUMERIC(12, 8) DEFAULT 10.06833014,   -- Barquisimeto, Estado Lara
    longitud_tienda NUMERIC(12, 8) DEFAULT -69.28499382,

    nota_pie_ticket TEXT DEFAULT '¡Gracias por su compra en UrbanStep! Para cambios de calzado dispone de 7 días continuos en su empaque original con su comprobante.',
    actualizado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABLA: HISTORIAL DE TASAS DE CAMBIO BCV (tasas_cambio)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tasas_cambio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tasa NUMERIC(12, 4) NOT NULL CHECK (tasa > 0),
    moneda_origen VARCHAR(5) NOT NULL DEFAULT 'USD',
    moneda_destino VARCHAR(5) NOT NULL DEFAULT 'VES',
    fuente VARCHAR(50) NOT NULL DEFAULT 'BCV Oficial',
    registrado_por VARCHAR(100) DEFAULT 'Sistema',
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABLA: CAJAS REGISTRADORAS Y TERMINALES POS (cajas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS cajas (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(200) DEFAULT 'Planta Principal',
    clave_pin VARCHAR(20) DEFAULT '1234',
    pin_hash TEXT NOT NULL,
    activa BOOLEAN DEFAULT true,
    creada_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizada_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 6. TABLA: USUARIOS Y PERFILES DEL SISTEMA (usuarios)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_auth_id UUID UNIQUE, -- Vínculo opcional con auth.users de Supabase
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(120) UNIQUE NOT NULL,
    rol rol_usuario_enum NOT NULL DEFAULT 'cajero',
    sucursal VARCHAR(100) DEFAULT 'Sede Caracas Principal',
    caja_asignada_id VARCHAR(50) REFERENCES cajas(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true,
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABLA: CATEGORÍAS DE PRODUCTOS (categorias)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(50),
    color VARCHAR(7) DEFAULT '#3b82f6',
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT true,
    creada_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizada_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABLA: MARCAS DE CALZADO Y MODA (marcas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS marcas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    descripcion TEXT,
    pais_origen VARCHAR(60) DEFAULT 'Internacional',
    sitio_web VARCHAR(255),
    activa BOOLEAN DEFAULT true,
    creada_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizada_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 9. TABLA: PROVEEDORES DE CALZADO Y SUMINISTROS (proveedores) [NORMALIZACIÓN 3NF]
-- ==============================================================================
CREATE TABLE IF NOT EXISTS proveedores (
    id VARCHAR(50) PRIMARY KEY, -- Ej: 'PRV-101'
    rif VARCHAR(25) NOT NULL UNIQUE, -- Ej: 'J-31245678-9'
    razon_social VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(150),
    contacto_nombre VARCHAR(120),
    telefono VARCHAR(30) NOT NULL,
    correo VARCHAR(120),
    direccion TEXT,
    ciudad VARCHAR(100) DEFAULT 'Caracas',
    estado VARCHAR(80) DEFAULT 'Distrito Capital',
    dias_credito_pactados INTEGER DEFAULT 0 CHECK (dias_credito_pactados >= 0),
    activo BOOLEAN DEFAULT true,
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABLA: PRODUCTOS DE CALZADO (productos) [RELACIONAL CON MARCAS Y CATEGORÍAS]
-- ==============================================================================
CREATE TABLE IF NOT EXISTS productos (
    id VARCHAR(50) PRIMARY KEY, -- 'PRD-1001'
    sku VARCHAR(60) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    marca_id UUID REFERENCES marcas(id) ON DELETE SET NULL,
    marca_nombre VARCHAR(80) NOT NULL,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    categoria_nombre VARCHAR(60) NOT NULL,
    proveedor_id VARCHAR(50) REFERENCES proveedores(id) ON DELETE SET NULL,
    descripcion TEXT,
    color VARCHAR(60) DEFAULT 'Multicolor',
    color_hex VARCHAR(7),
    costo_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (costo_usd >= 0),
    precio_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (precio_usd >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_minimo INTEGER NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
    tallas JSONB NOT NULL DEFAULT '["38", "39", "40", "41", "42", "43"]'::jsonb,
    imagen_url TEXT,
    estado VARCHAR(30) DEFAULT 'in_stock',
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_precio_mayor_costo CHECK (precio_usd >= costo_usd)
);

-- ==============================================================================
-- 11. TABLA: COMPRAS A PROVEEDORES (compras) [NUEVA CABECERA NORMALIZADA]
-- ==============================================================================
CREATE TABLE IF NOT EXISTS compras (
    id VARCHAR(50) PRIMARY KEY, -- 'CMP-2026-001'
    numero_factura VARCHAR(60) NOT NULL, -- Número de factura del proveedor
    numero_control VARCHAR(60) NOT NULL, -- Número de control fiscal SENIAT
    proveedor_id VARCHAR(50) NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
    caja_id VARCHAR(50) REFERENCES cajas(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_recepcion TIMESTAMP WITH TIME ZONE,
    tasa_bcv NUMERIC(12, 4) NOT NULL CHECK (tasa_bcv > 0),

    -- Montos en USD ($)
    subtotal_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_usd >= 0),
    iva_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (iva_usd >= 0),
    total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_usd >= 0),

    -- Montos en Bolívares (VES / Bs.)
    subtotal_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_bs >= 0),
    iva_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (iva_bs >= 0),
    total_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_bs >= 0),

    -- Condiciones y Pago
    metodo_pago metodo_pago_enum DEFAULT 'transferencia',
    banco_pago VARCHAR(100) DEFAULT '0134 - Banesco',
    condicion_pago condicion_pago_enum DEFAULT 'contado',
    dias_credito INTEGER DEFAULT 0 CHECK (dias_credito >= 0),
    estado estado_compra_enum DEFAULT 'recibido',
    recibido_por VARCHAR(150) DEFAULT 'Almacén Central',
    observaciones TEXT,
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 12. TABLA: DETALLES DE COMPRA (detalles_compra) [NORMALIZACIÓN 3NF]
-- ==============================================================================
CREATE TABLE IF NOT EXISTS detalles_compra (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compra_id VARCHAR(50) NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    producto_id VARCHAR(50) NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    nombre_producto VARCHAR(200) NOT NULL,
    talla VARCHAR(20),
    color VARCHAR(60),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    costo_unitario_usd NUMERIC(12, 2) NOT NULL CHECK (costo_unitario_usd >= 0),
    costo_unitario_bs NUMERIC(14, 2) NOT NULL CHECK (costo_unitario_bs >= 0),
    subtotal_usd NUMERIC(12, 2) NOT NULL CHECK (subtotal_usd >= 0),
    subtotal_bs NUMERIC(14, 2) NOT NULL CHECK (subtotal_bs >= 0),
    lote VARCHAR(50),
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 13. TABLA: CLIENTES CON DATOS VENEZOLANOS (clientes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(50) PRIMARY KEY, -- 'CLT-1001' o 'publico'
    tipo_documento tipo_documento_enum NOT NULL DEFAULT 'V',
    numero_documento VARCHAR(25) NOT NULL DEFAULT '00000000',
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(120),
    telefono VARCHAR(30),
    estado VARCHAR(80) DEFAULT 'Distrito Capital',
    ciudad VARCHAR(100) DEFAULT 'Caracas',
    direccion TEXT,
    latitud_entrega NUMERIC(12, 8),
    longitud_entrega NUMERIC(12, 8),
    total_comprado_usd NUMERIC(14, 2) DEFAULT 0.00 CHECK (total_comprado_usd >= 0),
    cantidad_compras INTEGER DEFAULT 0 CHECK (cantidad_compras >= 0),
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 14. TABLA: TURNOS DE CAJA (turnos_caja) [ARQUEOS Y CORTES Z]
-- ==============================================================================
CREATE TABLE IF NOT EXISTS turnos_caja (
    id VARCHAR(50) PRIMARY KEY, -- 'TURNO-2026-001'
    caja_id VARCHAR(50) NOT NULL REFERENCES cajas(id) ON DELETE RESTRICT,
    nombre_caja VARCHAR(100),
    cajero_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre_cajero VARCHAR(150) NOT NULL,
    estado estado_turno_enum DEFAULT 'abierto',
    apertura_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cierre_el TIMESTAMP WITH TIME ZONE,

    efectivo_inicial_usd NUMERIC(12, 2) DEFAULT 0.00 CHECK (efectivo_inicial_usd >= 0),
    efectivo_inicial_bs NUMERIC(14, 2) DEFAULT 0.00 CHECK (efectivo_inicial_bs >= 0),

    total_ventas_usd NUMERIC(12, 2) DEFAULT 0.00 CHECK (total_ventas_usd >= 0),
    total_ventas_bs NUMERIC(14, 2) DEFAULT 0.00 CHECK (total_ventas_bs >= 0),
    cantidad_ventas INTEGER DEFAULT 0 CHECK (cantidad_ventas >= 0),

    efectivo_declarado_usd NUMERIC(12, 2),
    efectivo_declarado_bs NUMERIC(14, 2),
    diferencia_usd NUMERIC(12, 2),
    diferencia_bs NUMERIC(14, 2),

    observaciones_apertura TEXT,
    observaciones_cierre TEXT,
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 15. TABLA: VENTAS Y FACTURACIÓN COMERCIAL (ventas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ventas (
    id VARCHAR(50) PRIMARY KEY, -- 'VEN-1001'
    numero_recibo VARCHAR(50) UNIQUE NOT NULL, -- 'TKT-2026-0001'
    numero_control_fiscal VARCHAR(50),
    cliente_id VARCHAR(50) REFERENCES clientes(id) ON DELETE SET NULL,
    nombre_cliente VARCHAR(200) NOT NULL,
    caja_id VARCHAR(50) REFERENCES cajas(id) ON DELETE SET NULL,
    turno_id VARCHAR(50) REFERENCES turnos_caja(id) ON DELETE SET NULL,
    usuario_cajero_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre_cajero VARCHAR(150) NOT NULL,
    tasa_bcv NUMERIC(12, 4) NOT NULL CHECK (tasa_bcv > 0),

    -- Montos en USD ($)
    subtotal_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_usd >= 0),
    descuento_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (descuento_usd >= 0),
    iva_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (iva_usd >= 0),
    igtf_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (igtf_usd >= 0),
    costo_delivery_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (costo_delivery_usd >= 0),
    total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_usd >= 0),

    -- Montos en Bolívares (VES / Bs.)
    subtotal_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_bs >= 0),
    iva_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (iva_bs >= 0),
    igtf_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (igtf_bs >= 0),
    total_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_bs >= 0),

    -- Métodos y Logística
    metodo_pago_principal metodo_pago_enum NOT NULL DEFAULT 'pagomovil',
    estado_pago VARCHAR(30) DEFAULT 'completado',
    empresa_envio empresa_envio_enum DEFAULT 'retiro_tienda',
    numero_guia VARCHAR(100),
    detalles_agencia_envio TEXT,

    tiene_delivery BOOLEAN DEFAULT false,
    delivery_id UUID,
    observaciones TEXT,
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 16. TABLA: DETALLES DE VENTAS (detalles_venta) [NORMALIZACIÓN 3NF]
-- ==============================================================================
CREATE TABLE IF NOT EXISTS detalles_venta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id VARCHAR(50) NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id VARCHAR(50) REFERENCES productos(id) ON DELETE SET NULL,
    nombre_producto VARCHAR(200) NOT NULL,
    marca VARCHAR(80),
    talla VARCHAR(20) NOT NULL,
    color VARCHAR(60),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario_usd NUMERIC(12, 2) NOT NULL CHECK (precio_unitario_usd >= 0),
    precio_unitario_bs NUMERIC(14, 2) NOT NULL CHECK (precio_unitario_bs >= 0),
    subtotal_usd NUMERIC(12, 2) NOT NULL CHECK (subtotal_usd >= 0),
    subtotal_bs NUMERIC(14, 2) NOT NULL CHECK (subtotal_bs >= 0)
);

-- ==============================================================================
-- 17. TABLA: PAGOS DE VENTAS (pagos_venta) [SOPORTE MULTIMONEDA Y PAGOS MIXTOS]
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pagos_venta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id VARCHAR(50) NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    metodo_pago metodo_pago_enum NOT NULL,
    monto_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monto_usd >= 0),
    monto_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (monto_bs >= 0),

    -- Referencias Bancarias Nacionales
    banco_origen VARCHAR(100),
    banco_destino VARCHAR(100),
    numero_referencia VARCHAR(50),
    telefono_origen VARCHAR(30),
    cedula_rif_titular VARCHAR(30),
    observaciones TEXT,
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 18. TABLA: ENVÍOS Y DELIVERIES CON GEOLOCALIZACIÓN (envios)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS envios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id VARCHAR(50) REFERENCES ventas(id) ON DELETE SET NULL,

    nombre_origen VARCHAR(200) DEFAULT 'UrbanStep Tienda',
    latitud_origen NUMERIC(12, 8) NOT NULL,
    longitud_origen NUMERIC(12, 8) NOT NULL,
    direccion_origen TEXT,

    nombre_destino VARCHAR(200),
    latitud_destino NUMERIC(12, 8) NOT NULL,
    longitud_destino NUMERIC(12, 8) NOT NULL,
    direccion_destino TEXT NOT NULL,

    distancia_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (distancia_km >= 0),
    tiempo_estimado_min INTEGER DEFAULT 30 CHECK (tiempo_estimado_min >= 0),
    costo_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (costo_usd >= 0),
    costo_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (costo_bs >= 0),

    estado estado_envio_enum DEFAULT 'pendiente',
    nombre_repartidor VARCHAR(150),
    telefono_repartidor VARCHAR(30),
    vehiculo_repartidor VARCHAR(100),

    nombre_cliente VARCHAR(200),
    telefono_cliente VARCHAR(30),
    instrucciones_entrega TEXT,

    entregado_el TIMESTAMP WITH TIME ZONE,
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 19. TABLA: REGISTRO DE AUDITORÍA (auditoria)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID,
    nombre_usuario VARCHAR(150),
    rol_usuario rol_usuario_enum,
    correo_usuario VARCHAR(120),

    accion accion_auditoria_enum NOT NULL,
    etiqueta_accion VARCHAR(200),
    modulo VARCHAR(60) NOT NULL,
    tipo_entidad VARCHAR(60),
    entidad_id VARCHAR(100),
    detalles JSONB,
    direccion_ip VARCHAR(45),
    agente_usuario TEXT,
    creado_el TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 20. TRIGGERS Y FUNCIONES DE AUTOMATIZACIÓN DE NEGOCIO
-- ==============================================================================

-- A) Actualización automática de marcas temporales (actualizado_el)
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_el = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_configuracion_actualizada ON configuracion_tienda;
CREATE TRIGGER trg_configuracion_actualizada
BEFORE UPDATE ON configuracion_tienda
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_cajas_actualizadas ON cajas;
CREATE TRIGGER trg_cajas_actualizadas
BEFORE UPDATE ON cajas
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_usuarios_actualizados ON usuarios;
CREATE TRIGGER trg_usuarios_actualizados
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_categorias_actualizadas ON categorias;
CREATE TRIGGER trg_categorias_actualizadas
BEFORE UPDATE ON categorias
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_marcas_actualizadas ON marcas;
CREATE TRIGGER trg_marcas_actualizadas
BEFORE UPDATE ON marcas
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_proveedores_actualizados ON proveedores;
CREATE TRIGGER trg_proveedores_actualizados
BEFORE UPDATE ON proveedores
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_productos_actualizados ON productos;
CREATE TRIGGER trg_productos_actualizados
BEFORE UPDATE ON productos
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_compras_actualizadas ON compras;
CREATE TRIGGER trg_compras_actualizadas
BEFORE UPDATE ON compras
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_clientes_actualizados ON clientes;
CREATE TRIGGER trg_clientes_actualizados
BEFORE UPDATE ON clientes
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_envios_actualizados ON envios;
CREATE TRIGGER trg_envios_actualizados
BEFORE UPDATE ON envios
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_timestamp();

-- B) Actualizar stock de inventario automáticamente al insertar detalles de compra
CREATE OR REPLACE FUNCTION fn_aumentar_stock_compra()
RETURNS TRIGGER AS $$
BEGIN
    -- Incrementar stock del producto
    UPDATE productos
    SET 
        stock = stock + NEW.cantidad,
        costo_usd = NEW.costo_unitario_usd,
        estado = CASE 
            WHEN (stock + NEW.cantidad) > stock_minimo THEN 'in_stock'
            WHEN (stock + NEW.cantidad) > 0 THEN 'low_stock'
            ELSE 'out_of_stock'
        END,
        actualizado_el = NOW()
    WHERE id = NEW.producto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_detalles_compra_stock ON detalles_compra;
CREATE TRIGGER trg_detalles_compra_stock
AFTER INSERT ON detalles_compra
FOR EACH ROW EXECUTE PROCEDURE fn_aumentar_stock_compra();

-- C) Descontar stock de inventario automáticamente al vender un producto
CREATE OR REPLACE FUNCTION fn_descontar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_detalles_venta_stock ON detalles_venta;
CREATE TRIGGER trg_detalles_venta_stock
AFTER INSERT ON detalles_venta
FOR EACH ROW EXECUTE PROCEDURE fn_descontar_stock_venta();

-- D) Actualizar acumulados del cliente al registrar una venta
CREATE OR REPLACE FUNCTION fn_actualizar_totales_cliente()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ventas_cliente_totales ON ventas;
CREATE TRIGGER trg_ventas_cliente_totales
AFTER INSERT ON ventas
FOR EACH ROW EXECUTE PROCEDURE fn_actualizar_totales_cliente();

-- ==============================================================================
-- 21. ÍNDICES DE RENDIMIENTO (B-TREE OPTIMIZADOS PARA POS Y REPORTES)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos(sku);
CREATE INDEX IF NOT EXISTS idx_productos_marca_id ON productos(marca_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor_id ON productos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);

CREATE INDEX IF NOT EXISTS idx_proveedores_rif ON proveedores(rif);
CREATE INDEX IF NOT EXISTS idx_proveedores_razon ON proveedores(razon_social);

CREATE INDEX IF NOT EXISTS idx_compras_factura ON compras(numero_factura);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor_id ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(estado);
CREATE INDEX IF NOT EXISTS idx_detalles_compra_compra_id ON detalles_compra(compra_id);
CREATE INDEX IF NOT EXISTS idx_detalles_compra_producto_id ON detalles_compra(producto_id);

CREATE INDEX IF NOT EXISTS idx_clientes_doc ON clientes(tipo_documento, numero_documento);
CREATE INDEX IF NOT EXISTS idx_ventas_creado_el ON ventas(creado_el);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_caja_id ON ventas(caja_id);
CREATE INDEX IF NOT EXISTS idx_ventas_turno_id ON ventas(turno_id);
CREATE INDEX IF NOT EXISTS idx_detalles_venta_venta_id ON detalles_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalles_venta_producto_id ON detalles_venta(producto_id);
CREATE INDEX IF NOT EXISTS idx_pagos_venta_venta_id ON pagos_venta(venta_id);

CREATE INDEX IF NOT EXISTS idx_turnos_caja_id ON turnos_caja(caja_id);
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos_caja(estado);
CREATE INDEX IF NOT EXISTS idx_envios_venta_id ON envios(venta_id);
CREATE INDEX IF NOT EXISTS idx_envios_estado ON envios(estado);
CREATE INDEX IF NOT EXISTS idx_auditoria_creado_el ON auditoria(creado_el);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria(modulo);

-- ==============================================================================
-- 22. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
ALTER TABLE configuracion_tienda ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasas_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura (Select)
CREATE POLICY "Lectura configuracion_tienda" ON configuracion_tienda FOR SELECT USING (true);
CREATE POLICY "Lectura tasas_cambio" ON tasas_cambio FOR SELECT USING (true);
CREATE POLICY "Lectura cajas" ON cajas FOR SELECT USING (true);
CREATE POLICY "Lectura usuarios" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Lectura categorias" ON categorias FOR SELECT USING (true);
CREATE POLICY "Lectura marcas" ON marcas FOR SELECT USING (true);
CREATE POLICY "Lectura proveedores" ON proveedores FOR SELECT USING (true);
CREATE POLICY "Lectura productos" ON productos FOR SELECT USING (true);
CREATE POLICY "Lectura compras" ON compras FOR SELECT USING (true);
CREATE POLICY "Lectura detalles_compra" ON detalles_compra FOR SELECT USING (true);
CREATE POLICY "Lectura clientes" ON clientes FOR SELECT USING (true);
CREATE POLICY "Lectura turnos_caja" ON turnos_caja FOR SELECT USING (true);
CREATE POLICY "Lectura ventas" ON ventas FOR SELECT USING (true);
CREATE POLICY "Lectura detalles_venta" ON detalles_venta FOR SELECT USING (true);
CREATE POLICY "Lectura pagos_venta" ON pagos_venta FOR SELECT USING (true);
CREATE POLICY "Lectura envios" ON envios FOR SELECT USING (true);
CREATE POLICY "Lectura auditoria" ON auditoria FOR SELECT USING (true);

-- Políticas de mutación (Insert, Update, Delete)
CREATE POLICY "Mutacion configuracion_tienda" ON configuracion_tienda FOR ALL USING (true);
CREATE POLICY "Mutacion tasas_cambio" ON tasas_cambio FOR ALL USING (true);
CREATE POLICY "Mutacion cajas" ON cajas FOR ALL USING (true);
CREATE POLICY "Mutacion usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "Mutacion categorias" ON categorias FOR ALL USING (true);
CREATE POLICY "Mutacion marcas" ON marcas FOR ALL USING (true);
CREATE POLICY "Mutacion proveedores" ON proveedores FOR ALL USING (true);
CREATE POLICY "Mutacion productos" ON productos FOR ALL USING (true);
CREATE POLICY "Mutacion compras" ON compras FOR ALL USING (true);
CREATE POLICY "Mutacion detalles_compra" ON detalles_compra FOR ALL USING (true);
CREATE POLICY "Mutacion clientes" ON clientes FOR ALL USING (true);
CREATE POLICY "Mutacion turnos_caja" ON turnos_caja FOR ALL USING (true);
CREATE POLICY "Mutacion ventas" ON ventas FOR ALL USING (true);
CREATE POLICY "Mutacion detalles_venta" ON detalles_venta FOR ALL USING (true);
CREATE POLICY "Mutacion pagos_venta" ON pagos_venta FOR ALL USING (true);
CREATE POLICY "Mutacion envios" ON envios FOR ALL USING (true);
CREATE POLICY "Mutacion auditoria" ON auditoria FOR ALL USING (true);

-- ==============================================================================
-- 23. VISTAS DE COMPATIBILIDAD BILINGÜES (BACKWARD COMPATIBILITY)
-- Permite que código legacy o bibliotecas externas en inglés sigan funcionando
-- ==============================================================================

CREATE OR REPLACE VIEW store_settings AS
SELECT 
    id,
    nombre_tienda AS store_name,
    razon_social AS legal_name,
    rif,
    direccion_fiscal AS fiscal_address,
    telefono AS phone,
    correo AS email,
    tasa_bcv AS bcv_rate,
    tasa_iva AS iva_rate,
    tasa_igtf AS igtf_rate,
    igtf_activo AS igtf_active,
    pagomovil_banco AS pagomovil_bank,
    pagomovil_telefono AS pagomovil_phone,
    pagomovil_rif AS pagomovil_rif,
    zelle_correo AS zelle_email,
    zelle_titular AS zelle_holder,
    transferencia_banco AS transfer_bank,
    transferencia_cuenta AS transfer_account,
    delivery_tarifa_base_usd AS delivery_base_rate_usd,
    delivery_costo_km_usd AS delivery_per_km_usd,
    delivery_distancia_max_km AS delivery_max_distance_km,
    latitud_tienda AS store_latitude,
    longitud_tienda AS store_longitude,
    nota_pie_ticket AS ticket_footer_note,
    actualizado_el AS updated_at
FROM configuracion_tienda;

CREATE OR REPLACE VIEW exchange_rates AS
SELECT 
    id,
    tasa AS rate,
    moneda_origen AS currency_from,
    moneda_destino AS currency_to,
    fuente AS source,
    registrado_por AS registered_by,
    creado_el AS created_at
FROM tasas_cambio;

CREATE OR REPLACE VIEW cash_registers AS
SELECT 
    id,
    nombre AS name,
    ubicacion AS location,
    pin_hash,
    activa AS active,
    creada_el AS created_at,
    actualizada_el AS updated_at
FROM cajas;

CREATE OR REPLACE VIEW profiles AS
SELECT 
    id,
    usuario_auth_id AS user_id,
    nombre_completo AS name,
    correo AS email,
    rol::text AS role,
    sucursal AS branch,
    caja_asignada_id AS assigned_caja,
    activo AS active,
    creado_el AS created_at,
    actualizado_el AS updated_at
FROM usuarios;

CREATE OR REPLACE VIEW categories AS
SELECT 
    id,
    nombre AS name,
    descripcion AS description,
    icono AS icon,
    color,
    orden AS sort_order,
    activa AS active,
    creada_el AS created_at,
    actualizada_el AS updated_at
FROM categorias;

CREATE OR REPLACE VIEW brands AS
SELECT 
    id,
    nombre AS name,
    logo_url,
    descripcion AS description,
    pais_origen AS country,
    sitio_web AS website,
    activa AS active,
    creada_el AS created_at,
    actualizada_el AS updated_at
FROM marcas;

CREATE OR REPLACE VIEW suppliers AS
SELECT 
    id,
    rif,
    razon_social AS company_name,
    nombre_comercial AS commercial_name,
    contacto_nombre AS contact_name,
    telefono AS phone,
    correo AS email,
    direccion AS address,
    ciudad AS city,
    estado AS state,
    dias_credito_pactados AS credit_days,
    activo AS active,
    creado_el AS created_at,
    actualizado_el AS updated_at
FROM proveedores;

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
    actualizado_el AS updated_at
FROM productos;

CREATE OR REPLACE VIEW purchases AS
SELECT 
    id,
    numero_factura AS invoice_number,
    numero_control AS control_number,
    proveedor_id AS supplier_id,
    caja_id,
    usuario_id AS user_id,
    fecha_emision AS issue_date,
    fecha_recepcion AS received_at,
    tasa_bcv AS bcv_rate,
    subtotal_usd,
    iva_usd AS tax_usd,
    total_usd,
    subtotal_bs,
    iva_bs AS tax_bs,
    total_bs,
    metodo_pago::text AS payment_method,
    banco_pago AS payment_bank,
    condicion_pago::text AS payment_condition,
    dias_credito AS credit_days,
    estado::text AS status,
    recibido_por AS received_by,
    observaciones AS notes,
    creado_el AS created_at,
    actualizado_el AS updated_at
FROM compras;

CREATE OR REPLACE VIEW purchase_items AS
SELECT 
    id,
    compra_id AS purchase_id,
    producto_id AS product_id,
    nombre_producto AS product_name,
    talla AS size,
    color,
    cantidad AS quantity,
    costo_unitario_usd AS unit_cost_usd,
    costo_unitario_bs AS unit_cost_bs,
    subtotal_usd,
    subtotal_bs,
    lote AS batch,
    creado_el AS created_at
FROM detalles_compra;

CREATE OR REPLACE VIEW customers AS
SELECT 
    id,
    tipo_documento AS doc_type,
    numero_documento AS doc_number,
    nombres AS first_name,
    apellidos AS last_name,
    correo AS email,
    telefono AS phone,
    estado AS state,
    ciudad AS city,
    direccion AS address,
    latitud_entrega AS delivery_latitude,
    longitud_entrega AS delivery_longitude,
    total_comprado_usd AS total_spent_usd,
    cantidad_compras AS purchases_count,
    creado_el AS created_at,
    actualizado_el AS updated_at
FROM clientes;

CREATE OR REPLACE VIEW shifts AS
SELECT 
    id,
    caja_id,
    nombre_caja AS caja_name,
    cajero_id AS cashier_id,
    nombre_cajero AS cashier_name,
    estado::text AS status,
    apertura_el AS opened_at,
    cierre_el AS closed_at,
    efectivo_inicial_usd AS initial_cash_usd,
    efectivo_inicial_bs AS initial_cash_bs,
    total_ventas_usd AS total_sales_usd,
    total_ventas_bs AS total_sales_bs,
    cantidad_ventas AS sales_count,
    efectivo_declarado_usd AS counted_cash_usd,
    efectivo_declarado_bs AS counted_cash_bs,
    diferencia_usd AS difference_usd,
    diferencia_bs AS difference_bs,
    observaciones_apertura AS notes,
    observaciones_cierre AS closing_notes,
    creado_el AS created_at
FROM turnos_caja;

CREATE OR REPLACE VIEW sales AS
SELECT 
    id,
    numero_recibo AS receipt_number,
    numero_control_fiscal AS fiscal_control_number,
    cliente_id AS customer_id,
    nombre_cliente AS customer_name,
    caja_id,
    turno_id AS shift_id,
    usuario_cajero_id AS cashier_id,
    nombre_cajero AS cashier_name,
    tasa_bcv AS bcv_rate,
    subtotal_usd,
    descuento_usd AS discount_usd,
    iva_usd AS tax_usd,
    igtf_usd,
    costo_delivery_usd AS delivery_cost_usd,
    total_usd,
    subtotal_bs,
    iva_bs AS tax_bs,
    igtf_bs,
    total_bs,
    metodo_pago_principal::text AS primary_payment_method,
    estado_pago AS payment_status,
    empresa_envio::text AS shipping_carrier,
    numero_guia AS shipping_tracking_number,
    detalles_agencia_envio AS shipping_agency_details,
    tiene_delivery AS has_delivery,
    delivery_id,
    observaciones AS notes,
    creado_el AS created_at
FROM ventas;

CREATE OR REPLACE VIEW sale_items AS
SELECT 
    id,
    venta_id AS sale_id,
    producto_id AS product_id,
    nombre_producto AS name,
    marca AS brand,
    talla AS size,
    color,
    cantidad AS quantity,
    precio_unitario_usd AS unit_price_usd,
    precio_unitario_bs AS unit_price_bs,
    subtotal_usd AS total_price_usd,
    subtotal_bs AS total_price_bs
FROM detalles_venta;

CREATE OR REPLACE VIEW sale_payments AS
SELECT 
    id,
    venta_id AS sale_id,
    metodo_pago::text AS payment_method,
    monto_usd AS amount_usd,
    monto_bs AS amount_bs,
    banco_origen AS bank_origin,
    banco_destino AS bank_destination,
    numero_referencia AS reference_number,
    telefono_origen AS phone_number,
    cedula_rif_titular AS id_card,
    observaciones AS notes,
    creado_el AS created_at
FROM pagos_venta;

CREATE OR REPLACE VIEW deliveries AS
SELECT 
    id,
    venta_id AS sale_id,
    nombre_origen AS origin_name,
    latitud_origen AS origin_latitude,
    longitud_origen AS origin_longitude,
    direccion_origen AS origin_address,
    nombre_destino AS destination_name,
    latitud_destino AS destination_latitude,
    longitud_destino AS destination_longitude,
    direccion_destino AS destination_address,
    distancia_km AS distance_km,
    tiempo_estimado_min AS estimated_time_min,
    costo_usd AS delivery_cost_usd,
    costo_bs AS delivery_cost_bs,
    estado::text AS status,
    nombre_repartidor AS driver_name,
    telefono_repartidor AS driver_phone,
    vehiculo_repartidor AS driver_vehicle,
    nombre_cliente AS customer_name,
    telefono_cliente AS customer_phone,
    instrucciones_entrega AS special_instructions,
    entregado_el AS delivered_at,
    creado_el AS created_at,
    actualizado_el AS updated_at
FROM envios;

CREATE OR REPLACE VIEW audit_logs AS
SELECT 
    id,
    usuario_id AS user_id,
    nombre_usuario AS user_name,
    rol_usuario::text AS user_role,
    correo_usuario AS user_email,
    accion::text AS action,
    etiqueta_accion AS action_label,
    modulo AS module,
    tipo_entidad AS entity_type,
    entidad_id AS entity_id,
    detalles AS details,
    direccion_ip AS ip_address,
    agente_usuario AS user_agent,
    creado_el AS created_at
FROM auditoria;

-- ==============================================================================
-- 24. SEMILLAS Y DATOS INICIALES EN ESPAÑOL (SEEDS)
-- ==============================================================================

-- A) Configuración inicial de la tienda
INSERT INTO configuracion_tienda (
    nombre_tienda, razon_social, rif, direccion_fiscal, telefono, correo,
    tasa_bcv, tasa_iva, tasa_igtf, igtf_activo,
    pagomovil_banco, pagomovil_telefono, pagomovil_rif,
    zelle_correo, zelle_titular, transferencia_banco, transferencia_cuenta,
    latitud_tienda, longitud_tienda
) VALUES (
    'UrbanStep Venezuela',
    'UrbanStep C.A.',
    'J-50123456-7',
    'Av. Los Leones con Av. Venezuela, Barquisimeto, Edo. Lara, Venezuela',
    '+58 251-255-4000',
    'contacto@urbanstep.com.ve',
    42.5000,
    0.1600,
    0.0300,
    true,
    '0134 - Banesco',
    '0414-2345678',
    'J-50123456-7',
    'pagos@urbanstep.com.ve',
    'UrbanStep International LLC',
    '0102 - Banco de Venezuela',
    '0102-0001-00-1234567890',
    10.06833014,
    -69.28499382
) ON CONFLICT DO NOTHING;

-- B) Historial de tasa BCV inicial
INSERT INTO tasas_cambio (tasa, fuente, registrado_por)
VALUES (42.5000, 'BCV Oficial', 'Administrador General')
ON CONFLICT DO NOTHING;

-- C) Cajas Registradoras iniciales con PINs
INSERT INTO cajas (id, nombre, ubicacion, clave_pin, pin_hash) VALUES
('caja-1', 'Caja 1', 'Planta Baja - Entrada Principal', '1234', crypt('1234', gen_salt('bf'))),
('caja-2', 'Caja 2', 'Planta Baja - Lateral Derecho', '5678', crypt('5678', gen_salt('bf'))),
('caja-3', 'Caja 3', 'Piso 1 - Área Premium', '9012', crypt('9012', gen_salt('bf')))
ON CONFLICT (id) DO NOTHING;

-- D) Categorías de calzado urbano y deportivo
INSERT INTO categorias (id, nombre, descripcion, icono, color, orden) VALUES
('c0000001-0000-0000-0000-000000000001', 'Running', 'Calzado deportivo para correr y maratones', '🏃', '#3b82f6', 1),
('c0000001-0000-0000-0000-000000000002', 'Casual', 'Calzado urbano y estilo casual diario', '👟', '#8b5cf6', 2),
('c0000001-0000-0000-0000-000000000003', 'Basketball', 'Zapatillas de alta tracción y tobillera para cancha', '🏀', '#f97316', 3),
('c0000001-0000-0000-0000-000000000004', 'Skateboarding', 'Calzado de suela vulcanizada y agarre', '🛹', '#ef4444', 4),
('c0000001-0000-0000-0000-000000000005', 'Lifestyle', 'Ediciones de moda urbana y coleccionables', '🔥', '#ec4899', 5)
ON CONFLICT (nombre) DO NOTHING;

-- E) Marcas reconocidas
INSERT INTO marcas (id, nombre, descripcion, pais_origen, sitio_web) VALUES
('b0000001-0000-0000-0000-000000000001', 'Nike', 'Líder global en rendimiento atlético e innovación', 'Estados Unidos', 'https://www.nike.com'),
('b0000001-0000-0000-0000-000000000002', 'Adidas', 'Diseño y tecnología deportiva alemana', 'Alemania', 'https://www.adidas.com'),
('b0000001-0000-0000-0000-000000000003', 'Puma', 'Velocidad y cultura urbana deportiva', 'Alemania', 'https://www.puma.com'),
('b0000001-0000-0000-0000-000000000004', 'New Balance', 'Artesanía, confort ergonómico y soporte', 'Estados Unidos', 'https://www.newbalance.com'),
('b0000001-0000-0000-0000-000000000005', 'Vans', 'Cultura skate y calzado clásico resistente', 'Estados Unidos', 'https://www.vans.com')
ON CONFLICT (nombre) DO NOTHING;

-- F) Proveedores venezolanos registrados (Normalización de Compras)
INSERT INTO proveedores (id, rif, razon_social, nombre_comercial, contacto_nombre, telefono, correo, direccion, ciudad, estado, dias_credito_pactados) VALUES
('PRV-101', 'J-31245678-9', 'Distribuidora Deportiva Ávila C.A.', 'Ávila Sports', 'Ing. Marcos Bastidas', '0212-3456789', 'ventas@distavila.com.ve', 'Av. Francisco de Miranda, Edif. Centro Seguros La Paz, Piso 4, La California Norte', 'Caracas', 'Miranda', 15),
('PRV-102', 'J-40987654-3', 'Calzados Industriales Los Andes S.A.', 'Los Andes Shoes', 'Lic. Carmen Briceño', '0274-2661234', 'pedidos@losandesshoes.com', 'Zona Industrial Los Curos, Galpón 12', 'Mérida', 'Mérida', 30),
('PRV-103', 'J-50112233-4', 'Importadora Caracas Sport C.A.', 'Caracas Sport Wholesale', 'Sr. Roberto Finol', '0212-9988776', 'compras@ccs-sport.com.ve', 'Calle Londres, Quinta Sportiva, Las Mercedes', 'Caracas', 'Miranda', 0),
('PRV-104', 'J-30456123-8', 'Marcas Globales de Venezuela C.A.', 'Global Brands VE', 'Dra. Elena Silva', '0241-8765432', 'contacto@marcasglobales.com.ve', 'Av. Bolívar Norte, Centro Empresarial Valencia, Ofic. 8-B', 'Valencia', 'Carabobo', 21)
ON CONFLICT (id) DO NOTHING;

-- G) Productos de calzado con imágenes y relaciones
INSERT INTO productos (
    id, sku, nombre, marca_id, marca_nombre, categoria_id, categoria_nombre, proveedor_id,
    descripcion, color, color_hex, costo_usd, precio_usd, stock, stock_minimo, tallas, imagen_url, estado
) VALUES
('PRD-1001', 'NK-AF1-001', 'Nike Air Force 1 07 White', 'b0000001-0000-0000-0000-000000000001', 'Nike', 'c0000001-0000-0000-0000-000000000002', 'Casual', 'PRV-101', 'El brillo sigue vivo con el ícono del básquetbol en cuero blanco impoluto.', 'Blanco', '#FFFFFF', 65.00, 110.00, 14, 5, '["39", "40", "41", "42", "43"]'::jsonb, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80', 'in_stock'),
('PRD-1002', 'AD-UB-002', 'Adidas Ultraboost Light', 'b0000001-0000-0000-0000-000000000002', 'Adidas', 'c0000001-0000-0000-0000-000000000001', 'Running', 'PRV-101', 'Máximo retorno de energía con espuma Boost de última generación.', 'Negro / Core Black', '#111827', 95.00, 160.00, 9, 4, '["40", "41", "42", "43", "44"]'::jsonb, 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80', 'in_stock'),
('PRD-1003', 'NB-550-003', 'New Balance 550 Vintage White', 'b0000001-0000-0000-0000-000000000004', 'New Balance', 'c0000001-0000-0000-0000-000000000002', 'Casual', 'PRV-104', 'Tributo al calzado de básquet profesional de los 80.', 'Blanco / Verde Vintage', '#15803d', 72.00, 125.00, 4, 5, '["38", "39", "40", "41", "42"]'::jsonb, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop&q=80', 'low_stock'),
('PRD-1004', 'VN-OLD-004', 'Vans Old Skool Classic Skate', 'b0000001-0000-0000-0000-000000000005', 'Vans', 'c0000001-0000-0000-0000-000000000004', 'Skateboarding', 'PRV-103', 'Zapatilla de skate clásica de Vans con franja lateral sidestripe.', 'Negro / Blanco', '#000000', 40.00, 75.00, 22, 6, '["37", "38", "39", "40", "41", "42"]'::jsonb, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&auto=format&fit=crop&q=80', 'in_stock'),
('PRD-1005', 'PM-RSX-005', 'Puma RS-X Triple White', 'b0000001-0000-0000-0000-000000000003', 'Puma', 'c0000001-0000-0000-0000-000000000005', 'Lifestyle', 'PRV-101', 'Diseño voluminoso y futurista con amortiguación Running System.', 'Blanco Puro', '#F3F4F6', 55.00, 95.00, 11, 4, '["39", "40", "41", "42", "43"]'::jsonb, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80', 'in_stock')
ON CONFLICT (id) DO NOTHING;

-- H) Clientes de demostración venezolanos
INSERT INTO clientes (id, tipo_documento, numero_documento, nombres, apellidos, correo, telefono, estado, ciudad, direccion, total_comprado_usd, cantidad_compras) VALUES
('publico', 'V', '00000000', 'Venta al', 'Público General', 'publico@urbanstep.com.ve', '0412-0000000', 'Distrito Capital', 'Caracas', 'Mostrador Tienda Principal', 0.00, 0),
('CLT-1001', 'V', '18945123', 'Carlos', 'Mendoza', 'carlos.m@gmail.com', '0414-2345678', 'Distrito Capital', 'Caracas (Chacao)', 'Urb. Los Palos Grandes, Edif. Ávila, Apto 4-B', 340.00, 3),
('CLT-1002', 'V', '22654987', 'Valentina', 'Rodríguez', 'vale.rod@hotmail.com', '0412-9876543', 'Miranda', 'Baruta (Las Mercedes)', 'Calle París, Qta. Los Rosales', 580.00, 5),
('CLT-1003', 'J', '31456789-0', 'Inversiones', 'Altamira C.A.', 'contacto@altamira.com.ve', '0424-1122334', 'Carabobo', 'Valencia', 'Av. Bolívar Norte, C.C. Cristal', 1250.00, 8)
ON CONFLICT (id) DO NOTHING;

-- I) Compras iniciales a proveedores (Semilla de Compras)
INSERT INTO compras (
    id, numero_factura, numero_control, proveedor_id, caja_id, fecha_emision, fecha_recepcion,
    tasa_bcv, subtotal_usd, iva_usd, total_usd, subtotal_bs, iva_bs, total_bs,
    metodo_pago, banco_pago, condicion_pago, dias_credito, estado, recibido_por, observaciones
) VALUES
('CMP-2026-001', 'FAC-2026-8941', '00-00458921', 'PRV-101', 'caja-1', '2026-09-15', NOW() - INTERVAL '20 days', 42.5000, 1950.00, 312.00, 2262.00, 82875.00, 13260.00, 96135.00, 'transferencia', '0134 - Banesco', 'credito', 15, 'recibido', 'Jesús Almacén', 'Reposición de lote zapatillas Nike Air Force 1 y Puma RS-X.'),
('CMP-2026-002', 'FAC-2026-9022', '00-00459344', 'PRV-104', 'caja-2', '2026-09-28', NOW() - INTERVAL '8 days', 42.5000, 1440.00, 230.40, 1670.40, 61200.00, 9792.00, 70992.00, 'transferencia', '0102 - Banco de Venezuela', 'contado', 0, 'recibido', 'Jesús Almacén', 'Importación directa lote New Balance 550 Vintage White.')
ON CONFLICT (id) DO NOTHING;

-- J) Detalles de las compras iniciales
INSERT INTO detalles_compra (compra_id, producto_id, nombre_producto, talla, color, cantidad, costo_unitario_usd, costo_unitario_bs, subtotal_usd, subtotal_bs, lote) VALUES
('CMP-2026-001', 'PRD-1001', 'Nike Air Force 1 07 White', '41', 'Blanco', 20, 65.00, 2762.50, 1300.00, 55250.00, 'LOTE-AF1-0926'),
('CMP-2026-001', 'PRD-1005', 'Puma RS-X Triple White', '42', 'Blanco Puro', 10, 65.00, 2762.50, 650.00, 27625.00, 'LOTE-RSX-0926'),
('CMP-2026-002', 'PRD-1003', 'New Balance 550 Vintage White', '41', 'Blanco / Verde', 20, 72.00, 3060.00, 1440.00, 61200.00, 'LOTE-NB-0928')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- FIN DEL ESQUEMA NORMALIZADO EN ESPAÑOL v4.0
-- ==============================================================================
