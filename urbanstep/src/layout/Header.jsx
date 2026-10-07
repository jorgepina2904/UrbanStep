import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Bell,
    Search,
    Sun,
    Moon,
    TrendingUp,
    RefreshCw,
    LayoutGrid,
    ChevronDown,
    X,
    Check,
    Package,
    Users,
    FileText,
    AlertTriangle,
    ArrowRight,
    Store,
    LayoutDashboard,
    ShoppingCart,
    Tags,
    Truck,
    Settings,
    FileBarChart,
    Monitor,
    Globe,
    Menu
} from 'lucide-react';
import { ThemeContext } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { AuthContext } from '../contexts/AuthContext';
import { hasPermission } from '../utils/permissions';
import { db } from '../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

export const Header = ({ onToggleMobileSidebar }) => {
    const { isDark, toggleTheme } = useContext(ThemeContext);
    const { rate, updateRate, refreshRate, isRefreshing, formatBs, formatUSD } = useCurrency();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    // Rate modal state
    const [showRateModal, setShowRateModal] = useState(false);
    const [newRateInput, setNewRateInput] = useState('');

    // Modules dropdown state
    const [isModulesOpen, setIsModulesOpen] = useState(false);
    const modulesRef = useRef(null);

    // Live search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef(null);

    // Notifications state
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [readNotifIds, setReadNotifIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('urbanstep_read_notifs') || '[]');
        } catch {
            return [];
        }
    });
    const notifRef = useRef(null);

    // Close popovers on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modulesRef.current && !modulesRef.current.contains(e.target)) {
                setIsModulesOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearchOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Module definitions with route and permissions
    const systemModules = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/', module: 'dashboard', desc: 'Resumen ejecutivo y KPIs' },
        { name: 'Terminal de Caja', icon: Monitor, path: '/cashier', module: 'cashier', desc: 'Facturación rápida y arqueos', badge: 'POS' },
        { name: 'Punto de Venta', icon: ShoppingCart, path: '/pos', module: 'pos', desc: 'Ventas de mostrador' },
        { name: 'Productos', icon: Tags, path: '/products', module: 'products', desc: 'Catálogo de calzados y moda' },
        { name: 'Inventario', icon: Package, path: '/inventory', module: 'inventory', desc: 'Stock, kardex y alertas' },
        { name: 'Clientes', icon: Users, path: '/customers', module: 'customers', desc: 'Fidelización y cédulas/RIF' },
        { name: 'Delivery', icon: Truck, path: '/delivery', module: 'delivery', desc: 'Envíos en Lara y motorizados' },
        { name: 'Reportes', icon: FileBarChart, path: '/reports', module: 'reports', desc: 'Reportes gerenciales y PDF' },
        { name: 'Configuración', icon: Settings, path: '/settings', module: 'settings', desc: 'Usuarios, roles y empresa' },
        { name: 'Tienda Ecommerce', icon: Globe, path: '/landing', module: 'dashboard', desc: 'Catálogo online para clientes', badge: 'Web' }
    ];

    const accessibleModules = systemModules.filter(m => hasPermission(user?.role, m.module));
    const currentModule = systemModules.find(m => m.path === location.pathname) || { name: 'Módulos', icon: LayoutGrid };

    // =========================================================================
    // REAL-TIME SEARCH (Products, Customers, Invoices)
    // =========================================================================
    const searchResults = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return { products: [], customers: [], sales: [] };

        const matchedProducts = (db.products || [])
            .filter(p => (
                p.name?.toLowerCase().includes(q) ||
                p.sku?.toLowerCase().includes(q) ||
                p.brand?.toLowerCase().includes(q)
            ))
            .slice(0, 4);

        const matchedCustomers = (db.customers || [])
            .filter(c => (
                `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(q) ||
                c.docNumber?.toLowerCase().includes(q) ||
                c.phone?.includes(q)
            ))
            .slice(0, 3);

        const matchedSales = (db.sales || [])
            .filter(s => (
                s.receiptNumber?.toLowerCase().includes(q) ||
                s.customer?.toLowerCase().includes(q)
            ))
            .slice(0, 3);

        return {
            products: matchedProducts,
            customers: matchedCustomers,
            sales: matchedSales
        };
    }, [searchQuery]);

    const totalSearchMatches = searchResults.products.length + searchResults.customers.length + searchResults.sales.length;

    // =========================================================================
    // SYSTEM NOTIFICATIONS ENGINE
    // =========================================================================
    const notifications = useMemo(() => {
        const list = [];

        // 1. Critical stock alerts
        const lowStockItems = (db.products || []).filter(p => p.stock <= (p.minStock || 5) && !p.disabled);
        const outOfStockItems = (db.products || []).filter(p => p.stock <= 0);

        if (outOfStockItems.length > 0) {
            list.push({
                id: 'notif-out-stock',
                type: 'danger',
                title: `${outOfStockItems.length} Calzado(s) Agotados`,
                message: `Modelos como "${outOfStockItems[0]?.name}" están sin inventario y deshabilitados.`,
                path: '/inventory',
                time: 'Inventario Crítico'
            });
        }

        if (lowStockItems.length > 0) {
            list.push({
                id: 'notif-low-stock',
                type: 'warning',
                title: `${lowStockItems.length} Producto(s) en Stock Bajo`,
                message: `Quedan pocas unidades. Sugerido reordenar en módulo de inventario.`,
                path: '/inventory',
                time: 'Alerta Operativa'
            });
        }

        // 2. Recent sales alert
        if (db.sales && db.sales.length > 0) {
            const lastSale = db.sales[0];
            list.push({
                id: `notif-sale-${lastSale.id}`,
                type: 'success',
                title: `Última Facturación: ${lastSale.receiptNumber}`,
                message: `${lastSale.customer} • ${formatUSD(lastSale.total)} (${formatBs(lastSale.totalBs)})`,
                path: '/reports',
                time: 'Ventas en Línea'
            });
        }

        // 3. Official BCV rate notification
        list.push({
            id: 'notif-bcv-rate',
            type: 'info',
            title: `Tasa Oficial BCV: ${formatBs(rate)}`,
            message: 'Tasa activa aplicada para cotizaciones en Bolívares y pago móvil.',
            path: null,
            time: 'Tipo de Cambio'
        });

        return list;
    }, [rate, formatBs, formatUSD]);

    const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

    const markAllNotifsRead = () => {
        const allIds = notifications.map(n => n.id);
        setReadNotifIds(allIds);
        localStorage.setItem('urbanstep_read_notifs', JSON.stringify(allIds));
        toast.success('Notificaciones marcadas como leídas');
    };

    // =========================================================================
    // BCV RATE MODAL HANDLERS
    // =========================================================================
    const handleOpenModal = () => {
        setNewRateInput(rate.toString());
        setShowRateModal(true);
    };

    const handleSaveRate = (e) => {
        e.preventDefault();
        const num = parseFloat(newRateInput);
        if (isNaN(num) || num <= 0) {
            toast.error('Ingresa una tasa válida');
            return;
        }
        updateRate(num, 'Cabecera Rápida');
        toast.success(`Tasa BCV actualizada: ${formatBs(num)}`);
        setShowRateModal(false);
    };

    const handleSyncLive = async () => {
        try {
            const updated = await refreshRate();
            setNewRateInput(updated.rate.toString());
            toast.success(`Tasa sincronizada con BCV: ${formatBs(updated.rate)}`);
        } catch {
            toast.error('No se pudo conectar a la API del BCV');
        }
    };

    return (
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 transition-colors duration-200 shrink-0 relative z-30">
            {/* Left: Mobile Drawer Trigger & Modules Dropdown Button */}
            <div className="flex items-center gap-2 sm:gap-3">
                {onToggleMobileSidebar && (
                    <button
                        onClick={onToggleMobileSidebar}
                        className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden transition-colors border border-gray-200 dark:border-gray-800"
                        title="Abrir menú de navegación"
                        aria-label="Abrir menú"
                    >
                        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>
                )}

                <div className="relative" ref={modulesRef}>
                    <button
                        onClick={() => setIsModulesOpen(!isModulesOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                            isModulesOpen
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                        }`}
                        title="Desplegar menú de módulos del sistema"
                    >
                        <LayoutGrid className="w-4 h-4 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Módulos:</span>
                        <span className="font-extrabold max-w-[120px] truncate text-blue-600 dark:text-blue-300">
                            {currentModule.name}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isModulesOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Desplegable de Módulos Popover */}
                    {isModulesOpen && (
                        <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="px-2 py-1.5 border-b border-gray-100 dark:border-gray-800 mb-2 flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                                    Navegación del Sistema
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold">
                                    Rol: {user?.role || 'Admin'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[70vh] overflow-y-auto pr-1">
                                {accessibleModules.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => {
                                                navigate(item.path);
                                                setIsModulesOpen(false);
                                            }}
                                            className={`flex items-start gap-2.5 p-2 rounded-xl text-left transition-all ${
                                                isActive
                                                    ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-transparent'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold truncate">{item.name}</span>
                                                    {item.badge && (
                                                        <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Center: Live Search with Popover */}
            <div className="flex-1 max-w-lg mx-3 sm:mx-6 relative" ref={searchRef}>
                <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsSearchOpen(true);
                        }}
                        onFocus={() => setIsSearchOpen(true)}
                        placeholder="Buscar producto, cliente o factura..."
                        className="w-full pl-9 pr-9 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all shadow-inner"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setIsSearchOpen(false);
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {isSearchOpen && searchQuery.trim().length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-3 z-50 max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                        {totalSearchMatches === 0 ? (
                            <div className="py-6 text-center text-gray-400 text-xs">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="font-medium">No se encontraron resultados para "{searchQuery}"</p>
                                <p className="text-[10px] mt-1 text-gray-500">Prueba con un SKU, nombre de zapato, cliente o factura</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Products Results */}
                                {searchResults.products.length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-2 flex items-center gap-1.5 mb-1.5">
                                            <Package className="w-3 h-3 text-blue-500" />
                                            Productos & Calzados ({searchResults.products.length})
                                        </span>
                                        <div className="space-y-1">
                                            {searchResults.products.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        navigate('/products');
                                                        setIsSearchOpen(false);
                                                    }}
                                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                                                        {p.imageUrl ? (
                                                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-0.5" />
                                                        ) : (
                                                            <span className="text-base">👟</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono">{p.brand} • SKU: {p.sku}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 block">{formatUSD(p.price)}</span>
                                                        <span className="text-[10px] font-semibold text-emerald-600 block">{p.stock} disp.</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Customers Results */}
                                {searchResults.customers.length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-2 flex items-center gap-1.5 mb-1.5">
                                            <Users className="w-3 h-3 text-indigo-500" />
                                            Clientes ({searchResults.customers.length})
                                        </span>
                                        <div className="space-y-1">
                                            {searchResults.customers.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => {
                                                        navigate('/customers');
                                                        setIsSearchOpen(false);
                                                    }}
                                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white">{c.firstName} {c.lastName}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono">{c.docNumber || 'Sin cédula'} • {c.phone || 'Sin tlf'}</p>
                                                    </div>
                                                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sales Results */}
                                {searchResults.sales.length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-2 flex items-center gap-1.5 mb-1.5">
                                            <FileText className="w-3 h-3 text-emerald-500" />
                                            Facturas & Tickets ({searchResults.sales.length})
                                        </span>
                                        <div className="space-y-1">
                                            {searchResults.sales.map(s => (
                                                <div
                                                    key={s.id}
                                                    onClick={() => {
                                                        navigate('/reports');
                                                        setIsSearchOpen(false);
                                                    }}
                                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white font-mono">{s.receiptNumber}</p>
                                                        <p className="text-[10px] text-gray-500">{s.customer}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-extrabold text-emerald-600">{formatUSD(s.total)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                {/* BCV Rate Widget */}
                <button
                    onClick={handleOpenModal}
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold transition-all border border-blue-200/50 dark:border-blue-800/50 shrink-0"
                    title="Clic para actualizar o sincronizar la tasa BCV"
                >
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="hidden sm:inline">BCV:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">{formatBs(rate)}</span>
                </button>

                {/* Interactive Notifications Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className={`p-2 rounded-xl border transition-all relative ${
                            isNotifOpen
                                ? 'bg-blue-100 dark:bg-blue-950/70 border-blue-400 text-blue-600'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent text-gray-500 dark:text-gray-400'
                        }`}
                        title="Centro de Notificaciones y Auditoría"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                        )}
                    </button>

                    {/* Notifications Drawer */}
                    {isNotifOpen && (
                        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-3">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-blue-500" />
                                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                                        Notificaciones
                                    </h4>
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 font-bold">
                                            {unreadCount} nuevas
                                        </span>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllNotifsRead}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors flex items-center gap-1"
                                    >
                                        <Check className="w-3 h-3" />
                                        Leídas
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                {notifications.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-6">Sin notificaciones pendientes</p>
                                ) : (
                                    notifications.map((n) => {
                                        const isUnread = !readNotifIds.includes(n.id);
                                        return (
                                            <div
                                                key={n.id}
                                                onClick={() => {
                                                    if (n.path) navigate(n.path);
                                                    setIsNotifOpen(false);
                                                }}
                                                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                                    isUnread
                                                        ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                                                        : 'bg-gray-50/80 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-black text-gray-900 dark:text-white">
                                                            {n.title}
                                                        </span>
                                                        {isUnread && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] font-mono font-semibold text-gray-400 shrink-0">
                                                        {n.time}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-snug">
                                                    {n.message}
                                                </p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Dark/Light mode toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                >
                    {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-500" />}
                </button>
            </div>

            {/* Quick Rate Modal */}
            <Modal isOpen={showRateModal} onClose={() => setShowRateModal(false)} title="🇻🇪 Tasa Oficial BCV" size="sm">
                <form onSubmit={handleSaveRate} className="space-y-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Indica la tasa del dólar oficial del Banco Central de Venezuela para los cálculos del sistema.
                    </p>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Tasa de Cambio (Bs. por 1 USD)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            value={newRateInput}
                            onChange={(e) => setNewRateInput(e.target.value)}
                            placeholder="42.50"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1 text-xs flex items-center justify-center gap-1"
                            onClick={handleSyncLive}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Consultando...' : 'Sincronizar BCV'}
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1 text-xs">
                            Guardar Tasa
                        </Button>
                    </div>
                </form>
            </Modal>
        </header>
    );
};

export default Header;