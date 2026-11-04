/**
 * storeInfo.js — Datos operativos de la tienda web (fuente única para la landing):
 * sede física, horario, zonas de delivery en Lara, drop semanal y fichas técnicas del hero.
 * Todas las horas se calculan en hora de Venezuela (UTC-4, sin horario de verano).
 */

export const STORE = {
    name: 'Hub UrbanStep Las Trinitarias',
    address: 'CC Las Trinitarias, Nivel Galería, Local G-14',
    reference: 'Frente a la feria',
    city: 'Av. Los Leones, Barquisimeto, Estado Lara',
    mapsUrl: 'https://www.google.com/maps?q=10.068330144675503,-69.28499381534304',
    rif: 'J-50123456-7'
};

// Horario por día (0 = domingo) en minutos desde medianoche, hora de Venezuela.
const WEEKDAY = [10 * 60, 19 * 60 + 30];
export const STORE_HOURS = { 0: [12 * 60, 18 * 60], 1: WEEKDAY, 2: WEEKDAY, 3: WEEKDAY, 4: WEEKDAY, 5: WEEKDAY, 6: WEEKDAY };
export const STORE_HOURS_LABEL = [
    { days: 'Lunes a Sábado', hours: '10:00 AM - 7:30 PM' },
    { days: 'Domingos', hours: '12:00 PM - 6:00 PM' }
];

/** Opciones de entrega del checkout (el costo lo aplica Landing.jsx). */
export const SHIPPING_OPTIONS = [
    { id: 'delivery_lara', label: 'Delivery Express Lara', detail: 'Barquisimeto & Cabudare · 45 min', costUsd: 3 },
    { id: 'pickup', label: 'Retiro en Tienda', detail: 'Las Trinitarias · inmediato', costUsd: 0 },
    { id: 'nacional', label: 'Encomienda Nacional', detail: 'Zoom · MRW · Tealca', costUsd: 5 }
];

/**
 * Zonas de despacho. `value` se conserva tal cual porque se guarda en la libreta de direcciones
 * y en las notas de la venta.
 */
export const DELIVERY_ZONES = [
    { id: 'este', value: 'Barquisimeto Este / Trinitarias', area: 'Este / Trinitarias', landmark: 'Av. Los Leones', eta: '25-30 min', etaMin: 30 },
    { id: 'centro', value: 'Barquisimeto Centro / Carrera 19', area: 'Centro / Carrera 19', landmark: 'Catedral & Vargas', eta: '35-40 min', etaMin: 40 },
    { id: 'oeste', value: 'Barquisimeto Oeste / Obelisco', area: 'Oeste / Obelisco', landmark: 'Obelisco & Av. Libertador', eta: '35-40 min', etaMin: 40 },
    { id: 'cabudare', value: 'Cabudare / Palavecino', area: 'Cabudare / Intercomunal', landmark: 'La Mata & El Recreo', eta: '40-45 min', etaMin: 45 },
    { id: 'nacional', value: 'Envío Nacional Fuera de Lara', area: 'Resto de Venezuela', landmark: 'Zoom · MRW · Tealca', eta: '24-72 h', etaMin: 1440, national: true }
];

export const zoneByValue = (value) => DELIVERY_ZONES.find(z => z.value === value) || DELIVERY_ZONES[0];

const fmtClock = (minutes) => {
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const h12 = ((h24 + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
};

/** Día de la semana y minuto del día en hora de Venezuela. */
const venezuelaClock = (now) => {
    let minute = now.getUTCHours() * 60 + now.getUTCMinutes() - 240;
    let day = now.getUTCDay();
    if (minute < 0) { minute += 1440; day = (day + 6) % 7; }
    return { day, minute };
};

/** Estado de la tienda física en este momento: abierta/cerrada y próximo cambio. */
export const getStoreStatus = (now = new Date()) => {
    const { day, minute } = venezuelaClock(now);
    const [open, close] = STORE_HOURS[day];
    if (minute >= open && minute < close) {
        return { isOpen: true, label: `Abierto ahora · cierra ${fmtClock(close)}` };
    }
    if (minute < open) return { isOpen: false, label: `Cerrado · abre hoy ${fmtClock(open)}` };
    const nextOpen = STORE_HOURS[(day + 1) % 7][0];
    return { isOpen: false, label: `Cerrado · abre mañana ${fmtClock(nextOpen)}` };
};

/** Drop semanal: jueves 6:00 PM hora de Venezuela (22:00 UTC). Se considera "en vivo" las 3 h siguientes. */
const DROP_LIVE_MS = 3 * 60 * 60 * 1000;
export const getDropWindow = (now = new Date()) => {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0));
    next.setUTCDate(next.getUTCDate() + ((4 - next.getUTCDay() + 7) % 7));
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
    const previous = new Date(next.getTime() - 7 * 24 * 60 * 60 * 1000);
    const isLive = now - previous < DROP_LIVE_MS;
    const ms = Math.max(0, next - now);
    return {
        isLive,
        days: Math.floor(ms / 86400000),
        hours: Math.floor((ms % 86400000) / 3600000),
        minutes: Math.floor((ms % 3600000) / 60000),
        seconds: Math.floor((ms % 60000) / 1000)
    };
};

/** Normaliza un teléfono venezolano al formato internacional de wa.me (o null si no es válido). */
export const whatsappNumber = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.startsWith('0') ? `58${digits.slice(1)}` : digits;
};

export const whatsappLink = (phone, text) => {
    const n = whatsappNumber(phone);
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
};

// Rasgo técnico destacado según la categoría del calzado (para las fichas del hero).
const CATEGORY_TECH = [
    { match: /run|deport|train|gym/i, label: 'Espuma Reactiva', value: 'Amortiguación Running' },
    { match: /f[uú]tbol|football|soccer|taco/i, label: 'Tacos Cónicos', value: 'Grip Firm Ground' },
    { match: /basket|bball|cancha/i, label: 'Soporte Lateral', value: 'Tobillo Reforzado' },
    { match: /skate/i, label: 'Suela Vulcanizada', value: 'Grip Skateboarding' },
    { match: /bota|boot|outdoor|trail/i, label: 'Suela Táctica', value: 'Tracción Todo Terreno' },
    { match: /life|sneaker|zapatilla|casual|urban/i, label: 'Corte Urbano', value: 'Icono Streetwear' }
];

/** Tres fichas para el producto destacado: una técnica (por categoría) y dos con datos reales de inventario. */
export const heroSpecs = (product, sizesInStock = []) => {
    const tech = CATEGORY_TECH.find(t => t.match.test(product?.category || '')) || { label: 'Garantía', value: '100% Original' };
    const sorted = [...sizesInStock].sort((a, b) => parseFloat(a) - parseFloat(b));
    const sizeRange = sorted.length === 0 ? 'Consultar' : sorted.length === 1 ? `Talla ${sorted[0]}` : `${sorted[0]} – ${sorted[sorted.length - 1]}`;
    const colors = Array.isArray(product?.colors) ? product.colors.length : 0;
    return [
        tech,
        { label: 'Tallas en Stock', value: sizeRange },
        { label: colors > 1 ? `${colors} Colorways` : 'Inventario', value: `${product?.stock ?? 0} pares listos` }
    ];
};
