# MANUAL DE USUARIO — URBANSTEP
## Sistema de Gestión Fiscal, Financiera (SGF) y Punto de Venta (POS)
### UrbanStep Venezuela C.A. • RIF: J-50123456-7 • Barquisimeto, Estado Lara

---

## 1. INTRODUCCIÓN Y BIENVENIDA
Bienvenido al **Manual de Usuario de UrbanStep**, la plataforma empresarial integral diseñada específicamente para el sector retail de calzado y streetwear en Venezuela. 

UrbanStep opera bajo una arquitectura bimonetaria nativa (**Dólar Estadounidense $ y Bolívar Digital Bs.**), conectada a la tasa oficial del **Banco Central de Venezuela (BCV)** y dando estricto cumplimiento a la **Providencia Administrativa SENIAT SNAT/2011/0071** y a las normas de contabilidad formal venezolana **VEN-NIIF (Doble Partida)**.

---

## 2. ACCESO AL SISTEMA Y ROLES DE USUARIO

### 2.1 Pantalla de Inicio de Sesión
1. Abra el navegador e ingrese a la dirección web del sistema: `http://localhost:5173` o el dominio corporativo asignado.
2. Haga clic en **"Iniciar Sesión"** o ingrese a `/landing?login=true`.
3. Ingrese su correo electrónico y contraseña asignada por la administración.

### 2.2 Roles Disponibles y Privilegios
* **Administrador General:** Acceso total a todas las capas del sistema, configuraciones fiscales, plan de cuentas, auditoría y supresión controlada.
* **Supervisor de Caja:** Autorización de devoluciones, emisión de Notas de Crédito, arqueos de caja, visualización de libros de ventas y compras.
* **Cajero:** Operación del Punto de Venta (POS), apertura y cierre de su turno de caja, emisión de facturas y cobranza bimonetaria.
* **Almacenista / Inventario:** Recepción de mercancía de proveedores, ajuste de stock, gestión de variantes por talla y color, y control de Kardex.

---

## 3. GESTIÓN DE CAJA Y TURNOS (APERTURA Y CIERRE)

### 3.1 Apertura de Turno de Caja
Antes de realizar la primera venta del día, el cajero debe abrir formalmente su turno:
1. En el menú superior o lateral, haga clic en el indicador de **Estado de Turno** o ingrese a **POS**.
2. Aparecerá el modal **"Apertura de Turno de Caja"**.
3. Ingrese el monto de **Fondo de Caja (Base)** tanto en efectivo Dólares ($ USD) como en Bolívares (Bs.).
4. Seleccione la caja física asignada (ej. *Caja 1 - Mostrador Principal*).
5. Ingrese observaciones iniciales si aplica y presione **"Abrir Turno de Caja"**.

### 3.2 Cierre de Turno y Arqueo Ciego (Corte Z)
Al finalizar la jornada laboral o el turno:
1. Haga clic en el botón **"Cierre de Caja"** en el encabezado del POS o del menú de usuario.
2. Realice el conteo físico de la gaveta e ingrese el efectivo real en **Dólares ($)** y en **Bolívares (Bs.)**.
3. El sistema contrastará el dinero esperado (Base inicial + Ventas en efectivo) contra el dinero declarado, calculando en tiempo real cualquier sobrante o faltante.
4. Presione **"Confirmar Cierre y Generar Corte Z"**. Podrá imprimir el comprobante térmico de arqueo para firmar y entregar a administración.

---

## 4. PUNTO DE VENTA (POS) Y FACTURACIÓN BIMONETARIA

### 4.1 Selección de Calzado, Talla y Color
1. En el catálogo visual o mediante el buscador/lector de código de barras, localice el modelo de calzado.
2. Cada tarjeta muestra el precio en **$ USD** y su equivalente exacto en **Bs.** a la tasa BCV oficial.
3. Si el calzado tiene variantes de color, seleccione la miniatura del color deseado.
4. Seleccione la **Talla** (ej. 38, 39, 40, 41, 42).
   * **Tallas con stock disponible:** Se muestran con el contador físico de pares.
   * **Tallas agotadas:** Aparecen deshabilitadas en color gris indicando *0 pares*.
   * **Tallas pausadas:** Exhiben el distintivo **`Pausada`** y no pueden agregarse al carrito, protegiendo las existencias físicas para reservas o vitrina.
5. Haga clic en **"Agregar al Carrito"**.

