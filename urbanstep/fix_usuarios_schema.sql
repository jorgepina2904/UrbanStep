-- ==============================================================================
-- FIX SCHEMA USUARIOS URBANSTEP: MIGRACIÓN DEFINITIVA
-- Amplía roles (motorizado, cliente), añade metadatos de flota y habilita RLS
-- ==============================================================================

-- 1. Ampliar enum rol_usuario_enum
DO $$
BEGIN
    ALTER TYPE rol_usuario_enum ADD VALUE IF NOT EXISTS 'motorizado';
    ALTER TYPE rol_usuario_enum ADD VALUE IF NOT EXISTS 'cliente';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Agregar columnas enriquecidas a la tabla usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(40);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS vehiculo VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS placa VARCHAR(30);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 4.90;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deliveries_count INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Insertar o sincronizar los 4 motorizados oficiales en usuarios
INSERT INTO usuarios (id, nombre_completo, correo, rol, sucursal, activo, telefono, vehiculo, placa, rating, deliveries_count)
VALUES 
  ('a1b2c3d4-e5f6-4a1b-8c2d-000000000001', 'Carlos Mendoza', 'motorizado1@urbanstep.com', 'motorizado', 'Sede Barquisimeto', true, '0412-5551234', 'Bera SBR 150 Azul', 'AB1C23D', 4.90, 142),
  ('a1b2c3d4-e5f6-4a1b-8c2d-000000000002', 'Pedro Yépez', 'motorizado2@urbanstep.com', 'motorizado', 'Sede Barquisimeto', true, '0414-9876543', 'Keeway Horse 150 Rojo', 'XY9Z87W', 4.80, 98),
  ('a1b2c3d4-e5f6-4a1b-8c2d-000000000003', 'Roberto Gómez', 'motorizado3@urbanstep.com', 'motorizado', 'Sede Barquisimeto', true, '0416-5554321', 'Suzuki AX4 115 Negro', 'JK4M56N', 5.00, 215),
  ('a1b2c3d4-e5f6-4a1b-8c2d-000000000004', 'Juan Alvarado', 'motorizado4@urbanstep.com', 'motorizado', 'Sede Barquisimeto', true, '0424-7778899', 'Bera Merú 150 Blanco', 'CD5E67F', 4.90, 76)
ON CONFLICT (correo) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  rol = EXCLUDED.rol,
  sucursal = EXCLUDED.sucursal,
  telefono = EXCLUDED.telefono,
  vehiculo = EXCLUDED.vehiculo,
  placa = EXCLUDED.placa,
  rating = EXCLUDED.rating,
  deliveries_count = EXCLUDED.deliveries_count,
  activo = EXCLUDED.activo;

-- 4. Asegurar que las políticas RLS permitan lectura y gestión adecuada de usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de usuarios" ON usuarios;
CREATE POLICY "Permitir lectura publica de usuarios" ON usuarios
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Permitir insercion publica de usuarios" ON usuarios;
CREATE POLICY "Permitir insercion publica de usuarios" ON usuarios
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de usuarios" ON usuarios;
CREATE POLICY "Permitir actualizacion de usuarios" ON usuarios
  FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminacion de usuarios" ON usuarios;
CREATE POLICY "Permitir eliminacion de usuarios" ON usuarios
  FOR DELETE TO public USING (true);
