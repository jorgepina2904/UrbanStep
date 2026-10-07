import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Tags,
    Users,
    FileBarChart,
    Settings,
    LogOut,
    Store,
    Monitor,
    Truck,
    Globe,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    X,
    FolderKanban
} from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { hasPermission, RoleMeta } from '../utils/permissions';
import { clsx } from 'clsx';

export const Sidebar = ({ isCollapsed, onToggleCollapse, mobileOpen, onCloseMobile }) => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const roleMeta = RoleMeta[user?.role] || {
        label: user?.role || 'Invitado',
        badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    };

    // Estructura de módulos organizados en categorías desplegables
    const menuGroups = [
        {
            id: 'general',
            title: 'General',
            collapsible: false,
            items: [
                { name: 'Dashboard', icon: LayoutDashboard, path: '/', module: 'dashboard' },
            ]
        },
        {
            id: 'ventas',
            title: 'Ventas & Mostrador',
            collapsible: true,
            items: [
                { name: 'Punto de Venta', icon: ShoppingCart, path: '/pos', module: 'pos' },
                { name: 'Terminal de Caja', icon: Monitor, path: '/cashier', module: 'cashier', highlight: true },
                { name: 'Delivery', icon: Truck, path: '/delivery', module: 'delivery' },
            ]
        },
        {
            id: 'catalogo',
            title: 'Catálogo & Almacén',
            collapsible: true,
            items: [
                { name: 'Productos', icon: Tags, path: '/products', module: 'products' },
                { name: 'Inventario', icon: Package, path: '/inventory', module: 'inventory' },
            ]
        },
        {
            id: 'gestion',
            title: 'Gestión & Reportes',
            collapsible: true,
            items: [
                { name: 'Clientes', icon: Users, path: '/customers', module: 'customers' },
                { name: 'Reportes', icon: FileBarChart, path: '/reports', module: 'reports' },
                { name: 'Configuración', icon: Settings, path: '/settings', module: 'settings' },
            ]
        },
        {
            id: 'online',
            title: 'Canal Ecommerce',
            collapsible: false,
            items: [
                { name: 'Tienda Pública', icon: Globe, path: '/landing', module: 'dashboard' },
            ]
        }
    ];

    // Estado de acordeones desplegables guardado en localStorage
    const [openGroups, setOpenGroups] = useState(() => {
        try {
            const saved = localStorage.getItem('urbanstep_sidebar_groups');
            return saved ? JSON.parse(saved) : { ventas: true, catalogo: true, gestion: true };
        } catch {
            return { ventas: true, catalogo: true, gestion: true };
        }
    });

    // Auto-desplegar la sección correspondiente a la ruta activa actual
    useEffect(() => {
        const currentPath = location.pathname;
        const matchingGroup = menuGroups.find(g => 
            g.items.some(item => item.path === currentPath)
        );
        if (matchingGroup && matchingGroup.collapsible) {
            setOpenGroups(prev => {
                if (!prev[matchingGroup.id]) {
                    const updated = { ...prev, [matchingGroup.id]: true };
                    try { localStorage.setItem('urbanstep_sidebar_groups', JSON.stringify(updated)); } catch {}
                    return updated;
                }
                return prev;
            });
        }
    }, [location.pathname]);

    const toggleGroup = (groupId) => {
        setOpenGroups(prev => {
            const updated = { ...prev, [groupId]: !prev[groupId] };
            try { localStorage.setItem('urbanstep_sidebar_groups', JSON.stringify(updated)); } catch {}
            return updated;
        });
    };

    const handleLinkClick = () => {
        if (onCloseMobile) onCloseMobile();
    };

    return (
        <>
            {/* Backdrop oscuro para dispositivos móviles (Android / iOS) */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={onCloseMobile}
                    aria-label="Cerrar menú"
                />
            )}

            {/* Aside Sidebar */}
            <aside
                className={clsx(
                    "fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 select-none shrink-0 shadow-lg lg:shadow-none h-screen",
                    isCollapsed ? "lg:w-20" : "lg:w-64",
                    mobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header del Sidebar */}
                <div className="h-16 flex items-center justify-between px-4 sm:px-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
                            <Store className="h-5 w-5" />
                        </div>
                        {(!isCollapsed || mobileOpen) && (
                            <span className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 truncate">
                                UrbanStep
                            </span>
                        )}
                    </div>

                    {/* Botón de cerrar en móvil */}
                    <button
                        onClick={onCloseMobile}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
                        aria-label="Cerrar navegación"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Botón de contraer/desplegar en escritorio */}
                    {onToggleCollapse && (
                        <button
                            onClick={onToggleCollapse}
                            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title={isCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
                        >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                {/* Perfil del Usuario */}
                {(!isCollapsed || mobileOpen) ? (
                    <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 shrink-0">
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-extrabold text-sm shrink-0">
                                {user?.name ? user.name.charAt(0) : 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user?.name || 'Usuario'}</p>
                                <span className={clsx('inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold', roleMeta.badgeClass)}>
                                    {roleMeta.label}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-3 flex justify-center border-b border-gray-200 dark:border-gray-800 shrink-0" title={`${user?.name || 'Usuario'} (${roleMeta.label})`}>
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-extrabold text-sm">
                            {user?.name ? user.name.charAt(0) : 'U'}
                        </div>
                    </div>
                )}

                {/* Navegación con Secciones Desplegables */}
                <nav className="flex-1 px-3 py-3 space-y-2 overflow-y-auto scrollbar-thin">
                    {menuGroups.map((group) => {
                        // Filtrar items según permisos del usuario
                        const allowedItems = group.items.filter(item => hasPermission(user?.role, item.module));
                        if (allowedItems.length === 0) return null;

                        const isOpen = openGroups[group.id] !== false;

                        // Si el sidebar está colapsado (rail de iconos en desktop)
                        if (isCollapsed && !mobileOpen) {
                            return (
                                <div key={group.id} className="space-y-1.5 py-1 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                                    {allowedItems.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={handleLinkClick}
                                            title={item.name}
                                            className={({ isActive }) => clsx(
                                                "w-11 h-11 mx-auto flex items-center justify-center rounded-xl transition-all relative group",
                                                isActive
                                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                                                    : item.highlight
                                                        ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/60"
                                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            )}
                                        >
                                            <item.icon className="w-5 h-5 shrink-0" />
                                            {item.highlight && (
                                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                                            )}
                                        </NavLink>
                                    ))}
                                </div>
                            );
                        }

                        // Modo expandido (con cabeceras desplegables estilo acordeón)
                        return (
                            <div key={group.id} className="space-y-1">
                                {group.collapsible ? (
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.id)}
                                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <FolderKanban className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                            {group.title}
                                        </span>
                                        <ChevronDown
                                            className={clsx(
                                                "w-3.5 h-3.5 transition-transform duration-200 text-gray-400",
                                                isOpen ? "rotate-0" : "-rotate-90"
                                            )}
                                        />
                                    </button>
                                ) : (
                                    <div className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-gray-400">
                                        {group.title}
                                    </div>
                                )}

                                {/* Contenedor de links desplegables */}
                                {(!group.collapsible || isOpen) && (
                                    <div className="space-y-1 animate-in fade-in duration-150 pl-0.5">
                                        {allowedItems.map((item) => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                onClick={handleLinkClick}
                                                className={({ isActive }) => clsx(
                                                    "flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
                                                    isActive
                                                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                                        : item.highlight
                                                            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70"
                                                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                                )}
                                            >
                                                <div className="flex items-center min-w-0">
                                                    <item.icon className="w-4 h-4 mr-2.5 shrink-0" />
                                                    <span className="truncate">{item.name}</span>
                                                </div>
                                                {item.highlight && (
                                                    <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 shrink-0">
                                                        POS
                                                    </span>
                                                )}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer: Cerrar Sesión */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
                    <button
                        onClick={logout}
                        title="Cerrar Sesión"
                        className={clsx(
                            "flex items-center rounded-xl text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors",
                            isCollapsed && !mobileOpen
                                ? "w-11 h-11 mx-auto justify-center"
                                : "w-full px-3 py-2.5"
                        )}
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {(!isCollapsed || mobileOpen) && <span className="ml-2.5 truncate">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;