### 4.2 Carrito de Compras y Selección de Cliente
1. En el panel lateral derecho del carrito, visualice los pares seleccionados. Puede ajustar cantidades o eliminar renglones.
2. Haga clic en el selector de **Cliente**:
   * Puede buscar por Cédula/RIF o Nombre (ej. *V-19876543*).
   * Si es un cliente nuevo, haga clic en **"Nuevo Cliente"** para registrarlo en 5 segundos.
   * Si el cliente no desea suministrar datos, mantenga seleccionado **"Cliente General" (Público general)**.

### 4.3 Opciones de Despacho y Delivery
Seleccione la modalidad de entrega:
* **Retiro en Tienda:** Entrega inmediata en el mostrador de Las Trinitarias (costo $0.00).
* **Delivery Urbano Barquisimeto:** Cálculo de flete por zona/distancia en tiempo real.
* **Encomienda Nacional:** Despacho por empresas de transporte (MRW, Zoom, Tealca).

### 4.4 Procesamiento del Cobro y Medios de Pago
Haga clic en **"Cobrar"**:
1. El modal presenta el total a pagar en ambas monedas ($ y Bs.).
2. Seleccione el método de pago:
   * **Pago Móvil (VES):** Permite copiar datos bancarios corporativos y registrar la referencia de 4 a 6 dígitos.
   * **Punto de Venta / Biopago (VES):** Registro de operación con tarjeta de débito nacional.
   * **Efectivo Divisas ($ USD):** El sistema calcula automáticamente el **IGTF (3%)** según la ley venezolana y desglosa el cambio a devolver.
   * **Efectivo Bolívares (VES):** Cobro directo en billetes de curso legal.
   * **Zelle / Custodia Digital:** Registro de titular y comprobante en divisas.
3. Presione **"Confirmar y Emitir Factura"**.
4. Se generará de inmediato el comprobante fiscal imprimible con código QR, número correlativo (`TKT-2026-XXXX`) y número de control SENIAT.

---

## 5. MÓDULO DE DEVOLUCIONES Y NOTAS DE CRÉDITO FISCALES (SGF)

Bajo la **Providencia SENIAT 0071** y las normas contables **VEN-NIIF**, queda terminantemente prohibido alterar o borrar facturas emitidas. Las devoluciones se procesan mediante la emisión formal de una **Nota de Crédito (NCR)**:

### 5.1 Procedimiento de Emisión
1. En el encabezado del POS, haga clic en el botón **`↩️ Devolución / NC`**.
2. **Paso 1:** Busque y seleccione la factura o ticket afectado (por número de recibo `TKT-...` o nombre del cliente).
3. **Paso 2:** Marque las casillas de los artículos específicos que el cliente desea devolver y especifique la cantidad.
4. **Paso 3:** Seleccione obligatoriamente el **Motivo SGF Legal**:
   * **`Producto Mal Facturado / Error de Facturación`**: Para errores de digitación en caja o cambio por modelo/precio. **El calzado reingresa automáticamente al inventario vendible**.
   * **`Producto Dañado / Falla de Fábrica / Garantía`**: Para calzados defectuosos o roturas. **NO reingresa al inventario vendible**; se da de baja automáticamente a la cuenta contable de *Merma Operativa (6.1.03.01.001)* y se asienta en Kardex.
   * **`Factura Fallida / Anulación de Transacción`**: Para operaciones que no se concretaron en pasarela bancaria. Anula la factura original y devuelve el stock.
5. Seleccione la **Modalidad de Reembolso** (*Efectivo Divisas, Efectivo Bs., Pago Móvil o Saldo a Favor*).
6. Presione **"Emitir Nota de Crédito SENIAT"**.
7. Se emitirá el comprobante oficial correlativo (`NC-2026-XXXX`) con su respectivo número de control (`00-XXXXXX`), afectando de inmediato el Libro de Ventas SENIAT y el Libro Diario contable.

---

## 6. CATÁLOGO DE PRODUCTOS Y GESTIÓN DE DISPONIBILIDAD

### 6.1 Protección Legal Contra Borrado de Calzados con Ventas
Si un producto ya posee ventas registradas en el sistema contable:
* Al presionar el botón de eliminar (papelera roja), el sistema **bloqueará la eliminación física** indicando la infracción fiscal a la Providencia SENIAT 0071.
* En su lugar, el sistema abrirá automáticamente la **Subpantalla de Disponibilidad por Talla y Color**.

