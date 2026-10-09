import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import CustomerSelector from '../ui/CustomerSelector';
import ReceiptModal from '../ui/ReceiptModal';
import DeliveryMapModal from '../ui/DeliveryMapModal';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { productService } from '../services/productService';
import { saleService } from '../services/saleServices';
import { settingsService } from '../services/settingsService';
import { deliveryService } from '../services/deliveryService';
import { auditService } from '../services/auditService';
import { VENEZUELA_BANKS, SHIPPING_CARRIERS } from '../data/venezuelaData';
import { 
    Search, 
    ShoppingCart, 
    Trash2, 
    CreditCard, 
    DollarSign, 
    Smartphone, 
    Truck, 
    Store, 
    CheckCircle2, 
    Copy, 
    Plus, 
    Minus,
    Coins,
    Building,
    MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function POS() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState({});
    const [selectedColor, setSelectedColor] = useState({});
    
    // Checkout state & Dynamic Payment Methods
    const [paymentMethodsList, setPaymentMethodsList] = useState(() => settingsService.getPaymentMethods());
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('pagomovil');
    const [paymentBank, setPaymentBank] = useState('0134 - Banesco');
    const [paymentReference, setPaymentReference] = useState('');
    const [payerPhone, setPayerPhone] = useState('');
    const [zelleHolder, setZelleHolder] = useState('');
    const [cashAmount, setCashAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    
    // Store settings & Completed sale for ticket
    const [settings, setSettings] = useState(null);
    const [saleComplete, setSaleComplete] = useState(null);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);

    const { 
        items, 
        addItem, 
        removeItem, 
        updateQuantity, 
        clearCart, 
        subtotal, 
        tax, 
        igtf, 
        total, 
        itemCount, 
        state, 
        setApplyIgtf, 
        setShipping, 
        shippingCost, 
        shippingCarrier,
        deliveryData,
        setDeliveryData
    } = useCart();
    
    const { user } = useAuth();
    const { rate, toBs, formatBs, formatUSD } = useCurrency();

    useEffect(() => {
        loadData();
        const handleSync = () => loadData();
        const handlePaySync = () => setPaymentMethodsList(settingsService.getPaymentMethods());
        window.addEventListener('products_updated', handleSync);
        window.addEventListener('payment_methods_updated', handlePaySync);
        return () => {
            window.removeEventListener('products_updated', handleSync);
            window.removeEventListener('payment_methods_updated', handlePaySync);
        };
    }, []);

    const loadData = async () => {
        try {
            const [prods, sett] = await Promise.all([
                productService.getAll(),
                settingsService.getSettings()
            ]);
            setProducts(prods.filter(p => !p.disabled && p.stock > 0));
            setSettings(sett);
            setPaymentMethodsList(settingsService.getPaymentMethods());
        } finally {
            setLoading(false);
        }
    };

    const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

    const filtered = products.filter(p => {
        if (p.disabled || p.stock <= 0) return false;
        const q = search.trim().toLowerCase();
        const matchesSearch = !q || [
            p.name,
            p.brand,
            p.category,
            p.sku,
            p.barcode,
            p.description,
            ...(p.sizes || [])
        ].some(val => val && String(val).toLowerCase().includes(q));

        const matchesCat = categoryFilter === 'all' || (p.category && p.category.toLowerCase() === categoryFilter.toLowerCase());
        return matchesSearch && matchesCat;
    });

    const handleAddToCart = (product) => {
        const color = selectedColor[product.id] || product.color || (Array.isArray(product.colors) && product.colors[0]) || null;
        const size = selectedSize[product.id] || (product.sizes?.length > 0 ? product.sizes[0] : 'N/A');
        const availableStock = productService.getAvailableStock(product, size, color);

        if (availableStock <= 0) {
            toast.error(`Agotado: La talla ${size}${color ? ` en ${color}` : ''} no tiene existencias`, { duration: 2500 });
            return;
        }

        const existingItem = items.find(i => 
            i.productId === product.id && 
            String(i.size) === String(size) && 
            (color ? String(i.color || '').toLowerCase() === String(color).toLowerCase() : true)
        );
        const inCartQty = existingItem ? existingItem.quantity : 0;

        if (inCartQty >= availableStock) {
            toast.error(
                `Límite alcanzado: Ya agregaste todos los pares disponibles (${availableStock}) de esta talla y color al carrito`, 
                { duration: 3000 }
            );
            return;
        }

        addItem(product, size, 1, color);
        toast.success(
            `${product.name} (${color ? `${color} • ` : ''}Talla ${size}) agregado (${inCartQty + 1}/${availableStock} en carrito)`, 
            { duration: 1800 }
        );
    };

    const handleCarrierChange = (e) => {
        const carrierId = e.target.value;
        const found = SHIPPING_CARRIERS.find(c => c.id === carrierId);
        if (carrierId === 'delivery_local') {
            setShowDeliveryModal(true);
        } else if (found) {
            setShipping(carrierId, found.baseCost);
        }
    };

    // Auto toggle IGTF when selecting foreign currency cash, Zelle or USD methods
    const handleSelectPaymentMethod = (methodId) => {
        setPaymentMethod(methodId);
        const pmObj = paymentMethodsList.find(m => m.id === methodId);
        if (pmObj?.currency === 'USD' || methodId === 'efectivo_usd' || methodId === 'zelle') {
            setApplyIgtf(settings?.igtfActive ?? true);
        } else {
            setApplyIgtf(false);
        }
    };

    // Calculation for Cash Change (Vuelto)
    const cashNum = parseFloat(cashAmount) || 0;
    let cashChange = 0;
    let cashChangeBs = 0;

    if (paymentMethod === 'efectivo_usd') {
        cashChange = Math.max(0, cashNum - total);
        cashChangeBs = cashChange * rate;
    } else if (paymentMethod === 'efectivo_bs') {
        const totalInBs = toBs(total);
        cashChangeBs = Math.max(0, cashNum - totalInBs);
        cashChange = rate > 0 ? cashChangeBs / rate : 0;
    }

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles`);
    };

    const handleExecuteSale = async () => {
        if (items.length === 0) return;
        setProcessing(true);

        try {
            const customerObj = state.customer;
            const carrierObj = SHIPPING_CARRIERS.find(c => c.id === shippingCarrier);

            const saleData = {
                customerId: customerObj?.id || 'publico',
                customer: customerObj?.id && customerObj?.id !== 'publico'
                    ? `${customerObj.firstName} ${customerObj.lastName}`
                    : 'Cliente General',
                customerDoc: customerObj?.docNumber || 'V-00000000',
                customerPhone: customerObj?.phone || '',
                items: items.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    brand: item.brand,
                    quantity: item.quantity,
                    price: item.price,
                    size: item.size,
                    color: item.color || null,
                })),
                bcvRate: rate,
                subtotal,
                tax,
                igtf,
                shippingCost,
                shippingCarrier,
                shippingCarrierName: carrierObj?.name || 'Retiro en Tienda',
                total,
                paymentMethod,
                paymentMethodLabel: (() => {
                    const foundPm = paymentMethodsList.find(m => m.id === paymentMethod);
                    if (foundPm) return foundPm.label;
                    return paymentMethod === 'pagomovil' ? 'Pago Móvil' :
                           paymentMethod === 'zelle' ? 'Zelle (USD)' :
                           paymentMethod === 'punto_venta' ? 'Punto de Venta' :
                           paymentMethod === 'efectivo_usd' ? 'Efectivo Divisas' :
                           paymentMethod === 'efectivo_bs' ? 'Efectivo Bolívares' : 'Otro';
                })(),
                paymentBank: paymentBank || paymentMethodsList.find(m => m.id === paymentMethod)?.bank || '',
                paymentReference: paymentReference || (paymentMethod === 'efectivo_usd' || paymentMethod === 'efectivo_bs' ? 'Efectivo' : 'Ref-0000'),
                cashReceived: cashNum > 0 ? cashNum : null,
                cashChange: paymentMethod === 'efectivo_bs' ? cashChangeBs : cashChange,
                cashCurrency: paymentMethod === 'efectivo_bs' ? 'VES' : 'USD',
                cashier: user?.name || 'Cajero',
            };

            const result = await saleService.create(saleData);

            // Register delivery in deliveryService if local delivery was chosen
            if (shippingCarrier === 'delivery_local' && deliveryData) {
                try {
                    await deliveryService.createDelivery({
                        saleId: result.id,
                        customerName: deliveryData.customerName || saleData.customer,
                        customerPhone: deliveryData.customerPhone || saleData.customerPhone,
                        destinationAddress: deliveryData.address,
                        destinationLat: deliveryData.lat,
                        destinationLng: deliveryData.lng,
                        distanceKm: deliveryData.distanceKm,
                        deliveryCostUsd: deliveryData.costUsd,
                        deliveryCostBs: Number((deliveryData.costUsd * rate).toFixed(2)),
                        estimatedMinutes: deliveryData.estimatedMinutes,
                        specialInstructions: deliveryData.notes,
                    });

                    await auditService.log({
                        action: 'delivery_create',
                        actionLabel: `Delivery creado para venta ${result.receiptNumber || result.id} (${deliveryData.distanceKm} km)`,
                        module: 'delivery',
                        entityType: 'delivery',
                        entityId: result.id,
                        user: user?.name || 'Cajero',
                    });
                } catch (delErr) {
                    console.error('Error al registrar delivery:', delErr);
                }
            }

            // Attach delivery details to sale complete object for receipt modal
            const saleWithDelivery = {
                ...result,
                deliveryDetails: shippingCarrier === 'delivery_local' && deliveryData ? deliveryData : null,
            };

            setSaleComplete(saleWithDelivery);
            setShowCheckoutModal(false);
            clearCart();
            
            // Recargar productos para reflejar nuevo stock
            const refreshedProds = await productService.getAll();
            setProducts(refreshedProds.filter(p => !p.disabled && p.stock > 0));

            // Resetear inputs de cobro
            setPaymentReference('');
            setCashAmount('');
            setPayerPhone('');

            toast.success('¡Venta completada con éxito!');
        } catch (err) {
            console.error('Error al procesar la venta:', err);
            toast.error('Error procesando venta: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-full pb-12">
            {/* Catalog Section */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Search & Category Tabs */}
                <div className="mb-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar zapato, franela, marca o SKU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white shadow-sm"
                            />
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none no-scrollbar">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                                        categoryFilter === cat
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    {cat === 'all' ? 'Todos' : cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Products Grid — Grilla fija sin solapamiento con auto-rows-max */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max content-start scrollbar-none no-scrollbar pb-6">
                    {filtered.length === 0 ? (
                        <div className="col-span-full text-center py-16 text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                            <Store className="w-12 h-12 mx-auto mb-2 opacity-40" />
                            <p className="text-base font-medium">No se encontraron productos disponibles</p>
                            <p className="text-xs mt-1">Prueba cambiando el término de búsqueda</p>
                        </div>
                    ) : (
                        filtered.map((product) => {
                            const availableColors = Array.isArray(product.colors) && product.colors.length > 0
                                ? product.colors
                                : (product.color ? [product.color] : ['Original']);
                            const currentColor = selectedColor[product.id] || product.color || availableColors[0];
                            const currentVariantStock = productService.getColorSizeStock(product, currentColor);

                            const currentSize = selectedSize[product.id] || (product.sizes?.length > 0 ? product.sizes[0] : 'N/A');
                            const imgSrc = product.imageUrl || product.image;
                            const sizeCount = currentVariantStock ? (currentVariantStock[currentSize] ?? 0) : (product.sizeStock ? (product.sizeStock[currentSize] ?? 0) : 0);
                            const isSelectedSizeOut = sizeCount <= 0;

                            return (
                                <div
                                    key={product.id}
                                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg hover:border-blue-500/60 transition-all flex flex-col justify-between group relative overflow-hidden min-h-[380px]"
                                >
                                    <div className="flex-1 min-w-0">
                                        {/* Product image thumbnail — Full Studio Frame */}
                                        <div className="h-48 w-full shrink-0 rounded-xl bg-gradient-to-b from-gray-50 to-gray-100/90 dark:from-gray-800/90 dark:to-gray-900 mb-3 overflow-hidden relative flex items-center justify-center border border-gray-200/80 dark:border-gray-700/80 group-hover:border-blue-500/40 transition-all shadow-sm">
                                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)] pointer-events-none" />
                                            {imgSrc ? (
                                                <img
                                                    src={imgSrc}
                                                    alt={product.name}
                                                    className="w-full h-full max-h-full max-w-full object-contain p-2 filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.22)] group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300 relative z-10"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        const fb = e.target.parentElement.querySelector('.pos-fallback-icon');
                                                        if (fb) fb.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <span className={`pos-fallback-icon text-4xl ${imgSrc ? 'hidden' : 'flex'}`}>👟</span>

                                            <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                                                <Badge variant={product.stock > 5 ? 'success' : 'warning'} className="text-[10px] shadow-sm font-bold">
                                                    {product.stock} en stock
                                                </Badge>
                                            </div>
                                            <span className="absolute top-2 right-2 z-20 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/75 text-white backdrop-blur-sm shadow-sm">
                                                {product.sku}
                                            </span>
                                        </div>

                                        <h3 className="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                            {product.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{product.brand} • {product.category}</p>

                                        {/* Model Color Options */}
                                        {availableColors.length > 1 ? (
                                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                                    <span>Color:</span>
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold truncate max-w-[120px]">{currentColor}</span>
                                                </div>
                                                <div className="flex gap-1 overflow-x-auto pb-0.5 max-w-full scrollbar-none no-scrollbar">
                                                    {availableColors.map((col) => {
                                                        const isColSelected = currentColor === col;
                                                        return (
                                                            <button
                                                                key={col}
                                                                type="button"
                                                                onClick={() => setSelectedColor({ ...selectedColor, [product.id]: col })}
                                                                className={`px-2 py-0.5 text-[10px] rounded-md font-bold shrink-0 transition-all ${
                                                                    isColSelected
                                                                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                                }`}
                                                            >
                                                                {col}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                                <span className="truncate">{currentColor}</span>
                                            </div>
                                        )}

                                        {/* Size Selector with Per-Color Stock Breakdown */}
                                        {product.sizes && product.sizes.length > 0 && (
                                            <div className="mt-2.5">
                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                                    <span>Tallas ({currentColor}):</span>
                                                    <span className={!isSelectedSizeOut ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-rose-500 font-extrabold"}>
                                                        {!isSelectedSizeOut 
                                                            ? `${sizeCount} disp.` 
                                                            : 'Agotado'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none no-scrollbar">
                                                    {product.sizes.map((s) => {
                                                        const sStock = currentVariantStock ? (currentVariantStock[s] ?? 0) : (product.sizeStock ? (product.sizeStock[s] ?? 0) : 0);
                                                        const isOutOfStock = sStock <= 0;
                                                        const isSelected = currentSize === s;
                                                        return (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                onClick={() => setSelectedSize({ ...selectedSize, [product.id]: s })}
                                                                title={sStock > 0 ? `${sStock} pares disponibles de talla ${s} en ${currentColor}` : `Talla ${s} agotada`}
                                                                className={`px-2 py-1 text-xs rounded-lg font-bold shrink-0 transition-all flex items-center gap-1 ${
                                                                    isSelected
                                                                        ? isOutOfStock
                                                                            ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-500'
                                                                            : 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                                                                        : isOutOfStock
                                                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 line-through opacity-60'
                                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                                }`}
                                                            >
                                                                <span>{s}</span>
                                                                <span className="text-[9px] font-mono opacity-80">
                                                                    ({sStock})
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dual Price & Add Button anchored safely */}
                                    <div className="relative z-20 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 shrink-0 bg-inherit">
                                        <div className="min-w-0 pr-1">
                                            <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white block truncate leading-tight">
                                                {formatUSD(product.price)}
                                            </span>
                                            <span className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                                                {formatBs(toBs(product.price))}
                                            </span>
                                        </div>

                                        {(() => {
                                            const existingInCart = items.find(i => 
                                                i.productId === product.id && 
                                                String(i.size) === String(currentSize) && 
                                                (currentColor ? String(i.color || '').toLowerCase() === String(currentColor).toLowerCase() : true)
                                            );
                                            const inCartCount = existingInCart ? existingInCart.quantity : 0;
                                            const isMaxInCart = sizeCount > 0 && inCartCount >= sizeCount;
                                            const isButtonDisabled = isSelectedSizeOut || isMaxInCart;

                                            return (
                                                <Button
                                                    size="sm"
                                                    variant={isButtonDisabled ? "secondary" : "primary"}
                                                    disabled={isButtonDisabled}
                                                    className={`flex items-center gap-1.5 shadow-md shrink-0 px-3.5 py-2 font-bold text-xs uppercase tracking-wide whitespace-nowrap active:scale-95 ${
                                                        isSelectedSizeOut
                                                            ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-800 text-gray-400'
                                                            : isMaxInCart
                                                                ? 'opacity-70 cursor-not-allowed bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                                : 'shadow-blue-500/25 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                                                    }`}
                                                    onClick={() => handleAddToCart(product)}
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    {isSelectedSizeOut ? 'Agotado' : isMaxInCart ? 'En Carrito (Máx)' : inCartCount > 0 ? `Agregar (${inCartCount})` : 'Agregar'}
                                                </Button>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Shopping Cart Sidebar */}
            <div className="w-full lg:w-96 shrink-0">
                <Card className="p-4 sm:p-5 flex flex-col lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)] shadow-xl border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            <h2 className="font-bold text-gray-900 dark:text-white text-base">Carrito de Ventas</h2>
                        </div>
                        <Badge variant="primary">{itemCount} art.</Badge>
                    </div>

                    {/* Customer Selector */}
                    <div className="mt-3 shrink-0">
                        <CustomerSelector />
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-1 min-h-0 overflow-y-auto my-3 space-y-2.5 max-h-[280px] lg:max-h-none pr-1">
                        {items.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">El carrito está vacío</p>
                                <p className="text-xs mt-1">Selecciona calzados o prendas para comenzar</p>
                            </div>
                        ) : (
                            items.map((item) => {
                                const isAtMax = item.maxStock !== undefined && item.quantity >= item.maxStock;
                                return (
                                    <div
                                        key={item.uniqueId}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/40 text-xs"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <p className="font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                                            <div className="flex items-center gap-1 text-[11px] text-gray-500 flex-wrap">
                                                {item.color && <span className="font-semibold text-blue-600 dark:text-blue-400">{item.color} •</span>}
                                                <span>Talla: {item.size} •</span>
                                                <span>{formatUSD(item.price)}</span>
                                                {item.maxStock !== undefined && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                                        isAtMax 
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
                                                            : 'text-gray-400'
                                                    }`}>
                                                        {isAtMax ? `Límite (${item.maxStock} disp.)` : `Máx: ${item.maxStock}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Qty Controls */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => updateQuantity(item.uniqueId, item.quantity - 1)}
                                                className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95 transition-transform"
                                                title="Disminuir"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-5 text-center font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                                            <button
                                                onClick={() => {
                                                    if (isAtMax) {
                                                        toast.error(`Stock máximo alcanzado (${item.maxStock} disponibles)`, { duration: 2000 });
                                                        return;
                                                    }
                                                    updateQuantity(item.uniqueId, item.quantity + 1);
                                                }}
                                                disabled={isAtMax}
                                                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                                                    isAtMax
                                                        ? 'opacity-30 cursor-not-allowed bg-gray-200 dark:bg-gray-800 text-gray-400'
                                                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95'
                                                }`}
                                                title={isAtMax ? `No puedes agregar más de ${item.maxStock} unidades` : "Aumentar"}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => removeItem(item.uniqueId)}
                                                className="ml-1 text-red-400 hover:text-red-500 p-1"
                                                title="Eliminar del carrito"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Shipping & Delivery & Totals Footer */}
                    {items.length > 0 && (
                        <div className="shrink-0 mt-auto pt-2 border-t border-gray-200 dark:border-gray-800 space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                                    Método de Entrega / Despacho:
                                </label>
                                {shippingCarrier === 'delivery_local' && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeliveryModal(true)}
                                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5"
                                    >
                                        <MapPin className="w-3 h-3" />
                                        <span>{deliveryData ? 'Editar Destino' : 'Configurar Mapa'}</span>
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={shippingCarrier}
                                    onChange={handleCarrierChange}
                                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                >
                                    {SHIPPING_CARRIERS.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.id === 'delivery_local' && deliveryData ? `(${formatUSD(deliveryData.costUsd)})` : c.baseCost > 0 ? `(+${formatUSD(c.baseCost)})` : '(Gratis)'}
                                        </option>
                                    ))}
                                </select>
                                {shippingCarrier !== 'delivery_local' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShipping('delivery_local', 3.50);
                                            setShowDeliveryModal(true);
                                        }}
                                        title="Solicitar Delivery con Mapa"
                                        className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-colors shrink-0"
                                    >
                                        <span>🛵 Delivery</span>
                                    </button>
                                )}
                            </div>

                            {/* Active Delivery Badge Card */}
                            {shippingCarrier === 'delivery_local' && (
                                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-1">
                                    <div className="flex items-center justify-between font-bold text-blue-700 dark:text-blue-300">
                                        <div className="flex items-center gap-1.5">
                                            <span>🛵 Delivery Express</span>
                                            {deliveryData && (
                                                <span className="text-[10px] px-1.5 py-0.2 bg-blue-200 dark:bg-blue-800 rounded font-mono">
                                                    {deliveryData.distanceKm} km • ~{deliveryData.estimatedMinutes} min
                                                </span>
                                            )}
                                        </div>
                                        <span>{formatUSD(shippingCost)}</span>
                                    </div>
                                    {deliveryData?.address ? (
                                        <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate" title={deliveryData.address}>
                                            📍 {deliveryData.address}
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowDeliveryModal(true)}
                                            className="w-full py-1 text-center font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/50 rounded-lg hover:bg-amber-200 transition-colors"
                                        >
                                            ⚠️ Haz clic aquí para marcar el destino en el mapa
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Totals & Calculations */}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1.5 text-xs">
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Subtotal:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatUSD(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>IVA (16% SENIAT):</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatUSD(tax)}</span>
                            </div>
                            {igtf > 0 && (
                                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                    <span>IGTF (3% Divisas):</span>
                                    <span className="font-semibold">{formatUSD(igtf)}</span>
                                </div>
                            )}
                            {shippingCost > 0 && (
                                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                    <span>Envío:</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{formatUSD(shippingCost)}</span>
                                </div>
                            )}

                            {/* Dual Total Box */}
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-800/40">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Total a Cobrar:</span>
                                    <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                                        {formatUSD(total)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-baseline mt-0.5">
                                    <span className="text-[11px] text-gray-500">Al cambio BCV:</span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatBs(toBs(total))}
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full mt-3 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 font-bold"
                                onClick={() => setShowCheckoutModal(true)}
                            >
                                <CreditCard className="w-4 h-4" />
                                Cobrar {formatUSD(total)}
                            </Button>
                        </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Advanced Venezuelan Checkout Modal */}
            <Modal
                isOpen={showCheckoutModal}
                onClose={() => setShowCheckoutModal(false)}
                title="💳 Procesar Cobro — Métodos Venezuela"
                size="md"
            >
                <div className="space-y-4">
                    {/* Amount Banner */}
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-4 text-white text-center shadow-md">
                        <p className="text-xs font-medium uppercase tracking-wider text-blue-200">Monto Total de la Venta</p>
                        <p className="text-2xl font-black mt-0.5">{formatUSD(total)}</p>
                        <p className="text-sm font-bold text-emerald-300 mt-0.5">
                            Equivalente: {formatBs(toBs(total))} <span className="text-xs font-normal text-blue-200">(Tasa: {formatBs(rate)})</span>
                        </p>
                    </div>

                    {/* Payment Method Selector Pills */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                            Selecciona la Forma de Pago:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {paymentMethodsList.filter(pm => pm.active).map((pm) => {
                                let Icon = CreditCard;
                                if (pm.type === 'movil') Icon = Smartphone;
                                else if (pm.type === 'tarjeta') Icon = CreditCard;
                                else if (pm.type === 'efectivo') Icon = pm.currency === 'USD' ? DollarSign : Coins;
                                else if (pm.type === 'digital' || pm.type === 'banco') Icon = Building;

                                const isSelected = paymentMethod === pm.id;
                                return (
                                    <button
                                        key={pm.id}
                                        type="button"
                                        onClick={() => handleSelectPaymentMethod(pm.id)}
                                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                                            isSelected
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 mb-1" />
                                        <span className="truncate max-w-full">{pm.label}</span>
                                        <span className="text-[9px] font-mono opacity-70">({pm.currency})</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dynamic Method Form */}
                    {/* 1. PAGO MÓVIL */}
                    {paymentMethod === 'pagomovil' && (
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            {/* Store receiving info banner */}
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 p-3 rounded-lg text-xs space-y-1">
                                <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                    <span>Datos Pago Móvil de la Tienda:</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(`${settings?.pagomovilBank} - ${settings?.pagomovilPhone} - ${settings?.pagomovilRif}`, 'Datos')}
                                        className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-normal"
                                    >
                                        <Copy className="w-3 h-3" /> Copiar
                                    </button>
                                </p>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Banco: <strong>{settings?.pagomovilBank || '0134 Banesco'}</strong> | Telf: <strong>{settings?.pagomovilPhone || '0414-2345678'}</strong>
                                </p>
                                <p className="text-gray-700 dark:text-gray-300">
                                    RIF: <strong>{settings?.pagomovilRif || 'J-50123456-7'}</strong>
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Banco Emisor del Cliente
                                </label>
                                <select
                                    value={paymentBank}
                                    onChange={(e) => setPaymentBank(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white"
                                >
                                    {VENEZUELA_BANKS.map((b) => (
                                        <option key={b.code} value={`${b.code} - ${b.name}`}>
                                            {b.code} - {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Número de Referencia *
                                    </label>
                                    <Input
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder="Ej: 849201"
                                        className="text-xs font-mono"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Teléfono Emisor
                                    </label>
                                    <Input
                                        value={payerPhone}
                                        onChange={(e) => setPayerPhone(e.target.value)}
                                        placeholder="0412-1234567"
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. PUNTO DE VENTA */}
                    {paymentMethod === 'punto_venta' && (
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Banco Terminal POS
                                </label>
                                <select
                                    value={paymentBank}
                                    onChange={(e) => setPaymentBank(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="Banesco POS">Banesco POS</option>
                                    <option value="Mercantil POS">Mercantil POS</option>
                                    <option value="BDV Biopago / POS">Banco de Venezuela (Biopago/POS)</option>
                                    <option value="Bancamiga POS">Bancamiga POS</option>
                                    <option value="Provincial POS">BBVA Provincial POS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Número de Lote y Aprobación
                                </label>
                                <Input
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    placeholder="Lote: 0021 / Aprob: 49201"
                                    className="text-xs font-mono"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {/* 3. EFECTIVO USD DIVISAS */}
                    {paymentMethod === 'efectivo_usd' && (
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Monto Entregado por el Cliente ($ USD)
                                </label>
                                <Input
                                    type="number"
                                    step="1"
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(e.target.value)}
                                    placeholder={total.toFixed(0)}
                                    className="text-base font-bold text-blue-600"
                                    autoFocus
                                />
                            </div>

                            {/* Quick cash buttons */}
                            <div className="flex gap-2">
                                {[10, 20, 50, 100].map((b) => (
                                    <button
                                        key={b}
                                        type="button"
                                        onClick={() => setCashAmount(b.toString())}
                                        className="flex-1 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                        ${b}
                                    </button>
                                ))}
                            </div>

                            {/* Live Change Calculator */}
                            {cashNum >= total && (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs">
                                    <div className="flex justify-between items-center font-bold text-emerald-800 dark:text-emerald-300">
                                        <span>Vuelto / Cambio a Entregar:</span>
                                        <span className="text-base">{formatUSD(cashChange)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 mt-1">
                                        <span>O su equivalente en Bolívares:</span>
                                        <span className="font-bold">{formatBs(cashChangeBs)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. EFECTIVO BOLÍVARES */}
                    {paymentMethod === 'efectivo_bs' && (
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Monto Entregado en Bolívares (Bs.)
                                </label>
                                <Input
                                    type="number"
                                    step="10"
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(e.target.value)}
                                    placeholder={toBs(total).toFixed(0)}
                                    className="text-base font-bold text-emerald-600"
                                    autoFocus
                                />
                            </div>

                            {cashNum >= toBs(total) && (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs">
                                    <div className="flex justify-between items-center font-bold text-emerald-800 dark:text-emerald-300">
                                        <span>Vuelto / Cambio en Bolívares:</span>
                                        <span className="text-base">{formatBs(cashChangeBs)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 5. ZELLE */}
                    {paymentMethod === 'zelle' && (
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/40 p-3 rounded-lg text-xs space-y-1">
                                <p className="font-bold text-purple-800 dark:text-purple-300 flex items-center justify-between">
                                    <span>Cuenta Zelle de la Tienda:</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(settings?.zelleEmail || 'pagos@urbanstep.com', 'Zelle')}
                                        className="text-purple-600 hover:text-purple-700 flex items-center gap-1 font-normal"
                                    >
                                        <Copy className="w-3 h-3" /> Copiar
                                    </button>
                                </p>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Correo: <strong>{settings?.zelleEmail || 'pagos@urbanstep.com'}</strong>
                                </p>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Titular: <strong>{settings?.zelleHolder || 'UrbanStep LLC'}</strong>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Nombre del Titular Zelle
                                    </label>
                                    <Input
                                        value={zelleHolder}
                                        onChange={(e) => setZelleHolder(e.target.value)}
                                        placeholder="Ej: Juan Pérez"
                                        className="text-xs"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Referencia / Confirmación *
                                    </label>
                                    <Input
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder="Ej: Conf-98124"
                                        className="text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6. OTROS MÉTODOS O PERSONALIZADOS (Binance, Zinli, Transferencias, etc.) */}
                    {!['pagomovil', 'punto_venta', 'efectivo_usd', 'efectivo_bs', 'zelle'].includes(paymentMethod) && (() => {
                        const customPm = paymentMethodsList.find(m => m.id === paymentMethod);
                        if (!customPm) return null;
                        return (
                            <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 p-3 rounded-lg text-xs space-y-1">
                                    <p className="font-bold text-blue-800 dark:text-blue-300 flex items-center justify-between">
                                        <span>Datos para {customPm.label}:</span>
                                        {(customPm.account || customPm.phone || customPm.email) && (
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(customPm.account || customPm.phone || customPm.email, customPm.label)}
                                                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-normal"
                                            >
                                                <Copy className="w-3 h-3" /> Copiar
                                            </button>
                                        )}
                                    </p>
                                    {customPm.bank && <p className="text-gray-700 dark:text-gray-300">Banco / Entidad: <strong>{customPm.bank}</strong></p>}
                                    {customPm.account && <p className="text-gray-700 dark:text-gray-300">Cuenta / Wallet: <strong>{customPm.account}</strong></p>}
                                    {customPm.phone && <p className="text-gray-700 dark:text-gray-300">Teléfono / Pay ID: <strong>{customPm.phone}</strong></p>}
                                    {customPm.email && <p className="text-gray-700 dark:text-gray-300">Correo Electrónico: <strong>{customPm.email}</strong></p>}
                                    {customPm.holder && <p className="text-gray-700 dark:text-gray-300">Titular: <strong>{customPm.holder}</strong></p>}
                                    {customPm.instructions && <p className="text-[11px] text-gray-500 italic pt-1">{customPm.instructions}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            {customPm.requiresReference ? 'N° de Referencia / Comprobante *' : 'N° de Referencia (Opcional)'}
                                        </label>
                                        <Input
                                            value={paymentReference}
                                            onChange={(e) => setPaymentReference(e.target.value)}
                                            placeholder="Ej: Tx-89412 o Ref Bancaria"
                                            className="text-xs font-mono"
                                            required={customPm.requiresReference}
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Titular o Cuenta Pagadora
                                        </label>
                                        <Input
                                            value={payerPhone}
                                            onChange={(e) => setPayerPhone(e.target.value)}
                                            placeholder="Ej: Nombre o correo emisor"
                                            className="text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowCheckoutModal(false)}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="success"
                            className="flex-1 flex items-center justify-center gap-2 font-bold"
                            onClick={handleExecuteSale}
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Confirmar Cobro
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Printable Venezuelan Receipt Modal */}
            <ReceiptModal
                isOpen={Boolean(saleComplete)}
                onClose={() => setSaleComplete(null)}
                sale={saleComplete}
                settings={settings}
                onNewSale={() => setSaleComplete(null)}
            />

            {/* Interactive Delivery Map Modal */}
            <DeliveryMapModal
                isOpen={showDeliveryModal}
                onClose={() => setShowDeliveryModal(false)}
                customer={state.customer}
                initialData={deliveryData}
                onConfirm={(data) => {
                    setDeliveryData(data);
                }}
            />
        </div>
    );
}
