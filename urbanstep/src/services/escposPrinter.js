/**
 * escposPrinter.js — Impresión térmica directa ESC/POS (58 mm / 80 mm) sin diálogo del navegador.
 * Transportes: Web USB y Web Bluetooth (BLE). Requiere HTTPS (o localhost) y Chrome/Edge.
 * Si el navegador no lo soporta o falla, el llamador debe recurrir a window.print().
 */
import { formatCurrency } from '../utils/formatCurrency';
import { usdToVes, resolveSaleRate } from '../utils/money';

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Servicios BLE habituales de impresoras térmicas genéricas
const BLE_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
];
const BLE_CHUNK = 100; // bytes por escritura (MTU conservador)
const PREF_KEY = 'urbanstep_printer_pref';

export const PAPER = {
    '58': { cols: 32, label: '58 mm' },
    '80': { cols: 48, label: '80 mm' }
};

// ---- Codificación CP858 (acentos y ñ del español) ----
const CP858 = {
    'á': 0xa0, 'é': 0x82, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4, 'Ñ': 0xa5,
    'Á': 0xb5, 'É': 0x90, 'Í': 0xd6, 'Ó': 0xe0, 'Ú': 0xe9, 'ü': 0x81, 'Ü': 0x9a,
    '¿': 0xa8, '¡': 0xad, '°': 0xf8, '•': 0x07, '×': 0x78, '—': 0x2d, '–': 0x2d,
    '“': 0x22, '”': 0x22, '‘': 0x27, '’': 0x27
};

const encodeText = (text) => {
    const out = [];
    for (const ch of String(text ?? '')) {
        if (/\s/.test(ch)) { out.push(0x20); continue; } // NBSP y espacios Unicode
        const code = ch.codePointAt(0);
        if (code < 0x80) out.push(code);
        else out.push(CP858[ch] ?? 0x3f);
    }
    return out;
};

export class EscPosBuilder {
    constructor(paper = '80') {
        this.cols = (PAPER[paper] || PAPER['80']).cols;
        this.bytes = [ESC, 0x40, ESC, 0x74, 19]; // init + tabla de caracteres CP858
    }

    raw(...b) { this.bytes.push(...b); return this; }
    text(t) { this.bytes.push(...encodeText(t)); return this; }
    line(t = '') {
        const str = String(t ?? '');
        if (str.length <= this.cols) return this.text(str).raw(LF);
        // Ajuste de línea por palabras para que el ticket no se corte en 58 mm
        let current = '';
        str.split(' ').forEach((word) => {
            if (current && (current + ' ' + word).length > this.cols) { this.text(current).raw(LF); current = word; }
            else current = current ? current + ' ' + word : word;
        });
        return current ? this.text(current).raw(LF) : this;
    }
    feed(n = 1) { return this.raw(ESC, 0x64, n); }
    align(a) { return this.raw(ESC, 0x61, { left: 0, center: 1, right: 2 }[a] ?? 0); }
    bold(on) { return this.raw(ESC, 0x45, on ? 1 : 0); }
    size(w = 1, h = 1) { return this.raw(GS, 0x21, ((w - 1) << 4) | (h - 1)); }
    rule(ch = '-') { return this.line(ch.repeat(this.cols)); }

    /** Texto a la izquierda y a la derecha en una misma línea */
    pair(left, right) {
        const l = String(left ?? '');
        const r = String(right ?? '');
        const space = this.cols - r.length;
        const lt = l.length > space - 1 ? l.slice(0, Math.max(0, space - 1)) : l;
        return this.line(lt + ' '.repeat(Math.max(1, this.cols - lt.length - r.length)) + r);
    }

    /** Código QR nativo (modelo 2) */
    qr(data, moduleSize = 6) {
        const bytes = encodeText(data);
        const len = bytes.length + 3;
        this.raw(GS, 0x28, 0x6b, 4, 0, 49, 65, 50, 0);          // modelo 2
        this.raw(GS, 0x28, 0x6b, 3, 0, 49, 67, moduleSize);     // tamaño del módulo
        this.raw(GS, 0x28, 0x6b, 3, 0, 49, 69, 49);             // corrección L
        this.raw(GS, 0x28, 0x6b, len & 0xff, len >> 8, 49, 80, 48, ...bytes); // datos
        this.raw(GS, 0x28, 0x6b, 3, 0, 49, 81, 48);             // imprimir
        return this.raw(LF);
    }

    cut() { return this.feed(3).raw(GS, 0x56, 0x42, 0x00); }
    build() { return new Uint8Array(this.bytes); }
}