### 6.2 Subpantalla de Disponibilidad por Talla y Color
Esta herramienta permite pausar temporalmente calzados o tallas específicas sin alterar los contadores de inventario:
1. En la tarjeta del calzado (o fila de inventario), haga clic en el botón de controles deslizantes (**`SlidersHorizontal`**).
2. Se desplegará la ventana modal de gestión granular:
   * **Pestañas de Color:** Filtre entre los colores disponibles del modelo.
   * **Selector de Tallas:** Haga clic en cualquier talla para alternar su estado entre **Disponible** y **Pausada**.
   * **Acciones Rápidas:**
     * *Pausar todas las tallas*: Para retirar el calzado de vitrina sin borrarlo.
     * *Pausar sin stock*: Pausa automáticamente solo las tallas con 0 pares.
     * *Habilitar todas las tallas*: Restablece la venta total.
3. Presione **"Guardar Disponibilidad"**.
4. **Garantía Invariable:** El conteo físico de pares de cada talla **se mantiene intacto en un 100%** (nunca se resetea a cero).

---

## 7. ALMACÉN, KARDEX Y COMPRAS A PROVEEDORES

### 7.1 Registro de Compras de Mercancía
1. Ingrese a la sección **"Compras"** en el menú principal.
2. Haga clic en **"Registrar Factura de Proveedor"**.
3. Seleccione el proveedor (ej. *Distribuidora Deportiva Ávila C.A.*) e ingrese el número de factura y de control emitido por el distribuidor.
4. Ingrese los modelos, tallas, cantidades recibidas y costo unitario en divisas ($).
5. El sistema calculará la base imponible, el IVA (16%), la retención legal de IVA del 75% aplicable a Contribuyentes Especiales y el total en Bolívares a tasa BCV.
6. Al guardar, las unidades ingresarán de inmediato al almacén, actualizando el Kardex y registrando el asiento contable en el Libro Diario.

### 7.2 Consulta de Kardex Valorizado
1. Ingrese a **"Inventario"** o a **"Reportes > Capa 4: Kardex"**.
2. Podrá consultar la trazabilidad histórica de cada par de zapatos:
   * *Entrada por compra.*
   * *Salida por venta en mostrador.*
   * *Baja por merma / falla de fábrica.*
   * *Reingreso por devolución de cliente.*
3. Valoración contable calculada bajo método de **Promedio Ponderado / PEPS (VEN-NIIF)**.

---

## 8. NAVEGACIÓN Y REPORTES EN EL SISTEMA SGF (6 CAPAS)

La sección **"Reportes"** está estructurada en 6 capas funcionales de respuesta ultrarrápida:

| Capa Funcional | Sub-reportes Clave | Propósito Legal / Operativo |
| :--- | :--- | :--- |
| **Capa 1: Contabilidad Formal** | Plan de Cuentas, Libro Diario, Libro Mayor, Balance de Comprobación, Estados Financieros. | Cumplimiento formal VEN-NIIF con Asientos por Partida Doble en tiempo real. |
| **Capa 2: Fiscal Venezuela (SENIAT)** | Libro de Ventas (Providencia 0071), Libro de Compras, Comprobantes de Retención IVA e ISLR. | Declaración mensual de IVA, IGTF y retenciones tributarias. Incluye deducciones por NCR. |
| **Capa 3: Tesorería** | Arqueo y Cierres Z, Flujo de Caja Proyectado (30/60/90 días), Conciliación Bancaria. | Control de liquidez, conciliación de cuentas en Banesco, BDV, Zelle y efectivo. |
| **Capa 4: Operaciones e Inventario** | Kardex Valorizado, Stock Crítico, Rotación de Calzado, Envíos, Garantías y Devoluciones. | Control de mermas, garantías atendidas, despachos por encomienda y stock bajo mínimos. |
| **Capa 5: BI / Dashboards Ejecutivos** | Tendencias y Ticket Promedio, Márgenes de Rentabilidad COGS, Desempeño de Cajeros, Ventas por Marca, Tráfico Horario. | Inteligencia de negocios para toma de decisiones gerenciales y compras estratégicas. |
| **Capa 6: Administración y Auditoría** | Trazabilidad y Logs de Auditoría en Tiempo Real. | Registro inmutable de cada acción de usuario (creación, edición, eliminación bloqueada, devoluciones). |

### 8.1 Exportación de Libros y Reportes
Cada reporte cuenta con el panel de exportación **`ExportButtonGroup`**:
* **Exportar a Excel (.XLSX / CSV):** Archivo formateado para importación en software contables externos (incluyendo el Libro de Ventas formal SENIAT).
* **Descargar PDF Imprimible:** Formato corporativo formal con membrete de UrbanStep Venezuela C.A., RIF, firma de contador y sellos fiscales.

