import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Tags, Users, FileBarChart, Settings, LogOut, Store, Monitor, Truck, Globe } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { hasPermission, RoleMeta } from '../utils/permissions';
import { clsx } from 'clsx';

export const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const roleMeta = RoleMeta[user?.role] || { label: user?.role || 'Invitado', badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/', module: 'dashboard' },
        { name: 'Terminal de Caja', icon: Monitor, path: '/cashier', module: 'cashier', highlight: true },
        { name: 'Punto de Venta', icon: ShoppingCart, path: '/pos', module: 'pos' },
        { name: 'Productos', icon: Tags, path: '/products', module: 'products' },
        { name: 'Inventario', icon: Package, path: '/inventory', module: 'inventory' },
        { name: 'Clientes', icon: Users, path: '/customers', module: 'customers' },
        { name: 'Delivery', icon: Truck, path: '/delivery', module: 'delivery' },
        { name: 'Reportes', icon: FileBarChart, path: '/reports', module: 'reports' },
        { name: 'Configuración', icon: Settings, path: '/settings', module: 'settings' },
        { name: 'Tienda Pública', icon: Globe, path: '/landing', module: 'dashboard' },
    ];

    return (
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen flex flex-col transition-colors duration-200 shrink-0">
            <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
                <Store className="h-8 w-8 text-blue-600 mr-2" />
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">UrbanStep</span>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                        {user?.name ? user.name.charAt(0) : 'U'}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || 'Usuario'}</p>
                        <span className={clsx('inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold', roleMeta.badgeClass)}>
                            {roleMeta.label}
                        </span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {menuItems.filter(item => hasPermission(user?.role, item.module)).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => clsx(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold"
                                : item.highlight
                                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60"
                                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        )}
                    >
                        <div className="flex items-center">
                            <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span>{item.name}</span>
                        </div>
                        {item.highlight && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                                POS
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <button onClick={logout} className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <LogOut className="w-5 h-5 mr-3" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;