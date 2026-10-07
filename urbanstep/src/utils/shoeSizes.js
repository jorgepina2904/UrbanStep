/**
 * shoeSizes.js — Categorías de tallas y gestión de disponibilidad por talla y color
 * Retail de calzado y moda urbana UrbanStep
 */

export const SHOE_SIZE_CATEGORIES = [
    {
        id: 'caballero',
        name: 'Caballero / Hombre',
        badge: 'HOMBRE',
        description: 'Tallas estándar de hombre (39 a 46)',
        sizes: ['39', '40', '41', '42', '43', '44', '45', '46']
    },
    {
        id: 'dama',
        name: 'Dama / Mujer',
        badge: 'MUJER',
        description: 'Tallas estándar de mujer (35 a 41)',
        sizes: ['35', '36', '37', '38', '39', '40', '41']
    },
    {
        id: 'unisex',
        name: 'Unisex',
        badge: 'UNISEX',
        description: 'Rango amplio para ambos géneros (36 a 44)',
        sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44']
    },
    {
        id: 'ninos',
        name: 'Niños / Infantil',
        badge: 'KIDS',
        description: 'Calzado junior e infantil (28 a 35)',
        sizes: ['28', '29', '30', '31', '32', '33', '34', '35']
    },
    {
        id: 'ropa',
        name: 'Ropa / Textil',
        badge: 'TEXTIL',
        description: 'Prendas, franelas y hoodies (XS a XXL)',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
        id: 'personalizado',
        name: 'Personalizado',
        badge: 'CUSTOM',
        description: 'Tallas libres a medida',
        sizes: ['38', '39', '40', '41', '42']
    }
];

/**
 * Garantiza que cada talla tenga su cantidad numérica de stock asignada
 */
export function ensureSizeStock(sizes = [], totalStock = 0, existing = null) {
    const result = {};
    const safeSizes = Array.isArray(sizes) && sizes.length > 0 ? sizes : ['38', '39', '40', '41', '42', '43'];
    
    if (existing && typeof existing === 'object' && Object.keys(existing).length > 0) {
        safeSizes.forEach(s => {
            result[s] = Math.max(0, parseInt(existing[s] ?? 0) || 0);
        });
        return result;
    }

    // Distribución equitativa inicial
    const base = Math.floor(Math.max(0, totalStock) / safeSizes.length);
    let rem = Math.max(0, totalStock) % safeSizes.length;
    safeSizes.forEach(s => {
        result[s] = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
    });
    return result;
}

/**
 * Suma el stock total sumando cada una de las tallas
 */
export function calculateTotalStock(sizeStock = {}) {
    if (!sizeStock || typeof sizeStock !== 'object') return 0;
    return Object.values(sizeStock).reduce((acc, val) => acc + Math.max(0, parseInt(val) || 0), 0);
}

/**
 * Obtiene la definición de categoría por id
 */
export function getSizeCategoryById(id) {
    return SHOE_SIZE_CATEGORIES.find(c => c.id === id) || SHOE_SIZE_CATEGORIES[0];
}

/**
 * Obtiene las tallas por defecto para una categoría
 */
export function getDefaultSizes(categoryId) {
    const cat = getSizeCategoryById(categoryId);
    return cat ? [...cat.sizes] : ['39', '40', '41', '42', '43', '44'];
}

/**
 * Detecta la categoría de tallas adecuada basada en las tallas activas
 */
export function detectSizeCategory(sizes = []) {
    if (!Array.isArray(sizes) || sizes.length === 0) return 'unisex';
    if (sizes.some(s => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(s))) return 'ropa';
    const numSizes = sizes.map(Number).filter(n => !isNaN(n));
    if (numSizes.length === 0) return 'personalizado';
    const min = Math.min(...numSizes);
    const max = Math.max(...numSizes);
    if (min <= 35 && max <= 35) return 'ninos';
    if (min >= 39 && max >= 44) return 'caballero';
    if (min <= 36 && max <= 41) return 'dama';
    return 'unisex';
}
