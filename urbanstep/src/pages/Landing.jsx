import React, { useState, useEffect, useMemo, useContext, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { productService } from '../services/productService';
import { saleService } from '../services/saleServices';
import { settingsService } from '../services/settingsService';
import { deliveryService } from '../services/deliveryService';
import { promotionService, accountService, addressBookService, wishlistService } from '../services/storefrontService';
import { cartRecoveryService, isValidPhone } from '../services/marketingService';
import { computePromotions } from '../utils/promotions';
import { tierPromotions, tierForPoints } from '../utils/loyalty';
import { getDefaultRoute } from '../utils/permissions';
import { mockProducts } from '../data/mockProducts';
import CustomerPurchaseHistoryModal from '../components/landing/CustomerPurchaseHistoryModal';
import CustomerPaymentVerificationModal from '../components/landing/CustomerPaymentVerificationModal';
import CustomerFitGuideModal from '../components/landing/CustomerFitGuideModal';
import CustomerAuthenticityModal from '../components/landing/CustomerAuthenticityModal';
import StoreHeader from './landing/StoreHeader';
import HeroCarousel from './landing/HeroCarousel';
import CatalogSection, { ProductCard } from './landing/CatalogSection';
import { cardColors, resolveActiveSize } from './landing/catalogUtils';
import { DeliveryZonesSection, DropBanner, StoreHubSection } from './landing/LocalSections';
import { TrustStrip, VipClubSection, FaqSection, SiteFooter, WhatsAppFab, MobileCartBar, FloatingDock } from './landing/LandingSections';
import CartDrawer from './landing/CartDrawer';
import CheckoutModal, { OrderSuccessModal } from './landing/CheckoutModal';
import AuthModal from './landing/AuthModal';
import CompleteProfileModal from './landing/CompleteProfileModal';
import { collectErrors, validateAddress, validatePersonName, validatePhoneVE } from '../utils/validators';
import { DELIVERY_ZONES, SHIPPING_OPTIONS, STORE, zoneByValue } from './landing/storeInfo';
import { scrollToId } from './landing/ui';

const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE;
const LOCAL_ZONE = DELIVERY_ZONES[0].value;
const NATIONAL_ZONE = DELIVERY_ZONES.find(z => z.national).value;
const SHIPPING_NOTE_PREFIX = { delivery_lara: 'Delivery Lara', pickup: 'Retiro en tienda', nacional: 'Envío nacional' };

const mapProductToCatalog = (p) => ({
    // Se conservan los campos originales (variantes pausadas, stock mínimo…) para el cálculo de existencias
    ...p,
    createdAt: p.createdAt || p.creado_el || null,
    id: p.id,
    brand: (p.brand || 'URBANSTEP').toUpperCase(),
    name: p.name,
    category: p.category || 'Sneakers',
    subtitle: p.color ? `${p.color} • ${p.category || 'Sneaker'}` : (p.category || 'Edición 2026'),
    color: p.color || (Array.isArray(p.colors) && p.colors[0]) || 'Multicolor',
    colors: Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : (p.color ? [p.color] : []),
    colorVariants: p.colorVariants || p.variantes_color || [],
    price: Number(p.price) || 120,
    tag: p.stock <= (p.minStock || 5) ? '⚡ POCAS UNIDADES' : '✓ DISPONIBLE',
    imageUrl: p.imageUrl || p.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    sizes: p.sizes || ['39', '40', '41', '42', '43'],
    sizeStock: p.sizeStock || null,
    sizeCategory: p.sizeCategory || null,
    rating: null,
    reviewsCount: 0,
    stockBadge: `${p.stock} pares disponibles`,
    stock: p.stock,
    description: p.description || 'Calzado original garantizado UrbanStep Store.'
});

const sameItem = (item, product, size, color) => (
    (item.productId === product.id || item.id === product.id) &&
    String(item.size) === String(size) &&
    (color ? String(item.color || '').toLowerCase() === String(color).toLowerCase() : true)
);

const tryOnLabel = ({ productName, color, size, backupSize }) =>
    `${productName} (${color}) talla ${size}${backupSize ? ` + respaldo talla ${backupSize}` : ''}`;

export default function Landing() {
    const { user, setUser, logout, isAuthenticated } = useAuth();
    const { isDark, toggleTheme } = useContext(ThemeContext);
    const { rate, formatBs, formatUSD, renderDualPrice } = useCurrency();
    const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, subtotal } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const isClient = user?.role === 'Cliente';

    // Catálogo — inicia vacío para reflejar el estado real de la base de datos
    const [products, setProducts] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('TODAS');
    const [selectedCategory, setSelectedCategory] = useState('TODAS');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSizes, setSelectedSizes] = useState({});
    const [selectedColors, setSelectedColors] = useState({});
    const [sortBy, setSortBy] = useState('relevancia');
    const [wishIds, setWishIds] = useState(() => wishlistService.get(null));
    const [bestsellerProducts, setBestsellerProducts] = useState([]);

    const [paymentMethods, setPaymentMethods] = useState(() => settingsService.getPaymentMethods().filter(pm => pm.active));

    // Bolsa, checkout y promociones
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [shippingOption, setShippingOption] = useState('delivery_lara');
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [orderSuccessData, setOrderSuccessData] = useState(null);
    const [promotions, setPromotions] = useState([]);
    const [couponInput, setCouponInput] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [contactConsent, setContactConsent] = useState(false);
    const [loyalty, setLoyalty] = useState(null);
    const [tryOnRequest, setTryOnRequest] = useState(null);
    const [checkoutErrors, setCheckoutErrors] = useState({});
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState({
        name: '',
        phone: '',
        address: '',
        zone: LOCAL_ZONE,
        paymentMethod: 'pagomovil',
        notes: ''
    });

    // Modales orientados al cliente
    const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false);
    const [isPaymentVerificationOpen, setIsPaymentVerificationOpen] = useState(false);
    const [isFitGuideOpen, setIsFitGuideOpen] = useState(false);
    const [isAuthenticityOpen, setIsAuthenticityOpen] = useState(false);
    const [selectedOrderForVerification, setSelectedOrderForVerification] = useState(null);

    // Portal único de acceso. Si se abrió para confirmar un pedido, el checkout se reanuda al iniciar sesión.
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authTab, setAuthTab] = useState('login');
    const [authPrefill, setAuthPrefill] = useState(null);
    const resumeCheckoutRef = useRef(false);

    const openAuth = useCallback((tab = 'login', { prefill = null, resumeCheckout = false } = {}) => {
        resumeCheckoutRef.current = resumeCheckout;
        setAuthPrefill(prefill);
        setAuthTab(tab);
        setIsAuthModalOpen(true);
    }, []);

    // Top 6 más vendidos para el hero (RPC segura productos_mas_vendidos o fallback)
    useEffect(() => {
        const pool = (products.length > 0 ? products : mockProducts.map(mapProductToCatalog)).filter(p => !p.disabled && p.stock > 0);
        if (pool.length === 0) return;
        let cancelled = false;

        const loadBestsellers = async () => {
            const sold = {};
            if (isSupabaseConfigured() && supabase) {
                try {
                    const { data, error } = await supabase.rpc('productos_mas_vendidos', { p_limite: 12 });
                    if (!error && Array.isArray(data)) {
                        data.forEach(r => {
                            if (r.producto_id) sold[r.producto_id] = Number(r.unidades) || 0;
                        });
                    }
                } catch (e) {
                    console.warn('Aviso RPC productos_mas_vendidos:', e);
                }
            }
            if (Object.keys(sold).length === 0) {
                try {
                    const sales = await saleService.getAll();
                    (Array.isArray(sales) ? sales : []).forEach(sale => (sale.items || []).forEach(it => {
                        const id = it.productId || it.id;
                        if (id) sold[id] = (sold[id] || 0) + (Number(it.quantity) || 1);
                    }));
                } catch { /* fallback */ }
            }
            const sorted = [...pool].sort((a, b) => ((sold[b.id] || 0) - (sold[a.id] || 0)) || ((b.stock || 0) - (a.stock || 0)));
            if (!cancelled) setBestsellerProducts(sorted.slice(0, 6));
        };

        loadBestsellers().catch((err) => {
            console.warn('Error calculando los más vendidos:', err);
            if (!cancelled) setBestsellerProducts(pool.slice(0, 6));
        });

        return () => { cancelled = true; };
    }, [products]);

    // Métodos de pago dinámicos desde Configuración
    useEffect(() => {
        const sync = () => setPaymentMethods(settingsService.getPaymentMethods().filter(pm => pm.active));
        window.addEventListener('payment_methods_updated', sync);
        return () => window.removeEventListener('payment_methods_updated', sync);
    }, []);

    // Si el método elegido se desactivó, se selecciona el primero disponible
    useEffect(() => {
        if (paymentMethods.length > 0 && !paymentMethods.some(pm => pm.id === checkoutForm.paymentMethod)) {
            setCheckoutForm(prev => ({ ...prev, paymentMethod: paymentMethods[0].id }));
        }
    }, [paymentMethods, checkoutForm.paymentMethod]);

    // ?login=true abre el acceso; ?cart=1 abre la bolsa; ?reset_password=true viene del correo de recuperación
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('reset_password') === 'true') openAuth('reset');
        else if (params.get('login') === 'true' && !isAuthenticated) openAuth('login');
        if (params.get('cart') === '1') setIsCartOpen(true);
    }, [location.search, isAuthenticated, openAuth]);

    // Quien entró con Google debe completar cédula, teléfono y dirección (factura fiscal y delivery)
    useEffect(() => {
        if (user?.role === 'Cliente' && user.profileComplete === false) setIsProfileOpen(true);
    }, [user]);

    // Datos del cliente con sesión y su dirección principal de la libreta
    useEffect(() => {
        if (!user) return;
        const main = addressBookService.list(user).find(a => a.isDefault);
        setCheckoutForm(prev => ({
            ...prev,
            name: user.name || prev.name,
            phone: main?.phone || user.phone || prev.phone,
            address: main?.address || user.address || prev.address,
            zone: main?.zone && DELIVERY_ZONES.some(z => z.value === main.zone) ? main.zone : prev.zone
        }));
    }, [user]);

    // Productos desde la base de datos, sincronizados en tiempo real
    useEffect(() => {
        const syncProductsList = (rawList) => {
            if (!Array.isArray(rawList)) return;
            setProducts(rawList.filter(p => !p.disabled && p.stock > 0).map(mapProductToCatalog));
        };
        const loadProducts = async () => {
            try {
                syncProductsList((await productService.getAll()) || []);
            } catch (err) {
                console.warn('Error cargando productos en landing:', err);
                setProducts([]);
            }
        };
        loadProducts();

        const handleRealtimeUpdate = (e) => (e.detail ? syncProductsList(e.detail) : loadProducts());
        window.addEventListener('products_updated', handleRealtimeUpdate);
        window.addEventListener('sales_updated', loadProducts);
        window.addEventListener('storage', loadProducts);
        return () => {
            window.removeEventListener('products_updated', handleRealtimeUpdate);
            window.removeEventListener('sales_updated', loadProducts);
            window.removeEventListener('storage', loadProducts);
        };
    }, []);

    useEffect(() => {
        setWishIds(wishlistService.get(user));
        const refresh = () => setWishIds(wishlistService.get(user));
        window.addEventListener('wishlist_changed', refresh);
        return () => window.removeEventListener('wishlist_changed', refresh);
    }, [user]);

    useEffect(() => {
        promotionService.getActive().then(setPromotions);
    }, []);

    // Nivel del Club VIP del cliente con sesión (sus beneficios se aplican solos)
    useEffect(() => {
        if (!isClient) { setLoyalty(null); return; }
        accountService.getLoyalty(user).then(setLoyalty).catch(() => setLoyalty(null));
    }, [user, isClient]);

    const availableBrands = useMemo(() => ['TODAS', ...new Set(products.map(p => p.brand).filter(Boolean))], [products]);

    const categories = useMemo(() => {
        const counts = new Map();
        products.forEach(p => counts.set(p.category, (counts.get(p.category) || 0) + 1));
        return [
            { id: 'TODAS', label: 'Todos', count: products.length },
            ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ id: name, label: name, count }))
        ];
    }, [products]);

    const filteredProducts = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const list = products.filter(p => {
            const matchBrand = selectedBrand === 'TODAS' || p.brand.includes(selectedBrand);
            const matchCategory = selectedCategory === 'TODAS' || p.category === selectedCategory;
            const matchSearch = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) ||
                (p.subtitle && p.subtitle.toLowerCase().includes(q)) || p.category.toLowerCase().includes(q);
            return matchBrand && matchCategory && matchSearch;
        });
        const sorters = {
            'precio-asc': (a, b) => a.price - b.price,
            'precio-desc': (a, b) => b.price - a.price,
            nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
            novedades: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        };
        return sorters[sortBy] ? [...list].sort(sorters[sortBy]) : list;
    }, [products, selectedBrand, selectedCategory, searchQuery, sortBy]);

    const findCartItem = (product, size, color) => cartItems.find(i => sameItem(i, product, size, color));

    const toggleWish = (product) => {
        const now = wishlistService.toggle(user, product.id);
        toast.success(now ? 'Guardado en tu lista de deseos' : 'Quitado de tu lista de deseos', { icon: now ? '❤️' : undefined });
    };

    // Agregar a la bolsa con variante de color y control estricto de stock. Devuelve true si se agregó.
    const handleAddToCart = (product, explicitColor = null, explicitSize = null, { openDrawer = true } = {}) => {
        const chosenColor = explicitColor || selectedColors[product.id] || cardColors(product)[0];
        const chosenSize = explicitSize || resolveActiveSize(product, chosenColor, selectedSizes[product.id]);
        const availableStock = productService.getAvailableStock(product, chosenSize, chosenColor);

        if (availableStock <= 0) {
            toast.error(`La talla ${chosenSize}${chosenColor ? ` en ${chosenColor}` : ''} de "${product.name}" se encuentra agotada temporalmente`);
            return false;
        }
        const inCartQty = findCartItem(product, chosenSize, chosenColor)?.quantity || 0;
        if (inCartQty >= availableStock) {
            toast.error(`Ya tienes el límite disponible (${availableStock} pares) de este modelo en tu bolsa de compras.`);
            return false;
        }

        const chosenImage = productService.getColorVariantImage(product, chosenColor) || product.imageUrl || product.image;
        addItem({ ...product, imageUrl: chosenImage, image: chosenImage }, chosenSize, 1, chosenColor);
        toast.success(`Agregado a la bolsa: ${product.name} (${chosenColor} • Talla ${chosenSize})`, { icon: '🛍️' });
        if (openDrawer) setIsCartOpen(true);
        return true;
    };

    const openCheckout = ({ skipEmptyCheck = false } = {}) => {
        if (!skipEmptyCheck && cartItems.length === 0) {
            toast('Tu bolsa está vacía: agrega un par para despacharlo', { icon: '🛍️' });
            setIsCartOpen(true);
            return;
        }
        setIsCartOpen(false);
        if (!isAuthenticated) {
            toast.error('Inicia sesión o regístrate para confirmar tu pedido', { icon: '🔒', duration: 4000 });
            openAuth('login', { resumeCheckout: true });
            return;
        }
        if (user?.profileComplete === false) {
            toast('Completa tu registro para poder facturar y despachar tu pedido', { icon: '🪪' });
            resumeCheckoutRef.current = true;
            setIsProfileOpen(true);
            return;
        }
        setCheckoutErrors({});
        setIsCheckoutModalOpen(true);
    };

    const handleShippingChange = (id) => {
        setShippingOption(id);
        if (id === 'nacional') setCheckoutForm(prev => ({ ...prev, zone: NATIONAL_ZONE }));
        if (id === 'delivery_lara') setCheckoutForm(prev => (zoneByValue(prev.zone).national ? { ...prev, zone: LOCAL_ZONE } : prev));
    };

    const handleZoneChange = (value) => {
        setCheckoutForm(prev => ({ ...prev, zone: value }));
        setShippingOption(zoneByValue(value).national ? 'nacional' : 'delivery_lara');
    };

    const handlePickup = () => {
        setShippingOption('pickup');
        toast.success('Retiro en tienda seleccionado: sin costo de flete', { icon: '🏬' });
        setIsCartOpen(true);
    };

    // Prueba en puerta: agrega la talla elegida y anota una talla de respaldo para el motorizado
    const handleTryOn = (product, color, size) => {
        if (productService.getAvailableStock(product, size, color) <= 0) {
            toast.error(`La talla ${size} en ${color} está agotada`);
            return;
        }
        if (!findCartItem(product, size, color) && !handleAddToCart(product, color, size, { openDrawer: false })) return;

        const sizes = product.sizes || [];
        const idx = sizes.findIndex(s => String(s) === String(size));
        const backupOptions = sizes.filter(s => String(s) !== String(size) && productService.getAvailableStock(product, s, color) > 0);
        const backupSize = [sizes[idx + 1], sizes[idx - 1]].find(s => s !== undefined && backupOptions.includes(s)) || backupOptions[0] || null;
        const request = { productId: product.id, productName: product.name, color, size, backupSize, backupOptions };
        setTryOnRequest({ ...request, label: tryOnLabel(request) });
        handleShippingChange('delivery_lara');
        toast.success(backupSize ? `Prueba en puerta: talla ${size} + respaldo ${backupSize}` : `Prueba en puerta: talla ${size}`, { icon: '🛵' });
        openCheckout({ skipEmptyCheck: true });
    };

    const handleBackupSize = (backupSize) => setTryOnRequest(prev => (prev ? { ...prev, backupSize, label: tryOnLabel({ ...prev, backupSize }) } : prev));

    // Si el par de la prueba sale de la bolsa, la solicitud deja de aplicar
    useEffect(() => {
        if (tryOnRequest && !cartItems.some(i => sameItem(i, { id: tryOnRequest.productId }, tryOnRequest.size, tryOnRequest.color))) {
            setTryOnRequest(null);
        }
    }, [cartItems, tryOnRequest]);

    const shippingCostUsd = SHIPPING_OPTIONS.find(o => o.id === shippingOption)?.costUsd ?? 0;

    // Carrito abandonado: solo si el cliente aceptó que lo contactemos por WhatsApp
    useEffect(() => {
        if (!contactConsent || cartItems.length === 0 || !isValidPhone(checkoutForm.phone)) return undefined;
        const t = setTimeout(() => {
            cartRecoveryService.save({ name: checkoutForm.name || user?.name, phone: checkoutForm.phone, items: cartItems, totalUsd: subtotal });
        }, 1500);
        return () => clearTimeout(t);
    }, [contactConsent, cartItems, checkoutForm.phone, checkoutForm.name, subtotal, user]);

    // Enlace de recuperación ?recover=<id>: restaura la bolsa con validación de stock
    const recoveredRef = useRef(false);
    useEffect(() => {
        const id = new URLSearchParams(location.search).get('recover');
        if (!id || recoveredRef.current || products.length === 0) return;
        recoveredRef.current = true;
        cartRecoveryService.getForRecovery(id).then((saved) => {
            if (!saved || saved.length === 0) { toast('Tu bolsa guardada ya no está disponible', { icon: 'ℹ️' }); return; }
            let restored = 0;
            saved.forEach((it) => {
                const product = products.find(p => String(p.id) === String(it.productId));
                if (!product) return;
                const stock = productService.getAvailableStock(product, it.size, it.color);
                if (stock <= 0) return;
                addItem({ ...product, imageUrl: productService.getColorVariantImage(product, it.color) || product.imageUrl }, it.size, Math.min(it.quantity, stock), it.color);
                restored += 1;
            });
            if (restored > 0) { toast.success('¡Recuperamos tu bolsa!', { icon: '🛍️' }); setIsCartOpen(true); }
            else toast.error('Lo sentimos, esos pares ya se agotaron');
        });
    }, [products, location.search, addItem]);

    const promo = useMemo(() => computePromotions({
        items: cartItems,
        subtotal,
        shippingCost: cartItems.length > 0 ? shippingCostUsd : 0,
        promotions: [...promotions, ...tierPromotions(loyalty?.tier || tierForPoints(0))],
        couponCode
    }), [cartItems, subtotal, shippingCostUsd, promotions, couponCode, loyalty]);

    const effectiveShippingUsd = cartItems.length > 0 ? Math.max(0, shippingCostUsd - promo.shippingDiscountUsd) : 0;
    const totalCartUsd = Math.max(0, subtotal - promo.discountUsd) + effectiveShippingUsd;
    const totalCartBs = totalCartUsd * rate;
    const totalItemsCount = cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0);

    const handleApplyCoupon = () => {
        const code = couponInput.trim().toUpperCase();
        if (!code) return;
        const test = computePromotions({ items: cartItems, subtotal, shippingCost: shippingCostUsd, promotions, couponCode: code });
        if (test.couponError) { toast.error(test.couponError); return; }
        setCouponCode(code);
        toast.success(`Cupón ${code} aplicado`, { icon: '🏷️' });
    };

    // =========================================================================
    // CONFIRMACIÓN DEL PEDIDO
    // =========================================================================
    const handleConfirmOrder = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0 || isSubmittingOrder) return;

        if (!isAuthenticated) {
            toast.error('Debes iniciar sesión o registrarte como cliente para realizar un pedido.', { icon: '🔒' });
            setIsCheckoutModalOpen(false);
            openAuth('login', { resumeCheckout: true });
            return;
        }
        const formErrors = collectErrors({
            name: () => validatePersonName(checkoutForm.name),
            phone: () => validatePhoneVE(checkoutForm.phone),
            address: () => (shippingOption === 'pickup' ? null : validateAddress(checkoutForm.address)),
            paymentMethod: () => (paymentMethods.some(pm => pm.id === checkoutForm.paymentMethod) ? null : 'Elige un método de pago disponible')
        });
        setCheckoutErrors(formErrors);
        if (Object.keys(formErrors).length > 0) {
            toast.error('Revisa los datos marcados en el formulario');
            return;
        }

        setIsSubmittingOrder(true);
        try {
            const isPickup = shippingOption === 'pickup';
            const zone = zoneByValue(checkoutForm.zone);
            const customerName = checkoutForm.name.trim() || (user ? user.name : 'Cliente Ecommerce');
            const customerPhone = checkoutForm.phone.trim();
            const deliveryAddress = isPickup ? `Retiro en tienda: ${STORE.address}` : `${checkoutForm.address} (${checkoutForm.zone})`.trim();
            const tryOn = shippingOption === 'delivery_lara' && tryOnRequest ? tryOnRequest.label : '';
            const paymentLabel = paymentMethods.find(pm => pm.id === checkoutForm.paymentMethod)?.label || checkoutForm.paymentMethod;

            // Vincula el pedido a la ficha del cliente para que aparezca en "Mis pedidos"
            const customerRecord = user ? await accountService.getCustomerRecord(user) : null;

            const createdSale = await saleService.create({
                customerId: customerRecord?.id || null,
                customer: customerName,
                customerPhone,
                customerDoc: customerRecord?.docNumber || 'V-00000000',
                items: cartItems.map(i => ({
                    productId: i.id || i.productId,
                    name: i.name,
                    brand: i.brand,
                    size: i.size,
                    color: i.color || null,
                    price: i.price,
                    quantity: i.quantity,
                    totalUsd: i.price * i.quantity
                })),
                subtotal,
                discount: promo.discountUsd,
                shippingCost: effectiveShippingUsd,
                total: totalCartUsd,
                bcvRate: rate,
                paymentMethod: checkoutForm.paymentMethod,
                cashier: 'Ecommerce Web',
                notes: `${SHIPPING_NOTE_PREFIX[shippingOption]}: ${deliveryAddress}. Notas: ${checkoutForm.notes || 'Sin notas'}` +
                    `${tryOn ? `. Prueba en puerta: ${tryOn}` : ''}` +
                    `${promo.applied.length ? `. Promociones: ${promo.applied.map(a => a.code).join(', ')}` : ''}`
            });

            // Registro del despacho para la flota de motorizados
            if (!isPickup) {
                try {
                    await deliveryService.createDelivery({
                        saleId: createdSale.id,
                        customerName,
                        customerPhone,
                        destinationAddress: deliveryAddress,
                        destinationLat: 10.0678,
                        destinationLng: -69.3474,
                        distanceKm: shippingOption === 'nacional' ? 350 : 7.2,
                        deliveryCostUsd: effectiveShippingUsd,
                        deliveryCostBs: Number((effectiveShippingUsd * rate).toFixed(2)),
                        estimatedMinutes: shippingOption === 'nacional' ? 1440 : zone.etaMin,
                        specialInstructions: `${shippingOption === 'nacional' ? 'Envío Nacional Encomienda' : 'Delivery Local Lara'}. ` +
                            `${tryOn ? `PRUEBA EN PUERTA: ${tryOn}. ` : ''}Notas: ${checkoutForm.notes || 'Sin instrucciones'}`
                    });
                } catch (delErr) {
                    console.warn('Aviso registrando delivery de landing:', delErr);
                }
            }

            promotionService.registerUse(promo.applied);
            cartRecoveryService.markConverted();
            setCouponCode('');
            setCouponInput('');
            setTryOnRequest(null);
            clearCart();
            setIsCheckoutModalOpen(false);
            setIsCartOpen(false);

            setOrderSuccessData({
                orderId: createdSale.id || `ORD-${Date.now().toString().slice(-6)}`,
                receiptNumber: createdSale.receiptNumber || 'TKT-ECOM-1001',
                customerName,
                totalUsd: totalCartUsd,
                totalBs: totalCartBs,
                shippingOption,
                deliveryAddress,
                paymentMethod: checkoutForm.paymentMethod,
                paymentLabel,
                eta: isPickup ? 'Listo para retirar' : zone.eta
            });
            toast.success(isPickup ? '¡Pedido recibido! Te esperamos en tienda.' : '¡Pedido recibido! Motorizado de guardia asignado.', { icon: '🚀' });
        } catch (err) {
            console.error('Error al procesar pedido:', err);
            toast.error('Error al registrar pedido. Intenta nuevamente.');
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const handleLogout = () => {
        logout();
        toast.success('Sesión finalizada');
    };

    const handleAccount = () => {
        if (!isAuthenticated) openAuth('login');
        else navigate(isClient ? '/cuenta' : getDefaultRoute(user?.role));
    };

    const browseCatalog = () => { setIsCartOpen(false); scrollToId('catalogo'); };

    const serviceHandlers = {
        onOpenOrders: () => setIsPurchaseHistoryOpen(true),
        onOpenPayment: () => setIsPaymentVerificationOpen(true),
        onOpenFitGuide: () => setIsFitGuideOpen(true),
        onOpenAuthenticity: () => setIsAuthenticityOpen(true)
    };

    const heroSlides = bestsellerProducts.length > 0 ? bestsellerProducts : (products.length > 0 ? products.slice(0, 6) : []);

    const renderCard = (product) => {
        const color = selectedColors[product.id] || cardColors(product)[0];
        const size = resolveActiveSize(product, color, selectedSizes[product.id]);
        return (
            <ProductCard
                key={product.id}
                product={product}
                selectedColor={selectedColors[product.id]}
                selectedSize={selectedSizes[product.id]}
                inCartQty={findCartItem(product, size, color)?.quantity || 0}
                isWished={wishIds.includes(product.id)}
                renderDualPrice={renderDualPrice}
                onSelectColor={(id, c) => setSelectedColors(prev => ({ ...prev, [id]: c }))}
                onSelectSize={(id, sz) => setSelectedSizes(prev => ({ ...prev, [id]: sz }))}
                onToggleWish={toggleWish}
                onAdd={handleAddToCart}
                onTryOn={handleTryOn}
            />
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-us-surface text-slate-800 dark:text-gray-200 font-us-body antialiased selection:bg-us-cyan selection:text-black transition-colors duration-200">
            <StoreHeader
                user={user}
                isAuthenticated={isAuthenticated}
                isDark={isDark}
                toggleTheme={toggleTheme}
                rate={rate}
                formatBs={formatBs}
                promotions={promotions}
                cartCount={totalItemsCount}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenCheckout={() => openCheckout()}
                onOpenAuth={(tab) => openAuth(tab)}
                onLogout={handleLogout}
                onGoToPanel={() => navigate(getDefaultRoute(user?.role))}
                {...serviceHandlers}
            />

            <main className="flex-1">
                <HeroCarousel
                    slides={heroSlides}
                    rate={rate}
                    formatBs={formatBs}
                    renderDualPrice={renderDualPrice}
                    cartCount={totalItemsCount}
                    onAddToCart={(product, color) => handleAddToCart(product, color)}
                    onOpenCart={() => setIsCartOpen(true)}
                    onOpenCheckout={() => openCheckout()}
                    onBrowse={browseCatalog}
                />

                <TrustStrip />

                <CatalogSection
                    totalCount={products.length}
                    products={filteredProducts}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onCategory={setSelectedCategory}
                    brands={availableBrands}
                    selectedBrand={selectedBrand}
                    onBrand={setSelectedBrand}
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    sortBy={sortBy}
                    onSort={setSortBy}
                    onReset={() => { setSelectedBrand('TODAS'); setSelectedCategory('TODAS'); setSearchQuery(''); }}
                    renderCard={renderCard}
                />

                <DeliveryZonesSection
                    selectedZone={checkoutForm.zone}
                    onSelectZone={handleZoneChange}
                    renderDualPrice={renderDualPrice}
                    onDispatch={() => openCheckout()}
                />

                <DropBanner whatsappPhone={WHATSAPP_PHONE} />

                <StoreHubSection paymentMethods={paymentMethods} onPickup={handlePickup} {...serviceHandlers} />

                <FaqSection />

                <VipClubSection
                    isLoggedIn={isAuthenticated}
                    loyalty={loyalty}
                    onJoin={(prefill) => openAuth('register', { prefill })}
                />
            </main>

            <SiteFooter
                rate={rate}
                formatBs={formatBs}
                paymentMethods={paymentMethods}
                whatsappPhone={WHATSAPP_PHONE}
                onLogin={() => openAuth('login')}
                onOpenCheckout={() => openCheckout()}
                onOpenAuthenticity={serviceHandlers.onOpenAuthenticity}
                onOpenFitGuide={serviceHandlers.onOpenFitGuide}
            />

            <FloatingDock
                isDark={isDark}
                toggleTheme={toggleTheme}
                cartCount={totalItemsCount}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenCheckout={() => openCheckout()}
                isAuthenticated={isAuthenticated}
                accountLabel={!isAuthenticated ? 'Login / Registro' : isClient ? 'Mi cuenta' : `Panel ${user?.role}`}
                onAccount={handleAccount}
            />
            <WhatsAppFab phone={WHATSAPP_PHONE} raised={totalItemsCount > 0} />
            <MobileCartBar count={totalItemsCount} totalLabel={renderDualPrice(totalCartUsd).primary} onOpen={() => setIsCartOpen(true)} />

            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                items={cartItems}
                totalItemsCount={totalItemsCount}
                renderDualPrice={renderDualPrice}
                formatUSD={formatUSD}
                shippingOption={shippingOption}
                onShippingChange={handleShippingChange}
                shippingCostUsd={shippingCostUsd}
                effectiveShippingUsd={effectiveShippingUsd}
                subtotal={subtotal}
                promo={promo}
                totalCartUsd={totalCartUsd}
                couponInput={couponInput}
                onCouponInput={setCouponInput}
                onApplyCoupon={handleApplyCoupon}
                couponCode={couponCode}
                onRemoveCoupon={() => { setCouponCode(''); setCouponInput(''); }}
                tryOnRequest={tryOnRequest}
                isAuthenticated={isAuthenticated}
                onRemoveItem={(item) => removeItem(item.id, item.size, item.color)}
                onChangeQty={(item, qty) => updateQuantity(item.id, item.size, qty, item.color)}
                onCheckout={() => openCheckout()}
                onBrowse={browseCatalog}
            />

            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                form={checkoutForm}
                errors={checkoutErrors}
                onFormChange={(patch) => {
                    setCheckoutForm(prev => ({ ...prev, ...patch }));
                    setCheckoutErrors(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !(k in patch))));
                }}
                onZoneChange={handleZoneChange}
                contactConsent={contactConsent}
                onConsent={setContactConsent}
                shippingOption={shippingOption}
                onShippingChange={handleShippingChange}
                paymentMethods={paymentMethods}
                tryOnRequest={tryOnRequest}
                onBackupSize={handleBackupSize}
                onClearTryOn={() => setTryOnRequest(null)}
                subtotal={subtotal}
                promo={promo}
                effectiveShippingUsd={effectiveShippingUsd}
                totalCartUsd={totalCartUsd}
                renderDualPrice={renderDualPrice}
                formatUSD={formatUSD}
                isSubmitting={isSubmittingOrder}
                onSubmit={handleConfirmOrder}
            />

            <OrderSuccessModal
                data={orderSuccessData}
                onClose={() => setOrderSuccessData(null)}
                onVerifyPayment={() => {
                    const ord = { ...orderSuccessData };
                    setOrderSuccessData(null);
                    setSelectedOrderForVerification(ord);
                    setIsPaymentVerificationOpen(true);
                }}
                onTrack={() => { setOrderSuccessData(null); setIsPurchaseHistoryOpen(true); }}
                formatUSD={formatUSD}
                formatBs={formatBs}
            />

            <AuthModal
                isOpen={isAuthModalOpen}
                initialTab={authTab}
                prefill={authPrefill}
                onClose={() => setIsAuthModalOpen(false)}
                onAuthenticated={() => {
                    if (resumeCheckoutRef.current && cartItems.length > 0) setIsCheckoutModalOpen(true);
                    resumeCheckoutRef.current = false;
                }}
            />

            <CompleteProfileModal
                isOpen={isProfileOpen}
                user={user}
                onClose={() => { setIsProfileOpen(false); resumeCheckoutRef.current = false; }}
                onCompleted={(updatedUser) => {
                    setUser(updatedUser);
                    setIsProfileOpen(false);
                    toast.success('¡Registro completo! Ya puedes comprar con delivery express.', { icon: '✅' });
                    if (resumeCheckoutRef.current && cartItems.length > 0) setIsCheckoutModalOpen(true);
                    resumeCheckoutRef.current = false;
                }}
            />

            <CustomerPurchaseHistoryModal
                isOpen={isPurchaseHistoryOpen}
                onClose={() => setIsPurchaseHistoryOpen(false)}
                currentUser={user}
                onOpenPaymentVerification={(ord) => {
                    setSelectedOrderForVerification(ord);
                    setIsPaymentVerificationOpen(true);
                }}
            />
            <CustomerPaymentVerificationModal
                isOpen={isPaymentVerificationOpen}
                onClose={() => {
                    setIsPaymentVerificationOpen(false);
                    setSelectedOrderForVerification(null);
                }}
                initialOrder={selectedOrderForVerification}
            />
            <CustomerFitGuideModal isOpen={isFitGuideOpen} onClose={() => setIsFitGuideOpen(false)} />
            <CustomerAuthenticityModal isOpen={isAuthenticityOpen} onClose={() => setIsAuthenticityOpen(false)} />
        </div>
    );
}
