// Matriz de permisos centralizada - Roles: Admin, Supervisor, Cajero, Cliente
export const RolePermissions = {
    Admin: ['dashboard', 'pos', 'cashier', 'products', 'inventory', 'customers', 'reports', 'delivery', 'users', 'settings', 'ecommerce'],
    Supervisor: ['dashboard', 'reports', 'inventory', 'customers', 'delivery', 'cashier'],
    Cajero: ['cashier', 'pos', 'customers', 'delivery', 'dashboard'],
    Cliente: ['ecommerce', 'delivery'],
};

export const hasPermission = (role, module) => {
    if (!role || !RolePermissions[role]) return false;
    return RolePermissions[role].includes(module);
};

// Ruta de aterrizaje por rol: el cajero entra directo al Terminal de Caja, Supervisor a Reportes, Cliente a Ecommerce
const DefaultRoutes = {
    Admin: '/',
    Supervisor: '/reports',
    Cajero: '/cashier',
    Cliente: '/landing',
};

export const getDefaultRoute = (role) => DefaultRoutes[role] || '/';

// Metadatos visuales por rol (badges en Sidebar/Header)
export const RoleMeta = {
    Admin:      { label: 'Administrador', badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    Supervisor: { label: 'Supervisor',    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    Cajero:     { label: 'Cajero',        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    Cliente:    { label: 'Cliente Online', badgeClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
};