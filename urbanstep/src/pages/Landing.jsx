import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { productService } from '../services/productService';
import { userService } from '../services/userService';
import { customerService } from '../services/customerService';
import { saleService } from '../services/saleServices';
import { settingsService } from '../services/settingsService';
import { deliveryService } from '../services/deliveryService';
import { promotionService, accountService, addressBookService } from '../services/storefrontService';
import { computePromotions } from '../utils/promotions';
import { cartRecoveryService, isValidPhone } from '../services/marketingService';
import { tierPromotions, tierForPoints } from '../utils/loyalty';
import { wishlistService } from '../services/storefrontService';
import { PromoBar, TrustStrip, VipClubSection, FaqSection, SiteFooter, WhatsAppFab, MobileCartBar } from './landing/LandingSections';
import { authService } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { getDefaultRoute } from '../utils/permissions';
import CinematicLandingExperience from '../components/CinematicLandingExperience';
import {
    Store,
    ShoppingBag,
    ShieldCheck,
    Truck,
    ArrowRight,
    Star,
    Heart,
    Flame,
    Sparkles,
    MapPin,
    CheckCircle2,
    Lock,
    User,
    LogIn,
    DollarSign,
    Search,
    Plus,
    Minus,
    Trash2,
    X,
    Eye,
    EyeOff,
    Check,
    CreditCard,
    Phone,
    Mail,
    LogOut,
    Sun,
    Moon,
    Package,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { mockProducts } from '../data/mockProducts';
import { getColorHex, SHOE_COLORS } from '../utils/shoeSizes';
import BrandLogo from '../ui/BrandLogo';

const mapProductToCatalog = (p) => ({
    createdAt: p.createdAt || p.creado_el || null,
    id: p.id,
    brand: (p.brand || 'URBANSTEP').toUpperCase(),
    name: p.name,
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

export default function Landing() {
    const { user, login, logout, isAuthenticated } = useAuth();
    const { isDark, toggleTheme } = useContext(ThemeContext);
    const { rate, formatBs } = useCurrency();
    const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, subtotal } = useCart();
    const navigate = useNavigate();
    const location = useLocation();

    // Catalog state — Inicializado vacío para reflejar el estado real de la base de datos
    const [products, setProducts] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('TODAS');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSizes, setSelectedSizes] = useState({});
    const [selectedColors, setSelectedColors] = useState({});

    // Top 6 Best-selling Products Carousel for Hero
    const [bestsellerProducts, setBestsellerProducts] = useState([]);
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [featuredColor, setFeaturedColor] = useState(null);
    const [isHeroPaused, setIsHeroPaused] = useState(false);

    // Compute top 6 best-selling products based on sales history & popularity
    useEffect(() => {
        const computeBestsellers = async () => {
            try {
                const sales = await saleService.getAll();
                const salesMap = {};
                if (Array.isArray(sales)) {
                    sales.forEach(sale => {
                        if (Array.isArray(sale.items)) {
                            sale.items.forEach(it => {
                                const pId = it.productId || it.id;
                                if (pId) {
                                    salesMap[pId] = (salesMap[pId] || 0) + (Number(it.quantity) || 1);
                                }
                            });
                        }
                    });
                }

                const pool = (products.length > 0 ? products : mockProducts.map(mapProductToCatalog))
                    .filter(p => !p.disabled && p.stock > 0);

                if (pool.length === 0) return;

                // Sort by sales count descending; fallback to stock
                const sorted = [...pool].sort((a, b) => {
                    const salesA = salesMap[a.id] || 0;
                    const salesB = salesMap[b.id] || 0;
                    if (salesB !== salesA) return salesB - salesA;
                    return (b.stock || 0) - (a.stock || 0);
                });

                const top6 = sorted.slice(0, Math.min(6, sorted.length));
                setBestsellerProducts(top6);
            } catch (err) {
                console.warn('Error calculating top 6 bestsellers:', err);
                const pool = (products.length > 0 ? products : mockProducts.map(mapProductToCatalog)).slice(0, 6);
                setBestsellerProducts(pool);
            }
        };

        computeBestsellers();
    }, [products]);

    // Automatic rotator timer for the top 6 bestsellers (every 4.5 seconds)
    useEffect(() => {
        if (!bestsellerProducts || bestsellerProducts.length <= 1 || isHeroPaused) return;

        const timer = setInterval(() => {
            setFeaturedIndex(prev => (prev + 1) % bestsellerProducts.length);
            setFeaturedColor(null);
        }, 4500);

        return () => clearInterval(timer);
    }, [bestsellerProducts.length, isHeroPaused]);

    // Dynamic payment methods from settings
    const [paymentMethods, setPaymentMethods] = useState(() => 
        settingsService.getPaymentMethods().filter(pm => pm.active)
    );

    useEffect(() => {
        const handleSyncPM = () => {
            setPaymentMethods(settingsService.getPaymentMethods().filter(pm => pm.active));
        };
        window.addEventListener('payment_methods_updated', handleSyncPM);
        return () => window.removeEventListener('payment_methods_updated', handleSyncPM);
    }, []);

    // Cart Drawer state
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [shippingOption, setShippingOption] = useState('delivery_lara'); // 'delivery_lara' | 'pickup' | 'nacional'
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [orderSuccessData, setOrderSuccessData] = useState(null);
    const [promotions, setPromotions] = useState([]);
    const [couponInput, setCouponInput] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [contactConsent, setContactConsent] = useState(false);
    const [sortBy, setSortBy] = useState('relevancia');
    const [wishIds, setWishIds] = useState(() => wishlistService.get(null));
    const [loyalty, setLoyalty] = useState(null);

    // Single Unified Auth Modal state
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    // Customer Registration Form state
    const [regForm, setRegForm] = useState({
        name: '',
        email: '',
        docType: 'V',
        docNumber: '',
        phone: '',
        address: '',
        password: '',
        confirmPassword: ''
    });

    // Checkout delivery form state
    const [checkoutForm, setCheckoutForm] = useState({
        name: '',
        phone: '',
        address: '',
        zone: 'Barquisimeto Este / Trinitarias',
        paymentMethod: 'pagomovil',
        notes: ''
    });

    // Open login modal if URL has ?login=true
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('login') === 'true' && !isAuthenticated) {
            setIsAuthModalOpen(true);
            setAuthTab('login');
        }
        if (params.get('cart') === '1') setIsCartOpen(true);
    }, [location.search, isAuthenticated]);

    // Pre-fill checkout form if user is logged in
    useEffect(() => {
        if (user) {
            setCheckoutForm(prev => ({
                ...prev,
                name: user.name || prev.name,
                phone: user.phone || prev.phone,
                address: user.address || prev.address
            }));
            const main = addressBookService.list(user).find(a => a.isDefault);
            if (main) {
                setCheckoutForm(prev => ({
                    ...prev,
                    address: main.address,
                    zone: main.zone || prev.zone,
                    phone: main.phone || prev.phone
                }));
            }
        }
    }, [user]);

    // Dynamic brand list based on active products
    const availableBrands = useMemo(() => {
        const set = new Set(['TODAS']);
        products.forEach(p => {
            if (p.brand) set.add(p.brand.toUpperCase());
        });
        return Array.from(set);
    }, [products]);

    // Load products from DB and keep synchronized in real time
    useEffect(() => {
        const syncProductsList = (rawList) => {
            if (!Array.isArray(rawList)) return;
            const activeDbProducts = rawList.filter(p => !p.disabled && p.stock > 0);
            const mappedDb = activeDbProducts.map(mapProductToCatalog);
            setProducts(mappedDb);
        };

        const loadProducts = async () => {
            try {
                const dbProducts = await productService.getAll();
                syncProductsList(dbProducts || []);
            } catch (err) {
                console.warn('Error cargando productos en landing:', err);
                setProducts([]);
            }
        };

        loadProducts();

        const handleRealtimeUpdate = (e) => {
            if (e.detail) {
                syncProductsList(e.detail);
            } else {
                loadProducts();
            }
        };

        const handleSync = () => loadProducts();

        window.addEventListener('products_updated', handleRealtimeUpdate);
        window.addEventListener('sales_updated', handleSync);
        window.addEventListener('storage', handleSync);

        return () => {
            window.removeEventListener('products_updated', handleRealtimeUpdate);
            window.removeEventListener('sales_updated', handleSync);
            window.removeEventListener('storage', handleSync);
        };
    }, []);

    // Filtered drops
    const filteredProducts = useMemo(() => {
        const list = products.filter(p => {
            const matchBrand = selectedBrand === 'TODAS' || p.brand.includes(selectedBrand);
            const q = searchQuery.toLowerCase().trim();
            const matchSearch = !q || (
                p.name.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q) ||
                (p.subtitle && p.subtitle.toLowerCase().includes(q))
            );
            return matchBrand && matchSearch;
        });
        const sorters = {
            'precio-asc': (a, b) => a.price - b.price,
            'precio-desc': (a, b) => b.price - a.price,
            nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
            novedades: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        };
        return sorters[sortBy] ? [...list].sort(sorters[sortBy]) : list;
    }, [products, selectedBrand, searchQuery, sortBy]);

    useEffect(() => {
        setWishIds(wishlistService.get(user));
        const refresh = () => setWishIds(wishlistService.get(user));
        window.addEventListener('wishlist_changed', refresh);
        return () => window.removeEventListener('wishlist_changed', refresh);
    }, [user]);

    const toggleWish = (product) => {
        const now = wishlistService.toggle(user, product.id);
        toast.success(now ? 'Guardado en tu lista de deseos' : 'Quitado de tu lista de deseos', { icon: now ? '❤️' : undefined });
    };

    // Size selection handler per product
    const handleSelectSize = (productId, size) => {
        setSelectedSizes(prev => ({ ...prev, [productId]: size }));
    };

    // Add to cart handler with color variant support and strict stock checking
    const handleAddToCart = (product, explicitColor = null, explicitSize = null) => {
        const prodColors = Array.isArray(product.colors) && product.colors.length > 0 
            ? product.colors 
            : (product.color ? [product.color] : ['Original']);
        const chosenColor = explicitColor || selectedColors[product.id] || prodColors[0];
        const chosenSize = explicitSize || selectedSizes[product.id] || (product.sizes && product.sizes[0]) || '41';
        const availableStock = productService.getAvailableStock(product, chosenSize, chosenColor);

        if (availableStock <= 0) {
            toast.error(`La talla ${chosenSize}${chosenColor ? ` en ${chosenColor}` : ''} de "${product.name}" se encuentra agotada temporalmente`);
            return;
        }

        const existingItem = cartItems.find(i => 
            (i.productId === product.id || i.id === product.id) && 
            String(i.size) === String(chosenSize) && 
            (chosenColor ? String(i.color || '').toLowerCase() === String(chosenColor).toLowerCase() : true)
        );
        const inCartQty = existingItem ? existingItem.quantity : 0;

        if (inCartQty >= availableStock) {
            toast.error(`Ya tienes el límite disponible (${availableStock} pares) de este modelo en tu bolsa de compras.`);
            return;
        }

        const chosenImage = productService.getColorVariantImage(product, chosenColor) || product.imageUrl || product.image;
        addItem({
            ...product,
            imageUrl: chosenImage,
            image: chosenImage
        }, chosenSize, 1, chosenColor);
        toast.success(`Agregado a la bolsa: ${product.name} (${chosenColor} • Talla ${chosenSize})`, {
            icon: '🛍️'
        });
        setIsCartOpen(true);
    };

    // Shipping cost calculation
    const shippingCostUsd = useMemo(() => {
        if (shippingOption === 'delivery_lara') return 3.00;
        if (shippingOption === 'nacional') return 5.00;
        return 0; // pickup
    }, [shippingOption]);

    useEffect(() => {
        promotionService.getActive().then(setPromotions);
    }, []);

    // Nivel del Club VIP del cliente con sesión iniciada (sus beneficios se aplican solos)
    useEffect(() => {
        if (user?.role !== 'Cliente') { setLoyalty(null); return; }
        accountService.getLoyalty(user).then(setLoyalty).catch(() => setLoyalty(null));
    }, [user]);

    // Carrito abandonado: solo si el cliente aceptó que lo contactemos por WhatsApp
    useEffect(() => {
        if (!contactConsent || cartItems.length === 0 || !isValidPhone(checkoutForm.phone)) return undefined;
        const t = setTimeout(() => {
            cartRecoveryService.save({ name: checkoutForm.name || user?.name, phone: checkoutForm.phone, items: cartItems, totalUsd: subtotal });
        }, 1500);
        return () => clearTimeout(t);
    }, [contactConsent, cartItems, checkoutForm.phone, checkoutForm.name, subtotal, user]);

    // Enlace de recuperación ?recover=<id>: restaura la bolsa con validación de stock
    const recoveredRef = React.useRef(false);
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
                if (productService.getAvailableStock(product, it.size, it.color) <= 0) return;
                addItem({ ...product, imageUrl: productService.getColorVariantImage(product, it.color) || product.imageUrl }, it.size, Math.min(it.quantity, productService.getAvailableStock(product, it.size, it.color)), it.color);
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

    const handleApplyCoupon = () => {
        const code = couponInput.trim().toUpperCase();
        if (!code) return;
        const test = computePromotions({ items: cartItems, subtotal, shippingCost: shippingCostUsd, promotions, couponCode: code });
        if (test.couponError) {
            toast.error(test.couponError);
            return;
        }
        setCouponCode(code);
        toast.success(`Cupón ${code} aplicado`, { icon: '🏷️' });
    };
    const totalCartBs = totalCartUsd * rate;
    const totalItemsCount = cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0);

    // =========================================================================
    // SINGLE UNIFIED LOGIN (Handles Admin, Cajero, Supervisor, Cliente)
    // =========================================================================
    const handleUnifiedLogin = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');

        if (!loginEmail.trim() || !loginPassword.trim()) {
            setAuthError('Por favor ingresa tu correo y contraseña');
            setAuthLoading(false);
            return;
        }

        try {
            const res = await login(loginEmail.trim(), loginPassword.trim());
            if (res.success) {
                const loggedUser = res.user;
                setIsAuthModalOpen(false);

                // Role-based routing:
                if (loggedUser.role === 'Admin') {
                    toast.success(`Bienvenido Administrador, ${loggedUser.name}`);
                    navigate('/', { replace: true });
                } else if (loggedUser.role === 'Cajero') {
                    toast.success(`Terminal de Caja asignado: ${loggedUser.assignedCaja || 'Caja 1'}`);
                    navigate('/cashier', { replace: true });
                } else if (loggedUser.role === 'Supervisor') {
                    toast.success(`Panel de Supervisión y Auditoría`);
                    navigate('/reports', { replace: true });
                } else {
                    // Cliente role: stays on Ecommerce Storefront with user session
                    toast.success(`¡Bienvenido de nuevo, ${loggedUser.name}!`);
                }
            } else {
                setAuthError(res.error || 'Credenciales inválidas');
            }
        } catch (err) {
            setAuthError(err.message || 'Error de conexión con el sistema');
        } finally {
            setAuthLoading(false);
        }
    };

    // =========================================================================
    // CLIENT SELF-REGISTRATION (Consumer Experience from Landing)
    // =========================================================================
    const handleClientRegister = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');

        if (!regForm.name.trim() || !regForm.email.trim() || !regForm.password.trim()) {
            setAuthError('Por favor completa todos los campos requeridos');
            setAuthLoading(false);
            return;
        }

        if (regForm.password !== regForm.confirmPassword) {
            setAuthError('Las contraseñas no coinciden');
            setAuthLoading(false);
            return;
        }

        if (regForm.password.length < 4) {
            setAuthError('La contraseña debe tener al menos 4 caracteres');
            setAuthLoading(false);
            return;
        }

        try {
            // 1. Create client in userService
            const newUser = await userService.create({
                name: regForm.name.trim(),
                email: regForm.email.trim(),
                password: regForm.password.trim(),
                role: 'Cliente',
                assignedCaja: 'Tienda Online',
                branch: 'Ecommerce Online'
            });

            // 2. Register in customerService
            const nameParts = regForm.name.trim().split(' ');
            const firstName = nameParts[0] || 'Cliente';
            const lastName = nameParts.slice(1).join(' ') || 'Online';
            const docNumber = regForm.docNumber ? `${regForm.docType}-${regForm.docNumber.trim()}` : `V-${Date.now().toString().slice(-8)}`;

            await customerService.create({
                firstName,
                lastName,
                docType: regForm.docType,
                docNumber,
                email: regForm.email.trim(),
                phone: regForm.phone.trim() || '0414-0000000',
                state: 'Lara',
                city: 'Barquisimeto',
                address: regForm.address.trim() || 'Barquisimeto, Estado Lara'
            });

            // 3. Immediately log the newly registered client in
            const loginRes = await login(regForm.email.trim(), regForm.password.trim());
            if (loginRes.success) {
                toast.success('¡Tu cuenta de cliente ha sido creada con éxito!', { icon: '🎉' });
                setIsAuthModalOpen(false);
            } else {
                toast.success('Cuenta creada. Ya puedes iniciar sesión.');
                setAuthTab('login');
                setLoginEmail(regForm.email);
            }
        } catch (err) {
            setAuthError(err.message || 'Error al crear cuenta de cliente');
        } finally {
            setAuthLoading(false);
        }
    };

    // =========================================================================
    // CHECKOUT ORDER SUBMISSION
    // =========================================================================
    const handleConfirmOrder = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0) return;

        if (!isAuthenticated) {
            toast.error('Debes iniciar sesión o registrarte como cliente para realizar un pedido.', { icon: '🔒' });
            setIsCheckoutModalOpen(false);
            setAuthTab('login');
            setIsAuthModalOpen(true);
            return;
        }

        try {
            const customerName = checkoutForm.name.trim() || (user ? user.name : 'Cliente Ecommerce');
            const customerPhone = checkoutForm.phone.trim() || '0414-1234567';
            const deliveryAddress = `${checkoutForm.address} (${checkoutForm.zone})`.trim();

            // Vincula el pedido a la ficha del cliente para que aparezca en "Mis pedidos"
            const customerRecord = user ? await accountService.getCustomerRecord(user) : null;

            const orderPayload = {
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
                subtotal: subtotal,
                discount: promo.discountUsd,
                shippingCost: effectiveShippingUsd,
                total: totalCartUsd,
                bcvRate: rate,
                paymentMethod: checkoutForm.paymentMethod,
                cashier: 'Ecommerce Web',
                notes: `Delivery Lara: ${deliveryAddress}. Notas: ${checkoutForm.notes}${promo.applied.length ? `. Promociones: ${promo.applied.map(a => a.code).join(', ')}` : ''}`
            };

            const createdSale = await saleService.create(orderPayload);

            // Register delivery record in Supabase Cloud
            if (shippingOption === 'delivery_lara' || shippingOption === 'nacional') {
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
                        estimatedMinutes: shippingOption === 'nacional' ? 1440 : 35,
                        specialInstructions: `${shippingOption === 'nacional' ? 'Envío Nacional Encomienda' : 'Delivery Local Lara'}. Notas: ${checkoutForm.notes || 'Sin instrucciones'}`,
                    });
                } catch (delErr) {
                    console.warn('Aviso registrando delivery de landing:', delErr);
                }
            }

            promotionService.registerUse(promo.applied);
            cartRecoveryService.markConverted();
            setCouponCode('');
            setCouponInput('');
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
                paymentMethod: checkoutForm.paymentMethod
            });

            toast.success('¡Pedido recibido! Motorizado de guardia asignado.', { icon: '🚀' });
        } catch (err) {
            console.error('Error al procesar pedido:', err);
            toast.error('Error al registrar pedido. Intenta nuevamente.');
        }
    };

    // Current featured bestseller product for Hero rotator
    const currentFeatured = (bestsellerProducts && bestsellerProducts.length > 0)
        ? (bestsellerProducts[featuredIndex % bestsellerProducts.length] || bestsellerProducts[0])
        : (products[0] || mockProducts[0]);

    const featuredColors = useMemo(() => {
        if (!currentFeatured) return [];
        if (Array.isArray(currentFeatured.colors) && currentFeatured.colors.length > 0) {
            return currentFeatured.colors;
        }
        if (currentFeatured.color) return [currentFeatured.color];
        return [];
    }, [currentFeatured]);

    const activeFeaturedColor = featuredColor || (featuredColors.length > 0 ? featuredColors[0] : (currentFeatured?.color || 'Original'));

    const activeFeaturedImage = useMemo(() => {
        if (!currentFeatured) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800';
        return productService.getColorVariantImage(currentFeatured, activeFeaturedColor) ||
            currentFeatured.imageUrl ||
            currentFeatured.image ||
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800';
    }, [currentFeatured, activeFeaturedColor]);

    const handleNextFeatured = () => {
        if (!bestsellerProducts || bestsellerProducts.length === 0) return;
        setFeaturedIndex(prev => (prev + 1) % bestsellerProducts.length);
        setFeaturedColor(null);
    };

    const handlePrevFeatured = () => {
        if (!bestsellerProducts || bestsellerProducts.length === 0) return;
        setFeaturedIndex(prev => (prev - 1 + bestsellerProducts.length) % bestsellerProducts.length);
        setFeaturedColor(null);
    };

    const handleRandomFeatured = () => {
        if (!bestsellerProducts || bestsellerProducts.length <= 1) return;
        setFeaturedIndex(prev => {
            let next = Math.floor(Math.random() * bestsellerProducts.length);
            if (next === prev) next = (prev + 1) % bestsellerProducts.length;
            return next;
        });
        setFeaturedColor(null);
    };

    return (
        <div className={`min-h-screen font-sans selection:bg-blue-600 selection:text-white flex flex-col transition-colors duration-200 ${
            isDark ? 'bg-[#07090e] text-gray-100' : 'bg-gray-50 text-gray-900'
        }`}>
            <PromoBar promotions={promotions} />

            {/* Live Ticker Bar: BCV Official Rate & Lara Express Delivery */}
            <div className={`border-b text-[11px] py-2 px-4 sticky top-0 z-40 backdrop-blur-md transition-colors ${
                isDark
                    ? 'bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-blue-900/40 text-gray-300'
                    : 'bg-blue-950 text-blue-100 border-blue-900'
            }`}>
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 font-mono">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            TASA OFICIAL BCV: {formatBs(rate)} / USD
                        </span>
                        <span className="hidden sm:inline text-gray-500">|</span>
                        <span className="hidden sm:flex items-center gap-1 text-blue-300">
                            <MapPin className="w-3 h-3 text-red-500" />
                            ESTADO LARA: DESPACHO EXPRESS 45 MIN (BARQUISIMETO & CABUDARE)
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-gray-400">
                        <span className="hidden md:flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-blue-400" />
                            100% SNEAKERS ORIGINALES
                        </span>

                        {isAuthenticated ? (
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold">{user?.name} ({user?.role})</span>
                                {user?.role !== 'Cliente' ? (
                                    <button
                                        onClick={() => navigate(getDefaultRoute(user?.role))}
                                        className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors"
                                    >
                                        Ir al Panel →
                                    </button>
                                ) : (
                                    <Link to="/cuenta" className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors">Mi cuenta</Link>
                                )}
                                {user?.role === 'Cliente' && (
                                    <button
                                        onClick={() => {
                                            logout();
                                            toast.success('Sesión finalizada');
                                        }}
                                        className="px-2 py-0.5 rounded bg-red-900/60 text-red-200 hover:bg-red-800 text-[10px]"
                                    >
                                        Salir
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    setIsAuthModalOpen(true);
                                    setAuthTab('login');
                                }}
                                className="text-blue-400 hover:text-white font-bold flex items-center gap-1 transition-colors"
                            >
                                <LogIn className="w-3 h-3" />
                                Iniciar Sesión / Mi Cuenta
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Ecommerce Header */}
            <header className={`border-b sticky top-9 z-30 backdrop-blur-xl transition-colors ${
                isDark ? 'border-white/[0.06] bg-black/60' : 'border-gray-200 bg-white/90 shadow-sm'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
                    {/* Official Brand Logo */}
                    <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <BrandLogo variant="compact" size="lg" />
                    </div>

                    {/* Search Bar */}
                    <div className="hidden md:flex flex-1 max-w-md mx-4">
                        <div className="relative w-full">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar silueta: Dunk Panda, Jordan 1, Samba, Yeezy..."
                                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors ${
                                    isDark
                                        ? 'bg-white/[0.05] border border-white/10 text-white placeholder-gray-500'
                                        : 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-400'
                                }`}
                            />
                        </div>
                    </div>

                    {/* Actions: Theme Toggle + Shopping Bag + Unified Login */}
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        {/* Dark / Light Mode Switcher */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${
                                isDark
                                    ? 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-amber-400'
                                    : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-blue-600'
                            }`}
                            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                        >
                            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
                        </button>

                        {/* Shopping Bag Button */}
                        <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-bold text-xs transition-all active:scale-95 shadow-sm ${
                                isDark
                                    ? 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900'
                            }`}
                            title="Ver bolsa de compras"
                        >
                            <ShoppingBag className="w-4 h-4 text-blue-500" />
                            <span className="hidden sm:inline">Bolsa</span>
                            {totalItemsCount > 0 && (
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                                    {totalItemsCount}
                                </span>
                            )}
                        </button>

                        {/* Unified Auth Button */}
                        {isAuthenticated ? (
                            <div className="flex items-center gap-2">
                                {user?.role === 'Cliente' ? (
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                                        isDark
                                            ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                                            : 'bg-blue-50 border-blue-200 text-blue-700'
                                    }`}>
                                        <User className="w-3.5 h-3.5" />
                                        <span>Hola, {user.name.split(' ')[0]}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => navigate(getDefaultRoute(user?.role))}
                                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                                    >
                                        <span>Panel {user?.role}</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    setIsAuthModalOpen(true);
                                    setAuthTab('login');
                                }}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 shrink-0 ${
                                    isDark
                                        ? 'bg-white text-black hover:bg-gray-200 shadow-white/10'
                                        : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
                                }`}
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Iniciar Sesión</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Banner with Three.js + GSAP ScrollTrigger Cinematic Experience */}
            <section className={`relative overflow-hidden pt-6 pb-16 md:pt-10 md:pb-24 border-b transition-colors ${
                isDark 
                    ? 'border-white/[0.06] bg-[#07090e]' 
                    : 'border-slate-200/80 bg-gradient-to-b from-blue-50/70 via-white to-slate-50/40'
            }`}>
                {/* 3D Cinematic Canvas & Camera Depth Rig (Three.js + GSAP ScrollTrigger) */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <CinematicLandingExperience isDark={isDark} activeBrand={selectedBrand} />
                </div>

                {/* Ambient glow - subtle and de-noised for dark mode, fresh for light mode */}
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[550px] rounded-full blur-[160px] pointer-events-none ${
                    isDark ? 'bg-blue-600/[0.05]' : 'bg-blue-400/10'
                }`} />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-5">
                            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-colors ${
                                isDark 
                                    ? 'bg-blue-950/70 border border-blue-500/30 text-blue-300' 
                                    : 'bg-blue-50 border border-blue-200 text-blue-800 shadow-xs'
                            }`}>
                                <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                SNEAKERS & STREETWEAR STORE • VENEZUELA 2026
                            </div>

                            <h1 className={`text-4xl sm:text-6xl md:text-7xl font-black uppercase italic tracking-tight leading-[0.95] ${
                                isDark ? 'text-white' : 'text-slate-950'
                            }`}>
                                THE STREETS <br />
                                <span className={
                                    isDark 
                                        ? 'bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent' 
                                        : 'bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 bg-clip-text text-transparent'
                                }>
                                    ARE YOURS.
                                </span>
                            </h1>

                            <p className={`text-sm sm:text-base max-w-xl font-normal leading-relaxed ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                                Encuentra las siluetas más buscadas de <strong>Nike, Air Jordan, Adidas y Yeezy</strong>. Precios en tiempo real en <strong>Dólares ($)</strong> y <strong>Bolívares (Bs.)</strong> a tasa oficial BCV, con entrega express en el <strong>Estado Lara</strong> y envíos asegurados a toda Venezuela.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                <button
                                    onClick={() => {
                                        const el = document.getElementById('catalogo');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-xl shadow-blue-600/30 flex items-center gap-2 active:scale-95"
                                >
                                    Ver Catálogo y Drops
                                    <ArrowRight className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={() => setIsCartOpen(true)}
                                    className={`px-5 py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 ${
                                        isDark 
                                            ? 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-white' 
                                            : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
                                    }`}
                                >
                                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                                    Mi Bolsa ({totalItemsCount})
                                </button>
                            </div>
                        </div>

                        {/* Right: Featured Showcase Card — Top 6 Bestsellers Animated Rotator */}
                        <div 
                            className="lg:col-span-5"
                            onMouseEnter={() => setIsHeroPaused(true)}
                            onMouseLeave={() => setIsHeroPaused(false)}
                        >
                            <div className={`p-6 rounded-3xl border shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-300 ${
                                isDark 
                                    ? 'bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-white/[0.01] border-white/10 shadow-black/60' 
                                    : 'bg-white/95 border-slate-200/90 shadow-slate-300/50'
                            }`}>
                                {/* Header with Rank Badge & Manual Rotator Controls */}
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-xs">
                                            <Flame className="w-3 h-3 fill-amber-400 text-amber-400 animate-pulse" />
                                            #{bestsellerProducts.length > 0 ? (featuredIndex % bestsellerProducts.length) + 1 : 1} MÁS VENDIDO
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
                                            TOP 6 DROPS
                                        </span>
                                    </div>

                                    {/* Navigation arrows & random shuffle */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleRandomFeatured}
                                            title="Cambiar a otro drop aleatorio"
                                            className={`p-1.5 rounded-lg border transition-all active:scale-90 text-[10px] flex items-center gap-1 font-mono ${
                                                isDark 
                                                    ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10' 
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                            }`}
                                        >
                                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePrevFeatured}
                                            title="Drop anterior"
                                            className={`p-1.5 rounded-lg border transition-all active:scale-90 ${
                                                isDark 
                                                    ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10' 
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                            }`}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleNextFeatured}
                                            title="Siguiente drop"
                                            className={`p-1.5 rounded-lg border transition-all active:scale-90 ${
                                                isDark 
                                                    ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10' 
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                            }`}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Sneaker Stage / Studio Frame with interactive color swapping */}
                                <div className={`relative w-full h-64 sm:h-72 shrink-0 flex items-center justify-center p-3 mb-4 rounded-2xl overflow-hidden border transition-all duration-500 group/stage ${
                                    isDark 
                                        ? 'bg-gradient-to-b from-[#111625] via-[#090d18] to-[#05070d] border-white/10 shadow-inner' 
                                        : 'bg-gradient-to-b from-white via-slate-50 to-slate-100 border-slate-200 shadow-sm'
                                }`}>
                                    {/* Ambient radial lighting spotlight */}
                                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18)_0%,transparent_75%)] pointer-events-none" />

                                    {/* High-impact Sneaker Image that reacts immediately to active color */}
                                    <img
                                        key={`${currentFeatured?.id}-${activeFeaturedColor}`}
                                        src={activeFeaturedImage}
                                        alt={`${currentFeatured?.name} - ${activeFeaturedColor}`}
                                        className="w-full h-full max-h-full max-w-full object-contain filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.38)] group-hover/stage:scale-105 group-hover/stage:-translate-y-1 transition-all duration-300 relative z-10 animate-fade-in"
                                    />

                                    {/* Floating Stock Badge bottom-left */}
                                    <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-emerald-400 shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>{currentFeatured?.stockBadge || `${currentFeatured?.stock || 0} pares disponibles`}</span>
                                    </div>

                                    {/* Reference-style Vertical Circular Color Swatches Pill (floating on bottom-right of image) */}
                                    {featuredColors.length > 0 && (
                                        <div 
                                            className="absolute bottom-3 right-3 z-20 bg-black/70 hover:bg-black/90 backdrop-blur-md p-1.5 rounded-2xl flex flex-col items-center gap-1.5 border border-white/20 shadow-xl transition-all"
                                            title={`${featuredColors.length} colores disponibles: ${featuredColors.join(', ')}`}
                                        >
                                            {featuredColors.map((colName) => {
                                                const hex = getColorHex(colName);
                                                const isSelected = activeFeaturedColor.toLowerCase() === colName.toLowerCase();
                                                return (
                                                    <button
                                                        key={colName}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFeaturedColor(colName);
                                                        }}
                                                        title={`Ver en color ${colName}`}
                                                        className={`w-5 h-5 rounded-full transition-transform hover:scale-125 border ${
                                                            isSelected 
                                                                ? 'ring-2 ring-blue-400 border-white scale-110 shadow-md' 
                                                                : 'border-white/50 hover:border-white opacity-80 hover:opacity-100'
                                                        }`}
                                                        style={{ background: hex }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Sneaker Info & Selected Color */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-mono text-blue-600 dark:text-blue-400 uppercase font-black tracking-wider">
                                            {currentFeatured?.brand}
                                        </p>

                                    </div>
                                    <h3 className={`text-lg font-black tracking-tight line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {currentFeatured?.name}
                                    </h3>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                        {currentFeatured?.subtitle || currentFeatured?.category || 'Sneaker Edición Especial'}
                                    </p>
                                </div>

                                {/* Interactive Color Chips if multiple colors available */}
                                {featuredColors.length > 1 && (
                                    <div className="mt-3 pt-3 border-t border-white/10 dark:border-white/10 border-slate-200/80">
                                        <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                                            <span className={isDark ? "text-gray-400" : "text-slate-500"}>Color activo:</span>
                                            <span className={`font-bold uppercase ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                {activeFeaturedColor}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {featuredColors.map((cName) => {
                                                const isSelected = activeFeaturedColor.toLowerCase() === cName.toLowerCase();
                                                const hex = getColorHex(cName);
                                                return (
                                                    <button
                                                        key={cName}
                                                        type="button"
                                                        onClick={() => setFeaturedColor(cName)}
                                                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                                                            isSelected
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-1 ring-blue-500'
                                                                : isDark
                                                                    ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                                        }`}
                                                    >
                                                        <span 
                                                            className="w-3 h-3 rounded-full border border-white/60 shadow-2xs shrink-0" 
                                                            style={{ background: hex }} 
                                                        />
                                                        <span>{cName}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Price and Buy CTA */}
                                <div className={`mt-4 pt-4 border-t flex items-center justify-between gap-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Precio Drop Oficial</p>
                                        <p className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                            ${currentFeatured?.price}{' '}
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                ({formatBs(((currentFeatured?.price || 0) * rate))})
                                            </span>
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleAddToCart(currentFeatured, activeFeaturedColor)}
                                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95"
                                    >
                                        <ShoppingBag className="w-4 h-4" />
                                        <span>Comprar</span>
                                    </button>
                                </div>

                                {/* 6 Bestseller Dots / Indicator Pills */}
                                {bestsellerProducts.length > 1 && (
                                    <div className="mt-4 pt-3 border-t border-dashed border-white/10 dark:border-white/10 border-slate-200 flex items-center justify-between">
                                        <span className="text-[10px] font-mono text-gray-400">
                                            {isHeroPaused ? '⏸ En pausa (explorando)' : '⚡ Rotando Drops Top 6'}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {bestsellerProducts.map((p, idx) => {
                                                const isActive = (featuredIndex % bestsellerProducts.length) === idx;
                                                return (
                                                    <button
                                                        key={p.id || idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setFeaturedIndex(idx);
                                                            setFeaturedColor(null);
                                                        }}
                                                        title={`Ver #${idx + 1}: ${p.name}`}
                                                        className={`h-2 rounded-full transition-all duration-300 ${
                                                            isActive
                                                                ? 'w-6 bg-blue-600 shadow-sm shadow-blue-500/50'
                                                                : 'w-2 bg-gray-400/40 hover:bg-gray-400'
                                                        }`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Official Brand Strip — "Las Mejores Marcas, En Un Solo Lugar" */}
            <section className={`border-b py-6 transition-colors ${
                isDark ? 'border-white/[0.06] bg-black/50' : 'border-slate-200 bg-white shadow-xs'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-sm shadow-blue-500" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-blue-500">
                                    LAS MEJORES MARCAS, EN UN SOLO LUGAR
                                </p>
                                <p className="text-[10px] font-mono text-gray-400">
                                    Distribuidores oficiales & siluetas exclusivas en Barquisimeto
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                            {[
                                { name: 'NIKE', tag: 'Dunk & Air Max', icon: '⚡' },
                                { name: 'VANS', tag: 'Knu Skool & Old Skool', icon: '🛹' },
                                { name: 'ADIDAS', tag: 'Samba & Originals', icon: '👟' },
                                { name: 'RS21', tag: 'Urban Streetwear', icon: '🔥' },
                                { name: 'PUMA', tag: 'Palermo & Suede', icon: '🐆' },
                            ].map(brandItem => {
                                const isCurrent = selectedBrand.toUpperCase() === brandItem.name.toUpperCase();
                                return (
                                    <button
                                        key={brandItem.name}
                                        type="button"
                                        onClick={() => {
                                            setSelectedBrand(brandItem.name);
                                            const el = document.getElementById('catalogo');
                                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className={`group px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 active:scale-95 ${
                                            isCurrent
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                                                : isDark
                                                    ? 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 text-gray-300 hover:text-white'
                                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                                        }`}
                                    >
                                        <span className="text-xs font-black italic tracking-wider font-sans group-hover:scale-105 transition-transform">
                                            {brandItem.name}
                                        </span>
                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                            isCurrent 
                                                ? 'bg-blue-800 text-blue-100' 
                                                : isDark ? 'bg-white/5 text-gray-400' : 'bg-white text-slate-500 border border-slate-200'
                                        }`}>
                                            {brandItem.tag}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            <TrustStrip isDark={isDark} />

            {/* Catalog Section */}
            <main id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full space-y-8">
                {/* Brand Filter Pills without scrollbars */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                        {availableBrands.map((brand) => (
                            <button
                                key={brand}
                                type="button"
                                onClick={() => setSelectedBrand(brand)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                    selectedBrand === brand
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                        : isDark
                                            ? 'bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                                            : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 shadow-sm'
                                }`}
                            >
                                {brand}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <p className="text-xs text-gray-400 font-mono hidden sm:block">
                            <strong className={isDark ? "text-white" : "text-gray-900"}>{filteredProducts.length}</strong> calzados
                        </p>
                        <label className="sr-only" htmlFor="catalog-sort">Ordenar catálogo</label>
                        <select
                            id="catalog-sort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className={`text-xs font-bold rounded-xl px-3 py-2 border outline-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}
                        >
                            <option value="relevancia">Ordenar: relevancia</option>
                            <option value="novedades">Novedades</option>
                            <option value="precio-asc">Precio: menor a mayor</option>
                            <option value="precio-desc">Precio: mayor a menor</option>
                            <option value="nombre">Nombre A-Z</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => {
                        const priceBs = product.price * rate;
                        const prodColors = Array.isArray(product.colors) && product.colors.length > 0 
                            ? product.colors 
                            : (product.color ? [product.color] : ['Multicolor']);
                        const activeColor = selectedColors[product.id] || prodColors[0];
                        const currentVariantStock = productService.getColorSizeStock(product, activeColor);
                        const activeSize = selectedSizes[product.id] || (product.sizes && product.sizes[0]) || '41';
                        const activeImage = productService.getColorVariantImage(product, activeColor) || product.imageUrl || product.image;

                        return (
                            <div
                                key={product.id}
                                className={`group rounded-3xl border p-5 transition-all duration-300 flex flex-col justify-between shadow-xl min-w-0 ${
                                    isDark
                                        ? 'bg-[#0b0e18] border-slate-800/80 hover:border-blue-500/50 hover:bg-[#0f1322]'
                                        : 'bg-white border-slate-200/90 hover:border-blue-500 hover:shadow-xl shadow-slate-200/50'
                                }`}
                            >
                                <div className="min-w-0">
                                    {/* Top Tag & Rating */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                {product.tag}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-500/10 text-gray-400 border border-slate-500/20">
                                                {product.brand}
                                            </span>
                                        </div>
                                        {product.rating ? (
                                            <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                                <span>{product.rating}</span>
                                            </div>
                                        ) : <span />}
                                    </div>

                                    {/* Image Thumbnail wrapper — High-end Sneaker Studio Frame matching reference */}
                                    <div className={`w-full h-60 sm:h-64 shrink-0 relative overflow-hidden rounded-2xl p-3 flex items-center justify-center mb-4 border transition-all duration-300 ${
                                        isDark 
                                            ? 'bg-gradient-to-b from-[#0e1322] via-[#090d18] to-[#060810] border-slate-800/80 group-hover:border-blue-500/40 shadow-inner' 
                                            : 'bg-gradient-to-b from-white via-slate-50 to-slate-100/90 border-slate-200 group-hover:border-blue-400/50 shadow-sm'
                                    }`}>
                                        {/* Subtle ambient lighting spotlight */}
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12)_0%,transparent_75%)] pointer-events-none" />
                                        <img
                                            src={activeImage}
                                            alt={`${product.name} - ${activeColor}`}
                                            key={`${product.id}-${activeColor}`}
                                            className="w-full h-full max-h-full max-w-full object-contain filter drop-shadow-[0_14px_22px_rgba(0,0,0,0.28)] group-hover:scale-[1.04] group-hover:-translate-y-1 transition-all duration-300 relative z-10"
                                            loading="lazy"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => toggleWish(product)}
                                            aria-pressed={wishIds.includes(product.id)}
                                            aria-label={wishIds.includes(product.id) ? `Quitar ${product.name} de la lista de deseos` : `Guardar ${product.name} en la lista de deseos`}
                                            className="absolute top-2.5 right-2.5 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
                                        >
                                            <Heart className={`w-[18px] h-[18px] ${wishIds.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                                        </button>

                                        {/* Stock Badge on bottom-left */}
                                        <span className="absolute bottom-2.5 left-2.5 z-20 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-mono text-emerald-400 border border-emerald-500/30 shadow-sm">
                                            {product.stockBadge}
                                        </span>

                                        {/* Reference-style Vertical Circular Color Swatches Pill (floating on bottom-right of image) */}
                                        {prodColors.length > 0 && (
                                            <div 
                                                className="absolute bottom-2.5 right-2.5 z-20 bg-black/60 hover:bg-black/85 backdrop-blur-md p-1 rounded-full flex flex-col items-center gap-1.5 border border-white/20 shadow-lg transition-all"
                                                title={`${prodColors.length} colores disponibles: ${prodColors.join(', ')}`}
                                            >
                                                {prodColors.slice(0, 3).map((colName) => {
                                                    const hex = getColorHex(colName);
                                                    const isSelected = activeColor.toLowerCase() === colName.toLowerCase();
                                                    return (
                                                        <button
                                                            key={colName}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedColors(prev => ({ ...prev, [product.id]: colName }));
                                                            }}
                                                            title={`Color: ${colName}`}
                                                            className={`w-4 h-4 rounded-full transition-transform hover:scale-125 border ${
                                                                isSelected 
                                                                    ? 'ring-2 ring-blue-400 border-white scale-110 shadow-sm' 
                                                                    : 'border-white/50 hover:border-white opacity-85 hover:opacity-100'
                                                            }`}
                                                            style={{ background: hex }}
                                                        />
                                                    );
                                                })}
                                                {prodColors.length > 3 && (
                                                    <span className="w-4 h-4 rounded-full bg-slate-800/90 text-white text-[8px] font-black flex items-center justify-center border border-white/30">
                                                        +{prodColors.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sneaker Info */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-mono font-bold text-blue-500 uppercase">
                                                {product.brand}
                                            </span>
                                            <span className="text-[10px] text-gray-400">• {product.category || 'Sneaker'}</span>
                                        </div>
                                        <h3 className={`text-base font-bold group-hover:text-blue-500 transition-colors line-clamp-1 ${
                                            isDark ? 'text-white' : 'text-slate-900'
                                        }`}>
                                            <Link to={`/producto/${product.id}`} className="focus:outline-none focus-visible:underline">{product.name}</Link>
                                        </h3>
                                        <p className={`text-xs line-clamp-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{product.subtitle}</p>
                                        <Link to={`/producto/${product.id}`} className="text-[11px] font-bold text-blue-500 hover:underline">Ver detalle, fotos y guía de tallas →</Link>
                                    </div>

                                    {/* Color Selector */}
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                                            <span className={isDark ? "text-gray-400" : "text-slate-500"}>Color:</span>
                                            <div className="flex items-center gap-1.5">
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full border border-gray-300 dark:border-gray-600 inline-block shadow-2xs"
                                                    style={{ background: getColorHex(activeColor) }} 
                                                />
                                                <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                    {activeColor}
                                                </span>
                                            </div>
                                        </div>
                                        {prodColors.length > 1 && (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {prodColors.map((cName) => {
                                                    const isSelected = activeColor.toLowerCase() === cName.toLowerCase();
                                                    const hex = getColorHex(cName);
                                                    return (
                                                        <button
                                                            key={cName}
                                                            type="button"
                                                            onClick={() => setSelectedColors(prev => ({ ...prev, [product.id]: cName }))}
                                                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                                                                isSelected
                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-1 ring-blue-500'
                                                                    : isDark
                                                                        ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                                                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                                            }`}
                                                        >
                                                            <span 
                                                                className="w-3 h-3 rounded-full border border-white/60 shadow-2xs shrink-0" 
                                                                style={{ background: hex }} 
                                                            />
                                                            <span>{cName}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sizes Selector with Per-Color Stock Breakdown */}
                                    <div className="mt-3">
                                        {(() => {
                                            const activeStock = currentVariantStock ? (currentVariantStock[activeSize] ?? 0) : (product.sizeStock ? (product.sizeStock[activeSize] ?? 0) : 0);
                                            const isSelectedOutOfStock = activeStock <= 0;

                                            return (
                                                <>
                                                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                                                        <span className={isDark ? "text-gray-400" : "text-slate-500"}>
                                                            Tallas ({activeColor}):
                                                        </span>
                                                        <span className={`font-bold ${
                                                            isSelectedOutOfStock 
                                                                ? 'text-rose-500' 
                                                                : 'text-emerald-500'
                                                        }`}>
                                                            Talla {activeSize}: {isSelectedOutOfStock ? 'Agotada' : `${activeStock} disp.`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {(product.sizes || ['39', '40', '41', '42', '43']).map((sz) => {
                                                            const szStock = currentVariantStock ? (currentVariantStock[sz] ?? 0) : (product.sizeStock ? (product.sizeStock[sz] ?? 0) : 0);
                                                            const isSzOut = szStock <= 0;
                                                            const isSelected = activeSize === sz;
                                                            return (
                                                                <button
                                                                    key={sz}
                                                                    type="button"
                                                                    onClick={() => handleSelectSize(product.id, sz)}
                                                                    title={!isSzOut ? `${szStock} pares disponibles de talla ${sz} en ${activeColor}` : `Talla ${sz} agotada en ${activeColor}`}
                                                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                                                                        isSelected
                                                                            ? isSzOut
                                                                                ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-500'
                                                                                : 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                                                                            : isSzOut
                                                                                ? 'bg-white/5 text-gray-500 line-through opacity-50 border border-white/5'
                                                                                : isDark
                                                                                    ? 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                                                                    }`}
                                                                >
                                                                    <span>{sz}</span>
                                                                    <span className={`text-[9px] font-normal ${isSzOut ? 'opacity-60' : 'opacity-85'}`}>
                                                                        ({szStock})
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Price & Add to Cart button */}
                                <div className={`mt-5 pt-4 border-t flex items-center justify-between gap-3 ${
                                    isDark ? 'border-white/[0.08]' : 'border-gray-200'
                                }`}>
                                    <div>
                                        <p className="text-[11px] text-gray-500 font-mono">PVP Oficial</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                ${product.price}
                                            </span>
                                            <span className="text-xs font-bold text-emerald-500 font-mono">
                                                {formatBs(priceBs)}
                                            </span>
                                        </div>
                                    </div>

                                    {(() => {
                                        const prodColors = Array.isArray(product.colors) && product.colors.length > 0 
                                            ? product.colors 
                                            : (product.color ? [product.color] : ['Original']);
                                        const chosenColor = selectedColors[product.id] || prodColors[0];
                                        const availableStock = productService.getAvailableStock(product, activeSize, chosenColor);
                                        const isSelectedOutOfStock = availableStock <= 0;

                                        const existingInCart = cartItems.find(i => 
                                            (i.productId === product.id || i.id === product.id) && 
                                            String(i.size) === String(activeSize) && 
                                            (chosenColor ? String(i.color || '').toLowerCase() === String(chosenColor).toLowerCase() : true)
                                        );
                                        const inCartQty = existingInCart ? existingInCart.quantity : 0;
                                        const isMaxInCart = availableStock > 0 && inCartQty >= availableStock;
                                        const isDisabled = isSelectedOutOfStock || isMaxInCart;

                                        return (
                                            <button
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() => handleAddToCart(product)}
                                                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                                                    isSelectedOutOfStock
                                                        ? 'opacity-40 cursor-not-allowed bg-gray-500 text-white'
                                                        : isMaxInCart
                                                            ? 'opacity-70 cursor-not-allowed bg-amber-600/30 text-amber-300 border border-amber-500/40'
                                                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                                                }`}
                                            >
                                                <ShoppingBag className="w-3.5 h-3.5" />
                                                {isSelectedOutOfStock ? 'Agotado' : isMaxInCart ? 'En Bolsa (Máx)' : inCartQty > 0 ? `Bolsa (${inCartQty})` : 'Agregar'}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredProducts.length === 0 && (
                    <div className={`text-center py-16 px-6 space-y-3 rounded-3xl border transition-colors ${isDark ? 'border-slate-800 bg-[#0b0e18]' : 'border-slate-200 bg-white shadow-sm'}`}>
                        <Package className="w-12 h-12 mx-auto text-blue-500/50" />
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {products.length === 0 ? 'Catálogo en Preparación' : 'No encontramos sneakers con ese filtro.'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            {products.length === 0 
                                ? 'Actualmente no hay calzados registrados con inventario en la tienda. Agrega tus modelos desde el panel administrativo para verlos aquí.'
                                : 'Intenta seleccionando otra marca o limpiando los términos de búsqueda.'}
                        </p>
                        {products.length > 0 && (
                            <button
                                onClick={() => {
                                    setSelectedBrand('TODAS');
                                    setSearchQuery('');
                                }}
                                className="text-xs text-blue-400 hover:underline font-bold"
                            >
                                Ver todo el catálogo
                            </button>
                        )}
                    </div>
                )}
            </main>

            {/* Lara Delivery & Guarantees Section */}
            <section className={`border-t py-16 transition-colors ${
                isDark 
                    ? 'bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-indigo-950/30 border-white/[0.08]' 
                    : 'bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border-slate-200'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/20 text-xs font-bold">
                                <MapPin className="w-3.5 h-3.5" />
                                COBERTURA GEOLOCALIZADA EN ESTADO LARA
                            </div>
                            <h2 className={`text-3xl sm:text-4xl font-black uppercase italic ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                DELIVERY EXPRESS EN 45 MINUTOS <br />
                                <span className={isDark ? "text-blue-400" : "text-blue-600"}>BARQUISIMETO & CABUDARE</span>
                            </h2>
                            <p className={`text-sm leading-relaxed max-w-xl ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                Despacho directo desde nuestra sede principal en Barquisimeto hasta tu puerta. Paga cómodamente al recibir mediante Pago Móvil, Punto de Venta inalámbrico o Efectivo en Divisas.
                            </p>

                            <div className="pt-1">
                                <a
                                    href="https://www.google.com/maps?q=10.068330144675503,-69.28499381534304"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs group ${
                                        isDark 
                                            ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30' 
                                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                                    }`}
                                >
                                    <MapPin className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                                    <span>Ver Sede en Google Maps (10.06833, -69.28499)</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                {[
                                    { place: 'Las Trinitarias & Este', time: '15 - 25 min' },
                                    { place: 'Carrera 19 & Centro', time: '20 - 30 min' },
                                    { place: 'Cabudare Centro', time: '30 - 45 min' },
                                    { place: 'Carora & Quíbor', time: 'Mismo Día' }
                                ].map(zone => (
                                    <div key={zone.place} className={`p-3 rounded-xl border ${
                                        isDark ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                                    }`}>
                                        <p className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{zone.place}</p>
                                        <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500 font-medium'}`}>{zone.time}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-5">
                            <div className={`p-6 rounded-3xl border space-y-4 ${
                                isDark ? 'bg-black/70 border-white/10' : 'bg-white border-slate-200 shadow-md'
                            }`}>
                                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                    Beneficios Exclusivos de Despacho
                                </h3>
                                <ul className={`space-y-3 text-xs ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span><strong>Pruébate dos tallas antes de pagar:</strong> El motorizado lleva dos opciones para asegurar tu ajuste perfecto.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span><strong>Comprobante fiscal con QR y RIF SENIAT:</strong> Emitido al momento de la entrega.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <span><strong>Envíos Nacionales:</strong> Despachos a toda Venezuela mediante Zoom, Tealca y MRW asegurado.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <VipClubSection
                isDark={isDark}
                isLoggedIn={isAuthenticated}
                onJoin={() => { setIsAuthModalOpen(true); setAuthTab('register'); }}
            />
            <div id="faq"><FaqSection isDark={isDark} /></div>

            <SiteFooter
                isDark={isDark}
                rate={rate}
                formatBs={formatBs}
                paymentMethods={paymentMethods}
                BrandLogo={BrandLogo}
                onLogin={() => { setIsAuthModalOpen(true); setAuthTab('login'); }}
            />

            <WhatsAppFab phone={import.meta.env.VITE_WHATSAPP_PHONE} raised={totalItemsCount > 0} />
            <MobileCartBar count={totalItemsCount} totalLabel={`$${totalCartUsd.toFixed(2)}`} onOpen={() => setIsCartOpen(true)} />

            {/* ========================================================================= */}
            {/* SLIDE-OUT SHOPPING BAG DRAWER */}
            {/* ========================================================================= */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsCartOpen(false)}
                    />

                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className={`w-screen max-w-md shadow-2xl flex flex-col justify-between transition-colors ${
                            isDark 
                                ? 'bg-[#0b0e14] text-white border-l border-white/10' 
                                : 'bg-white text-gray-900 border-l border-gray-200'
                        }`}>
                            {/* Drawer Header with Brand Logo */}
                            <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
                                isDark ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-gray-50/90'
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    <BrandLogo variant="compact" size="xs" showSubtitle={false} theme={isDark ? 'dark' : 'light'} />
                                    <span className={isDark ? "text-gray-700" : "text-gray-300"}>|</span>
                                    <div className="flex items-center gap-1.5">
                                        <ShoppingBag className="w-4 h-4 text-blue-500" />
                                        <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Bolsa
                                        </span>
                                        <span className={`text-xs font-mono font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            ({totalItemsCount})
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                                    }`}
                                    title="Cerrar bolsa"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Items */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {cartItems.length === 0 ? (
                                    <div className="text-center py-16 space-y-4 px-6">
                                        <div className="w-20 h-20 mx-auto rounded-3xl bg-black border border-blue-500/30 p-2.5 shadow-xl shadow-blue-500/10 flex items-center justify-center">
                                            <img
                                                src="/brand/urbanstep-emblem.png"
                                                alt="UrbanStep"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className={`font-black text-base uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-950'}`}>
                                                Tu bolsa está vacía
                                            </p>
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Agrega tus siluetas favoritas de Nike, Vans, Adidas, RS21 o Puma.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setIsCartOpen(false)}
                                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
                                        >
                                            Explorar Catálogo
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {cartItems.map((item) => {
                                            const isAtMax = item.maxStock !== undefined && item.quantity >= item.maxStock;
                                            return (
                                                <div
                                                    key={`${item.id}-${item.size}-${item.color || ''}`}
                                                    className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                                                        isDark 
                                                            ? 'bg-white/[0.03] border-white/10' 
                                                            : 'bg-gray-50 border-gray-200 shadow-xs'
                                                    }`}
                                                >
                                                    {/* Thumbnail */}
                                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center p-1 shrink-0 overflow-hidden border ${
                                                        isDark ? 'bg-neutral-900 border-white/5' : 'bg-white border-gray-200'
                                                    }`}>
                                                        {item.imageUrl ? (
                                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <span className="text-2xl">👟</span>
                                                        )}
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-mono text-blue-500 uppercase font-bold">{item.brand}</p>
                                                        <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.name}</h4>
                                                        <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Talla: <strong className={isDark ? "text-white" : "text-gray-900"}>{item.size}</strong>
                                                            {item.color && (
                                                                <> • Color: <strong className="text-blue-500 dark:text-purple-400">{item.color}</strong></>
                                                            )}
                                                        </p>
                                                        <p className={`text-xs font-black mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            ${item.price}{' '}
                                                            <span className={`text-[10px] font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                                ({formatBs(item.price * rate)})
                                                            </span>
                                                        </p>
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="flex flex-col items-end gap-2">
                                                        <button
                                                            onClick={() => removeItem(item.id, item.size, item.color)}
                                                            className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                                            title="Eliminar de la bolsa"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <div className={`flex items-center gap-1.5 rounded-lg border p-0.5 ${
                                                            isDark ? 'bg-black/60 border-white/10' : 'bg-white border-gray-300'
                                                        }`}>
                                                            <button
                                                                onClick={() => updateQuantity(item.id, item.size, item.quantity - 1, item.color)}
                                                                className={`w-5 h-5 flex items-center justify-center transition-colors ${
                                                                    isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                                                }`}
                                                                title="Disminuir"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className={`text-xs font-bold font-mono px-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</span>
                                                            <button
                                                                onClick={() => {
                                                                    if (isAtMax) {
                                                                        toast.error(`Stock máximo alcanzado (${item.maxStock} disponibles)`);
                                                                        return;
                                                                    }
                                                                    updateQuantity(item.id, item.size, item.quantity + 1, item.color);
                                                                }}
                                                                disabled={isAtMax}
                                                                className={`w-5 h-5 flex items-center justify-center transition-colors ${
                                                                    isAtMax 
                                                                        ? 'opacity-25 cursor-not-allowed text-gray-400' 
                                                                        : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                                                }`}
                                                                title={isAtMax ? `Stock máximo alcanzado (${item.maxStock} disp.)` : "Aumentar"}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Shipping Option Selector */}
                                        <div className={`pt-4 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                            <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Modalidad de Entrega:
                                            </label>
                                            <div className="space-y-1.5">
                                                {[
                                                    { id: 'delivery_lara', label: '🛵 Delivery Express Lara (45 min)', price: '+$3.00' },
                                                    { id: 'pickup', label: '🏬 Retiro en Tienda (Las Trinitarias)', price: 'Gratis' },
                                                    { id: 'nacional', label: '📦 Encomienda Nacional (Zoom/MRW)', price: '+$5.00' }
                                                ].map((opt) => (
                                                    <label
                                                        key={opt.id}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                                                            shippingOption === opt.id
                                                                ? 'bg-blue-600/15 border-blue-500 font-bold ' + (isDark ? 'text-white' : 'text-blue-900')
                                                                : isDark
                                                                    ? 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.05]'
                                                                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="shipping"
                                                                value={opt.id}
                                                                checked={shippingOption === opt.id}
                                                                onChange={() => setShippingOption(opt.id)}
                                                                className="text-blue-600"
                                                            />
                                                            <span>{opt.label}</span>
                                                        </div>
                                                        <span className={`font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{opt.price}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Drawer Footer */}
                            {cartItems.length > 0 && (
                                <div className={`p-5 border-t space-y-3 ${
                                    isDark ? 'border-white/10 bg-black/60' : 'border-gray-200 bg-gray-50'
                                }`}>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            aria-label="Código de cupón"
                                            value={couponInput}
                                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                                            placeholder="Código de cupón"
                                            className={`flex-1 px-3 py-2 rounded-xl text-xs outline-none border ${isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                        />
                                        <button type="button" onClick={handleApplyCoupon} className="px-3 py-2 rounded-xl bg-gray-800 text-white text-xs font-bold hover:bg-gray-700">Aplicar</button>
                                    </div>
                                    {couponCode && (
                                        <p className="text-[11px] text-emerald-500">
                                            Cupón {couponCode} activo · <button type="button" className="underline" onClick={() => { setCouponCode(''); setCouponInput(''); }}>quitar</button>
                                        </p>
                                    )}
                                    <div className="space-y-1 text-xs">
                                        <div className={`flex justify-between ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <span>Subtotal Calzados:</span>
                                            <span className="font-mono">${subtotal.toFixed(2)}</span>
                                        </div>
                                        {promo.applied.map((a) => (
                                            <div key={`${a.code}-${a.label}`} className="flex justify-between text-emerald-500 font-semibold">
                                                <span>🏷️ {a.label || a.code}</span>
                                                <span className="font-mono">{a.discountUsd > 0 ? `-$${a.discountUsd.toFixed(2)}` : 'Envío gratis'}</span>
                                            </div>
                                        ))}
                                        <div className={`flex justify-between ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <span>Flete / Envío:</span>
                                            <span className="font-mono">
                                                {promo.shippingDiscountUsd > 0 && <s className="mr-1 opacity-60">${shippingCostUsd.toFixed(2)}</s>}
                                                ${effectiveShippingUsd.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className={`flex justify-between text-base font-black pt-1 border-t ${
                                            isDark ? 'text-white border-white/10' : 'text-gray-950 border-gray-200'
                                        }`}>
                                            <span>Total a Pagar:</span>
                                            <div className="text-right">
                                                <span>${totalCartUsd.toFixed(2)}</span>
                                                <div className={`text-xs font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    {formatBs(totalCartBs)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!isAuthenticated && (
                                        <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 transition-colors ${
                                            isDark 
                                                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300' 
                                                : 'bg-amber-50 border-amber-200 text-amber-800 shadow-xs'
                                        }`}>
                                            <span className="text-base shrink-0">🔒</span>
                                            <div>
                                                <p className="font-bold">Inicia sesión para comprar</p>
                                                <p className="text-[11px] opacity-90">Debes tener una cuenta activa para despachar tu pedido y acumular puntos VIP.</p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isAuthenticated) {
                                                toast.error('Inicia sesión o regístrate para confirmar tu pedido', {
                                                    icon: '🔒',
                                                    duration: 4000
                                                });
                                                setAuthTab('login');
                                                setIsAuthModalOpen(true);
                                                return;
                                            }
                                            setIsCheckoutModalOpen(true);
                                        }}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 active:scale-95"
                                    >
                                        <span>{isAuthenticated ? 'Confirmar Pedido & Delivery' : 'Iniciar Sesión para Comprar'}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CHECKOUT & DELIVERY MODAL */}
            {/* ========================================================================= */}
            {isCheckoutModalOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-colors ${
                    isDark ? 'bg-black/80' : 'bg-black/50'
                }`}>
                    <div className={`rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5 border transition-all ${
                        isDark 
                            ? 'bg-[#0f131c] border-white/10 text-white shadow-black/80' 
                            : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/40'
                    }`}>
                        <div className={`flex items-center justify-between pb-3 border-b ${
                            isDark ? 'border-white/10' : 'border-slate-200'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-blue-500" />
                                <h3 className={`text-lg font-bold uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Datos de Despacho & Pago
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsCheckoutModalOpen(false)}
                                className={`p-1 rounded-lg transition-colors ${
                                    isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                                }`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmOrder} className="space-y-4 text-xs">
                            <div>
                                <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                    Nombre Completo del Cliente *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={checkoutForm.name}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                                    placeholder="Ej. Carlos Mendoza"
                                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border transition-all ${
                                        isDark 
                                            ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                    }`}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                        Teléfono WhatsApp *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={checkoutForm.phone}
                                        onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                                        placeholder="0414-5551234"
                                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border transition-all ${
                                            isDark 
                                                ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                        }`}
                                    />
                                    <label className={`mt-2 flex items-start gap-2 text-[10px] cursor-pointer ${
                                        isDark ? 'text-gray-400' : 'text-slate-500'
                                    }`}>
                                        <input type="checkbox" checked={contactConsent} onChange={(e) => setContactConsent(e.target.checked)} className="mt-0.5" />
                                        <span>Guardar mi bolsa y avisarme por WhatsApp si no termino mi compra.</span>
                                    </label>
                                </div>
                                <div>
                                    <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                        Zona / Municipio (Lara)
                                    </label>
                                    <select
                                        value={checkoutForm.zone}
                                        onChange={(e) => setCheckoutForm({ ...checkoutForm, zone: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border transition-all ${
                                            isDark 
                                                ? 'bg-black/60 border-white/10 text-white focus:border-blue-500' 
                                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                                        }`}
                                    >
                                        <option value="Barquisimeto Este / Trinitarias">Barquisimeto Este / Trinitarias</option>
                                        <option value="Barquisimeto Centro / Carrera 19">Barquisimeto Centro / Carrera 19</option>
                                        <option value="Barquisimeto Oeste / Obelisco">Barquisimeto Oeste / Obelisco</option>
                                        <option value="Cabudare / Palavecino">Cabudare / Palavecino</option>
                                        <option value="Envío Nacional Fuera de Lara">Envío Nacional Fuera de Lara</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                    Dirección Exacta de Entrega *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={checkoutForm.address}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                                    placeholder="Urb. El Parral, Calle 4 con Av. Los Leones, Casa #12"
                                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border transition-all ${
                                        isDark 
                                            ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                    }`}
                                />
                            </div>

                            <div>
                                <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                    Método de Pago Preferido *
                                </label>
                                <select
                                    value={checkoutForm.paymentMethod}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentMethod: e.target.value })}
                                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border font-bold transition-all ${
                                        isDark 
                                            ? 'bg-black/60 border-white/10 text-white focus:border-blue-500' 
                                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                                    }`}
                                >
                                    {paymentMethods.map(pm => (
                                        <option key={pm.id} value={pm.id}>
                                            {pm.label || pm.name} ({pm.currency === 'VES' ? 'Bs. Tasa BCV' : '$ USD'})
                                        </option>
                                    ))}
                                </select>
                                {/* Active payment method details */}
                                {(() => {
                                    const selectedPm = paymentMethods.find(pm => pm.id === checkoutForm.paymentMethod);
                                    if (!selectedPm) return null;
                                    return (
                                        <div className={`mt-2 p-2.5 rounded-xl border text-[11px] space-y-1 font-mono transition-colors ${
                                            isDark 
                                                ? 'bg-white/[0.04] border-white/10 text-gray-300' 
                                                : 'bg-slate-100/80 border-slate-200 text-slate-700'
                                        }`}>
                                            {selectedPm.bank && <p>Banco: <strong className={isDark ? "text-white" : "text-slate-900"}>{selectedPm.bank}</strong></p>}
                                            {selectedPm.phone && <p>Teléfono: <strong className={isDark ? "text-white" : "text-slate-900"}>{selectedPm.phone}</strong></p>}
                                            {selectedPm.rif && <p>RIF/Cédula: <strong className={isDark ? "text-white" : "text-slate-900"}>{selectedPm.rif}</strong></p>}
                                            {selectedPm.email && <p>Correo: <strong className={isDark ? "text-white" : "text-slate-900"}>{selectedPm.email}</strong></p>}
                                            {selectedPm.holder && <p>Titular: <strong className={isDark ? "text-white" : "text-slate-900"}>{selectedPm.holder}</strong></p>}
                                            {selectedPm.accountNumber && <p>Cuenta: <strong className={isDark ? "text-white" : "text-slate-900"}>{selectedPm.accountNumber}</strong></p>}
                                            {selectedPm.instructions && <p className="text-[10px] text-amber-500 font-semibold italic">{selectedPm.instructions}</p>}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div>
                                <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                    Indicaciones para el Motorizado (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={checkoutForm.notes}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                                    placeholder="Llevar cambio en efectivo de $20 o traer también talla 42 para medir"
                                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none border transition-all ${
                                        isDark 
                                            ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                    }`}
                                />
                            </div>

                            <div className={`p-3.5 rounded-2xl flex items-center justify-between text-xs border transition-colors ${
                                isDark 
                                    ? 'bg-blue-950/40 border-blue-800/60' 
                                    : 'bg-blue-50/80 border-blue-200'
                            }`}>
                                <div>
                                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Total Final del Pedido:</p>
                                    <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Incluye calzados + despacho</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>${totalCartUsd.toFixed(2)}</p>
                                    <p className={`text-xs font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatBs(totalCartBs)}</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Check className="w-4 h-4" />
                                Enviar Pedido a Despacho
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ORDER CONFIRMATION MODAL */}
            {/* ========================================================================= */}
            {orderSuccessData && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-colors ${
                    isDark ? 'bg-black/80' : 'bg-black/50'
                }`}>
                    <div className={`rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 border transition-all ${
                        isDark 
                            ? 'bg-[#0f131c] border-emerald-500/30 text-white shadow-black/80' 
                            : 'bg-white border-emerald-200 text-slate-900 shadow-emerald-600/15'
                    }`}>
                        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center text-3xl font-bold">
                            ✓
                        </div>

                        <h3 className={`text-xl font-black uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ¡Pedido Confirmado con Éxito!
                        </h3>
                        <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                            Tu orden ha sido registrada con el folio <strong className="text-blue-500 font-mono">{orderSuccessData.receiptNumber}</strong>. Nuestro equipo de despacho ya está preparando tus sneakers.
                        </p>

                        <div className={`p-4 rounded-2xl border text-left text-xs space-y-1.5 font-mono transition-colors ${
                            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
                        }`}>
                            <p className={isDark ? "text-gray-400" : "text-slate-500"}>Cliente: <strong className={isDark ? "text-white" : "text-slate-900"}>{orderSuccessData.customerName}</strong></p>
                            <p className={isDark ? "text-gray-400" : "text-slate-500"}>Entrega: <strong className={isDark ? "text-white" : "text-slate-900"}>{orderSuccessData.deliveryAddress}</strong></p>
                            <p className={isDark ? "text-gray-400" : "text-slate-500"}>Pago: <strong className="text-emerald-500 capitalize">{orderSuccessData.paymentMethod}</strong></p>
                            <div className={`pt-2 border-t flex justify-between font-bold text-sm ${
                                isDark ? 'border-white/10' : 'border-slate-200'
                            }`}>
                                <span className={isDark ? "text-white" : "text-slate-900"}>Monto a pagar:</span>
                                <span className="text-emerald-500">${orderSuccessData.totalUsd.toFixed(2)} ({formatBs(orderSuccessData.totalBs)})</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setOrderSuccessData(null)}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/25 active:scale-95"
                        >
                            Volver a la Tienda
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SINGLE UNIFIED LOGIN & REGISTRATION MODAL (FOR ALL ROLES) */}
            {/* ========================================================================= */}
            {isAuthModalOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-colors ${
                    isDark ? 'bg-black/80' : 'bg-black/50'
                }`}>
                    <div className={`rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5 border transition-all ${
                        isDark 
                            ? 'bg-[#0f131c] border-white/10 text-white shadow-black/80' 
                            : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/50'
                    }`}>
                        {/* Close button */}
                        <button
                            onClick={() => {
                                setIsAuthModalOpen(false);
                                setAuthError('');
                            }}
                            className={`absolute top-5 right-5 p-1 rounded-lg transition-colors ${
                                isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Modal Header */}
                        <div className="text-center space-y-1">
                            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20 mb-2">
                                <Lock className="w-6 h-6 text-white" />
                            </div>
                            <h3 className={`text-xl font-black uppercase italic ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {authTab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta de Cliente'}
                            </h3>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                {authTab === 'login'
                                    ? 'Portal de acceso único para Admin, Cajero, Supervisor o Cliente.'
                                    : 'Regístrate para comprar online con delivery express en Lara.'}
                            </p>
                        </div>

                        {/* Tab Switcher */}
                        <div className={`grid grid-cols-2 p-1 rounded-xl text-xs font-bold border transition-colors ${
                            isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'
                        }`}>
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthTab('login');
                                    setAuthError('');
                                }}
                                className={`py-2 rounded-lg transition-all ${
                                    authTab === 'login' 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : isDark 
                                            ? 'text-gray-400 hover:text-white' 
                                            : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Iniciar Sesión
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthTab('register');
                                    setAuthError('');
                                }}
                                className={`py-2 rounded-lg transition-all ${
                                    authTab === 'register' 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : isDark 
                                            ? 'text-gray-400 hover:text-white' 
                                            : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Registrarse (Cliente)
                            </button>
                        </div>

                        {/* Error Notice */}
                        {authError && (
                            <div className={`p-3 rounded-xl text-xs border ${
                                isDark 
                                    ? 'bg-red-950/60 border-red-800 text-red-300' 
                                    : 'bg-red-50 border-red-200 text-red-700'
                            }`}>
                                {authError}
                            </div>
                        )}

                        {/* TAB 1: SINGLE UNIFIED LOGIN */}
                        {isSupabaseConfigured() && (
                            <div className="mb-4">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const res = await authService.loginWithGoogle();
                                        if (!res.success) toast.error(res.error);
                                    }}
                                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${
                                        isDark 
                                            ? 'bg-white text-gray-900 hover:bg-gray-100 border-transparent shadow-md' 
                                            : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-xs'
                                    }`}
                                >
                                    <span aria-hidden="true" className="font-black text-blue-600">G</span>
                                    Continuar con Google
                                </button>
                                <p className={`text-center text-[10px] mt-2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                                    o con tu correo y contraseña
                                </p>
                            </div>
                        )}
                        {authTab === 'login' && (
                            <form onSubmit={handleUnifiedLogin} className="space-y-4">
                                <div>
                                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                        Correo Electrónico o Usuario
                                    </label>
                                    <div className="relative">
                                        <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                                            isDark ? 'text-gray-500' : 'text-slate-400'
                                        }`} />
                                        <input
                                            type="text"
                                            required
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            placeholder="admin@urbanstep.com o tu correo"
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none border transition-all ${
                                                isDark 
                                                    ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                            }`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                                            isDark ? 'text-gray-500' : 'text-slate-400'
                                        }`} />
                                        <input
                                            type={showLoginPassword ? 'text' : 'password'}
                                            required
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none border transition-all ${
                                                isDark 
                                                    ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                                            className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                                                isDark ? 'text-gray-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                                            }`}
                                        >
                                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95"
                                >
                                    {authLoading ? 'Verificando...' : 'Acceder al Sistema'}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </form>
                        )}

                        {/* TAB 2: CLIENT REGISTRATION */}
                        {authTab === 'register' && (
                            <form onSubmit={handleClientRegister} className="space-y-3 text-xs">
                                <div>
                                    <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                        Nombre Completo *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={regForm.name}
                                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                                        placeholder="Tu nombre y apellido"
                                        className={`w-full px-3 py-2 rounded-xl outline-none border transition-all ${
                                            isDark 
                                                ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                        }`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                            Correo Electrónico *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={regForm.email}
                                            onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                                            placeholder="cliente@ejemplo.com"
                                            className={`w-full px-3 py-2 rounded-xl outline-none border transition-all ${
                                                isDark 
                                                    ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                            Teléfono WhatsApp *
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={regForm.phone}
                                            onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                                            placeholder="0414-1234567"
                                            className={`w-full px-3 py-2 rounded-xl outline-none border transition-all ${
                                                isDark 
                                                    ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                            }`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-1">
                                        <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                            Doc.
                                        </label>
                                        <select
                                            value={regForm.docType}
                                            onChange={(e) => setRegForm({ ...regForm, docType: e.target.value })}
                                            className={`w-full px-2 py-2 rounded-xl outline-none border font-bold transition-all ${
                                                isDark 
                                                    ? 'bg-black/60 border-white/10 text-white focus:border-blue-500' 
                                                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                                            }`}
                                        >
                                            <option value="V">V-</option>
                                            <option value="E">E-</option>
                                            <option value="J">J-</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                            Cédula / RIF
                                        </label>
                                        <input
                                            type="text"
                                            value={regForm.docNumber}
                                            onChange={(e) => setRegForm({ ...regForm, docNumber: e.target.value })}
                                            placeholder="28123456"
                                            className={`w-full px-3 py-2 rounded-xl outline-none border transition-all ${
                                                isDark 
                                                    ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                            }`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                        Dirección de Entrega en Lara
                                    </label>
                                    <input
                                        type="text"
                                        value={regForm.address}
                                        onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                                        placeholder="Barquisimeto / Cabudare, Urb. o Sector"
                                        className={`w-full px-3 py-2 rounded-xl outline-none border transition-all ${
                                            isDark 
                                                ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                        }`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                            Contraseña *
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={regForm.password}
                                            onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                                            placeholder="••••••••"
                                            className={`w-full px-3 py-2 rounded-xl outline-none border transition-all ${
                                                isDark 
                                                    ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                            Repetir Contraseña *
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={regForm.confirmPassword}
                                            onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                            placeholder="••••••••"
                                            className={`w-full px-3 py-2 rounded-xl outline-none border transition-all ${
                                                isDark 
                                                    ? 'bg-black/60 border-white/10 text-white placeholder-gray-500 focus:border-blue-500' 
                                                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                                            }`}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    {authLoading ? 'Creando cuenta...' : 'Crear Cuenta de Cliente'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
