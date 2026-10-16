/**
 * Guía de tallas EU → US / CM (largo del pie). Valores referenciales de la industria:
 * pueden variar ±0.5 según la marca y el horma del modelo.
 */
const MEN = {
    '39': { us: '6.5', cm: 24.5 }, '40': { us: '7', cm: 25.0 }, '41': { us: '8', cm: 26.0 }, '42': { us: '8.5', cm: 26.5 },
    '43': { us: '9.5', cm: 27.5 }, '44': { us: '10', cm: 28.0 }, '45': { us: '11', cm: 29.0 }, '46': { us: '12', cm: 29.5 }
};
const WOMEN = {
    '35': { us: '5', cm: 22.5 }, '36': { us: '6', cm: 23.0 }, '37': { us: '6.5', cm: 23.5 }, '38': { us: '7.5', cm: 24.0 },
    '39': { us: '8', cm: 25.0 }, '40': { us: '9', cm: 25.5 }, '41': { us: '9.5', cm: 26.0 }
};
const KIDS = {
    '28': { us: '11', cm: 17.0 }, '29': { us: '12', cm: 17.5 }, '30': { us: '12.5', cm: 18.5 }, '31': { us: '13', cm: 19.0 },
    '32': { us: '1', cm: 20.0 }, '33': { us: '2', cm: 20.5 }, '34': { us: '2.5', cm: 21.5 }, '35': { us: '3.5', cm: 22.0 }
};

const TABLES = { caballero: MEN, dama: WOMEN, ninos: KIDS, unisex: MEN, personalizado: MEN };

/** Devuelve [{ eu, us, cm }] para las tallas del producto (las que no están en la tabla se omiten). */
export const getSizeRows = (sizes = [], categoryId = 'unisex') => {
    const table = TABLES[categoryId] || MEN;
    return sizes
        .map(String)
        .filter(s => table[s])
        .map(s => ({ eu: s, ...table[s] }));
};

/** Talla recomendada para un largo de pie en cm (con 0.3 cm de holgura). */
export const recommendSize = (footCm, rows = []) => {
    const foot = Number(footCm);
    if (!(foot > 0) || rows.length === 0) return null;
    const fit = rows.find(r => r.cm >= foot + 0.3);
    return (fit || rows[rows.length - 1]).eu;
};
