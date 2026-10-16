-- ==============================================================================
-- FASE 5 · Marketing y fidelización — carritos abandonados y alertas de talla
-- Ejecutar UNA VEZ en Supabase > SQL Editor. Es idempotente.
-- Hasta que se ejecute, la tienda funciona igual: simplemente no se guardan carritos ni alertas.
-- ==============================================================================

-- 1) Carritos abandonados (solo de clientes que aceptaron ser contactados por WhatsApp)
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

-- 2) "Avísame cuando esté disponible mi talla"
CREATE TABLE IF NOT EXISTS alertas_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(200),
    color VARCHAR(60) NOT NULL DEFAULT '',
    talla VARCHAR(20) NOT NULL,
    nombre VARCHAR(150),
    contacto VARCHAR(120) NOT NULL,                 -- WhatsApp o correo
    creado_el TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notificado_el TIMESTAMPTZ,
    UNIQUE (producto_id, color, talla, contacto)
);
CREATE INDEX IF NOT EXISTS idx_alertas_pendientes ON alertas_stock (producto_id) WHERE notificado_el IS NULL;

-- 3) Seguridad (mismo criterio del resto del esquema)
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

NOTIFY pgrst, 'reload schema';
