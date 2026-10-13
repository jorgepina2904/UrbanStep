/**
 * shoeSizes.js — Categorías de tallas y gestión de disponibilidad por talla y color
 * Retail de calzado y moda urbana UrbanStep
 */

export const SHOE_COLORS = [
    { name: 'Negro', hex: '#1a1a1a', textColor: 'white' },
    { name: 'Blanco', hex: '#ffffff', textColor: 'black', border: true },
    { name: 'Gris', hex: '#64748b', textColor: 'white' },
    { name: 'Gris Claro', hex: '#cbd5e1', textColor: 'black' },
    { name: 'Rojo', hex: '#ef4444', textColor: 'white' },
    { name: 'Rojo Oscuro', hex: '#991b1b', textColor: 'white' },
    { name: 'Borgoña', hex: '#7f1d1d', textColor: 'white' },
    { name: 'Azul', hex: '#2563eb', textColor: 'white' },
    { name: 'Azul Marino', hex: '#1e3a5f', textColor: 'white' },
    { name: 'Azul Cielo', hex: '#38bdf8', textColor: 'black' },
    { name: 'Verde', hex: '#16a34a', textColor: 'white' },
    { name: 'Verde Oliva', hex: '#4d5d2a', textColor: 'white' },
    { name: 'Verde Menta', hex: '#a7f3d0', textColor: 'black' },
    { name: 'Amarillo', hex: '#eab308', textColor: 'black' },
    { name: 'Naranja', hex: '#f97316', textColor: 'white' },
    { name: 'Rosa', hex: '#ec4899', textColor: 'white' },
    { name: 'Rosa Pálido', hex: '#fbcfe8', textColor: 'black' },
    { name: 'Púrpura', hex: '#9333ea', textColor: 'white' },
    { name: 'Lavanda', hex: '#c4b5fd', textColor: 'black' },
    { name: 'Marrón', hex: '#78350f', textColor: 'white' },
    { name: 'Camel', hex: '#d4a574', textColor: 'black' },
    { name: 'Beige', hex: '#f5f0e1', textColor: 'black', border: true },
    { name: 'Dorado', hex: '#ca8a04', textColor: 'white' },
    { name: 'Plateado', hex: '#a8a8a8', textColor: 'black' },
    { name: 'Multicolor', hex: 'linear-gradient(135deg, #f43f5e, #3b82f6, #22c55e, #eab308)', textColor: 'white', isGradient: true },
];

export function getColorHex(colorName, fallback = '#3b82f6') {
    if (!colorName) return fallback;
    const lower = String(colorName).trim().toLowerCase();
    const found = SHOE_COLORS.find(c => c.name.toLowerCase() === lower);
    if (found) return found.hex;
    const aliases = {
        'white': '#ffffff',
        'black': '#1a1a1a',
        'red': '#ef4444',
        'blue': '#2563eb',
        'green': '#16a34a',
        'yellow': '#eab308',
        'orange': '#f97316',
        'pink': '#ec4899',
        'purple': '#9333ea',
        'brown': '#78350f',
        'grey': '#64748b',
        'gray': '#64748b',
        'cyan': '#06b6d4',
        'violet': '#8b5cf6',
        'original': '#3b82f6'
    };
    if (aliases[lower]) return aliases[lower];
    if (colorName.startsWith('#') || colorName.startsWith('rgb')) return colorName;
    return fallback;
}

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

/**
 * Garantiza que las variantes de color tengan su propia matriz de existencias por talla
 */
