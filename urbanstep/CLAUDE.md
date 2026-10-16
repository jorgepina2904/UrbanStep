# CLAUDE.md - Contexto y Directivas Maestras: UrbanStep SGF ERP

## 1. Identidad del Proyecto
- **Empresa:** UrbanStep Venezuela C.A. (RIF J-50123456-7).
- **Giro de Negocio:** Cadena de tiendas de calzado deportivo y casual (sneakers).
- **Sistema:** SGF ERP (Sistema de Gestión Fiscal y Contable Integral).
- **Stack:** React (Vite), JavaScript moderno, Tailwind CSS / Vanilla CSS, Lucide Icons, Supabase (PostgreSQL + RLS + Storage).
- **Ubicación del código fuente:** `urbanstep/` (aplicación Vite principal).

---

## 2. Marco Legal y Fiscal Obligatorio (SENIAT & VEN-NIIF)
Cualquier modificación o adición de código DEBE cumplir rigurosamente con la legislación tributaria venezolana:
1. **Providencia Administrativa SENIAT N° 0071:**
   - Facturación con correlativo único consecutivo (`FAC-YYYY-XXXX`) y Número de Control fiscal ininterrumpido (`00-XXXXXX`).
   - **Prohibición de Eliminación Física (Hard Delete):** Ninguna factura, venta o compra generada legalmente puede ser borrada de la base de datos (`DELETE`). 
   - **Notas de Crédito Exclusivas:** Cualquier reversión total o parcial de venta se procesa únicamente mediante Nota de Crédito fiscal (`NC-YYYY-XXXX`), con 3 motivos autorizados:
     - `mal_facturado`: Corrección por datos erróneos de cliente o montos.
     - `producto_danado`: Falla de fábrica o desperfecto físico (reingreso a inventario dañado / merma).
     - `factura_fallida`: Abandono o error en pasarela/pago.
2. **Gestión Bimonetaria Estricta:**
   - Moneda de referencia: USD ($).
   - Moneda de curso legal: Bolívares (VES / Bs.), convertidos a la tasa oficial del Banco Central de Venezuela (BCV).
   - Todo ticket, factura, reporte contable y pantalla debe presentar la dualidad monetaria con precisión a 2 decimales.
3. **VEN-NIIF / NIIF para PYMES:**
   - Contabilidad de doble partida (Partida Doble: Debe = Haber).
   - Asientos contables automáticos por cada hecho económico: Ventas, Costo de Ventas, Compras, IVA Débito Fiscal, IVA Crédito Fiscal, Cuentas por Cobrar/Pagar, Retenciones de IVA (75% o 100%).
   - Suite contable: Libro Diario, Libro Mayor, Balance de Comprobación, Estado de Resultados (P&L) y Balance General.

---

## 3. Lógica de Negocio de Calzado (Retail Footwear)
1. **Variantes de Calzado:** Los productos se dividen en variantes por **Talla** (36 a 45) y **Color**.
2. **Regla de Protección de Stock:**
   - Jamás se permite eliminar una variante que tenga existencia física (`stock > 0`).
   - Si una variante no debe venderse, se conmuta su estado a `disponible = false` (Pausada de mostrador), preservando la existencia contable e histórica.
   - Solo se autoriza eliminación de variante si `stock === 0` y no posee movimientos históricos cerrados.

---

## 4. Arquitectura de Datos y Servicios Clave (`src/services/`)
- `saleServices.js`: Registro de ventas, control de inventario transaccional, deduplicación de consultas y caché TTL (4s).
- `returnService.js`: Emisión de Notas de Crédito, tickets fiscales, reposición de inventario y asientos de ajuste.
- `accountingService.js`: Motor contable en memoria de alta velocidad (`getAccountingSuite`). Asientos automáticos y libros legales.
- `productService.js`: CRUD de calzado, tallas, colores, categorías y validaciones de eliminación.
- `purchaseService.js`: Registro de compras a proveedores, cálculo de IVA Crédito Fiscal y retenciones.
- `reportService.js`: Consolidación analítica instantánea (sub-100ms) de ventas, libros de IVA y finanzas.

---

## 5. Directivas de Calidad y Colaboración
- **No romper compatibilidad:** Trabajar armónicamente sobre la base construida con Antigravity / SGF.
- **Rendimiento:** Evitar bucles innecesarios, re-renders masivos o delays artificiales. Mantener la respuesta visual ultra fluida.
- **Estética:** Interfaces limpias, profesionales, con contraste óptimo, badges de estado claros, modal de confirmaciones y soporte de impresión térmica de 80mm y hoja carta.
- **Validación de Build:** Cada módulo debe compilar limpiamente con `npm run build` sin errores de linter ni TypeScript/JavaScript.
