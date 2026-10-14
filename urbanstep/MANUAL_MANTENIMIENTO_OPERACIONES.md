# MANUAL DE MANTENIMIENTO Y OPERACIONES — URBANSTEP
## Sistema de Gestión Fiscal, Financiera (SGF) y Punto de Venta (POS)
### UrbanStep Venezuela C.A. • RIF: J-50123456-7 • Barquisimeto, Estado Lara

---

## 1. INTRODUCCIÓN Y ALCANCE
Este manual establece los procedimientos estandarizados de **operación diaria, mantenimiento preventivo, respaldos, resolución de incidencias y contingencias** para garantizar la continuidad operativa ininterrumpida y el cumplimiento fiscal permanente de **UrbanStep Venezuela C.A.**

---

## 2. PROCEDIMIENTOS OPERATIVOS PERIÓDICOS

### 2.1 Rutinas Diarias
* **Inicio del Día (08:30 AM):**
  1. Encender el terminal de caja y la impresora térmica de recibos.
  2. Verificar que la fecha y hora del sistema operativo estén correctamente sincronizadas con la hora legal de Venezuela (UTC-4).
  3. Ingresar al sistema y verificar que la **Tasa BCV oficial** esté actualizada en el encabezado. Si el Banco Central emitió una nueva tasa no reflejada, el supervisor debe hacer clic en el botón de actualización o ingresar la tasa oficial manualmente en *Ajustes*.
  4. Realizar la **Apertura de Turno de Caja** ingresando el fondo de caja inicial en divisas ($) y bolívares (Bs.).
* **Durante la Jornada:**
  1. Registrar cada venta seleccionando el cliente o asignando "Cliente General".
  2. Entregar el ticket fiscal impreso a cada comprador.
  3. En caso de reclamo o garantía, procesar la devolución exclusivamente mediante el módulo **`Devolución / NC`** con su respectivo motivo legal.
* **Cierre del Día (07:30 PM):**
  1. Realizar el **Arqueo de Caja Ciego**: contar los billetes en dólares y bolívares e ingresarlos al sistema.
  2. Generar e imprimir el comprobante de **Corte Z**.
  3. Guardar el comprobante firmado junto con el efectivo del día en la caja fuerte de seguridad.

### 2.2 Rutinas Semanales
* **Conciliación Bancaria:**
  * Cruzar los reportes de cobros por Punto de Venta (Biopago BDV) y Pago Móvil (Banesco) contra los estados de cuenta bancarios oficiales.
* **Auditoría de Inventario Crítico:**
  * Ingresar a **Reportes > Capa 4: Stock Crítico** y generar la lista de calzados con existencias inferiores al mínimo para emitir órdenes de compra a distribuidores.

### 2.3 Rutinas Mensuales (Cierre Fiscal SENIAT)
* **Primeros 5 Días del Mes Siguiente:**
  1. Ingresar a **Reportes > Capa 2: Fiscal Venezuela (SENIAT)**.
  2. Generar y exportar el **Libro de Ventas Fiscal** del mes vencido (con el desglose de facturas y notas de crédito `NCR`).
  3. Generar y exportar el **Libro de Compras Fiscal** y la relación de **Comprobantes de Retención de IVA (75%) e ISLR**.
  4. Entregar los archivos PDF y Excel al contador público colegiado de la empresa para la declaración formal en el portal del SENIAT.

### 2.4 Rutinas Anuales (Cierre de Ejercicio VEN-NIIF)
* Al 31 de diciembre:
  1. Generar el **Balance de Comprobación Anual** y los **Estados Financieros** (Balance General y Estado de Resultados).
  2. Realizar el conteo físico general de mercancía en el almacén de Las Trinitarias y contrastarlo contra el **Kardex Valorizado PEPS**.

---

## 3. POLÍTICA DE RESPALDOS Y RECUPERACIÓN (BACKUPS & DRP)

UrbanStep cuenta con una estrategia de respaldo dual (**En la Nube + Local**):

```
┌────────────────────────────────────────────────────────┐
│               POLÍTICA DE RESPALDO DUAL                │
├───────────────────────────┬────────────────────────────┤
│   SUPABASE CLOUD (AUTO)   │    RESPALDO LOCAL (MANUAL) │
│ • Snapshot diario a las   │ • Exportación JSON desde   │
│   02:00 AM UTC.           │   el panel de Ajustes.     │
│ • Retención de 30 días.   │ • Almacenamiento en disco  │
│ • Point-in-time recovery. │   externo o pendrive seguro│
└───────────────────────────┴────────────────────────────┘
```

### 3.1 Generación de Respaldo Manual
1. Inicie sesión con credenciales de **Administrador General**.
2. Diríjase a **Ajustes > Base de Datos & Respaldo**.
3. Haga clic en el botón **"Descargar Copia de Seguridad JSON"**.
4. Se descargará un archivo consolidado con el formato:
   `urbanstep_backup_YYYY-MM-DD_HHMM.json`
5. Guarde este archivo en una unidad USB externa o almacenamiento seguro fuera de la tienda.

