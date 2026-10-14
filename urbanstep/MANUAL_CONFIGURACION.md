# MANUAL DE CONFIGURACIÓN Y DESPLIEGUE — URBANSTEP
## Sistema de Gestión Fiscal, Financiera (SGF) y Punto de Venta (POS)
### UrbanStep Venezuela C.A. • RIF: J-50123456-7 • Barquisimeto, Estado Lara

---

## 1. REQUISITOS DEL SISTEMA Y ENTORNO

### 1.1 Requisitos de Hardware Mínimos
* **Servidor / Host Local:** Procesador Dual Core 2.0 GHz o superior, 4 GB de memoria RAM, 20 GB de espacio en disco de estado sólido (SSD).
* **Terminales de Caja (Punto de Venta):** Equipo con procesador Intel i3 o equivalente, 4 GB de RAM, pantalla con resolución mínima de 1366x768 píxeles (recomendado 1920x1080).
* **Conectividad:** Conexión a Internet de banda ancha (para sincronización con Supabase Cloud y tasa oficial BCV). En caso de desconexión, el sistema conmuta automáticamente a modo local de contingencia.

### 1.2 Requisitos de Software
* **Sistema Operativo:** Windows 10/11, macOS 12+ o Linux (Ubuntu 22.04 LTS / Debian 12).
* **Node.js:** Versión 18.x LTS o 20.x LTS.
* **Gestor de Paquetes:** npm 9.x+ o pnpm 8.x+.
* **Navegadores Homologados:** Google Chrome 115+, Microsoft Edge 115+, Mozilla Firefox 118+ o Safari 16+.

---

## 2. INSTALACIÓN Y PUESTA EN MARCHA LOCAL

### 2.1 Clonación y Dependencias
1. Abra su terminal de comandos (PowerShell, Bash o Terminal).
2. Clone el repositorio del proyecto:
   ```bash
   git clone https://github.com/jorgepina2904/UrbanStep.git
   cd UrbanStep/urbanstep
   ```
3. Instale las dependencias oficiales del proyecto:
   ```bash
   npm install
   ```

### 2.2 Ejecución en Entorno de Desarrollo
Para levantar el servidor local con recarga rápida (HMR):
```bash
npm run dev
```
La aplicación quedará disponible en:
```
http://localhost:5173
```
Para permitir el acceso a otras computadoras o tablets en la red local de la tienda, ejecute:
```bash
npm run dev -- --host
```

---

## 3. VARIABLES DE ENTORNO (.env)

En la raíz del proyecto `urbanstep/`, cree o edite el archivo `.env` basándose en la plantilla `.env.example`:

```env
# =========================================================================
# URBANSTEP — CONFIGURACIÓN DE VARIABLES DE ENTORNO
# =========================================================================

# 1. Conexión a Supabase Cloud (PostgreSQL & Realtime)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica-aqui

# 2. Configuración Fiscal Corporativa Venezuela
VITE_COMPANY_NAME="UrbanStep Venezuela C.A."
VITE_COMPANY_RIF="J-50123456-7"
VITE_COMPANY_ADDRESS="Av. Los Leones, C.C. Las Trinitarias, Local PB-42, Barquisimeto, Estado Lara"
VITE_COMPANY_PHONE="+58 251-2541234"
VITE_COMPANY_CITY="Barquisimeto"
VITE_COMPANY_STATE="Lara"

# 3. Parámetros Tributarios SENIAT (Providencia 0071)
VITE_IVA_PERCENT=16.0
VITE_IGTF_PERCENT=3.0
VITE_RETENTION_IVA_PERCENT=75.0
VITE_RETENTION_ISLR_PERCENT=2.0

# 4. API de Tasa Oficial BCV
VITE_BCV_API_URL="https://ve.dolarapi.com/v1/dolares/oficial"
VITE_BCV_FALLBACK_RATE=876.80
```

---

## 4. CONFIGURACIÓN DE BASE DE DATOS (SUPABASE CLOUD)

UrbanStep utiliza **PostgreSQL** alojado en **Supabase** como motor de persistencia relacional con respaldo local reactivo.

