-- ==============================================================================
-- FASE 6 · Costo histórico de ventas y homologación del Kardex
-- Ejecutar UNA VEZ en Supabase > SQL Editor ANTES de desplegar el código. Es idempotente.
-- (El código funciona aunque no se ejecute: reintenta sin la columna y el Kardex cae a 'auditoria'.)
-- ==============================================================================

-- 1) Costo Promedio Ponderado vigente al momento de la venta (inmutable; NIIF Pymes sección 13)
ALTER TABLE detalles_venta ADD COLUMN IF NOT EXISTS costo_unitario_usd NUMERIC(12, 2);
COMMENT ON COLUMN detalles_venta.costo_unitario_usd IS 'CPP unitario en USD congelado al emitir la venta';

-- 2) Kardex: columnas que escribe stockMovementService y catálogo de tipos (valores históricos + nuevos)
DO $$
BEGIN
    -- 'tipo' -> 'tipo_movimiento' y 'delta' -> 'cantidad_delta' si el esquema es el antiguo de modificaciones_db.sql
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
    -- históricos
    'edicion_producto', 'ajuste_manual', 'venta', 'devolucion', 'recepcion_compra', 'merma',
    -- homologados SGF
    'entrada_compra', 'salida_venta', 'entrada_devolucion', 'baja_merma_dano', 'traslado_origen', 'traslado_destino'
));

NOTIFY pgrst, 'reload schema';
