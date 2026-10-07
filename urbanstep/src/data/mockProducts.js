import { generateId } from '../utils/generateId';
import { generateSKU } from '../utils/generateSKU';

const categories = ['Zapatillas', 'Ropa', 'Accesorios'];
const brands = ['Nike', 'Adidas', 'Puma', 'UrbanStep', 'Vans', 'New Balance'];
const colors = ['Negro', 'Blanco', 'Rojo', 'Azul', 'Gris'];

const SNEAKER_IMAGES = [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', // Nike Air Red
    'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&auto=format&fit=crop&q=80', // Adidas Sneaker
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=80', // Vans Old Skool
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80', // Puma White/Gold
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80', // New Balance Lifestyle
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80', // Air Force style
    'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=600&auto=format&fit=crop&q=80', // Running Sport
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80', // Streetwear classic
];

const APPAREL_IMAGES = [
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=600&auto=format&fit=crop&q=80',
];

const ACCESSORY_IMAGES = [
    'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622445268045-81676f45a7d3?w=600&auto=format&fit=crop&q=80',
];

export const mockProducts = Array.from({ length: 24 }).map((_, index) => {
    const category = categories[index % categories.length];
    const brand = brands[index % brands.length];
    const cost = Math.floor(Math.random() * 40) + 30;
    const price = cost + Math.floor(Math.random() * 60) + 30;
    const stock = Math.floor(Math.random() * 35) + (index % 5 === 0 ? 0 : 2);
    const minStock = 5;
    const itemSizes = category === 'Zapatillas' ? ['38', '39', '40', '41', '42', '43'] : ['S', 'M', 'L', 'XL'];

    let imageUrl = '';
    if (category === 'Zapatillas') {
        imageUrl = SNEAKER_IMAGES[index % SNEAKER_IMAGES.length];
    } else if (category === 'Ropa') {
        imageUrl = APPAREL_IMAGES[index % APPAREL_IMAGES.length];
    } else {
        imageUrl = ACCESSORY_IMAGES[index % ACCESSORY_IMAGES.length];
    }

    return {
        id: `PRD-${1000 + index}`,
        sku: generateSKU(category, brand),
        name: `${brand} ${category === 'Zapatillas' ? 'Sneaker Pro' : category === 'Ropa' ? 'Urban Hoodie' : 'Cap Classic'} #${index + 1}`,
        description: `Excelente calzado ${brand} de alta durabilidad, diseño ergonómico y estilo urbano vanguardista.`,
        category,
        brand,
        cost,
        price,
        salePrice: price,
        purchasePrice: cost,
        stock,
        minStock,
        sizes: itemSizes,
        color: colors[index % colors.length],
        imageUrl,
        image: imageUrl,
        status: stock > minStock ? 'in_stock' : stock > 0 ? 'low_stock' : 'out_of_stock',
        variants: itemSizes.map(size => ({ size, stock: Math.floor(stock / itemSizes.length) }))
    };
});

export default mockProducts;