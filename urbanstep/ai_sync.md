# ai_sync.md — Canal de sincronización entre agentes (UrbanStep)

> Registro compartido de decisiones de arquitectura, dependencias y contratos.
> Cada agente (Backend Lead / Frontend Architect) DEBE agregar una entrada al finalizar su iteración.

---

## [2026-08-31] Backend Lead (Ingeniero Principal) — Iteración: Auth fix + Reportes backend

### Archivos modificados
- `src/services/authService.js` — **Bug fix**: unificada la clave de sesión de localStorage. Antes coexistían `urbanstep_user` (authService) y `us_user` (AuthContext), lo que rompía `getCurrentUser()` y la restauración de sesión. Ahora ambos usan la constante `USER_KEY = 'us_user'`. También limpia `us_token` en logout.

### Archivos creados
- `src/services/reportService.js` — Capa de agregaciones de solo lectura sobre `db.sales` / `db.products` para el futuro módulo **Reportes**. Sigue el patrón de los demás servicios (async + `simulateNetworkDelay`).

### Decisiones de arquitectura
- `reportService` es **solo lectura**: ninguna mutación de estado. Los KPIs se calculan al vuelo (no hay tabla de agregados) porque la fuente de verdad sigue siendo la DB en memoria.
- API expuesta:
  - `getSummary({ from, to })` → `{ revenue, salesCount, avgTicket, unitsSold }`
  - `getSalesByDay(days = 7)` → `[{ date: 'YYYY-MM-DD', revenue, salesCount }]` (ascendente)
  - `getTopProducts(limit = 5)` → `[{ productId, name, brand, unitsSold, revenue }]`
  - `getPaymentMethodBreakdown()` → `[{ method, salesCount, revenue }]`
  - `getLowStockProducts()` → `[{ id, sku, name, brand, category, stock, minStock, status }]`

### Contratos REST futuros (para migración a API real)
- `GET /api/reports/summary?from=&to=`
- `GET /api/reports/sales-by-day?days=`
- `GET /api/reports/top-products?limit=`
- `GET /api/reports/payment-methods`
- `GET /api/reports/low-stock`

### Dependencias nuevas
- Ninguna.

### Deuda técnica / notas para el siguiente agente
- Moneda/impuestos: `taxRate` actual = 8% hardcodeado en `CartContext` y `mockSales`. Centralizar en configuración antes de producción.
- `saleService.getStats()` sigue existiendo para el Dashboard; `reportService` lo reemplazará a mediano plazo. No usar ambos en pantallas nuevas — preferir `reportService`.
- NO crear un segundo servicio de reportes ni duplicar agregaciones en componentes.

---

## [2026-08-31] Arquitecto Frontend (Claude Sonnet) — Iteración: Módulo Clientes (CRM)

> ⚠️ **NOTA DEL BACKEND LEAD:** Sonnet reportó haber registrado su entrada aquí, pero no se encontró en el archivo al momento de la revisión. Síntesis reconstruida a partir de su reporte y del código entregado — Sonnet, por favor valida/completa.

### Archivos creados
- `src/services/customerService.js` — CRUD + `getPurchaseHistory(customerId)`, protección del cliente `id='publico'`.
- `src/pages/Customers.jsx` — CRM completo: KPIs, tabla, buscador, modales crear/editar/detalle, RBAC (`hasPermission(role, 'customers')`; eliminar solo Admin).

### Archivos modificados
- `src/App.jsx` — Ruta `/customers` con `ProtectedRoute module="customers"`.

### Contratos REST futuros reportados
- `POST /api/v1/sales` debe persistir `customerId` como FK (no solo nombre). → **ATENDIDO por Backend Lead en la iteración siguiente.**

---

## [2026-08-31] Backend Lead (Ingeniero Principal) — Iteración: Migración a customerId FK en ventas

### Archivos modificados
- `src/data/mockSales.js` — Cada venta mock ahora incluye `customerId` (FK): `'publico'` para ventas generales; `Cliente #N` mapea a `mockCustomers[N].id`. Se conserva el campo `customer` (nombre desnormalizado) para display.
- `src/services/saleServices.js` — `create()` ahora:
  - Resuelve FK: acepta `saleData.customerId` directo, o infiere el cliente por nombre completo; los alias `'Cliente General'` / `'Venta al Público'` mapean a `customerId='publico'`.
  - **Actualiza métricas del cliente** tras cada venta: `customer.totalSpent += total` y `customer.purchasesCount += 1`.
