-- ==============================================================================
-- URBANSTEP VENEZUELA - SCRIPT DE INSERCIÓN OFICIAL DE PRODUCTOS EN SUPABASE
-- Ejecuta este script directamente en el SQL Editor de tu consola Supabase.
-- Compatible con PostgreSQL y el esquema de 'supabase_schema.sql'.
-- ==============================================================================

-- 1. Actualizar Coordenadas Exactas de la Tienda Principal en Barquisimeto
UPDATE configuracion_tienda
SET 
    latitud_tienda = 10.06833014,
    longitud_tienda = -69.28499382,
    direccion_fiscal = 'Av. Los Leones con Av. Venezuela, Barquisimeto, Edo. Lara, Venezuela',
    telefono = '+58 251-255-4000',
    actualizado_el = NOW();

-- 2. Asegurar Marcas Principales
INSERT INTO marcas (id, nombre, pais_origen, sitio_web, activa) VALUES
('b0000001-0000-0000-0000-000000000001', 'Nike', 'Estados Unidos', 'https://www.nike.com', true),
('b0000001-0000-0000-0000-000000000002', 'Adidas', 'Alemania', 'https://www.adidas.com', true),
('b0000001-0000-0000-0000-000000000003', 'Puma', 'Alemania', 'https://www.puma.com', true),
('b0000001-0000-0000-0000-000000000004', 'New Balance', 'Estados Unidos', 'https://www.newbalance.com', true),
('b0000001-0000-0000-0000-000000000005', 'Vans', 'Estados Unidos', 'https://www.vans.com', true),
('b0000001-0000-0000-0000-000000000006', 'Yeezy', 'Estados Unidos', 'https://www.yeezy.com', true),
('b0000001-0000-0000-0000-000000000007', 'Jordan', 'Estados Unidos', 'https://www.nike.com/jordan', true)
ON CONFLICT (nombre) DO NOTHING;

-- 3. Asegurar Categorías de Calzado
INSERT INTO categorias (id, nombre, descripcion, icono, color, orden, activa) VALUES
('c0000001-0000-0000-0000-000000000001', 'Zapatillas', 'Calzado deportivo y urbano de colección', '👟', '#3b82f6', 1, true),
('c0000001-0000-0000-0000-000000000002', 'Casual', 'Calzado casual para el día a día', '👟', '#8b5cf6', 2, true),
('c0000001-0000-0000-0000-000000000003', 'Basketball', 'Zapatillas de básquetbol y alta tracción', '🏀', '#f97316', 3, true),
('c0000001-0000-0000-0000-000000000004', 'Skateboarding', 'Calzado resistente vulcanizado', '🛹', '#ef4444', 4, true),
('c0000001-0000-0000-0000-000000000005', 'Lifestyle', 'Ediciones limitadas y moda urbana hype', '🔥', '#ec4899', 5, true)
ON CONFLICT (nombre) DO NOTHING;

