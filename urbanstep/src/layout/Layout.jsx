import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout = () => {
    // Estado para colapsar/desplegar menú lateral en pantallas de escritorio
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('urbanstep_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });

    // Estado para abrir/cerrar drawer en teléfonos móviles (Android / iOS)
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem('urbanstep_sidebar_collapsed', String(next));
            } catch {}
            return next;
        });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
            {/* Sidebar con módulos desplegables y soporte responsivo móvil */}
            <Sidebar
                isCollapsed={isCollapsed}
                onToggleCollapse={toggleCollapse}
                mobileOpen={mobileOpen}
                onCloseMobile={() => setMobileOpen(false)}
            />

            {/* Contenedor Principal */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <Header onToggleMobileSidebar={() => setMobileOpen(prev => !prev)} />

                {/* Área de Contenido Principal: min-h-full sin trampas de h-full que compriman las cards */}
                <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 scroll-smooth">
                    <div className="max-w-7xl mx-auto min-h-full flex flex-col">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;