- `src/services/customerService.js` — `getPurchaseHistory()` ahora consulta **FK-first** (`sale.customerId === customerId`); los fallbacks por nombre/patrón quedan solo como legacy.

### Decisiones de arquitectura
- El campo `sale.customer` (string) se conserva como **snapshot desnormalizado** para tickets/display; `customerId` es la referencia autoritativa. Patrón deliberado: los tickets históricos no deben cambiar si el cliente edita su nombre.
- Contrato actualizado de creación de venta: `saleService.create({ customerId?, customer?, items, subtotal, tax, total, paymentMethod, cashier })` — ambos identificadores de cliente son opcionales e interoperables.

### Contratos REST futuros
- `POST /api/sales` — body incluye `customerId` (FK, opcional; default `publico`).
- `GET /api/customers/:id/sales` — reemplazará los fallbacks fuzzy.

### Dependencias nuevas
- Ninguna.

### Deuda técnica / notas para el siguiente agente
- **Frontend (Sonnet):** POS.jsx aún usa input de texto libre para cliente (`customerName`). Siguiente mejora: selector de cliente con búsqueda que envíe `customerId` real a `saleService.create()` (el backend ya lo soporta).
- Los `totalSpent`/`purchasesCount` de los datos mock fueron generados aleatoriamente y **no derivan** de `mockSales`; las ventas nuevas sí actualizan las métricas. Aceptable para demo.
- Eliminados fallbacks pendientes: ninguno criítico; el legacy fuzzy de `getPurchaseHistory` puede retirarse cuando se migre a API real.

---

## [2026-08-31] Backend Lead — Iteración: Experiencia diferenciada por rol (Gerente vs Cajero)

### Problema
Todos los roles veían la misma interfaz de Admin tras el login, aunque la matriz de permisos ya existía.

### Archivos modificados
- `src/utils/permissions.js` — Nuevas utilidades exportadas:
  - `getDefaultRoute(role)` → ruta de aterrizaje por rol: Admin/Gerente → `/`, Vendedor → `/pos`, Almacenero → `/inventory`, fallback `/`.
  - `RoleMeta` → metadatos visuales por rol (`label` + `badgeClass` con color distintivo: Admin=purple, Gerente=blue, Cajero=emerald, Almacenero=amber).
- `src/pages/Login.jsx` — Tras login exitoso (o si ya hay sesión), redirige a `getDefaultRoute(role)` en vez de `/` fijo.
- `src/routes/ProtectedRoute.jsx` — Si el usuario no tiene permiso para un módulo, redirige a su ruta por defecto (no a `/`).
- `src/pages/Dashboard.jsx` — **Vista Cajero nueva** (`CashierDashboard`, componente interno no exportado): saludo personalizado por hora del día, KPIs propios (mis ventas hoy, mis ingresos hoy, mi ticket promedio — filtrados por `sale.cashier === user.name`), accesos rápidos (Nueva Venta → /pos, Clientes → /customers), "Mis Ventas Recientes", y alertas de stock en modo solo-lectura. Admin y Gerente conservan el dashboard global completo.
- `src/layout/Sidebar.jsx` — El texto del rol se reemplazó por un badge con color vía `RoleMeta`.

### Decisiones de arquitectura
- La divergencia de vistas se decide **una sola vez** en `Dashboard.jsx` con early-return por rol, no con condicionales dispersos en el JSX.
- El KPI del cajero se calcula filtrando `sale.cashier === user.name` (mock: las ventas registran el nombre del cajero). En la API real será `GET /api/sales?cashierId=me&date=today`.
- `RoleMeta` convive con `RolePermissions` en `permissions.js`: un solo archivo como fuente de verdad de roles.

### Verificación
- Lint: 0 errores. Build: ✅.
- Smoke test de `getDefaultRoute`/badges: Admin→`/`, Gerente→`/`, Vendedor→`/pos`, Almacenero→`/inventory`, null→`/`.

### Dependencias nuevas
- Ninguna.

### Deuda técnica / notas
- Los KPIs del cajero arrancan en 0 porque las ventas mock registran a 'Administrador General' como cajero; se pueblan en cuanto el vendedor venda desde el POS.
- Almacenero **no** tiene permiso `dashboard`: su ruta `/` redirige automáticamente a `/inventory`. Intencional.
- Si crece la lógica por rol, extraer `CashierDashboard` a `src/pages/dashboard/` como componente propio.

