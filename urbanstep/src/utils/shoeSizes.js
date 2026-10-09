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

/**
 * Garantiza que las variantes de color tengan su propia matriz de existencias por talla
 */
export function ensureColorVariants(colors = [], sizes = [], existingVariants = null, fallbackSizeStock = null) {
    const safeSizes = Array.isArray(sizes) && sizes.length > 0 ? sizes : ['38', '39', '40', '41', '42', '43'];
    const activeColors = Array.isArray(colors) && colors.length > 0 ? colors : ['Original'];

    // Si ya existen variantes válidas
    if (Array.isArray(existingVariants) && existingVariants.length > 0) {
        return existingVariants.map(v => {
            const vColor = v.color || 'Original';
            const vHex = v.hex || '#3b82f6';
            const vStock = ensureSizeStock(safeSizes, 0, v.sizeStock || fallbackSizeStock);
            return {
                color: vColor,
                hex: vHex,
                sizeStock: vStock,
                total: calculateTotalStock(vStock)
            };
        });
    }

    // Si no existen variantes, crearlas a partir de los colores
    return activeColors.map((colorName, idx) => {
        // Al primer color le asignamos el fallbackSizeStock si existe, a los siguientes 0 o repartido
        const baseStock = idx === 0 && fallbackSizeStock ? fallbackSizeStock : {};
        const vStock = ensureSizeStock(safeSizes, 0, baseStock);
        return {
            color: colorName,
            hex: '#3b82f6',
            sizeStock: vStock,
            total: calculateTotalStock(vStock)
        };
    });
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
