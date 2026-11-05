/**
 * validators.js — Reglas únicas de validación (Venezuela) compartidas por formularios y servicios.
 * Cada validador devuelve el mensaje de error en español o null si el valor es válido, para que
 * la misma regla se aplique en la interfaz y se vuelva a comprobar antes de guardar.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;
// Móviles (0412, 0414, 0416, 0422, 0424, 0426) y fijos (02xx)
const PHONE_RE = /^0(41[246]|42[246]|2\d{2})\d{7}$/;

export const DOC_TYPES = ['V', 'E', 'J', 'G', 'P'];

export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');
export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

/** Teléfono en formato local de 11 dígitos (acepta +58 y separadores). */
export const normalizePhoneVE = (value) => {
    const d = onlyDigits(value);
    return d.startsWith('58') && d.length === 12 ? `0${d.slice(2)}` : d;
};

/**
 * Documento normalizado como "V-12345678" (acepta "12.345.678", "V-12345678", etc.).
 * El pasaporte (P) conserva letras; el resto de tipos solo dígitos.
 */
export const normalizeDocument = (type, number) => {
    const raw = String(number ?? '').trim().toUpperCase();
    const prefix = raw.match(/^([VEJGP])\s*-\s*/);
    const t = (prefix ? prefix[1] : String(type || 'V').toUpperCase()).trim();
    const body = prefix ? raw.slice(prefix[0].length) : raw;
    return `${t}-${t === 'P' ? body.replace(/[^A-Z0-9]/g, '') : onlyDigits(body)}`;
};

export const validateEmail = (value) => {
    const s = normalizeEmail(value);
    if (!s) return 'El correo electrónico es obligatorio';
    if (!EMAIL_RE.test(s)) return 'El correo electrónico no tiene un formato válido';
    return null;
};

export const validatePhoneVE = (value, { required = true } = {}) => {
    const d = normalizePhoneVE(value);
    if (!d) return required ? 'El teléfono es obligatorio' : null;
    if (!PHONE_RE.test(d)) return 'Teléfono inválido: usa el formato 0414-1234567 o 0251-1234567';
    return null;
};

export const validatePersonName = (value) => {
    const s = String(value ?? '').trim().replace(/\s+/g, ' ');
    if (!s) return 'El nombre completo es obligatorio';
    if (!NAME_RE.test(s)) return 'El nombre solo puede contener letras';
    if (s.split(' ').length < 2 || s.length < 5) return 'Escribe nombre y apellido';
    return null;
};

/** Cédula (V/E: 6 a 9 dígitos), RIF (J/G: 8 a 10 dígitos) o pasaporte (P: 5 a 15 letras o números). */
export const validateDocument = (type, number) => {
    const [t, body] = normalizeDocument(type, number).split('-');
    if (!DOC_TYPES.includes(t)) return 'Tipo de documento inválido';
    if (!body) return 'La cédula o RIF es obligatorio';
    if (/^0+$/.test(body)) return 'El número de documento no es válido';
    if ((t === 'V' || t === 'E') && !/^\d{6,9}$/.test(body)) return 'La cédula debe tener entre 6 y 9 dígitos';
    if ((t === 'J' || t === 'G') && !/^\d{8,10}$/.test(body)) return 'El RIF debe tener entre 8 y 10 dígitos';
    if (t === 'P' && !/^[A-Z0-9]{5,15}$/.test(body)) return 'El pasaporte debe tener entre 5 y 15 letras o números';
    return null;
};

/** Valores de relleno que el sistema usa cuando un dato opcional no se conoce. */
export const isPlaceholder = (value) => ['', '-', 'n/a', 'por confirmar'].includes(String(value ?? '').trim().toLowerCase());

/** Contraseñas nuevas: mínimo 8 caracteres combinando letras y números. */
export const validatePassword = (value, { min = 8 } = {}) => {
    const s = String(value ?? '');
    if (s.trim().length < min) return `La contraseña debe tener al menos ${min} caracteres`;
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(s) || !/\d/.test(s)) return 'La contraseña debe combinar letras y números';
    return null;
};

export const validateAddress = (value, { min = 8 } = {}) => {
    const s = String(value ?? '').trim();
    if (!s) return 'La dirección es obligatoria';
    if (s.length < min) return 'Escribe la dirección completa (urbanización, calle y referencia)';
    return null;
};

/** Monto en USD: número finito, no negativo y con un máximo de 2 decimales. */
export const validateAmount = (value, { min = 0, label = 'El monto' } = {}) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return `${label} no es un número válido`;
    if (n < min) return `${label} debe ser mayor o igual a ${min}`;
    if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return `${label} admite máximo 2 decimales`;
    return null;
};

/** Ejecuta un mapa { campo: () => error|null } y devuelve solo los errores encontrados. */
export const collectErrors = (rules) => Object.fromEntries(
    Object.entries(rules).map(([field, rule]) => [field, rule()]).filter(([, err]) => Boolean(err))
);