export function ensureColorVariants(colors = [], sizes = [], existingVariants = null, fallbackSizeStock = null) {
    const safeSizes = Array.isArray(sizes) && sizes.length > 0 ? sizes : ['38', '39', '40', '41', '42', '43'];
    const activeColors = Array.isArray(colors) && colors.length > 0 ? colors : ['Original'];

    // Si ya existen variantes válidas
    if (Array.isArray(existingVariants) && existingVariants.length > 0) {
        return activeColors.map(colorName => {
            const found = existingVariants.find(v => (v.color || '').toLowerCase() === colorName.toLowerCase());
            const vHex = found?.hex || getColorHex(colorName);
            const vStock = ensureSizeStock(safeSizes, 0, found?.sizeStock || fallbackSizeStock);
            const vImage = found?.imageUrl || found?.image || '';
            return {
                color: colorName,
                hex: vHex,
                sizeStock: vStock,
                total: calculateTotalStock(vStock),
                imageUrl: vImage
            };
        });
    }

    // Si no existen variantes, crearlas a partir de los colores
    return activeColors.map((colorName, idx) => {
        const baseStock = idx === 0 && fallbackSizeStock ? fallbackSizeStock : {};
        const vStock = ensureSizeStock(safeSizes, 0, baseStock);
        return {
            color: colorName,
            hex: getColorHex(colorName),
            sizeStock: vStock,
            total: calculateTotalStock(vStock),
            imageUrl: ''
        };
    });
}

/**
 * Obtiene la fotografía vinculada a un color específico del calzado
 * Si el color no tiene fotografía específica, retorna la foto principal del producto.
 */
export function getColorVariantImage(product, colorName) {
    if (!product) return '';
    const fallback = product.imageUrl || product.imagen_url || product.image || '';
    if (!colorName || !Array.isArray(product.colorVariants) || product.colorVariants.length === 0) {
        return fallback;
    }
    const found = product.colorVariants.find(v => (v.color || '').toLowerCase() === String(colorName).trim().toLowerCase());
    if (found && (found.imageUrl || found.image)) {
        return found.imageUrl || found.image;
    }
    return fallback;
}

/**
 * Calcula la suma total de existencias en todas las variantes de color
 */
export function calculateVariantsTotalStock(colorVariants = []) {
    if (!Array.isArray(colorVariants) || colorVariants.length === 0) return 0;
    return colorVariants.reduce((sum, v) => sum + calculateTotalStock(v.sizeStock || {}), 0);
}

/**
 * Obtiene el desglose de existencias por talla para un color específico de un producto
 */
export function getColorVariantSizeStock(product, colorName) {
    if (!product) return {};
    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
        const found = product.colorVariants.find(v => (v.color || '').toLowerCase() === (colorName || '').toLowerCase());
        if (found && found.sizeStock) return found.sizeStock;
        // Si no coincide exactamente, retornar la primera variante
        if (product.colorVariants[0]?.sizeStock) return product.colorVariants[0].sizeStock;
    }
    return product.sizeStock || {};
}

/**
 * Calcula con precisión milimétrica la cantidad máxima disponible de un producto
 * para una talla y color específico, garantizando que nunca se exceda el inventario real.
 */
export function getAvailableStockForItem(product, size = 'N/A', color = null) {
    if (!product || product.disabled || product.status === 'out_of_stock' || (product.stock !== undefined && product.stock <= 0)) return 0;

    // 1. Si se especificó una talla válida (distinta de 'N/A' o vacío)
    if (size && size !== 'N/A') {
        const s = String(size);

        // A. Buscar en variantes de color si existen
        if (color && Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
            const variant = product.colorVariants.find(v => (v.color || '').toLowerCase() === String(color).toLowerCase()) 
                         || product.colorVariants[0];
            if (variant?.sizeStock && variant.sizeStock[s] !== undefined) {
                return Math.max(0, parseInt(variant.sizeStock[s]) || 0);
            }
        }

        // B. Buscar en sizeStock general del producto
        if (product.sizeStock && product.sizeStock[s] !== undefined) {
            return Math.max(0, parseInt(product.sizeStock[s]) || 0);
        }
    }

    // 2. Si se especificó un color pero no talla
    if (color && Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
        const variant = product.colorVariants.find(v => (v.color || '').toLowerCase() === String(color).toLowerCase());
        if (variant) {
            return Math.max(0, parseInt(variant.total) || calculateTotalStock(variant.sizeStock));
        }
    }

    // 3. Fallback al stock general del producto
    return Math.max(0, parseInt(product.stock) || 0);
}
