import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { productService } from '../services/productService';
import { userService } from '../services/userService';
import { customerService } from '../services/customerService';
import { saleService } from '../services/saleServices';
import { getDefaultRoute } from '../utils/permissions';
import {
    Store,
    ShoppingBag,
    ShieldCheck,
    Truck,
    ArrowRight,
    Star,
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
    Moon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { mockProducts } from '../data/mockProducts';

const mapProductToCatalog = (p) => ({
    id: p.id,
    brand: (p.brand || 'URBANSTEP').toUpperCase(),
    name: p.name,
    subtitle: p.color ? `${p.color} • ${p.category || 'Sneaker'}` : (p.category || 'Edición 2026'),
    price: Number(p.price) || 120,
    tag: p.stock <= (p.minStock || 5) ? '⚡ POCAS UNIDADES' : '✓ DISPONIBLE',
    imageUrl: p.imageUrl || p.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    sizes: p.sizes || ['39', '40', '41', '42', '43'],
    rating: 4.9,
    reviewsCount: 150,
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

    // Catalog state — Inicializado con catálogo oficial unificado
    const [products, setProducts] = useState(() => mockProducts.map(mapProductToCatalog));
    const [selectedBrand, setSelectedBrand] = useState('TODAS');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSizes, setSelectedSizes] = useState({});

    // Cart Drawer state
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [shippingOption, setShippingOption] = useState('delivery_lara'); // 'delivery_lara' | 'pickup' | 'nacional'
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [orderSuccessData, setOrderSuccessData] = useState(null);

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
        const loadProducts = async () => {
            try {
                const dbProducts = await productService.getAll();
                if (dbProducts && dbProducts.length > 0) {
                    // Filter to active items with positive stock
                    const activeDbProducts = dbProducts.filter(p => !p.disabled && p.stock > 0);

                    const mappedDb = activeDbProducts.map(p => ({
                        id: p.id,
                        brand: (p.brand || 'URBANSTEP').toUpperCase(),
                        name: p.name,
                        subtitle: p.color ? `${p.color} • ${p.category || 'Sneaker'}` : (p.category || 'Edición 2026'),
                        price: Number(p.price) || 120,
                        tag: p.stock <= (p.minStock || 5) ? '⚡ POCAS UNIDADES' : '✓ DISPONIBLE',
                        imageUrl: p.imageUrl || p.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
                        sizes: p.sizes || ['39', '40', '41', '42', '43'],
                        rating: 4.8,
                        reviewsCount: 120,
                        stockBadge: `${p.stock} pares disponibles`,
                        stock: p.stock,
                        description: p.description || 'Calzado original garantizado UrbanStep Store.'
                    }));

                    setProducts(mappedDb);
                } else {
                    setProducts(mockProducts.map(mapProductToCatalog));
                }
            } catch (err) {
                console.warn('Usando catálogo inicial:', err);
                setProducts(mockProducts.map(mapProductToCatalog));
            }
        };

        loadProducts();

        const handleSync = () => loadProducts();
        window.addEventListener('products_updated', handleSync);
        window.addEventListener('sales_updated', handleSync);
        window.addEventListener('storage', handleSync);

        return () => {
            window.removeEventListener('products_updated', handleSync);
            window.removeEventListener('sales_updated', handleSync);
            window.removeEventListener('storage', handleSync);
        };
    }, []);

    // Filtered drops
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchBrand = selectedBrand === 'TODAS' || p.brand.includes(selectedBrand);
            const q = searchQuery.toLowerCase().trim();
            const matchSearch = !q || (
                p.name.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q) ||
                (p.subtitle && p.subtitle.toLowerCase().includes(q))
            );
            return matchBrand && matchSearch;
        });
    }, [products, selectedBrand, searchQuery]);

    // Size selection handler per product
    const handleSelectSize = (productId, size) => {
        setSelectedSizes(prev => ({ ...prev, [productId]: size }));
    };

    // Add to cart handler
    const handleAddToCart = (product) => {
        const chosenSize = selectedSizes[product.id] || (product.sizes && product.sizes[0]) || '41';
        addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            brand: product.brand,
            imageUrl: product.imageUrl,
            stock: product.stock
        }, chosenSize, 1);
        toast.success(`Agregado a la bolsa: ${product.name} (Talla ${chosenSize})`, {
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

    const totalCartUsd = subtotal + (cartItems.length > 0 ? shippingCostUsd : 0);
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

        try {
            const customerName = checkoutForm.name.trim() || (user ? user.name : 'Cliente Ecommerce');
            const customerPhone = checkoutForm.phone.trim() || '0414-1234567';
            const deliveryAddress = `${checkoutForm.address} (${checkoutForm.zone})`.trim();

            const orderPayload = {
                customer: customerName,
                customerPhone,
                customerDoc: 'V-00000000',
                items: cartItems.map(i => ({
                    productId: i.id || i.productId,
                    name: i.name,
                    brand: i.brand,
                    size: i.size,
                    price: i.price,
                    quantity: i.quantity,
                    totalUsd: i.price * i.quantity
                })),
                subtotal: subtotal,
                shippingCost: shippingCostUsd,
                total: totalCartUsd,
                bcvRate: rate,
                paymentMethod: checkoutForm.paymentMethod,
                cashier: 'Ecommerce Web',
                notes: `Delivery Lara: ${deliveryAddress}. Notas: ${checkoutForm.notes}`
            };

            const createdSale = await saleService.create(orderPayload);
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

    return (
        <div className={`min-h-screen font-sans selection:bg-blue-600 selection:text-white flex flex-col transition-colors duration-200 ${
            isDark ? 'bg-[#07090e] text-gray-100' : 'bg-gray-50 text-gray-900'
        }`}>
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
                    {/* Brand */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20 shrink-0">
                            <Store className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className={`text-2xl font-black tracking-tighter uppercase italic ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                URBAN<span className="text-blue-500">STEP</span>
                            </span>
                            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 align-middle">
                                STORE
                            </span>
                            <p className="text-[10px] text-gray-400 font-mono tracking-wider">BARQUISIMETO • SNEAKERS & STREETWEAR</p>
                        </div>
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

            {/* Hero Banner */}
            <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24 border-b border-white/[0.06]">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-5">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-500/30 text-blue-300 text-xs font-bold tracking-wider uppercase">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                SNEAKERS & STREETWEAR STORE • VENEZUELA 2026
                            </div>

                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white uppercase italic tracking-tight leading-[0.95]">
                                THE STREETS <br />
                                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                                    ARE YOURS.
                                </span>
                            </h1>

                            <p className="text-sm sm:text-base text-gray-300 max-w-xl font-normal leading-relaxed">
                                Encuentra las siluetas más buscadas de <strong>Nike, Air Jordan, Adidas y Yeezy</strong>. Precios en tiempo real en <strong>Dólares ($)</strong> y <strong>Bolívares (Bs.)</strong> a tasa oficial BCV, con entrega express en el <strong>Estado Lara</strong> y envíos asegurados a toda Venezuela.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                <button
                                    onClick={() => {
                                        const el = document.getElementById('catalogo');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-xl shadow-blue-600/30 flex items-center gap-2 active:scale-95"
                                >
                                    Ver Catálogo y Drops
                                    <ArrowRight className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={() => setIsCartOpen(true)}
                                    className="px-5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95"
                                >
                                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                                    Mi Bolsa ({totalItemsCount})
                                </button>
                            </div>
                        </div>

                        {/* Right: Featured Showcase Card */}
                        <div className="lg:col-span-5">
                            <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        ⚡ DROP DESTACADO
                                    </span>
                                    <span className="text-xs font-mono text-gray-400">Entrega 45 min en Lara</span>
                                </div>

                                <div className="relative w-full h-56 shrink-0 flex items-center justify-center p-2 mb-4 bg-black/40 rounded-2xl overflow-hidden">
                                    <img
                                        src={(products[0] || mockProducts[0])?.imageUrl}
                                        alt={(products[0] || mockProducts[0])?.name}
                                        className="w-full h-full object-contain filter drop-shadow-2xl hover:scale-105 transition-transform"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs font-mono text-blue-400 uppercase font-bold">{(products[0] || mockProducts[0])?.brand}</p>
                                    <h3 className="text-lg font-bold text-white">{(products[0] || mockProducts[0])?.name}</h3>
                                    <p className="text-xs text-gray-400">{(products[0] || mockProducts[0])?.subtitle || (products[0] || mockProducts[0])?.category}</p>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] text-gray-500 font-mono">Precio Oficial</p>
                                        <p className="text-2xl font-black text-white">
                                            ${(products[0] || mockProducts[0])?.price}{' '}
                                            <span className="text-xs font-bold text-emerald-400 font-mono">
                                                ({formatBs(((products[0] || mockProducts[0])?.price || 0) * rate)})
                                            </span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleAddToCart(products[0] || mockProducts[0])}
                                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Comprar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Catalog Section */}
            <main id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full space-y-8">
                {/* Brand Filter Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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

                    <p className="text-xs text-gray-400 font-mono">
                        Mostrando <strong className={isDark ? "text-white" : "text-gray-900"}>{filteredProducts.length}</strong> calzados
                    </p>
                </div>

                {/* Sneaker Grid — Protected responsive cards (no squishing/contraction) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => {
                        const priceBs = product.price * rate;
                        const activeSize = selectedSizes[product.id] || (product.sizes && product.sizes[0]) || '41';

                        return (
                            <div
                                key={product.id}
                                className={`group rounded-3xl border p-5 transition-all duration-300 flex flex-col justify-between shadow-xl min-w-0 ${
                                    isDark
                                        ? 'bg-white/[0.03] border-white/[0.08] hover:border-blue-500/50 hover:bg-white/[0.05]'
                                        : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-2xl shadow-gray-200/50'
                                }`}
                            >
                                <div className="min-w-0">
                                    {/* Top Tag & Rating */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                            {product.tag}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                            <span>{product.rating || '4.9'}</span>
                                        </div>
                                    </div>

                                    {/* Image Thumbnail wrapper — Shrink-0 and fixed height prevents responsive contracting */}
                                    <div className={`w-full h-52 sm:h-56 shrink-0 relative overflow-hidden rounded-2xl p-4 flex items-center justify-center mb-4 border ${
                                        isDark ? 'bg-neutral-900/90 border-white/5' : 'bg-gray-100 border-gray-200'
                                    }`}>
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-110 group-hover:-rotate-2 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                                            {product.stockBadge}
                                        </span>
                                    </div>

                                    {/* Sneaker Info */}
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-mono font-bold text-blue-500 uppercase">{product.brand}</p>
                                        <h3 className={`text-base font-bold group-hover:text-blue-500 transition-colors line-clamp-1 ${
                                            isDark ? 'text-white' : 'text-gray-900'
                                        }`}>
                                            {product.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 line-clamp-1">{product.subtitle}</p>
                                    </div>

                                    {/* Sizes Selector */}
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-1.5">
                                            <span>Seleccionar Talla:</span>
                                            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Talla: {activeSize}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {(product.sizes || ['39', '40', '41', '42', '43']).map((sz) => (
                                                <button
                                                    key={sz}
                                                    type="button"
                                                    onClick={() => handleSelectSize(product.id, sz)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                                                        activeSize === sz
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : isDark
                                                                ? 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                                                    }`}
                                                >
                                                    {sz}
                                                </button>
                                            ))}
                                        </div>
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

                                    <button
                                        type="button"
                                        onClick={() => handleAddToCart(product)}
                                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/30 shrink-0 active:scale-95"
                                    >
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        Agregar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="text-center py-16 space-y-3">
                        <p className="text-lg font-bold text-gray-400">No encontramos sneakers con ese filtro.</p>
                        <button
                            onClick={() => {
                                setSelectedBrand('TODAS');
                                setSearchQuery('');
                            }}
                            className="text-xs text-blue-400 hover:underline font-bold"
                        >
                            Ver todo el catálogo
                        </button>
                    </div>
                )}
            </main>

            {/* Lara Delivery & Guarantees Section */}
            <section className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border-t border-white/[0.08] py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold">
                                <MapPin className="w-3.5 h-3.5" />
                                COBERTURA GEOLOCALIZADA EN ESTADO LARA
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase italic">
                                DELIVERY EXPRESS EN 45 MINUTOS <br />
                                <span className="text-blue-400">BARQUISIMETO & CABUDARE</span>
                            </h2>
                            <p className="text-sm text-gray-300 leading-relaxed max-w-xl">
                                Despacho directo desde nuestra sede principal en Barquisimeto hasta tu puerta. Paga cómodamente al recibir mediante Pago Móvil, Punto de Venta inalámbrico o Efectivo en Divisas.
                            </p>

                            <div className="pt-1">
                                <a
                                    href="https://www.google.com/maps?q=10.068330144675503,-69.28499381534304"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-bold transition-all shadow-sm group"
                                >
                                    <MapPin className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                                    <span>Ver Sede en Google Maps (10.06833, -69.28499)</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                                    <p className="font-bold text-xs text-white">Las Trinitarias & Este</p>
                                    <p className="text-[11px] text-gray-400">15 - 25 min</p>
                                </div>
                                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                                    <p className="font-bold text-xs text-white">Carrera 19 & Centro</p>
                                    <p className="text-[11px] text-gray-400">20 - 30 min</p>
                                </div>
                                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                                    <p className="font-bold text-xs text-white">Cabudare Centro</p>
                                    <p className="text-[11px] text-gray-400">30 - 45 min</p>
                                </div>
                                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                                    <p className="font-bold text-xs text-white">Carora & Quíbor</p>
                                    <p className="text-[11px] text-gray-400">Mismo Día</p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5">
                            <div className="p-6 rounded-3xl bg-black/70 border border-white/10 space-y-4">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                    Beneficios Exclusivos de Despacho
                                </h3>
                                <ul className="space-y-3 text-xs text-gray-300">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span><strong>Pruébate dos tallas antes de pagar:</strong> El motorizado lleva dos opciones para asegurar tu ajuste perfecto.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span><strong>Comprobante fiscal con QR y RIF SENIAT:</strong> Emitido al momento de la entrega.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span><strong>Envíos Nacionales:</strong> Despachos a toda Venezuela mediante Zoom, Tealca y MRW asegurado.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/[0.06] bg-black/80 py-10 text-xs text-gray-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-blue-500" />
                        <span className="font-bold text-white uppercase tracking-wider">URBANSTEP VENEZUELA C.A.</span>
                        <span>•</span>
                        <span>RIF: J-50123456-7</span>
                        <span>•</span>
                        <span>Barquisimeto, Estado Lara</span>
                    </div>

                    <div className="flex items-center gap-6 text-[11px]">
                        <a
                            href="https://www.google.com/maps?q=10.068330144675503,-69.28499381534304"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 flex items-center gap-1 transition-colors font-bold"
                        >
                            <MapPin className="w-3.5 h-3.5 text-red-400" />
                            <span>Ubicación Maps (10.06833, -69.28499)</span>
                        </a>
                        <span>•</span>
                        <span>BCV: {formatBs(rate)} / USD</span>
                        <span>•</span>
                        <span>© 2026 Todos los derechos reservados</span>
                    </div>
                </div>
            </footer>

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
                        <div className="w-screen max-w-md bg-[#0d1017] border-l border-white/10 shadow-2xl flex flex-col justify-between">
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-blue-400" />
                                    <h2 className="text-base font-bold text-white uppercase">Tu Bolsa de Compras</h2>
                                    <span className="text-xs font-mono text-gray-400">({totalItemsCount} items)</span>
                                </div>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Items */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {cartItems.length === 0 ? (
                                    <div className="text-center py-20 space-y-3">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center text-3xl">
                                            👟
                                        </div>
                                        <p className="font-bold text-white text-base">Tu bolsa está vacía</p>
                                        <p className="text-xs text-gray-400">Agrega tus sneakers favoritos para solicitar delivery en Lara.</p>
                                        <button
                                            onClick={() => setIsCartOpen(false)}
                                            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                                        >
                                            Explorar Catálogo
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {cartItems.map((item) => (
                                            <div
                                                key={`${item.id}-${item.size}`}
                                                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3"
                                            >
                                                {/* Thumbnail */}
                                                <div className="w-16 h-16 rounded-xl bg-neutral-900 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <span className="text-2xl">👟</span>
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-mono text-blue-400 uppercase font-bold">{item.brand}</p>
                                                    <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                                                    <p className="text-[11px] text-gray-400">Talla: <strong className="text-white">{item.size}</strong></p>
                                                    <p className="text-xs font-black text-white mt-1">
                                                        ${item.price}{' '}
                                                        <span className="text-[10px] text-emerald-400 font-mono">
                                                            ({formatBs(item.price * rate)})
                                                        </span>
                                                    </p>
                                                </div>

                                                {/* Controls */}
                                                <div className="flex flex-col items-end gap-2">
                                                    <button
                                                        onClick={() => removeItem(item.id, item.size)}
                                                        className="text-gray-500 hover:text-red-400 p-1"
                                                        title="Eliminar de la bolsa"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="flex items-center gap-1.5 bg-black/60 rounded-lg border border-white/10 p-0.5">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                                                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-xs font-bold font-mono px-1">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                                                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Shipping Option Selector */}
                                        <div className="pt-4 border-t border-white/10 space-y-2">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
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
                                                                ? 'bg-blue-600/20 border-blue-500 text-white'
                                                                : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.05]'
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
                                                            <span className="font-semibold">{opt.label}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-emerald-400">{opt.price}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Drawer Footer */}
                            {cartItems.length > 0 && (
                                <div className="p-5 border-t border-white/10 bg-black/60 space-y-3">
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between text-gray-400">
                                            <span>Subtotal Calzados:</span>
                                            <span className="font-mono">${subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Flete / Envío:</span>
                                            <span className="font-mono">${shippingCostUsd.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-base font-black text-white pt-1 border-t border-white/10">
                                            <span>Total a Pagar:</span>
                                            <div className="text-right">
                                                <span>${totalCartUsd.toFixed(2)}</span>
                                                <div className="text-xs font-bold text-emerald-400 font-mono">
                                                    {formatBs(totalCartBs)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCheckoutModalOpen(true);
                                        }}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30"
                                    >
                                        <span>Confirmar Pedido & Delivery</span>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#0f131c] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-bold text-white uppercase">Datos de Despacho & Pago</h3>
                            </div>
                            <button
                                onClick={() => setIsCheckoutModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmOrder} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-300 mb-1">Nombre Completo del Cliente *</label>
                                <input
                                    type="text"
                                    required
                                    value={checkoutForm.name}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                                    placeholder="Ej. Carlos Mendoza"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-300 mb-1">Teléfono WhatsApp *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={checkoutForm.phone}
                                        onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                                        placeholder="0414-5551234"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-300 mb-1">Zona / Municipio (Lara)</label>
                                    <select
                                        value={checkoutForm.zone}
                                        onChange={(e) => setCheckoutForm({ ...checkoutForm, zone: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-blue-500"
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
                                <label className="block font-semibold text-gray-300 mb-1">Dirección Exacta de Entrega *</label>
                                <input
                                    type="text"
                                    required
                                    value={checkoutForm.address}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                                    placeholder="Urb. El Parral, Calle 4 con Av. Los Leones, Casa #12"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-300 mb-1">Método de Pago Preferido</label>
                                <select
                                    value={checkoutForm.paymentMethod}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentMethod: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-blue-500 font-bold"
                                >
                                    <option value="pagomovil">Pago Móvil (Bs. Tasa BCV)</option>
                                    <option value="efectivo_usd">Efectivo Divisas ($ al recibir)</option>
                                    <option value="punto_venta">Punto de Venta Inalámbrico al entregar</option>
                                    <option value="zelle">Zelle (USD)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-300 mb-1">Indicaciones para el Motorizado (Opcional)</label>
                                <input
                                    type="text"
                                    value={checkoutForm.notes}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                                    placeholder="Llevar cambio en efectivo de $20 o traer también talla 42 para medir"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-800/60 flex items-center justify-between text-xs">
                                <div>
                                    <p className="font-bold text-white">Total Final del Pedido:</p>
                                    <p className="text-[11px] text-gray-400">Incluye calzados + despacho</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-white">${totalCartUsd.toFixed(2)}</p>
                                    <p className="text-xs font-bold text-emerald-400 font-mono">{formatBs(totalCartBs)}</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#0f131c] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl">
                            ✓
                        </div>

                        <h3 className="text-xl font-black text-white uppercase">¡Pedido Confirmado con Éxito!</h3>
                        <p className="text-xs text-gray-300">
                            Tu orden ha sido registrada con el folio <strong className="text-blue-400 font-mono">{orderSuccessData.receiptNumber}</strong>. Nuestro equipo de despacho ya está preparando tus sneakers.
                        </p>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left text-xs space-y-1.5 font-mono">
                            <p className="text-gray-400">Cliente: <strong className="text-white">{orderSuccessData.customerName}</strong></p>
                            <p className="text-gray-400">Entrega: <strong className="text-white">{orderSuccessData.deliveryAddress}</strong></p>
                            <p className="text-gray-400">Pago: <strong className="text-emerald-400 capitalize">{orderSuccessData.paymentMethod}</strong></p>
                            <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm">
                                <span className="text-white">Monto a pagar:</span>
                                <span className="text-emerald-400">${orderSuccessData.totalUsd.toFixed(2)} ({formatBs(orderSuccessData.totalBs)})</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setOrderSuccessData(null)}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#0f131c] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5">
                        {/* Close button */}
                        <button
                            onClick={() => {
                                setIsAuthModalOpen(false);
                                setAuthError('');
                            }}
                            className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Modal Header */}
                        <div className="text-center space-y-1">
                            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20 mb-2">
                                <Lock className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase italic">
                                {authTab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta de Cliente'}
                            </h3>
                            <p className="text-xs text-gray-400">
                                {authTab === 'login'
                                    ? 'Portal de acceso único para Admin, Cajero, Supervisor o Cliente.'
                                    : 'Regístrate para comprar online con delivery express en Lara.'}
                            </p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => {
                                    setAuthTab('login');
                                    setAuthError('');
                                }}
                                className={`py-2 rounded-lg transition-all ${
                                    authTab === 'login' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
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
                                    authTab === 'register' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Registrarse (Cliente)
                            </button>
                        </div>

                        {/* Error Notice */}
                        {authError && (
                            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                                {authError}
                            </div>
                        )}

                        {/* TAB 1: SINGLE UNIFIED LOGIN */}
                        {authTab === 'login' && (
                            <form onSubmit={handleUnifiedLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Correo Electrónico o Usuario
                                    </label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            required
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            placeholder="admin@urbanstep.com o tu correo"
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type={showLoginPassword ? 'text' : 'password'}
                                            required
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                        >
                                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
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
                                    <label className="block font-semibold text-gray-300 mb-1">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        required
                                        value={regForm.name}
                                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                                        placeholder="Tu nombre y apellido"
                                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-semibold text-gray-300 mb-1">Correo Electrónico *</label>
                                        <input
                                            type="email"
                                            required
                                            value={regForm.email}
                                            onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                                            placeholder="cliente@ejemplo.com"
                                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-300 mb-1">Teléfono WhatsApp *</label>
                                        <input
                                            type="tel"
                                            required
                                            value={regForm.phone}
                                            onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                                            placeholder="0414-1234567"
                                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-1">
                                        <label className="block font-semibold text-gray-300 mb-1">Doc.</label>
                                        <select
                                            value={regForm.docType}
                                            onChange={(e) => setRegForm({ ...regForm, docType: e.target.value })}
                                            className="w-full px-2 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-blue-500 font-bold"
                                        >
                                            <option value="V">V-</option>
                                            <option value="E">E-</option>
                                            <option value="J">J-</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block font-semibold text-gray-300 mb-1">Cédula / RIF</label>
                                        <input
                                            type="text"
                                            value={regForm.docNumber}
                                            onChange={(e) => setRegForm({ ...regForm, docNumber: e.target.value })}
                                            placeholder="28123456"
                                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-300 mb-1">Dirección de Entrega en Lara</label>
                                    <input
                                        type="text"
                                        value={regForm.address}
                                        onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                                        placeholder="Barquisimeto / Cabudare, Urb. o Sector"
                                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-semibold text-gray-300 mb-1">Contraseña *</label>
                                        <input
                                            type="password"
                                            required
                                            value={regForm.password}
                                            onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-300 mb-1">Repetir Contraseña *</label>
                                        <input
                                            type="password"
                                            required
                                            value={regForm.confirmPassword}
                                            onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-1.5"
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
