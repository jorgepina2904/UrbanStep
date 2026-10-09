# UrbanStep Venezuela — Informe de Modificaciones de Base de Datos (Supabase / PostgreSQL)

**Rol:** Manager Full Stack Chief  
**Fecha:** Octubre 2026  
**Entorno:** Supabase / PostgreSQL 15+  
**Script SQL Listo para Ejecutar:** [`modificaciones_db.sql`](./modificaciones_db.sql)

---

## 1. Resumen Ejecutivo de Modificaciones

Como Manager Full Stack Chief, se ha realizado una auditoría exhaustiva y evolución de la arquitectura de datos del sistema para respaldar las 9 mejoras clave solicitadas. A continuación se desglosan los cambios estructurales aplicados y disponibles para la base de datos:

| Componente | Tabla / Objeto | Tipo de Cambio | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Colores de Modelos** | `productos` | `ADD COLUMN colores JSONB`, `categoria_tallas TEXT`, `tallas_stock JSONB` | Permite almacenar múltiples variantes cromáticas por modelo (ej: Blanco, Negro, Rojo) y su desglose por escala de tallas. |
| **Auditoría & Kardex** | `movimientos_inventario` | `CREATE TABLE` (Nueva) | Registra el histórico inmutable (Kardex) cada vez que el stock cambia por edición de producto, ajuste manual, venta o recepción de compra. |
| **Gestión de Proveedores** | `proveedores` | `CREATE TABLE` (Nueva) | Directorio corporativo de proveedores (RIF, razón social, contacto, días de crédito, estado). |
| **Órdenes de Compra** | `compras` y `detalles_compra` | `CREATE TABLE` (Nuevas) | Gestión de compras de calzado a distribuidores con auto-incremento de stock al recibir. |
| **Métodos de Pago Admin** | `metodos_pago` | `CREATE TABLE` (Nueva) | Permite al administrador crear, modificar, activar/desactivar métodos de pago (Zinli, Binance, Pago Móvil, Efectivo USD/Bs, Punto). |
| **Solución Bug Descuento Stock** | `ventas` / `detalles_venta` | Corrección de Endpoint | El frontend ahora inserta directamente en las tablas base `ventas` y `detalles_venta`, activando el disparador nativo `trg_detalles_venta_stock` (evitando el error de vista `sales`). |

---

## 2. Detalle Técnico de Tablas y Columnas

### A. Modificaciones en la Tabla `productos`
Se agregaron columnas para dar soporte nativo a múltiples colores, matrices independientes de tallas por color y vinculación con proveedores:
```sql
ALTER TABLE productos ADD COLUMN IF NOT EXISTS colores JSONB DEFAULT '[]'::jsonb;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS variantes_color JSONB DEFAULT '[]'::jsonb;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS proveedor_id TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS proveedor_nombre TEXT DEFAULT 'Distribuidora Deportiva Ávila C.A.';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria_tallas TEXT DEFAULT 'caballero';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tallas_stock JSONB DEFAULT '{}'::jsonb;
```
* **`colores`**: Almacena un array JSON de colores disponibles (ej: `["Negro", "Blanco", "Rojo"]`).
* **`variantes_color`**: Almacena la matriz independiente de tallas y pares por cada color del modelo: `[{ "color": "Rojo", "sizes": ["38","39"], "sizeStock": {"38": 2, "39": 5}, "total": 7 }]`.
* **`proveedor_id`**: Identificador foráneo del proveedor del calzado (vinculado con la tabla `proveedores`).
* **`proveedor_nombre`**: Razón social o nombre comercial del proveedor para consultas rápidas y auditoría.
* **`categoria_tallas`**: Almacena la categoría de calzado (`caballero`, `dama`, `juvenil`, `infantil`, `unisex`).
* **`tallas_stock`**: Mapeo clave-valor con pares por talla del color principal (ej: `{"39": 2, "40": 4, "41": 6}`).

---

### B. Nueva Tabla: `movimientos_inventario` (Kardex de Auditoría)
Garantiza trazabilidad total cada vez que una cantidad es modificada en el sistema:
```sql
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
```

---

### C. Nuevas Tablas: `proveedores`, `compras` y `detalles_compra`
Conectadas directamente con el módulo de compras del sistema:
```sql
-- Directorio de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id TEXT PRIMARY KEY,
    rif TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    dias_credito INTEGER DEFAULT 15,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    creado_el TIMESTAMPTZ DEFAULT NOW(),
    actualizado_el TIMESTAMPTZ DEFAULT NOW()
);

-- Cabecera de Órdenes de Compra
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

-- Renglones / Ítems de Compra
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
```

---

### D. Nueva Tabla: `metodos_pago` (Administrables por el Admin)
Permite al administrador agregar métodos de pago dinámicos (ej: Zinli, Wally, Binance, Bancamiga):
```sql
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
```

---

## 3. Resolución del Bug de Descuento de Stock en Ventas

### Diagnóstico de Causa Raíz
El código previo intentaba realizar operaciones `INSERT` contra la vista SQL `sales`:
```sql
-- Error PostgreSQL: 0A000: cannot insert into column ... of view "sales"
```
Al fallar la inserción en la vista, el bloque `catch` omitía la actualización en Supabase. Cuando el POS o Terminal recargaban los productos desde Supabase, el stock volvía al valor anterior.

### Solución Full Stack Implementada
En `src/services/saleServices.js`, se reorientó la inserción directamente hacia las tablas relacionales base:
1. `ventas` (Cabecera de venta).
2. `detalles_venta` (Renglones con talla y cantidad).
3. El disparador `trg_detalles_venta_stock` de Supabase se ejecuta de manera atómica, descontando tanto `stock` como el desglose en `tallas_stock`.
4. Adicionalmente, el servicio registra de forma síncrona el movimiento en el Kardex (`movimientos_inventario`).

---

## 4. Instrucciones para el Administrador / Desarrollador
1. Abre tu panel de control en **Supabase** -> **SQL Editor**.
2. Abre o copia el contenido de `modificaciones_db.sql`.
3. Haz clic en **Run** (Ejecutar).
4. El sistema cuenta además con fallback local automático en `localStorage` con sincronización en tiempo real vía eventos custom de ventana (`window.dispatchEvent`), garantizando que la aplicación continúe funcionando a la perfección incluso en modo offline o sin conexión directa a Supabase.