---

## 9. HARDWARE DE PUNTO DE VENTA, ESCÁNER Y MODO OFFLINE (PWA)

### 9.1 Impresión Térmica Directa ESC/POS (58mm y 80mm)
El Punto de Venta incluye integración nativa de hardware para impresoras térmicas de tickets sin necesidad de abrir la ventana de diálogo del navegador:
1. En el modal de recibo tras procesar una venta, presione el botón **"Térmica Directa"**.
2. Conéctese a través de **WebUSB** o **Web Bluetooth** con su impresora (ej. Xprinter, Epson, Bixolon).
3. El ticket se imprime en milisegundos con logotipo, desglose bimonetario ($ / Bs. BCV), código QR de validación y corte automático de papel.

### 9.2 Generación y Lectura de Código de Barras (Code128)
1. **Generación de Etiquetas:** Desde el módulo **"Inventario"**, haga clic en **"Imprimir Etiquetas"** para generar códigos de barra estándar en formato `SKU|TALLA|COLOR` listos para adherir a las cajas de calzado (formatos 50x30 mm, 40x25 mm y 58x40 mm).
2. **Escaneo en Caja:** En la terminal de caja (**POS / Terminal**), conecte cualquier pistola lectora USB o Bluetooth. Al escanear la etiqueta, el sistema detecta el retorno y añade de inmediato la variante exacta de talla y color al carrito de compras.

### 9.3 Arqueo Ciego y Bóveda por Denominación de Billetes
Al realizar el cierre de turno:
1. El cajero realiza un **Cierre Ciego** (el sistema oculta los saldos teóricos esperados para garantizar la transparencia del arqueo).
2. En el desglose de bóveda, cuente billete por billete por denominación ($100, $50, $20, $10, $5, $1 y Bolívares), más los lotes de Punto de Venta, Pago Móvil y Zelle.
3. El sistema calcula automáticamente los faltantes o sobrantes y genera una alerta de auditoría para la gerencia en caso de descuadre.

### 9.4 Operación Continua Fuera de Línea (Offline-First)
Si ocurre una falla eléctrica o caída del proveedor de internet en la tienda:
1. La aplicación continuará funcionando en la caja gracias a su Service Worker y almacenamiento local en **IndexedDB**.
2. Podrá seguir registrando ventas, emitiendo comprobantes provisionales `TKT-OFF-CAJA-YYYY-XXXX`.
3. Una barra flotante superior indicará las ventas pendientes por sincronizar.
4. Al restablecerse la conexión a internet, el sistema sincroniza automáticamente la cola contra Supabase sin duplicados.

---

## 10. ECOMMERCE, LOGÍSTICA DE ALMACÉN Y MARKETING VIP

### 10.1 Ficha de Producto y Reseñas en Tienda Web
* Los clientes acceden a `/producto/:id` para visualizar la galería en alta resolución, disponibilidad en tiempo real por talla y color, y opiniones verificadas de otros compradores.
* Incluye botones de compra rápida y cálculo de cuotas o conversión a tasa oficial BCV.

### 10.2 Traslados entre Sucursales y Lotes de Garantía (`/warehouse`)
1. **Traslados de Mercancía:** Desde el módulo **Almacén y Sucursales**, genere traslados entre la Tienda Principal y Depósitos (`TRF-YYYY-XXXX`) con recepción ciega para cotejar los pares enviados vs. recibidos.
2. **Garantías a Proveedor:** Agrupe el calzado recibido por devolución con motivo `producto_danado` en un lote de garantía (`GAR-YYYY-XXXX`) para solicitar reposición o nota de crédito al distribuidor mayorista.

### 10.3 Carritos Abandonados y Alertas "Avísame mi Talla" (`/marketing`)
1. **Recuperación de Carritos:** En el módulo **Marketing**, visualice los clientes que dejaron calzado en su bolsa. Con un solo clic, envíe un mensaje personalizado de WhatsApp con un enlace directo (`?recover=`) que restaura su carrito con el inventario actualizado.
2. **Alertas de Stock:** Cuando un cliente solicita una talla agotada, el sistema registra su contacto. Al recibir una compra de mercancía que repone esa talla, el sistema lista a los clientes en espera para notificarles inmediatamente.
3. **UrbanStep VIP Club:** Los clientes acumulan 1 punto por cada dólar neto comprado. El sistema clasifica automáticamente en niveles (*Rookie, Streetwear Fan y Sneakerhead VIP*) otorgando descuentos de 3% a 5% y beneficios de envío gratis de forma transparente en el checkout.

