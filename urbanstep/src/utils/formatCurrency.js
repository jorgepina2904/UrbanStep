/**
 * formatCurrency.js — Formateador de moneda con soporte USD y Bolívares (VES)
 */

export const formatCurrency = (amount, currency = 'USD') => {
    const num = Number(amount) || 0;
    if (currency === 'VES' || currency === 'Bs' || currency === 'Bs.') {
        return `Bs. ${new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num)}`;
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(num);
};

export default formatCurrency;