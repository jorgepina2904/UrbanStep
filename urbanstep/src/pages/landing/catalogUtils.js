import { productService } from '../../services/productService';

export const DEFAULT_SIZES = ['39', '40', '41', '42', '43'];

export const cardColors = (product) => (
    Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : (product.color ? [product.color] : ['Original'])
);

/** Talla activa: la elegida por el cliente o, por defecto, la primera con existencia en el color activo. */
export const resolveActiveSize = (product, color, chosen) => {
    if (chosen) return chosen;
    const sizes = product.sizes || DEFAULT_SIZES;
    return sizes.find(sz => productService.getAvailableStock(product, sz, color) > 0) || sizes[0] || '41';
};