### 3.2 Restauración de Base de Datos
1. En caso de pérdida de equipo o fallo de disco, abra la aplicación en el nuevo computador.
2. Ingrese a **Ajustes > Base de Datos & Respaldo**.
3. En la sección *Restaurar Sistema*, seleccione el archivo `.json` de respaldo más reciente.
4. Presione **"Restaurar Datos"** y confirme la acción. El sistema reconstruirá el catálogo, clientes, ventas y libros contables de inmediato.

---

## 4. GUÍA DE RESOLUCIÓN DE PROBLEMAS FRECUENTES (TROUBLESHOOTING)

### 4.1 Caída de Conexión a Internet
* **Síntoma:** El indicador superior muestra *"Modo Local / Sin Conexión"*.
* **Causa:** Corte de fibra óptica o servicio de proveedor de telecomunicaciones en la zona.
* **Solución:**
  * **UrbanStep continúa operando con normalidad:** Las ventas, consultas de catálogo y arqueos se procesan contra la base de datos local del navegador (`LocalStorage / In-Memory`).
  * Tan pronto regrese la conectividad, el sistema sincronizará los comprobantes pendientes hacia Supabase Cloud de forma automática y transparente.

### 4.2 Discrepancia en Arqueo de Caja (Diferencia de Efectivo)
* **Síntoma:** El sistema muestra una alerta de *"Faltante"* o *"Sobrante"* en el Corte Z.
* **Causa:** Error en la entrega de vuelto al cliente o digitación incorrecta del método de cobro (ej. se cobró en divisas pero se marcó como bolívares).
* **Solución:**
  1. Ingrese a **Reportes > Capa 6: Auditoría de Comprobantes**.
  2. Filtre por el nombre del cajero y revise cada venta del turno contrastándola con los comprobantes físicos y vouchers bancarios.
  3. En las observaciones del Cierre de Turno, justifique la causa identificada antes de confirmar el cierre.

### 4.3 Error: "No es posible eliminar el producto debido a restricciones fiscales"
* **Síntoma:** Al presionar la papelera roja en un calzado, aparece una advertencia legal y el producto no se borra.
* **Causa:** El calzado figura en facturas o libros contables previos. La ley venezolana (**Providencia SENIAT 0071**) prohíbe eliminar registros comerciales con historial tributario.
* **Solución:**
  * **No se debe borrar el producto.** En su lugar, el sistema despliega automáticamente el modal **Disponibilidad por Talla y Color**.
  * Haga clic en **"Pausar todas las tallas"** y guarde. El calzado no aparecerá disponible para la venta en el POS pero mantendrá intacta la trazabilidad contable y el conteo físico de inventario.

### 4.4 Fallo de Impresión en Ticketera Térmica
* **Síntoma:** Al confirmar la venta no sale el ticket o sale en blanco.
* **Causas y Soluciones:**
  1. *Papel al revés:* El papel térmico solo imprime por una cara. Invierta la orientación del rollo en la impresora.
  2. *Ancho de papel incorrecto:* Vaya a **Ajustes > Impresora** y confirme si su equipo es de **58 mm** o **80 mm**.
  3. *Bloqueador de ventanas emergentes:* Verifique que el navegador no esté bloqueando el diálogo de impresión de la página.

### 4.5 Desfase en la Tasa Cambiaria Oficial
* **Síntoma:** El BCV actualizó la tasa a las 04:00 PM pero el sistema aún muestra la tasa de la mañana.
* **Solución:**
  1. Ingrese a **Ajustes > Tasa de Cambio BCV**.
  2. Presione el botón **"Sincronizar con API Oficial"**.
  3. Si la API de terceros experimenta lentitud, active la casilla **"Ajuste Manual de Contingencia"**, digite el valor exacto publicado en la cuenta oficial del BCV y presione guardar.

---

## 5. MANTENIMIENTO PREVENTIVO DEL SISTEMA

| Tarea de Mantenimiento | Frecuencia | Responsable | Procedimiento |
| :--- | :--- | :--- | :--- |
| **Limpieza de Impresora Térmica** | Quincenal | Cajero / Supervisor | Limpiar el cabezal térmico con un hisopo humedecido en alcohol isopropílico para evitar manchas en tickets. |
| **Limpieza de Caché del Navegador** | Mensual | Soporte TI | Purgar archivos temporales del navegador web para asegurar la ejecución del bundle JS más reciente. |
| **Verificación de Integridad de Base de Datos** | Trimestral | Administrador TI | Ejecutar el script `verificar_database.sql` en Supabase Console para certificar la consistencia de llaves foráneas. |
| **Rotación de Contraseñas** | Semestral | Todo el personal | Actualizar las claves de acceso de cajeros y administradores cumpliendo políticas de seguridad. |

---

## 6. CONTACTOS DE SOPORTE Y ESCALAMIENTO

* **Soporte Técnico de Sistemas UrbanStep:** soporte@urbanstep.com.ve • +58 412-1234567
* **Asesoría Contable y Tributaria:** contabilidad@urbanstep.com.ve
* **Sede Central:** Centro Comercial Las Trinitarias, Nivel Planta Baja, Barquisimeto, Estado Lara.