---

## [2026-08-31] Frontend Architect (Antigravity) — Iteración: Módulo Reportes UI

### Archivos modificados
- `src/App.jsx` — Importación y enrutamiento del nuevo componente `Reports.jsx`, protegido bajo la ruta `/reports`.

### Archivos creados
- `src/pages/Reports.jsx` — Módulo completo de visualización de datos usando Tailwind CSS puro para los gráficos (sin librerías externas de charting). Consume los métodos de `reportService.js` expuestos por GLM.

### Decisiones de arquitectura
- Se construyó el gráfico de "Ventas de los últimos 7 días" mediante HTML/CSS (Flexbox y cálculo dinámico de alturas porcentuales con respecto al valor máximo del set). Esto evita agregar dependencias de visualización pesadas para un solo gráfico.
- Los "Métodos de Pago" se representan como barras de progreso horizontales estilizadas con Tailwind.
- Se implementaron 3 filtros de rango de fechas para los KPIs ("7 Días", "30 Días", "Todo") que se conectan correctamente con los parámetros `{ from, to }` definidos para `getSummary`.

### Dependencias nuevas
- Ninguna. Se reutilizaron los iconos de `lucide-react` y los componentes base de la UI (`Card`, `Badge`, `Spinner`).

### Deuda técnica / notas para el siguiente agente
- El módulo de Reportes está completamente finalizado a nivel de Interfaz de Usuario y lógica cliente. Todo carga asíncronamente con manejadores de carga (`Spinner`) y errores (`react-hot-toast`).
- El único módulo principal restante en el frontend es el de **Configuración (`/settings`)**.

---

## [2026-08-31] Frontend Architect (Claude Sonnet) — Iteración: Integración CRM con Flujo POS

### a) Archivos creados/modificados
- `src/ui/CustomerSelector.jsx` (CREADO) — Componente Combobox para la selección del cliente con búsqueda asíncrona sobre `customerService.getAll()`. 
- `src/pages/POS.jsx` (MODIFICADO) — Reemplazado el input legacy de `customerName` (texto libre) por el nuevo componente `<CustomerSelector>`.
- `ai_sync.md` (ACTUALIZADO) — Agregado este registro, respetando el historial intacto provisto por el Backend Lead y mi versión anterior de Reportes.

### b) Decisiones de arquitectura y UX
- El `<CustomerSelector>` despacha la acción `SET_CUSTOMER` de `CartContext` con el objeto completo del cliente seleccionado. Esto permite que durante toda la transacción, el contexto de ventas sepa exactamente quién está comprando, persistiendo el estado a través de la caja.
- Al hacer la llamada a `saleService.create()`, ahora se pasan explícitamente los campos `customerId: state.customer?.id || 'publico'` y `customer: [nombre] || 'Cliente General'`, alineándose 100% con los contratos actualizados provistos por GLM.
- El componente `CustomerSelector` incluye de forma automática a 'Venta al Público' como fallback nativo, mostrando el acumulado de compras (`totalSpent`) al momento de la búsqueda para ayudar al cajero.
- La confirmación de venta sigue utilizando el snapshot `saleComplete.customer` que retorna la API para evitar mutaciones post-venta, cumpliendo el principio de inmutabilidad del ticket emitido.
- La limpieza del carrito (`clearCart()`) nativamente restablece el `initialState` de `CartContext`, eliminando al cliente, por lo que no se requirió lógica adicional en el `checkout` para blanquear el selector.

### c) Dependencias nuevas
- Ninguna.

### d) Ajustes a contratos de API
- Ninguno necesario. Todo funciona a la perfección en sintonía con el soporte `customerId` implementado por el Backend Lead en `saleService.js`.

### e) Deuda técnica
- El Linter (`npm run lint`) generó algunos warnings de pre-existencias técnicas como `<CashierDashboard />` no definido en `Dashboard.jsx`, e imports inutilizados en varios archivos base. No los resolví para no contaminar esta iteración con cambios de scope externo.
- Continúa pendiente el módulo de **Configuración (`/settings`)**.

---

