/**
 * venezuelaData.js — Datos de referencia para el mercado venezolano
 * Bancos SUDEBAN, Estados, Municipios, Prefijos telefónicos y Agencias de Envío.
 */

export const VENEZUELA_BANKS = [
    { code: '0102', name: 'Banco de Venezuela (BDV)', short: 'BDV' },
    { code: '0134', name: 'Banesco Banco Universal', short: 'Banesco' },
    { code: '0105', name: 'Banco Mercantil', short: 'Mercantil' },
    { code: '0108', name: 'BBVA Banco Provincial', short: 'Provincial' },
    { code: '0172', name: 'Bancamiga Banco Universal', short: 'Bancamiga' },
    { code: '0116', name: 'Banco Nacional de Crédito (BNC)', short: 'BNC' },
    { code: '0114', name: 'Bancaribe', short: 'Bancaribe' },
    { code: '0171', name: 'Banco Activo', short: 'Activo' },
    { code: '0169', name: 'Mi Banco', short: 'Mi Banco' },
    { code: '0174', name: 'Banplus', short: 'Banplus' },
    { code: '0175', name: 'Banco Bicentenario', short: 'Bicentenario' },
    { code: '0177', name: 'Banco de la Fuerza Armada (BANFANB)', short: 'BANFANB' },
    { code: '0191', name: 'Banco Nacional de Crédito (BNC Corp)', short: 'BNC' },
    { code: '0128', name: 'Banco Caroní', short: 'Caroní' },
    { code: '0138', name: 'Banco Plaza', short: 'Banco Plaza' },
    { code: '0151', name: 'BFC Banco Fondo Común', short: 'BFC' },
    { code: '0156', name: '100% Banco', short: '100% Banco' },
    { code: '0157', name: 'Banco DelSur', short: 'DelSur' },
    { code: '0163', name: 'Banco del Tesoro', short: 'Tesoro' },
    { code: '0168', name: 'Bancrecer', short: 'Bancrecer' },
];

export const PHONE_PREFIXES = [
    { prefix: '0412', operator: 'Digitel' },
    { prefix: '0414', operator: 'Movistar' },
    { prefix: '0424', operator: 'Movistar' },
    { prefix: '0416', operator: 'Movilnet' },
    { prefix: '0426', operator: 'Movilnet' },
    { prefix: '0212', operator: 'Caracas Fijo' },
];

export const DOC_TYPES = [
    { value: 'V', label: 'V - Venezolano' },
    { value: 'E', label: 'E - Extranjero' },
    { value: 'J', label: 'J - Jurídico / Empresa' },
    { value: 'G', label: 'G - Gubernamental' },
    { value: 'P', label: 'P - Pasaporte' },
];

export const VENEZUELA_STATES = [
    {
        name: 'Distrito Capital',
        cities: ['Caracas (Libertador)', 'Caracas (Chacao)', 'Caracas (Baruta)', 'Caracas (Sucre)', 'Caracas (El Hatillo)']
    },
    {
        name: 'Miranda',
        cities: ['Los Teques', 'Guarenas', 'Guatire', 'San Antonio de los Altos', 'Charallave', 'Cúa', 'Higuerote']
    },
    {
        name: 'Carabobo',
        cities: ['Valencia', 'Naguanagua', 'San Diego', 'Puerto Cabello', 'Guacara']
    },
    {
        name: 'Zulia',
        cities: ['Maracaibo', 'San Francisco', 'Cabimas', 'Ciudad Ojeda']
    },
    {
        name: 'Aragua',
        cities: ['Maracay', 'Turmero', 'La Victoria', 'Cagua', 'El Limón']
    },
    {
        name: 'Lara',
        cities: ['Barquisimeto', 'Cabudare', 'Carora', 'El Tocuyo']
    },
    {
        name: 'Anzoátegui',
        cities: ['Barcelona', 'Puerto La Cruz', 'Lechería', 'El Tigre', 'Anaco']
    },
    {
        name: 'Bolívar',
        cities: ['Ciudad Guayana (Puerto Ordaz)', 'Ciudad Bolívar', 'Upata']
    },
    {
        name: 'Táchira',
        cities: ['San Cristóbal', 'Táriba', 'San Antonio del Táchira', 'Rubio']
    },
    {
        name: 'Mérida',
        cities: ['Mérida', 'El Vigía', 'Ejido', 'Tovar']
    },
    {
        name: 'Nueva Esparta (Margarita)',
        cities: ['Porlamar', 'Pampatar', 'La Asunción', 'Juan Griego']
    },
    {
        name: 'Falcón',
        cities: ['Punto Fijo', 'Coro', 'Chichiriviche', 'Tucacas']
    },
    {
        name: 'Monagas',
        cities: ['Maturín', 'Punta de Mata', 'Caripe']
    },
    {
        name: 'Portuguesa',
        cities: ['Acarigua', 'Araure', 'Guanare']
    },
    {
        name: 'Yaracuy',
        cities: ['San Felipe', 'Yaritagua', 'Chivacoa']
    }
];

export const SHIPPING_CARRIERS = [
    { id: 'retiro_tienda', name: 'Retiro en Tienda', icon: 'Store', estimatedTime: 'Inmediato', baseCost: 0 },
    { id: 'delivery_local', name: 'Delivery Motorizado Express', icon: 'Bike', estimatedTime: '1 - 3 horas', baseCost: 3.50 },
    { id: 'mrw', name: 'MRW Nacional', icon: 'Truck', estimatedTime: '24 - 48 horas', baseCost: 5.00 },
    { id: 'zoom', name: 'ZOOM Envíos', icon: 'Truck', estimatedTime: '24 - 48 horas', baseCost: 6.00 },
    { id: 'tealca', name: 'Tealca Express', icon: 'Truck', estimatedTime: '24 - 48 horas', baseCost: 5.50 },
    { id: 'domesa', name: 'Domesa', icon: 'Truck', estimatedTime: '48 - 72 horas', baseCost: 5.00 },
];
