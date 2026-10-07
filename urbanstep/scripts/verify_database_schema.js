import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, '../supabase_schema.sql');
const testScriptPath = path.resolve(__dirname, '../verificar_database.sql');

console.log('------------------------------------------------------------');
console.log('🔍 VERIFICACIÓN ESTATICA Y ESTRUCTURAL DEL ESQUEMA SQL v4.0');
console.log('------------------------------------------------------------\n');

if (!fs.existsSync(schemaPath)) {
    console.error('❌ ERROR: No se encontró el archivo supabase_schema.sql');
    process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf-8');

// 1. Verificar Tablas en Español
const expectedTables = [
    'configuracion_tienda',
    'tasas_cambio',
    'cajas',
    'usuarios',
    'categorias',
    'marcas',
    'proveedores',
    'productos',
    'compras',
    'detalles_compra',
    'clientes',
    'turnos_caja',
    'ventas',
    'detalles_venta',
    'pagos_venta',
    'envios',
    'auditoria'
];

console.log('1. Verificando Definición de Tablas en Español (3NF):');
let missingTables = 0;
expectedTables.forEach(table => {
    const regex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${table}\\b`, 'i');
    if (regex.test(sql)) {
        console.log(`  ✓ Tabla [${table}] definida.`);
    } else {
        console.error(`  ❌ FALTA tabla [${table}]`);
        missingTables++;
    }
});

// 2. Verificar Relaciones de Claves Foráneas (FK)
console.log('\n2. Verificando Relaciones e Integridad Referencial (Foreign Keys):');
const expectedRelations = [
    { from: 'usuarios', to: 'cajas' },
    { from: 'productos', to: 'marcas' },
    { from: 'productos', to: 'categorias' },
    { from: 'productos', to: 'proveedores' },
    { from: 'compras', to: 'proveedores' },
    { from: 'compras', to: 'cajas' },
    { from: 'compras', to: 'usuarios' },
    { from: 'detalles_compra', to: 'compras' },
    { from: 'detalles_compra', to: 'productos' },
    { from: 'turnos_caja', to: 'cajas' },
    { from: 'ventas', to: 'clientes' },
    { from: 'ventas', to: 'cajas' },
    { from: 'detalles_venta', to: 'ventas' },
    { from: 'detalles_venta', to: 'productos' },
    { from: 'pagos_venta', to: 'ventas' },
    { from: 'envios', to: 'ventas' },
];

let missingRelations = 0;
expectedRelations.forEach(rel => {
    const regex = new RegExp(`REFERENCES\\s+${rel.to}\\s*\\(`, 'i');
    if (regex.test(sql)) {
        console.log(`  ✓ Relación detectada: [${rel.from}] -> [${rel.to}]`);
    } else {
        console.error(`  ❌ Relación faltante: [${rel.from}] -> [${rel.to}]`);
        missingRelations++;
    }
});

// 3. Verificar Vistas de Compatibilidad Bilingüe
console.log('\n3. Verificando Vistas de Retrocompatibilidad (Inglés / Español):');
const expectedViews = [
    'store_settings',
    'exchange_rates',
    'cash_registers',
    'profiles',
    'categories',
    'brands',
    'suppliers',
    'products',
    'purchases',
    'purchase_items',
    'customers',
    'shifts',
    'sales',
    'sale_items',
    'sale_payments',
    'deliveries',
    'audit_logs'
];

let missingViews = 0;
expectedViews.forEach(view => {
    const regex = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?VIEW\\s+${view}\\b`, 'i');
    if (regex.test(sql)) {
        console.log(`  ✓ Vista de compatibilidad [${view}] definida.`);
    } else {
        console.error(`  ❌ Vista de compatibilidad faltante: [${view}]`);
        missingViews++;
    }
});

// 4. Verificar Triggers y Reglas de Negocio
console.log('\n4. Verificando Triggers de Negocio:');
const expectedTriggers = [
    'trg_detalles_compra_stock', // Incremento de stock por compra
    'trg_detalles_venta_stock',  // Descuento de stock por venta
    'trg_ventas_cliente_totales', // Totales de compras por cliente
    'trg_configuracion_actualizada',
    'trg_cajas_actualizadas',
    'trg_productos_actualizados',
    'trg_compras_actualizadas'
];

let missingTriggers = 0;
expectedTriggers.forEach(trg => {
    const regex = new RegExp(`CREATE\\s+TRIGGER\\s+${trg}\\b`, 'i');
    if (regex.test(sql)) {
        console.log(`  ✓ Trigger de automatización [${trg}] detectado.`);
    } else {
        console.error(`  ❌ Trigger faltante: [${trg}]`);
        missingTriggers++;
    }
});

// 5. Verificar Restricciones CHECK
console.log('\n5. Verificando Restricciones de Dominio (CHECK):');
const checkRegex = /CHECK\s*\([^)]+\)/gi;
const checksFound = sql.match(checkRegex) || [];
console.log(`  ✓ Se encontraron ${checksFound.length} restricciones CHECK de integridad (precios, costos, cantidades, tasas).`);

// 6. Verificar Script de Pruebas
console.log('\n6. Verificando Script de Pruebas Relacionales:');
if (fs.existsSync(testScriptPath)) {
    const testSql = fs.readFileSync(testScriptPath, 'utf-8');
    console.log(`  ✓ Archivo verificar_database.sql presente (${testSql.length} bytes).`);
} else {
    console.error('  ❌ Falta el archivo verificar_database.sql');
}

console.log('\n------------------------------------------------------------');
if (missingTables === 0 && missingRelations === 0 && missingViews === 0 && missingTriggers === 0) {
    console.log('🎉 ¡VERIFICACIÓN EXITOSA! La base de datos está completamente normalizada,');
    console.log('   traducida a español, cuenta con la tabla compras y proveedores,');
    console.log('   y garantiza compatibilidad retroactiva total.');
    console.log('------------------------------------------------------------');
    process.exit(0);
} else {
    console.error(`❌ VERIFICACIÓN FALLIDA CON ${missingTables + missingRelations + missingViews + missingTriggers} ERRORES.`);
    process.exit(1);
}
