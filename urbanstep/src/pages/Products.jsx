import { useState, useEffect, useRef } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { productService } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import { Palette, Check, ChevronDown, Image as ImageIcon, Upload, Link as LinkIcon, X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_IMAGES = [
    { name: 'Nike Air Max Red', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80' },
    { name: 'Adidas Sneaker White', url: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&auto=format&fit=crop&q=80' },
    { name: 'Vans Old Skool Black', url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=80' },
    { name: 'Puma White Gold', url: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80' },
    { name: 'New Balance 550 Style', url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80' },
    { name: 'Urban Chunky Sneaker', url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80' },
];

/**
 * Paleta de colores predefinida para zapatos
 */
const SHOE_COLORS = [
    { name: 'Negro', hex: '#1a1a1a', textColor: 'white' },
    { name: 'Blanco', hex: '#f5f5f5', textColor: 'black' },
    { name: 'Gris', hex: '#6b7280', textColor: 'white' },
    { name: 'Gris Claro', hex: '#d1d5db', textColor: 'black' },
    { name: 'Rojo', hex: '#dc2626', textColor: 'white' },
    { name: 'Rojo Oscuro', hex: '#991b1b', textColor: 'white' },
    { name: 'Borgoña', hex: '#7f1d1d', textColor: 'white' },
    { name: 'Azul', hex: '#2563eb', textColor: 'white' },
    { name: 'Azul Marino', hex: '#1e3a5f', textColor: 'white' },
    { name: 'Azul Cielo', hex: '#7dd3fc', textColor: 'black' },
    { name: 'Verde', hex: '#16a34a', textColor: 'white' },
    { name: 'Verde Oliva', hex: '#4d5d2a', textColor: 'white' },
    { name: 'Verde Menta', hex: '#a7f3d0', textColor: 'black' },
    { name: 'Amarillo', hex: '#eab308', textColor: 'black' },
    { name: 'Naranja', hex: '#ea580c', textColor: 'white' },
    { name: 'Rosa', hex: '#ec4899', textColor: 'white' },
    { name: 'Rosa Pálido', hex: '#fbcfe8', textColor: 'black' },
    { name: 'Púrpura', hex: '#9333ea', textColor: 'white' },
    { name: 'Lavanda', hex: '#c4b5fd', textColor: 'black' },
    { name: 'Marrón', hex: '#78350f', textColor: 'white' },
    { name: 'Camel', hex: '#d4a574', textColor: 'black' },
    { name: 'Beige', hex: '#f5f0e1', textColor: 'black' },
    { name: 'Dorado', hex: '#ca8a04', textColor: 'white' },
    { name: 'Plateado', hex: '#a8a8a8', textColor: 'black' },
    { name: 'Multicolor', hex: 'linear-gradient(135deg, #f43f5e, #3b82f6, #22c55e, #eab308)', textColor: 'white', isGradient: true },
];

/**
 * Color Palette Picker component
 */
function ColorPalette({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedColor = SHOE_COLORS.find(c => c.name === value) || null;

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-500" />
                Color del Calzado
            </label>

            {/* Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left hover:border-gray-300 dark:hover:border-gray-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                {selectedColor ? (
                    <>
                        <span
                            className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 shrink-0 shadow-sm"
                            style={{ background: selectedColor.hex }}
                        />
                        <span className="text-sm text-gray-900 dark:text-white font-medium flex-1">{selectedColor.name}</span>
                    </>
                ) : (
                    <>
                        <span className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 shrink-0" />
                        <span className="text-sm text-gray-400 flex-1">Seleccionar color...</span>
                    </>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Palette */}
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 font-semibold uppercase tracking-wider">Paleta de colores</p>
                    <div className="grid grid-cols-5 gap-2">
                        {SHOE_COLORS.map((color) => {
                            const isSelected = value === color.name;
                            return (
                                <button
                                    key={color.name}
                                    type="button"
                                    title={color.name}
                                    onClick={() => {
                                        onChange(color.name);
                                        setIsOpen(false);
                                    }}
                                    className={`relative group flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
                                        isSelected
                                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                >
                                    <span
                                        className={`w-8 h-8 rounded-full border-2 shadow-sm transition-transform group-hover:scale-110 ${
                                            isSelected ? 'border-blue-500' : 'border-gray-200 dark:border-gray-600'
                                        }`}
                                        style={{ background: color.hex }}
                                    >
                                        {isSelected && (
                                            <span className="w-full h-full flex items-center justify-center">
                                                <Check className="w-4 h-4" style={{ color: color.textColor }} />
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight font-medium truncate w-full">
                                        {color.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom color input */}
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="O escribe un color personalizado..."
                                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Products management page with CRUD operations.
 */
export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [imageTab, setImageTab] = useState('local'); // 'local' | 'url' | 'presets'
    const [urlInput, setUrlInput] = useState('');
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '', brand: '', category: '', price: '', cost: '', stock: '', minStock: '', color: '', description: '', imageUrl: '',
    });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        const data = await productService.getAll();
        setProducts(data);
        setLoading(false);
    };

    const categories = ['all', ...new Set(products.map(p => p.category))];

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.brand.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const openCreateModal = () => {
        setEditingProduct(null);
        setForm({ name: '', brand: '', category: '', price: '', cost: '', stock: '', minStock: '', color: '', description: '', imageUrl: '' });
        setUrlInput('');
        setImageTab('local');
        setShowModal(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        const currentImg = product.imageUrl || product.image || '';
        setForm({
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: String(product.price),
            cost: String(product.cost),
            stock: String(product.stock),
            minStock: String(product.minStock),
            color: product.color,
            description: product.description,
            imageUrl: currentImg,
        });
        setUrlInput(currentImg.startsWith('http') ? currentImg : '');
        setImageTab(currentImg.startsWith('data:') ? 'local' : currentImg.startsWith('http') ? 'url' : 'local');
        setShowModal(true);
    };

    const handleLocalFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no debe superar los 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Optimizar tamaño para rendimiento de almacenamiento
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                setForm(prev => ({ ...prev, imageUrl: dataUrl }));
                toast.success('¡Imagen local cargada con éxito!');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleApplyUrl = () => {
        if (!urlInput.trim()) {
            toast.error('Ingresa una URL válida');
            return;
        }
        setForm(prev => ({ ...prev, imageUrl: urlInput.trim() }));
        toast.success('URL de imagen asignada');
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('El nombre del producto es obligatorio');
            return;
        }

        const data = {
            ...form,
            price: parseFloat(form.price) || 0,
            cost: parseFloat(form.cost) || 0,
            stock: parseInt(form.stock) || 0,
            minStock: parseInt(form.minStock) || 0,
            imageUrl: form.imageUrl || '',
            image: form.imageUrl || '',
            sizes: editingProduct?.sizes || ['38', '39', '40', '41', '42', '43'],
        };

        if (editingProduct) {
            await productService.update(editingProduct.id, data);
            toast.success('Producto actualizado');
        } else {
            await productService.create(data);
            toast.success('Producto creado');
        }

        setShowModal(false);
        await loadProducts();
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar este producto?')) {
            await productService.delete(id);
            toast.success('Producto eliminado');
            await loadProducts();
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            in_stock: { variant: 'success', label: 'En Stock' },
            active: { variant: 'success', label: 'En Stock' },
            low_stock: { variant: 'warning', label: 'Stock Bajo' },
            out_of_stock: { variant: 'danger', label: 'Agotado' },
        };
        const { variant, label } = map[status] || map.in_stock;
        return <Badge variant={variant}>{label}</Badge>;
    };

    const getColorSwatch = (colorName) => {
        const color = SHOE_COLORS.find(c => c.name === colorName);
        if (color) {
            return (
                <span
                    className="inline-block w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm"
                    style={{ background: color.hex }}
                    title={color.name}
                />
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Productos</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{products.length} productos registrados</p>
                </div>
                <Button variant="primary" onClick={openCreateModal}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Producto
                </Button>
            </div>

            {/* Filters */}
            <Card padding={false} className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar producto, marca, SKU..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                    categoryFilter === cat
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                {cat === 'all' ? 'Todos' : cat}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(product => {
                    const imgSrc = product.imageUrl || product.image;
                    return (
                        <Card key={product.id} hover className="flex flex-col min-w-0 group overflow-hidden">
                            {/* Product image container */}
                            <div className="w-full h-48 shrink-0 rounded-xl bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-800/90 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center mb-3 relative overflow-hidden border border-gray-100 dark:border-gray-800">
                                {imgSrc ? (
                                    <img
                                        src={imgSrc}
                                        alt={product.name}
                                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const fallback = e.target.parentElement.querySelector('.fallback-shoe-icon');
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div
                                    className={`fallback-shoe-icon w-full h-full items-center justify-center ${imgSrc ? 'hidden' : 'flex'}`}
                                >
                                    <span className="text-5xl drop-shadow-sm select-none">👟</span>
                                </div>
                                
                                {/* Color indicator badge */}
                                {product.color && (
                                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/80 dark:border-gray-700 shadow-sm">
                                        {getColorSwatch(product.color)}
                                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200">{product.color}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={product.name}>{product.name}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{product.brand}</p>
                                    </div>
                                    {getStatusBadge(product.status)}
                                </div>

                                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{product.sku}</p>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(product.price)}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Stock: {product.stock} un.</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openEditModal(product)}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-blue-600"
                                            title="Editar producto"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-500 hover:text-red-600"
                                            title="Eliminar producto"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-gray-500 dark:text-gray-400">No se encontraron productos</p>
                </div>
            )}

            {/* Create/Edit Modal with Image Import */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProduct ? 'Editar Producto / Calzado' : 'Nuevo Producto / Calzado'} size="lg">
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                    {/* Basic info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { key: 'name', label: 'Nombre del Modelo', type: 'text', placeholder: 'Ej: Nike Air Max 90' },
                            { key: 'brand', label: 'Marca', type: 'text', placeholder: 'Ej: Nike, Adidas, Puma...' },
                            { key: 'category', label: 'Categoría', type: 'text', placeholder: 'Ej: Zapatillas, Casual, Running...' },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                                <input
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                />
                            </div>
                        ))}

                        {/* Color Palette Picker */}
                        <div>
                            <ColorPalette
                                value={form.color}
                                onChange={(color) => setForm(prev => ({ ...prev, color }))}
                            />
                        </div>
                    </div>

                    {/* Image Import Section (Local File or URL) */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                Imagen del Calzado (Local o URL)
                            </label>

                            {/* Image Mode Tabs */}
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setImageTab('local')}
                                    className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                                        imageTab === 'local'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Archivo Local
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageTab('url')}
                                    className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                                        imageTab === 'url'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    Enlace URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageTab('presets')}
                                    className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                                        imageTab === 'presets'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    Modelos Rápidos
                                </button>
                            </div>
                        </div>

                        {/* Local File Tab */}
                        {imageTab === 'local' && (
                            <div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleLocalFileUpload}
                                    className="hidden"
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-5 text-center cursor-pointer bg-white dark:bg-gray-900 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                        Haz clic para seleccionar o arrastra una imagen desde tu computadora
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Formatos soportados: JPG, PNG, WebP (máx. 5MB)
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* URL Tab */}
                        {imageTab === 'url' && (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={e => setUrlInput(e.target.value)}
                                        placeholder="https://ejemplo.com/calzado.jpg"
                                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleApplyUrl}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                                >
                                    Cargar URL
                                </button>
                            </div>
                        )}

                        {/* Presets Tab */}
                        {imageTab === 'presets' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {PRESET_IMAGES.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => {
                                            setForm(prev => ({ ...prev, imageUrl: preset.url }));
                                            toast.success(`Modelo ${preset.name} seleccionado`);
                                        }}
                                        className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all ${
                                            form.imageUrl === preset.url
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300'
                                        }`}
                                    >
                                        <img src={preset.url} alt={preset.name} className="w-10 h-10 object-cover rounded-lg" />
                                        <span className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate">{preset.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Image Preview Box */}
                        {form.imageUrl && (
                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                                <img
                                    src={form.imageUrl}
                                    alt="Vista previa"
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Vista previa del calzado</p>
                                    <p className="text-[10px] text-gray-400 truncate">
                                        {form.imageUrl.startsWith('data:') ? 'Imagen local cargada (Base64)' : form.imageUrl}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForm(prev => ({ ...prev, imageUrl: '' }));
                                        setUrlInput('');
                                        toast('Imagen removida');
                                    }}
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    title="Quitar imagen"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Prices and Stock */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { key: 'price', label: 'Precio de Venta (USD)', type: 'number', placeholder: '0.00' },
                            { key: 'cost', label: 'Costo de Adquisición (USD)', type: 'number', placeholder: '0.00' },
                            { key: 'stock', label: 'Stock Actual', type: 'number', placeholder: '0' },
                            { key: 'minStock', label: 'Stock Mínimo (Alerta)', type: 'number', placeholder: '0' },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                                <input
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                                />
                            </div>
                        ))}

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={2}
                                placeholder="Detalles de materiales, amortiguación, tipo de suela..."
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSave}>
                        {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
