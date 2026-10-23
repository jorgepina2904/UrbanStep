-- ==============================================================================
-- URBANSTEP VENEZUELA — MIGRACIÓN TABLA MOTORIZADOS FLOTA DELIVERY
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.motorizados (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    vehiculo VARCHAR(100) NOT NULL,
    placa VARCHAR(30) NOT NULL,
    calificacion NUMERIC(3, 1) DEFAULT 5.0,
    entregas_historicas INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    creado_el TIMESTAMPTZ DEFAULT NOW(),
    actualizado_el TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.motorizados ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para lectura y escritura completa
DROP POLICY IF EXISTS "Permitir lectura publica de motorizados" ON public.motorizados;
CREATE POLICY "Permitir lectura publica de motorizados" 
ON public.motorizados FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion de motorizados" ON public.motorizados;
CREATE POLICY "Permitir insercion de motorizados" 
ON public.motorizados FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de motorizados" ON public.motorizados;
CREATE POLICY "Permitir actualizacion de motorizados" 
ON public.motorizados FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir eliminacion de motorizados" ON public.motorizados;
CREATE POLICY "Permitir eliminacion de motorizados" 
ON public.motorizados FOR DELETE USING (true);

-- Insertar los 4 motorizados de la flota inicial si no existen
INSERT INTO public.motorizados (id, nombre, telefono, vehiculo, placa, calificacion, entregas_historicas, activo)
VALUES
    ('mot-1', 'Carlos Mendoza', '0412-5551234', 'Bera SBR 150 Azul', 'AB1C23D', 4.9, 143, true),
    ('mot-2', 'Pedro Yépez', '0414-9876543', 'Keeway Horse 150 Rojo', 'XY9Z87W', 4.8, 98, true),
    ('mot-3', 'Roberto Gómez', '0416-5554321', 'Suzuki AX4 115 Negro', 'JK4M56N', 5.0, 216, true),
    ('mot-4', 'Juan Alvarado', '0424-7778899', 'Bera Merú 150 Blanco', 'CD5E67F', 4.9, 76, true)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    telefono = EXCLUDED.telefono,
    vehiculo = EXCLUDED.vehiculo,
    placa = EXCLUDED.placa,
    calificacion = EXCLUDED.calificacion,
    entregas_historicas = EXCLUDED.entregas_historicas,
    activo = EXCLUDED.activo,
    actualizado_el = NOW();