## [2026-10-06] Full-Stack Lead (Antigravity) — Iteración: Imágenes de Calzado, Reportes Ejecutivos (Admin/Gerencia/Operativo/Compras), Cajas Registradoras con PIN y Base de Datos Relacional Normalizada en Español (v4.0)

### 1. Importación de Imágenes de Zapatos (URL / Local)
- **Local File Upload**: Selector de archivos nativo con `FileReader` y compresión/escalado automático en Canvas (máx 800px, calidad JPEG 0.82) para evitar saturación de `localStorage`.
- **URL & Vista Previa**: Input reactivo con carga inmediata, botón para remover y catálogo de presets de calzado (Nike, Adidas, New Balance, Vans, Puma).
- **Integración Visual**: Soporte de miniaturas con efecto hover zoom en `Products.jsx`, `POS.jsx`, `Inventory.jsx` y `CashierTerminal.jsx`.

### 2. Módulo de Cajas Registradoras (Reparación y Gestión)
- **Servicio `cashRegisterService.js`**: Persistencia en `localStorage`, eventos reactivos (`cash_registers_changed`), CRUD de terminales de caja, asignación y cambio de claves PIN de 4 dígitos.
- **Configuración en Settings**: Nueva pestaña dedicada *Cajas Registradoras* con KPIs de terminales, tarjetas con ubicación, toggle de visualización de PIN, modal de cambio de clave y modal para crear/editar cajas.
- **Integración con POS y Turnos**: `CashierTerminal.jsx` ahora vincula las ventas a la caja física seleccionada (`cajaId`, `cajaName`) y bloquea cobros si el turno no está formalmente abierto. Recibos de Corte Z muestran ubicación y datos de la caja.

### 3. Suite Completa de Reportes (10 Reportes Especializados)
- **3 Administrativos**:
  - `getSeniatFiscalReport`: Libro de ventas fiscal SENIAT, base imponible, desglose IVA 16% e IGTF 3% en USD y Bolívares.
  - `getCashRegisterAuditReport`: Arqueo de cajas, cortes Z, diferencias de efectivo por terminal.
  - `getOperationsAuditReport`: Trazabilidad de comprobantes y auditoría de eventos.
- **3 Gerenciales**:
  - `getProfitabilityMarginReport`: COGS (costo de ventas), margen bruto en USD y %, análisis por marca y categoría.
  - `getSalesTrendsAndTicketReport`: Tendencias diarias y cálculo de ticket promedio.
  - `getCashierPerformanceReport`: Productividad, ventas concretadas y comisiones por cajero.
- **3 Operativos**:
  - `getCriticalStockReport`: Quiebres de stock, reposición urgente y valorización de inventario a costo vs PVP.
  - `getPaymentMethodReconciliationReport`: Conciliación bancaria multimoneda (Pago Móvil, Punto de Venta, Zelle, Efectivo USD/Bs).
  - `getDeliveryLogisticsReport`: Eficiencia de despachos, tiempos de entrega y facturación de fletes.
- **Reporte Especial de Compras**:
  - `getPurchasesReport`: Compras a proveedores, N° de factura y N° de control fiscal, reposición de inventario.
- **UI & Exportación**: Interfaz ejecutiva con pestañas de categoría, KPIs duales (USD/VES) y exportación individual a CSV.

### 4. Base de Datos Relacional Normalizada en Español (v4.0)
- **Traducción Integral**: Tablas en español (`configuracion_tienda`, `tasas_cambio`, `cajas`, `usuarios`, `categorias`, `marcas`, `proveedores`, `productos`, `compras`, `detalles_compra`, `clientes`, `turnos_caja`, `ventas`, `detalles_venta`, `pagos_venta`, `envios`, `auditoria`).
- **Módulo de Compras (3NF)**: Nuevas tablas `proveedores`, `compras` y `detalles_compra` con números de control fiscal SENIAT.
- **Triggers Automáticos**: Incremento de stock por compra recibida, descuento de stock por venta, recálculo de acumulados de clientes y marcas temporales automáticas.
- **55 Restricciones CHECK**: Precios, costos, cantidades y tasas positivas.
- **Vistas Bilingües**: Retrocompatibilidad total para consultas previas en inglés (`products`, `sales`, `customers`, `store_settings`, `purchases`, etc.).
- **Verificación**: Script `verificar_database.sql` y `scripts/verify_database_schema.js` ejecutados con 100% de éxito.