/** Construye el ticket fiscal bimonetario a partir de una venta. */
export const buildSaleTicket = (sale, settings = {}, paper = '80', bcvFallback = 0) => {
    const rate = resolveSaleRate(sale, bcvFallback);
    const bs = (usd) => formatCurrency(usdToVes(usd, rate), 'VES');
    const b = new EscPosBuilder(paper);

    b.align('center').bold(true).size(2, 2).line('URBANSTEP').size(1, 1);
    b.line(settings.legalName || 'UrbanStep Venezuela C.A.').bold(false);
    b.line(`RIF: ${settings.rif || 'J-50123456-7'}`);
    if (settings.fiscalAddress) b.line(settings.fiscalAddress);
    if (settings.phone) b.line(`Telf: ${settings.phone}`);
    b.align('left').rule('=');

    b.pair('COMPROBANTE:', sale.receiptNumber || sale.id);
    if (sale.controlNumber) b.pair('N. CONTROL:', sale.controlNumber);
    b.pair('FECHA:', new Date(sale.date || Date.now()).toLocaleString('es-VE'));
    b.pair('CAJERO:', sale.cashier || 'Caja 1');
    b.pair('TASA BCV:', `${formatCurrency(rate, 'VES')}/USD`);
    b.rule();
    b.pair('CLIENTE:', sale.customer || 'Cliente General');
    if (sale.customerDoc) b.pair('CI/RIF:', sale.customerDoc);
    b.rule();

    (sale.items || []).forEach((item) => {
        b.bold(true).line(String(item.name || '').slice(0, b.cols)).bold(false);
        const detail = `${item.quantity} x ${formatCurrency(item.price)}${item.size ? `  T:${item.size}` : ''}`;
        b.pair(detail, formatCurrency(item.price * item.quantity));
        b.align('right').line(bs(item.price * item.quantity)).align('left');
    });
    b.rule();

    b.pair('SUBTOTAL:', formatCurrency(sale.subtotal));
    b.pair('IVA 16%:', formatCurrency(sale.tax));
    if (sale.igtf > 0) b.pair('IGTF 3%:', formatCurrency(sale.igtf));
    if (sale.shippingCost > 0) b.pair('ENVIO:', formatCurrency(sale.shippingCost));
    b.rule('=');
    b.bold(true).size(1, 2);
    b.pair('TOTAL USD:', formatCurrency(sale.total));
    b.pair('TOTAL Bs.:', formatCurrency(Number(sale.totalBs) > 0 ? Number(sale.totalBs) : usdToVes(sale.total, rate), 'VES'));
    b.size(1, 1).bold(false);
    b.rule();

    b.pair('PAGO:', String(sale.paymentMethodLabel || sale.paymentMethod || '').toUpperCase());
    if (sale.paymentReference) b.pair('REF:', sale.paymentReference);
    if (sale.cashChange > 0) b.pair('VUELTO:', sale.cashCurrency === 'VES' ? formatCurrency(sale.cashChange, 'VES') : formatCurrency(sale.cashChange));
    b.rule();

    b.align('center');
    b.line(settings.ticketFooter || 'Gracias por su compra en UrbanStep');
    b.line('Cambios de calzado: 7 dias con ticket y caja');
    b.feed(1).qr(`URBANSTEP|${sale.receiptNumber || sale.id}|${sale.total}`);
    b.line(sale.receiptNumber || String(sale.id || ''));
    return b.cut().build();
};

// ---- Transportes ----
let _device = null;       // { kind: 'usb'|'ble', handle, endpoint?, characteristic? }

const getPref = () => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
};
export const setPrinterPref = (patch) => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ ...getPref(), ...patch })); } catch { /* sin almacenamiento */ }
};
export const getPrinterPref = () => ({ paper: '80', ...getPref() });

export const isDirectPrintSupported = () =>
    typeof navigator !== 'undefined' && Boolean(navigator.usb || navigator.bluetooth);

const openUsb = async (device) => {
    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);
    let found = null;
    for (const iface of device.configuration.interfaces) {
        for (const alt of iface.alternates) {
            const ep = alt.endpoints.find(e => e.direction === 'out' && e.type === 'bulk');
            if (ep) { found = { iface: iface.interfaceNumber, ep: ep.endpointNumber }; break; }
        }
        if (found) break;
    }
    if (!found) throw new Error('La impresora USB no expone un endpoint de salida');
    await device.claimInterface(found.iface);
    return { kind: 'usb', handle: device, endpoint: found.ep };
};

const openBle = async (device) => {
    const server = await device.gatt.connect();
    for (const svc of BLE_SERVICES) {
        try {
            const service = await server.getPrimaryService(svc);
            const chars = await service.getCharacteristics();
            const writable = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
            if (writable) return { kind: 'ble', handle: device, characteristic: writable };
        } catch { /* probar siguiente servicio */ }
    }
    throw new Error('No se encontró una característica de escritura en la impresora Bluetooth');
};

/** Conecta (pide permiso al usuario la primera vez; después reutiliza el dispositivo autorizado). */
export const connectPrinter = async (transport = 'usb') => {
    if (_device) return _device;
    if (transport === 'usb') {
        if (!navigator.usb) throw new Error('Este navegador no soporta Web USB');
        const known = await navigator.usb.getDevices();
        const device = known[0] || await navigator.usb.requestDevice({ filters: [] });
        _device = await openUsb(device);
    } else {
        if (!navigator.bluetooth) throw new Error('Este navegador no soporta Web Bluetooth');
        const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES });
        _device = await openBle(device);
    }
    setPrinterPref({ transport });
    return _device;
};

export const disconnectPrinter = async () => {
    try {
        if (_device?.kind === 'usb') await _device.handle.close();
        if (_device?.kind === 'ble') _device.handle.gatt?.disconnect();
    } catch (e) {
        console.warn('Aviso al desconectar la impresora:', e);
    }
    _device = null;
};

/** Envía bytes ESC/POS a la impresora conectada. */
export const sendToPrinter = async (data, transport = getPrinterPref().transport || 'usb') => {
    const dev = await connectPrinter(transport);
    try {
        if (dev.kind === 'usb') {
            await dev.handle.transferOut(dev.endpoint, data);
        } else {
            for (let i = 0; i < data.length; i += BLE_CHUNK) {
                const chunk = data.slice(i, i + BLE_CHUNK);
                if (dev.characteristic.properties.writeWithoutResponse) await dev.characteristic.writeValueWithoutResponse(chunk);
                else await dev.characteristic.writeValue(chunk);
            }
        }
    } catch (err) {
        _device = null; // forzar reconexión en el siguiente intento
        throw err;
    }
};

export const printSaleDirect = async (sale, settings, bcvFallback = 0) => {
    const { paper } = getPrinterPref();
    await sendToPrinter(buildSaleTicket(sale, settings, paper, bcvFallback));
};
