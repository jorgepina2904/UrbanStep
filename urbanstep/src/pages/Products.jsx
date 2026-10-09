import { useState, useEffect, useRef } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { productService } from '../services/productService';
import { purchaseService } from '../services/purchaseService';
import { formatCurrency } from '../utils/formatCurrency';
import { 
    Palette, 
    Check, 
    ChevronDown, 
    Image as ImageIcon, 
    Upload, 
    Link as LinkIcon, 
    X, 
    Sparkles, 
    Layers, 
    Plus, 
    Minus, 
    RotateCcw, 
    Zap,
    Truck,
    Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    SHOE_SIZE_CATEGORIES, 
    ensureSizeStock, 
    calculateTotalStock, 
    detectSizeCategory, 
    getDefaultSizes, 
    ensureColorVariants,
    calculateVariantsTotalStock
} from '../utils/shoeSizes';

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
 * Selector de colores para modelos de calzado (admite múltiples colores por modelo)
 */
function ModelColorsSelector({ colors, primaryColor, onChangeColors, onSetPrimaryColor }) {
    const [customColor, setCustomColor] = useState('');
    const activeColors = Array.isArray(colors) && colors.length > 0 ? colors : [primaryColor || 'Negro'];

    const toggleColor = (colorName) => {
        let updated;
        if (activeColors.includes(colorName)) {
            if (activeColors.length === 1) {
                toast.error('El modelo debe tener al menos un color asignado');
                return;
            }
            updated = activeColors.filter(c => c !== colorName);
            if (primaryColor === colorName) {
                onSetPrimaryColor(updated[0]);
            }
        } else {
            updated = [...activeColors, colorName];
        }
        onChangeColors(updated);
    };

    const addCustom = (e) => {
        if (e) e.preventDefault();
        const trimmed = customColor.trim();
        if (!trimmed) return;
        if (activeColors.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            toast.error('Este color ya está en la lista del modelo');
            return;
        }
        const updated = [...activeColors, trimmed];
        onChangeColors(updated);
        setCustomColor('');
        toast.success(`Color "${trimmed}" añadido al modelo`);
    };

    return (
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-purple-500" />
                    Colores Disponibles del Modelo ({activeColors.length})
                </label>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Principal: <strong className="text-purple-600 dark:text-purple-400 font-bold">{primaryColor || activeColors[0]}</strong>
                </span>
            </div>

            {/* Active Colors Chips */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 rounded-xl bg-white dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/80">
                {activeColors.map((colorName) => {
                    const swatch = SHOE_COLORS.find(c => c.name.toLowerCase() === colorName.toLowerCase());
                    const isPrimary = colorName === primaryColor;
                    return (
                        <div
                            key={colorName}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                isPrimary 
                                    ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 shadow-xs ring-1 ring-purple-500/30'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <span 
                                className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600 shrink-0 shadow-2xs"
                                style={{ background: swatch?.hex || '#6366f1' }}
                            />
                            <span>{colorName}</span>
                            {isPrimary ? (
                                <span className="text-[9px] uppercase font-black bg-purple-200/80 dark:bg-purple-800/80 text-purple-900 dark:text-purple-100 px-1 py-0.5 rounded leading-none">
                                    Principal
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onSetPrimaryColor(colorName)}
                                    className="text-[10px] text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors ml-0.5 font-bold"
                                    title="Marcar como color principal"
                                >
                                    ★ Principal
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => toggleColor(colorName)}
                                className="text-gray-400 hover:text-red-500 ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                title="Quitar este color"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Quick Color Selector Grid */}
            <div>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Toca para alternar colores predefinidos:
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                    {SHOE_COLORS.map(c => {
                        const isIncluded = activeColors.some(ac => ac.toLowerCase() === c.name.toLowerCase());
                        return (
                            <button
                                key={c.name}
                                type="button"
                                onClick={() => toggleColor(c.name)}
                                title={c.name}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs shrink-0 transition-all border ${
                                    isIncluded
                                        ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                <span 
                                    className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-2xs" 
                                    style={{ background: c.hex }} 
                                />
                                <span className="text-[11px]">{c.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom color input */}
            <div className="flex gap-2 pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                    placeholder="Escribir color personalizado (ej: Neón, Camuflaje, Triple White)..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                    type="button"
                    onClick={addCustom}
                    className="px-3 py-1.5 text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl border border-purple-200 dark:border-purple-800 transition-colors whitespace-nowrap"
                >
                    + Añadir
                </button>
            </div>
        </div>
    );
}

/**
 * Products management page with CRUD operations.
 */
export default function Products() {
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [imageTab, setImageTab] = useState('local'); // 'local' | 'url' | 'presets'
    const [urlInput, setUrlInput] = useState('');
    const [customSizeInput, setCustomSizeInput] = useState('');
    const [activeColorTab, setActiveColorTab] = useState('Negro');
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '', 
        brand: '', 
        category: 'Zapatillas', 
        price: '', 
        cost: '', 
        stock: '0', 
        minStock: '3', 
        color: 'Negro', 
        colors: ['Negro'],
        supplierId: 'PRV-101',
        supplierName: 'Distribuidora Deportiva Ávila C.A.',
        colorVariants: [],
        description: '', 
        imageUrl: '',
        sizeCategory: 'caballero',
        sizes: getDefaultSizes('caballero'),
        sizeStock: ensureSizeStock(getDefaultSizes('caballero'), 0),
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [data, sups] = await Promise.all([
                productService.getAll(),
                purchaseService.getSuppliers()
            ]);
            setProducts(data || []);
            setSuppliers(sups || []);
        } catch {
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = loadData;

    const categories = ['all', ...new Set(products.map(p => p.category))];

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.brand.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            (p.supplierName && p.supplierName.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const openCreateModal = () => {
        setEditingProduct(null);
        const defaultCat = 'caballero';
        const defaultSizes = getDefaultSizes(defaultCat);
        const initialVariants = ensureColorVariants(['Negro'], defaultSizes, null, ensureSizeStock(defaultSizes, 0));
        const initialSupplier = suppliers[0] || { id: 'PRV-101', name: 'Distribuidora Deportiva Ávila C.A.' };

        setForm({
            name: '',
            brand: '',
            category: 'Zapatillas',
            price: '',
            cost: '',
            stock: '0',
            minStock: '3',
            color: 'Negro',
            colors: ['Negro'],
            supplierId: initialSupplier.id,
            supplierName: initialSupplier.name || initialSupplier.companyName || 'Distribuidora Deportiva Ávila C.A.',
            colorVariants: initialVariants,
            description: '',
            imageUrl: '',
            sizeCategory: defaultCat,
            sizes: defaultSizes,
            sizeStock: initialVariants[0]?.sizeStock || ensureSizeStock(defaultSizes, 0),
        });
        setActiveColorTab('Negro');
        setUrlInput('');
        setCustomSizeInput('');
        setImageTab('local');
        setShowModal(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        const currentImg = product.imageUrl || product.image || '';
        const cat = product.sizeCategory || detectSizeCategory(product.sizes);
        const sizes = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : getDefaultSizes(cat);
        const primaryCol = product.color || 'Negro';
        const modelCols = Array.isArray(product.colors) && product.colors.length > 0 
            ? product.colors 
            : [primaryCol];
        
        const variants = ensureColorVariants(modelCols, sizes, product.colorVariants, product.sizeStock);
        const total = calculateVariantsTotalStock(variants) || product.stock || 0;
        const initialSupplier = suppliers.find(s => s.id === product.supplierId) || {
            id: product.supplierId || 'PRV-101',
            name: product.supplierName || 'Distribuidora Deportiva Ávila C.A.'
        };

        const activeVar = variants.find(v => v.color.toLowerCase() === primaryCol.toLowerCase()) || variants[0];

        setForm({
            name: product.name,
            brand: product.brand,
            category: product.category,
            price: String(product.price),
            cost: String(product.cost),
            stock: String(total),
            minStock: String(product.minStock),
            color: primaryCol,
            colors: modelCols,
            supplierId: initialSupplier.id,
            supplierName: initialSupplier.name || initialSupplier.companyName || product.supplierName || 'Proveedor',
            colorVariants: variants,
            description: product.description || '',
            imageUrl: currentImg,
            sizeCategory: cat,
            sizes: sizes,
            sizeStock: activeVar?.sizeStock || ensureSizeStock(sizes, 0),
        });
        setActiveColorTab(activeVar?.color || primaryCol);
        setUrlInput(currentImg.startsWith('http') ? currentImg : '');
        setCustomSizeInput('');
        setShowModal(true);
    };

    const handleCategoryChange = (catId) => {
        const newSizes = getDefaultSizes(catId);
        setForm(prev => {
            const updatedVariants = (prev.colorVariants || []).map(v => {
                const newStockMap = {};
                newSizes.forEach(s => {
                    newStockMap[s] = v.sizeStock?.[s] !== undefined ? v.sizeStock[s] : 0;
                });
                return { ...v, sizeStock: newStockMap, total: calculateTotalStock(newStockMap) };
            });
            const total = calculateVariantsTotalStock(updatedVariants);
            const activeVar = updatedVariants.find(v => v.color.toLowerCase() === activeColorTab.toLowerCase()) || updatedVariants[0];
            return {
                ...prev,
                sizeCategory: catId,
                sizes: newSizes,
                colorVariants: updatedVariants,
                sizeStock: activeVar?.sizeStock || {},
                stock: String(total),
            };
        });
    };

    const handleSelectColorTab = (colName) => {
        setActiveColorTab(colName);
        const variant = form.colorVariants?.find(v => v.color.toLowerCase() === colName.toLowerCase());
        if (variant && variant.sizeStock) {
            setForm(prev => ({
                ...prev,
                sizeStock: variant.sizeStock
            }));
        }
    };

    const handleModelColorsChange = (newColors) => {
        setForm(prev => {
            const updatedVariants = ensureColorVariants(newColors, prev.sizes, prev.colorVariants, prev.sizeStock);
            const total = calculateVariantsTotalStock(updatedVariants);
            const targetColorTab = newColors.includes(activeColorTab) ? activeColorTab : (newColors[0] || 'Negro');
            const activeVariant = updatedVariants.find(v => v.color.toLowerCase() === targetColorTab.toLowerCase()) || updatedVariants[0];
            return {
                ...prev,
                colors: newColors,
                color: newColors.includes(prev.color) ? prev.color : (newColors[0] || 'Negro'),
                colorVariants: updatedVariants,
                sizeStock: activeVariant?.sizeStock || {},
                stock: String(total)
            };
        });
        if (!newColors.includes(activeColorTab)) {
            setActiveColorTab(newColors[0] || 'Negro');
        }
    };

    const handleSizeQuantityChange = (size, qty) => {
        const safeQty = Math.max(0, parseInt(qty) || 0);
        setForm(prev => {
            const currentTab = activeColorTab || prev.color || prev.colors[0] || 'Negro';
            const updatedVariants = (prev.colorVariants || []).map(v => {
                if (v.color.toLowerCase() === currentTab.toLowerCase()) {
                    const newStock = { ...(v.sizeStock || {}), [size]: safeQty };
                    return { ...v, sizeStock: newStock, total: calculateTotalStock(newStock) };
                }
                return v;
            });
            const total = calculateVariantsTotalStock(updatedVariants);
            const activeVariant = updatedVariants.find(v => v.color.toLowerCase() === currentTab.toLowerCase());
            return {
                ...prev,
                colorVariants: updatedVariants,
                sizeStock: activeVariant?.sizeStock || { ...prev.sizeStock, [size]: safeQty },
                stock: String(total),
            };
        });
    };

    const handleStepSizeQuantity = (size, delta) => {
        setForm(prev => {
            const currentTab = activeColorTab || prev.color || prev.colors[0] || 'Negro';
            const targetVariant = (prev.colorVariants || []).find(v => v.color.toLowerCase() === currentTab.toLowerCase());
            const currentVal = parseInt(targetVariant?.sizeStock?.[size] ?? prev.sizeStock?.[size] ?? 0) || 0;
            const newVal = Math.max(0, currentVal + delta);

            const updatedVariants = (prev.colorVariants || []).map(v => {
                if (v.color.toLowerCase() === currentTab.toLowerCase()) {
                    const newStock = { ...(v.sizeStock || {}), [size]: newVal };
                    return { ...v, sizeStock: newStock, total: calculateTotalStock(newStock) };
                }
                return v;
            });
            const total = calculateVariantsTotalStock(updatedVariants);
            const activeVariant = updatedVariants.find(v => v.color.toLowerCase() === currentTab.toLowerCase());
            return {
                ...prev,
                colorVariants: updatedVariants,
                sizeStock: activeVariant?.sizeStock || { ...prev.sizeStock, [size]: newVal },
                stock: String(total),
            };
        });
    };

    const handleRemoveSize = (sizeToRemove) => {
        if (form.sizes.length <= 1) {
            toast.error('Debe haber al menos 1 talla activa');
            return;
        }
        setForm(prev => {
            const newSizes = prev.sizes.filter(s => s !== sizeToRemove);
            const updatedVariants = (prev.colorVariants || []).map(v => {
                const newStockMap = { ...v.sizeStock };
                delete newStockMap[sizeToRemove];
                return { ...v, sizeStock: newStockMap, total: calculateTotalStock(newStockMap) };
            });
            const total = calculateVariantsTotalStock(updatedVariants);
            const activeVariant = updatedVariants.find(v => v.color.toLowerCase() === activeColorTab.toLowerCase()) || updatedVariants[0];
            return {
                ...prev,
                sizes: newSizes,
                colorVariants: updatedVariants,
                sizeStock: activeVariant?.sizeStock || {},
                stock: String(total),
            };
        });
    };

    const handleAddCustomSize = (e) => {
        if (e) e.preventDefault();
        const trimmed = customSizeInput.trim().toUpperCase();
        if (!trimmed) return;
        if (form.sizes.includes(trimmed)) {
            toast.error(`La talla ${trimmed} ya está incluida`);
            return;
        }
        setForm(prev => {
            const newSizes = [...prev.sizes, trimmed];
            const updatedVariants = (prev.colorVariants || []).map(v => ({
                ...v,
                sizeStock: { ...(v.sizeStock || {}), [trimmed]: 0 }
            }));
            const activeVariant = updatedVariants.find(v => v.color.toLowerCase() === activeColorTab.toLowerCase()) || updatedVariants[0];
            return {
                ...prev,
                sizes: newSizes,
                colorVariants: updatedVariants,
                sizeStock: activeVariant?.sizeStock || {},
            };
        });
        setCustomSizeInput('');
        toast.success(`Talla ${trimmed} agregada`);
    };

    const handleDistributeEvenly = () => {
        const input = window.prompt(`¿Cuántos pares de calzado llegaron para CADA talla del color "${activeColorTab}"?`, '2');
        if (input === null) return;
        const qtyPerSize = Math.max(0, parseInt(input) || 0);
        setForm(prev => {
            const currentTab = activeColorTab || prev.color || prev.colors[0] || 'Negro';
            const updatedVariants = (prev.colorVariants || []).map(v => {
                if (v.color.toLowerCase() === currentTab.toLowerCase()) {
                    const newStock = {};
                    prev.sizes.forEach(s => { newStock[s] = qtyPerSize; });
                    return { ...v, sizeStock: newStock, total: calculateTotalStock(newStock) };
                }
                return v;
            });
            const total = calculateVariantsTotalStock(updatedVariants);
            const activeVariant = updatedVariants.find(v => v.color.toLowerCase() === currentTab.toLowerCase());
            return {
                ...prev,
                colorVariants: updatedVariants,
                sizeStock: activeVariant?.sizeStock || {},
                stock: String(total),
            };
        });
        toast.success(`Asignados ${qtyPerSize} pares a cada talla de "${activeColorTab}"`);
    };

    const handleCopySizesToAllColors = () => {
        setForm(prev => {
            const currentTab = activeColorTab || prev.color || prev.colors[0] || 'Negro';
            const sourceVariant = (prev.colorVariants || []).find(v => v.color.toLowerCase() === currentTab.toLowerCase());
            if (!sourceVariant || !sourceVariant.sizeStock) return prev;
            const copyStock = { ...sourceVariant.sizeStock };
            const updatedVariants = (prev.colorVariants || []).map(v => ({
                ...v,
                sizeStock: { ...copyStock },
                total: calculateTotalStock(copyStock)
            }));
            const total = calculateVariantsTotalStock(updatedVariants);
            return {
                ...prev,
                colorVariants: updatedVariants,
                stock: String(total),
            };
        });
        toast.success(`Tallas del color "${activeColorTab}" replicadas a todos los colores del modelo`);
    };

    const handleResetAllSizes = () => {
        setForm(prev => {
            const currentTab = activeColorTab || prev.color || prev.colors[0] || 'Negro';
            const updatedVariants = (prev.colorVariants || []).map(v => {
                if (v.color.toLowerCase() === currentTab.toLowerCase()) {
                    const newStock = {};
                    prev.sizes.forEach(s => { newStock[s] = 0; });
                    return { ...v, sizeStock: newStock, total: 0 };
                }
                return v;
            });
            const total = calculateVariantsTotalStock(updatedVariants);
            const activeVariant = updatedVariants.find(v => v.color.toLowerCase() === currentTab.toLowerCase());
            return {
                ...prev,
                colorVariants: updatedVariants,
                sizeStock: activeVariant?.sizeStock || {},
                stock: String(total),
            };
        });
        toast(`Stock de tallas para "${activeColorTab}" reiniciado a 0`);
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

        const primaryColor = form.color || (form.colors && form.colors[0]) || 'Negro';
        const modelColors = Array.isArray(form.colors) && form.colors.length > 0 ? form.colors : [primaryColor];

        const finalVariants = form.colorVariants && form.colorVariants.length > 0
            ? form.colorVariants
            : ensureColorVariants(modelColors, form.sizes, null, form.sizeStock);

        const totalCalculated = calculateVariantsTotalStock(finalVariants) || calculateTotalStock(form.sizeStock);
        const activeVariant = finalVariants.find(v => v.color.toLowerCase() === primaryColor.toLowerCase()) || finalVariants[0];

        const data = {
            ...form,
            color: primaryColor,
            colors: modelColors,
            supplierId: form.supplierId || 'PRV-101',
            supplierName: form.supplierName || 'Distribuidora Deportiva Ávila C.A.',
            colorVariants: finalVariants,
            price: parseFloat(form.price) || 0,
            cost: parseFloat(form.cost) || 0,
            stock: totalCalculated,
            minStock: parseInt(form.minStock) || 0,
            imageUrl: form.imageUrl || '',
            image: form.imageUrl || '',
            sizes: form.sizes,
            sizeCategory: form.sizeCategory,
            sizeStock: activeVariant?.sizeStock || form.sizeStock,
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
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
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
                    const prodColors = Array.isArray(product.colors) && product.colors.length > 0 
                        ? product.colors 
                        : (product.color ? [product.color] : []);

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
                                
                                {/* Model Colors indicator badge */}
                                {prodColors.length > 0 && (
                                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/80 dark:border-gray-700 shadow-sm max-w-[85%]">
                                        <div className="flex items-center -space-x-1 shrink-0">
                                            {prodColors.slice(0, 4).map((cName, idx) => (
                                                <span key={idx} className="relative z-10 transition-transform hover:scale-125 hover:z-20">
                                                    {getColorSwatch(cName)}
                                                </span>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 truncate">
                                            {prodColors.length > 1 ? `${prodColors.length} colores` : prodColors[0]}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={product.name}>{product.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{product.brand}</p>
                                            {product.sizeCategory && (
                                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                                                    {product.sizeCategory}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {getStatusBadge(product.status)}
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">
                                    <span>{product.sku}</span>
                                    {prodColors.length > 0 && (
                                        <span className="text-[11px] font-sans font-medium text-gray-600 dark:text-gray-300 truncate max-w-[120px]" title={prodColors.join(', ')}>
                                            {prodColors.join(', ')}
                                        </span>
                                    )}
                                </div>

                                {product.supplierName && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate" title={`Proveedor: ${product.supplierName}`}>
                                        <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="truncate font-medium">{product.supplierName}</span>
                                    </div>
                                )}

                                {/* Sizes & Stock preview pill list */}
                                {product.sizes && product.sizes.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none no-scrollbar text-[10px]">
                                            {product.sizes.slice(0, 5).map(s => {
                                                const sQty = product.sizeStock ? product.sizeStock[s] : null;
                                                return (
                                                    <span 
                                                        key={s} 
                                                        className={`px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                                            sQty !== null && sQty <= 0 
                                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 line-through' 
                                                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                                                        }`}
                                                    >
                                                        {s}{sQty !== null ? `:${sQty}` : ''}
                                                    </span>
                                                );
                                            })}
                                            {product.sizes.length > 5 && (
                                                <span className="text-[9px] text-gray-400 font-mono">+{product.sizes.length - 5}</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(product.price)}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Stock: {product.stock} pares</p>
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
                                onChange={(color) => setForm(prev => ({ 
                                    ...prev, 
                                    color,
                                    colors: (prev.colors || []).includes(color) ? prev.colors : [color, ...(prev.colors || [])]
                                }))}
                            />
                        </div>

                        {/* Supplier Selector */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    Proveedor del Calzado
                                </span>
                                <span className="text-[11px] text-gray-400">Vinculado a módulo de Compras / Proveedores</span>
                            </label>
                            <select
                                value={form.supplierId || ''}
                                onChange={e => {
                                    const sId = e.target.value;
                                    const sup = suppliers.find(s => s.id === sId);
                                    setForm(prev => ({
                                        ...prev,
                                        supplierId: sId,
                                        supplierName: sup ? (sup.name || sup.companyName) : prev.supplierName
                                    }));
                                }}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
                            >
                                {suppliers.length === 0 && (
                                    <option value="">Cargando proveedores...</option>
                                )}
                                {suppliers.map(sup => (
                                    <option key={sup.id} value={sup.id}>
                                        {sup.name || sup.companyName} {sup.rif ? `(${sup.rif})` : ''} - {sup.category || 'Calzado'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Model Colors Selector */}
                        <div className="sm:col-span-2">
                            <ModelColorsSelector
                                colors={form.colors}
                                primaryColor={form.color}
                                onChangeColors={handleModelColorsChange}
                                onSetPrimaryColor={(c) => setForm(prev => ({ ...prev, color: c }))}
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

                    {/* Size Categories & Per-Color Per-Size Availability Section */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-50 via-gray-50/80 to-blue-50/30 dark:from-gray-800/70 dark:via-gray-800/50 dark:to-blue-950/20 border border-gray-200 dark:border-gray-700 space-y-4">
                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200/80 dark:border-gray-700/80">
                            <div>
                                <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    Matriz de Inventario: Tallas y Colores del Modelo
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Configura los pares que llegaron por cada talla para cada uno de los colores del calzado.
                                </p>
                            </div>
                            
                            {/* Live Badge with Total Pairs */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100/90 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300 font-extrabold text-xs self-start sm:self-auto shadow-xs">
                                <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Total Modelo: {calculateVariantsTotalStock(form.colorVariants) || calculateTotalStock(form.sizeStock)} pares</span>
                            </div>
                        </div>

                        {/* Step 1: Category Selector Pills */}
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-2">
                                1. Escala / Rango de Tallas:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                {SHOE_SIZE_CATEGORIES.map((cat) => {
                                    const isSelected = form.sizeCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => handleCategoryChange(cat.id)}
                                            className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30'
                                                    : 'bg-white dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                }`}>
                                                    {cat.badge}
                                                </span>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <span className="text-xs font-bold leading-tight truncate">{cat.name.split('/')[0]}</span>
                                            <span className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {cat.description.split('(')[1]?.replace(')', '') || cat.description}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step 2: Color Variant Tabs & Size Stock Matrix */}
                        <div className="space-y-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                                        2. Selecciona el Color para gestionar sus Tallas:
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Toca una pestaña de color para ajustar cuántos pares hay en cada talla para ese color específico.
                                    </span>
                                </div>
                                
                                {/* Quick actions */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={handleDistributeEvenly}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors shadow-xs"
                                        title={`Asignar la misma cantidad a todas las tallas del color ${activeColorTab}`}
                                    >
                                        <Zap className="w-3 h-3" />
                                        Distribuir ({activeColorTab})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopySizesToAllColors}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition-colors shadow-xs"
                                        title="Copiar las cantidades de tallas de este color a todos los demás colores"
                                    >
                                        <Copy className="w-3 h-3" />
                                        Copiar a Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetAllSizes}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors shadow-xs"
                                        title={`Poner en 0 las tallas de ${activeColorTab}`}
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        Reiniciar ({activeColorTab})
                                    </button>
                                </div>
                            </div>

                            {/* Color Tabs Row */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                                {(form.colors || [form.color || 'Negro']).map((colName) => {
                                    const isSelected = (activeColorTab || '').toLowerCase() === colName.toLowerCase();
                                    const variant = (form.colorVariants || []).find(v => v.color.toLowerCase() === colName.toLowerCase());
                                    const variantCount = variant ? calculateTotalStock(variant.sizeStock) : 0;
                                    const swatch = SHOE_COLORS.find(c => c.name.toLowerCase() === colName.toLowerCase());

                                    return (
                                        <button
                                            key={colName}
                                            type="button"
                                            onClick={() => handleSelectColorTab(colName)}
                                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/25'
                                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                        >
                                            <span
                                                className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-2xs shrink-0"
                                                style={{ background: swatch?.hex || '#6366f1' }}
                                            />
                                            <span>{colName}</span>
                                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                            }`}>
                                                {variantCount} pares
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Active Color Details & Sizes Matrix */}
                            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                        <span>Editando tallas para el color:</span>
                                        <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-black">
                                            {activeColorTab}
                                        </span>
                                    </span>
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                        Subtotal color: {(() => {
                                            const v = (form.colorVariants || []).find(cv => cv.color.toLowerCase() === (activeColorTab || '').toLowerCase());
                                            return v ? calculateTotalStock(v.sizeStock) : 0;
                                        })()} pares
                                    </span>
                                </div>

                                {/* Sizes Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                                    {form.sizes.map((s) => {
                                        const currentVariant = (form.colorVariants || []).find(v => v.color.toLowerCase() === (activeColorTab || form.color || 'Negro').toLowerCase());
                                        const qty = (currentVariant?.sizeStock && currentVariant.sizeStock[s] !== undefined)
                                            ? currentVariant.sizeStock[s]
                                            : (form.sizeStock[s] ?? 0);
                                        const hasStock = qty > 0;
                                        return (
                                            <div
                                                key={s}
                                                className={`p-2 rounded-xl border transition-all flex flex-col justify-between ${
                                                    hasStock
                                                        ? 'bg-white dark:bg-gray-800 border-blue-400 dark:border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                                                        : 'bg-white/60 dark:bg-gray-850 border-gray-200 dark:border-gray-750 opacity-80'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-black text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                            Talla {s}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSize(s)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded"
                                                        title={`Quitar talla ${s}`}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {/* Quantity Stepper */}
                                                <div className="flex items-center gap-1 mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStepSizeQuantity(s, -1)}
                                                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold transition-colors active:scale-95"
                                                        title="Restar 1 par"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={qty}
                                                        onChange={(e) => handleSizeQuantityChange(s, e.target.value)}
                                                        className="flex-1 min-w-0 h-7 text-center rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-xs font-black text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        title={`Cantidad de pares para talla ${s}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStepSizeQuantity(s, 1)}
                                                        className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold transition-colors active:scale-95"
                                                        title="Sumar 1 par"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <div className="mt-1.5 text-center">
                                                    <span className={`text-[10px] font-bold ${hasStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                                                        {hasStock ? `${qty} ${qty === 1 ? 'par' : 'pares'}` : '0 pares'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add Custom / Extra Size Row */}
                                <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">¿Llegó una talla fuera de rango?</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="text"
                                            placeholder="Ej: 47, 34, XL"
                                            value={customSizeInput}
                                            onChange={(e) => setCustomSizeInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddCustomSize();
                                                }
                                            }}
                                            className="w-28 px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCustomSize}
                                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Agregar Talla
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prices and Stock */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio de Venta (USD)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.price}
                                onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo de Adquisición (USD)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.cost}
                                onChange={e => setForm(prev => ({ ...prev, cost: e.target.value }))}
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                                <span>Stock Actual (Total Pares)</span>
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold font-mono">
                                    ⚡ Suma de Tallas
                                </span>
                            </label>
                            <input
                                type="number"
                                value={form.stock}
                                readOnly
                                placeholder="0"
                                className="w-full px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-gray-900 dark:text-white font-bold placeholder-gray-400 focus:outline-none cursor-not-allowed text-sm"
                                title="Calculado automáticamente como la suma de pares desglosados por talla"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Calculado en vivo sumando los pares de cada talla arriba.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Mínimo (Alerta)</label>
                            <input
                                type="number"
                                value={form.minStock}
                                onChange={e => setForm(prev => ({ ...prev, minStock: e.target.value }))}
                                placeholder="3"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Umbral para alertas de reabastecimiento de inventario.</p>
                        </div>

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