### 4.1 Pasos para Inicializar la Base de Datos
1. Inicie sesión en [Supabase Console](https://supabase.com).
2. Cree un nuevo proyecto o ingrese al proyecto existente.
3. Vaya al **SQL Editor** en la barra lateral izquierda.
4. Ejecute en orden los siguientes scripts SQL presentes en el repositorio:
   * **`supabase_schema.sql`**: Crea el esquema formal de tablas relacionales:
     * `productos` y `variantes_producto` (tallas, colores, precios y stock).
     * `ventas`, `detalles_venta` y `pagos_venta`.
     * `notas_credito` y `detalles_nota_credito` (con afectación a factura y destino de inventario).
     * `turnos_caja` (arqueos y cortes Z).
     * `compras` y `detalles_compra`.
     * `clientes` y `proveedores`.
     * `logs_auditoria` (inmutable para fiscalización).
   * **`modificaciones_db.sql`**: Aplica triggers automáticos para descuento de stock en venta, reingreso en devolución, y generación de números de control fiscal SENIAT.
   * **`insert_productos_supabase.sql`**: Carga el catálogo inicial con marcas oficiales (*Nike, Adidas, Jordan, Puma, New Balance, Vans*).

---

## 5. CONFIGURACIÓN FISCAL VENEZOLANA (SENIAT & VEN-NIIF)

En el panel de administración (**Ajustes > Parámetros Fiscales**):

### 5.1 Correlativos y Números de Control
Según la **Providencia SNAT/2011/0071**, todo comprobante debe contar con numeración consecutiva única e irrepetible:
* **Formato de Facturas / Tickets:** `TKT-YYYY-XXXX` (ej. `TKT-2026-1045`).
* **Formato de Números de Control:** `00-XXXXXX` (ej. `00-001245`).
* **Formato de Notas de Crédito:** `NC-YYYY-XXXX` (ej. `NC-2026-0004`).
* **Comprobantes de Retención IVA:** `YYYYMMXXXXXX` (ej. `202610000012`).

### 5.2 Plan de Cuentas Contable VEN-NIIF
El sistema incluye de forma predeterminada el Plan de Cuentas estándar venezolano codificado a 5 niveles:
* `1` Activo -> `1.1` Activo Corriente -> `1.1.01` Efectivo y Equivalentes -> `1.1.01.01.001` Caja Mostrador VES.
* `2` Pasivo -> `2.1` Pasivo Corriente -> `2.1.02.01.001` Débito Fiscal IVA 16%.
* `4` Ingresos -> `4.1` Ingresos Operacionales -> `4.1.01.01.001` Ventas de Calzado Mostrador POS.
* `5` Costo de Ventas -> `5.1.01.01.001` Costo de Calzado Vendido.
* `6` Gastos -> `6.1.03.01.001` Mermas y Pérdidas de Calzado Dañado / Garantía.

---

## 6. CONFIGURACIÓN DE DISPOSITIVOS DE CAJA Y HARDWARE

### 6.1 Impresoras Térmicas de Recibos
El sistema soporta cualquier impresora térmica conectada por USB, Red LAN o Bluetooth:
1. En **Ajustes > Impresora Térmica**:
   * **Ancho de Papel:** Seleccione **58 mm** o **80 mm** (estándar para tickets fiscales).
   * **Corte Automático:** Active la bandera si la impresora cuenta con guillotina.
   * **Encabezado y Pie:** Ingrese el RIF, razón social, mensaje de garantía y leyenda fiscal obligatoria.
2. La impresión se ejecuta mediante CSS Print optimizado sin márgenes laterales, asegurando nitidez en el código QR y desglose de IVA/IGTF.

### 6.2 Lectores de Código de Barras
* Compatible con cualquier escáner USB o inalámbrico que opere en modo emulación de teclado (**HID Keyboard**).
* No requiere controladores adicionales: al escanear sobre el POS, el código de barras se digita automáticamente en el campo de búsqueda rápida, seleccionando el producto al instante.

### 6.3 Gaveta de Dinero
* Conecte el cable RJ-11 de la gaveta de dinero directamente al puerto posterior de la impresora térmica de recibos.
* Cada vez que se emite una factura o se confirma un cobro en efectivo, el pulso ESC/POS enviará la señal de apertura de la gaveta.

---

## 7. COMPILACIÓN Y DESPLIEGUE EN PRODUCCIÓN

### 7.1 Generación del Bundle Optimizado
Ejecute el comando de compilación:
```bash
npm run build
```
Vite generará los archivos estáticos listos para producción dentro de la carpeta `dist/`.

### 7.2 Despliegue en Vercel
El proyecto incluye el archivo `vercel.json` preconfigurado con reescritura para Single Page Application (SPA):
```bash
npx vercel --prod
```

### 7.3 Despliegue en Servidor Local con Nginx
Si desea alojar UrbanStep en un servidor Linux dentro de la tienda local:
```nginx
server {
    listen 80;
    server_name pos.urbanstep.local;

    root /var/www/urbanstep/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```