-- 4. INSERT OFICIAL DE PRODUCTOS URBANSTEP (12 MODELOS AUTÉNTICOS)
INSERT INTO productos (
    id, sku, nombre, marca_id, marca_nombre, categoria_id, categoria_nombre,
    descripcion, color, color_hex, costo_usd, precio_usd, stock, stock_minimo, tallas, imagen_url, estado
) VALUES
(
    'PRD-1001',
    'NK-AJ1-CHI',
    'Air Jordan 1 Retro High OG "Chicago Lost & Found"',
    'b0000001-0000-0000-0000-000000000007',
    'Jordan',
    'c0000001-0000-0000-0000-000000000005',
    'Zapatillas',
    'La silueta más legendaria del básquetbol retro en cuero agrietado vintage y caja original estilo 1985.',
    'Rojo Chicago',
    '#dc2626',
    110.00,
    180.00,
    8,
    4,
    '["40", "41", "42", "43", "44"]'::jsonb,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    'in_stock'
),
(
    'PRD-1002',
    'NK-DNK-PND',
    'Nike Dunk Low Retro "Panda"',
    'b0000001-0000-0000-0000-000000000001',
    'Nike',
    'c0000001-0000-0000-0000-000000000001',
    'Zapatillas',
    'El clásico monocromático que domina el streetwear mundial en cuero premium y suela vulcanizada.',
    'Negro / Blanco',
    '#1a1a1a',
    70.00,
    115.00,
    15,
    5,
    '["38", "39", "40", "41", "42", "43"]'::jsonb,
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80',
    'in_stock'
),
(
    'PRD-1003',
    'AD-SMB-WHT',
    'Adidas Originals Samba OG "Cloud White"',
    'b0000001-0000-0000-0000-000000000002',
    'Adidas',
    'c0000001-0000-0000-0000-000000000002',
    'Zapatillas',
    'Silueta icónica de perfil bajo con puntera de gamuza en T y clásica suela de goma caramelo.',
    'Blanco / Negro Gum',
    '#f5f5f5',
    60.00,
    100.00,
    12,
    5,
    '["39", "40", "41", "42", "43"]'::jsonb,
    'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800&auto=format&fit=crop&q=80',
    'in_stock'
),
(
    'PRD-1004',
    'YZ-350-ONX',
    'Yeezy Boost 350 V2 "Onyx"',
    'b0000001-0000-0000-0000-000000000006',
    'Yeezy',
    'c0000001-0000-0000-0000-000000000005',
    'Zapatillas',
    'Amortiguación BOOST de longitud completa con empeine elástico de tejido Primeknit monofilamento.',
    'Onyx Black',
    '#111827',
    140.00,
    220.00,
    5,
    3,
    '["40", "41", "42", "43", "44", "45"]'::jsonb,
    'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&auto=format&fit=crop&q=80',
    'low_stock'
),
(
    'PRD-1005',
    'NB-550-GRN',
    'New Balance 550 Vintage "White/Green"',
    'b0000001-0000-0000-0000-000000000004',
    'New Balance',
    'c0000001-0000-0000-0000-000000000002',
    'Zapatillas',
    'Tributo auténtico al baloncesto retro de 1989 en cuero de grano grueso y acentos verde bosque.',
    'Blanco / Verde Vintage',
    '#16a34a',
    75.00,
    125.00,
    9,
    4,
    '["39", "40", "41", "42", "43"]'::jsonb,
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop&q=80',
    'in_stock'
),
(
    'PRD-1006',
    'PM-SUD-BLK',
    'Puma Suede Classic XXI "Triple Black"',
    'b0000001-0000-0000-0000-000000000003',
    'Puma',
    'c0000001-0000-0000-0000-000000000002',
    'Zapatillas',
    'Gamuza de primera calidad con logotipo dorado metálico PUMA y herencia urbana.',
    'Negro Triple',
    '#0f172a',
    50.00,
    85.00,
    14,
    5,
    '["38", "39", "40", "41", "42", "43"]'::jsonb,
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80',
    'in_stock'
),
(
    'PRD-1007',
    'NK-AF1-007',
    'Nike Air Force 1 07 "Triple White"',
    'b0000001-0000-0000-0000-000000000001',
    'Nike',
    'c0000001-0000-0000-0000-000000000001',
    'Zapatillas',
    'El clásico indiscutible en cuero blanco puro con amortiguación Air encapsulada.',
    'Blanco Puro',
    '#ffffff',
    65.00,
    110.00,
    18,
    6,
    '["38", "39", "40", "41", "42", "43", "44"]'::jsonb,
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80',
    'in_stock'
),
(
    'PRD-1008',
    'AD-CMP-BLK',
    'Adidas Campus 00s "Core Black"',
    'b0000001-0000-0000-0000-000000000002',
    'Adidas',
    'c0000001-0000-0000-0000-000000000004',
    'Zapatillas',
    'Silueta acolchada estilo skate de los 2000s con cordones anchos y gamuza prémium.',
    'Core Black / White',
    '#18181b',
    68.00,
    110.00,
    11,
    4,
    '["39", "40", "41", "42", "43"]'::jsonb,
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80',
    'in_stock'
),
(
    'PRD-1009',
    'NK-AJ1-TSM',
    'Travis Scott x Air Jordan 1 Low "Reverse Mocha"',
    'b0000001-0000-0000-0000-000000000007',
    'Jordan',
    'c0000001-0000-0000-0000-000000000005',
    'Zapatillas',
    'Colaboración legendaria de Cactus Jack con Swoosh invertido y gamuza color moca y vela.',
    'Sail / Ridgerock',
    '#78350f',
    160.00,
    250.00,
    4,
    2,
    '["40", "41", "42", "43", "44"]'::jsonb,
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80',
    'low_stock'
),
(
    'PRD-1010',
    'NB-2002-RN',
    'New Balance 2002R "Protection Pack Rain Cloud"',
    'b0000001-0000-0000-0000-000000000004',
    'New Balance',
    'c0000001-0000-0000-0000-000000000001',
    'Zapatillas',
    'Capas de gamuza deshilachada deconstruida con amortiguación N-ergy y suela de absorción de impacto.',
    'Rain Cloud / Grey',
    '#6b7280',
    95.00,
    160.00,
    7,
    3,
    '["39", "40", "41", "42", "43"]'::jsonb,
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop&q=80',
    'in_stock'
),
(
    'PRD-1011',
    'VN-KNU-BLK',
    'Vans Knu Skool "Black / True White"',
    'b0000001-0000-0000-0000-000000000005',
    'Vans',
    'c0000001-0000-0000-0000-000000000004',
    'Zapatillas',
    'Reedición estilo años 90 con lengüeta y tobillera extra acolchadas y sidestripe en 3D.',
    'Negro / Blanco',
    '#000000',
    45.00,
    75.00,
    16,
    5,
    '["37", "38", "39", "40", "41", "42"]'::jsonb,
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&auto=format&fit=crop&q=80',
    'in_stock'
),
(
    'PRD-1012',
    'AD-BB-FRM',
    'Adidas Bad Bunny x Forum Low "Easter Egg"',
    'b0000001-0000-0000-0000-000000000002',
    'Adidas',
    'c0000001-0000-0000-0000-000000000005',
    'Zapatillas',
    'Edición especial Bad Bunny con lengüeta doble desmontable y hebilla metálica táctica.',
    'Pastel Pink / Brown',
    '#ec4899',
    120.00,
    195.00,
    6,
    3,
    '["39", "40", "41", "42", "43"]'::jsonb,
    'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800&auto=format&fit=crop&q=80',
    'in_stock'
)
ON CONFLICT (id) DO UPDATE SET
    sku = EXCLUDED.sku,
    nombre = EXCLUDED.nombre,
    marca_nombre = EXCLUDED.marca_nombre,
    categoria_nombre = EXCLUDED.categoria_nombre,
    descripcion = EXCLUDED.descripcion,
    color = EXCLUDED.color,
    color_hex = EXCLUDED.color_hex,
    costo_usd = EXCLUDED.costo_usd,
    precio_usd = EXCLUDED.precio_usd,
    stock = EXCLUDED.stock,
    stock_minimo = EXCLUDED.stock_minimo,
    tallas = EXCLUDED.tallas,
    imagen_url = EXCLUDED.imagen_url,
    estado = EXCLUDED.estado,
    actualizado_el = NOW();

-- 5. Consulta de Verificación
SELECT id, sku, nombre, marca_nombre, precio_usd, stock, estado 
FROM productos 
ORDER BY id ASC;
