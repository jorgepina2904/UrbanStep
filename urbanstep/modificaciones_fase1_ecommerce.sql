-- ==============================================================================
-- FASE 1 · eCommerce — Cupones, promociones y reseñas
-- Ejecutar UNA VEZ en Supabase > SQL Editor. Es idempotente (IF NOT EXISTS).
-- Hasta que se ejecute, la tienda funciona igual: simplemente no hay cupones ni reseñas.
-- ==============================================================================

-- 1) Cupones y promociones automáticas
CREATE TABLE IF NOT EXISTS cupones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(40) UNIQUE,                       -- NULL cuando es promoción automática
    descripcion VARCHAR(200),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo', 'envio_gratis', 'dos_por_uno')),
    valor NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
    compra_minima_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (compra_minima_usd >= 0),
    productos_ids TEXT[],                            -- solo para 2x1 (NULL = todos los modelos)
    automatico BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    inicia_el TIMESTAMPTZ,
    vence_el TIMESTAMPTZ,
    usos_maximos INTEGER CHECK (usos_maximos IS NULL OR usos_maximos > 0),
    usos_actuales INTEGER NOT NULL DEFAULT 0,
    creado_el TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cupon_codigo_o_auto CHECK (automatico OR codigo IS NOT NULL)
);

-- Incremento atómico del contador de usos (evita carreras entre pedidos simultáneos)
CREATE OR REPLACE FUNCTION incrementar_uso_cupon(p_id UUID)
RETURNS VOID AS $$
    UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id = p_id;
$$ LANGUAGE sql;

-- 2) Reseñas de clientes (se publican al instante si la compra está verificada; si no, requieren moderación)
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

-- 3) Seguridad (mismo criterio que el resto del esquema: la app usa la clave anónima)
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

NOTIFY pgrst, 'reload schema';

-- Ejemplos (opcionales):
-- INSERT INTO cupones (codigo, descripcion, tipo, valor) VALUES ('BIENVENIDA10', '10% en tu primera compra', 'porcentaje', 10);
-- INSERT INTO cupones (descripcion, tipo, compra_minima_usd, automatico) VALUES ('Envío gratis desde $80', 'envio_gratis', 80, TRUE);
