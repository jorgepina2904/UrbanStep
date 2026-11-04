import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Truck, User, Sun, Moon, Menu, X, ChevronDown, Package, CreditCard, Ruler, ShieldCheck, LogOut, ArrowRight } from 'lucide-react';
import CurrencyToggle from '../../components/CurrencyToggle';
import { PromoBar } from './LandingSections';
import StoreWordmark from './StoreWordmark';

const NAV_LINKS = [
    { href: '#catalogo', label: 'Catálogo' },
    { href: '#drop', label: 'Drops' },
    { href: '#despacho', label: 'Cobertura Lara' },
    { href: '#hub-fisico', label: 'Tienda Física' },
    { href: '#club', label: 'Club VIP' },
    { href: '#faq', label: 'Preguntas' }
];

/**
 * Encabezado fijo de la tienda: promociones vigentes, ticker BCV/delivery, navegación y acciones
 * (moneda, tema, despacho, bolsa y cuenta).
 */
export default function StoreHeader({
    user, isAuthenticated, isDark, toggleTheme, rate, formatBs, promotions, cartCount,
    onOpenCart, onOpenCheckout, onOpenAuth, onLogout, onGoToPanel,
    onOpenOrders, onOpenPayment, onOpenFitGuide, onOpenAuthenticity
}) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const isClient = user?.role === 'Cliente';

    useEffect(() => {
        if (!menuOpen) return undefined;
        const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const runAndClose = (fn) => () => { setMenuOpen(false); setMobileOpen(false); fn(); };

    const services = [
        { icon: Package, label: 'Mis pedidos y rastreo', onClick: onOpenOrders },
        { icon: CreditCard, label: 'Verificar pago', onClick: onOpenPayment },
        { icon: Ruler, label: 'Guía de tallas', onClick: onOpenFitGuide },
        { icon: ShieldCheck, label: 'Garantía y autenticidad', onClick: onOpenAuthenticity }
    ];

    return (
        <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-us-carbon/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl">
            <PromoBar promotions={promotions} />

            {/* Ticker: tasa BCV, delivery local y autenticidad */}
            <div className="bg-slate-100 dark:bg-us-ink border-b border-slate-200 dark:border-white/5 py-1 px-4 text-[11px] font-us-mono tracking-wider uppercase text-slate-500 dark:text-gray-400">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5">
                    <p>
                        <span className="text-sky-600 dark:text-us-cyan font-bold mr-1">Tasa oficial BCV:</span>
                        <span className="text-slate-900 dark:text-white font-medium">{formatBs(rate)} / USD • sin recargos</span>
                    </p>
                    <p className="hidden sm:block">
                        <span className="text-orange-500 dark:text-orange-400 font-bold mr-1">Delivery express:</span>
                        Barquisimeto &amp; Cabudare (45 min)
                    </p>
                    <p className="hidden md:block text-emerald-600 dark:text-emerald-400 font-bold">100% sneakers originales garantizados</p>
                </div>
            </div>

            {/* Barra principal */}
            <div className="h-16 max-w-7xl mx-auto px-4 flex items-center justify-between gap-3">
                <a href="#top" aria-label="UrbanStep — volver al inicio" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <StoreWordmark />
                </a>

                <nav aria-label="Secciones de la tienda" className="hidden xl:flex items-center gap-5 text-xs font-us-mono uppercase tracking-wider text-slate-500 dark:text-gray-400">
                    {NAV_LINKS.map(l => (
                        <a key={l.href} href={l.href} className="hover:text-sky-600 dark:hover:text-us-cyan transition-colors">{l.label}</a>
                    ))}
                </nav>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="hidden sm:inline-flex"><CurrencyToggle compact /></span>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        className="hidden sm:flex px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-us-low dark:hover:bg-us-mid text-sky-600 dark:text-us-cyan border border-slate-200 dark:border-white/10 items-center gap-1.5 text-xs font-us-mono font-bold uppercase transition-all"
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        <span className="hidden xl:inline text-[11px]">{isDark ? 'Claro' : 'Oscuro'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenCheckout}
                        className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-us-high dark:hover:bg-us-highest text-sky-700 dark:text-us-cyan border border-sky-200 dark:border-us-cyan/40 text-xs font-us-mono font-bold uppercase transition-all"
                    >
                        <Truck className="w-4 h-4" />
                        <span>Despacho &amp; Pago</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenCart}
                        aria-label={`Abrir bolsa (${cartCount} artículos)`}
                        className="relative px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-us-low dark:hover:bg-us-mid text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 flex items-center gap-2 text-xs font-us-mono font-bold uppercase transition-all"
                    >
                        <ShoppingBag className="w-4 h-4 text-sky-600 dark:text-us-cyan" />
                        <span className="hidden sm:inline">Bolsa</span>
                        <span className={`min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${cartCount > 0 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-us-high dark:text-gray-400'}`}>
                            {cartCount}
                        </span>
                    </button>

                    {!isAuthenticated ? (
                        <button
                            type="button"
                            onClick={() => onOpenAuth('login')}
                            className="px-3 py-1.5 rounded-lg bg-us-cyan text-black font-us-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1"
                        >
                            <User className="w-4 h-4" />
                            <span className="hidden sm:inline">Acceder</span>
                        </button>
                    ) : !isClient ? (
                        <button
                            type="button"
                            onClick={onGoToPanel}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-us-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                            <span className="hidden sm:inline">Panel</span> {user?.role}
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setMenuOpen(o => !o)}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-cyan-950/60 border border-sky-200 dark:border-cyan-800 text-sky-700 dark:text-cyan-300 font-us-mono font-bold text-xs flex items-center gap-1"
                            >
                                <User className="w-4 h-4" />
                                <span className="hidden sm:inline max-w-[90px] truncate">Hola, {user?.name?.split(' ')[0]}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {menuOpen && (
                                <div role="menu" className="absolute right-0 mt-2 w-60 rounded-xl bg-white dark:bg-us-elevated border border-slate-200 dark:border-white/10 shadow-2xl p-1.5 text-sm us-fade-in">
                                    <Link role="menuitem" to="/cuenta" className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-white/5">
                                        <User className="w-4 h-4 text-sky-600 dark:text-us-cyan" /> Mi cuenta y direcciones
                                    </Link>
                                    {services.slice(0, 2).map(({ icon: Icon, label, onClick }) => (
                                        <button key={label} role="menuitem" type="button" onClick={runAndClose(onClick)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-white/5">
                                            <Icon className="w-4 h-4 text-sky-600 dark:text-us-cyan" /> {label}
                                        </button>
                                    ))}
                                    <div className="my-1 border-t border-slate-200 dark:border-white/10" />
                                    <button role="menuitem" type="button" onClick={runAndClose(onLogout)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">
                                        <LogOut className="w-4 h-4" /> Cerrar sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setMobileOpen(o => !o)}
                        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                        aria-expanded={mobileOpen}
                        className="xl:hidden p-2 rounded-lg text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Menú móvil */}
            {mobileOpen && (
                <div className="xl:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-us-carbon px-4 py-3 space-y-3 us-fade-in">
                    <nav aria-label="Secciones" className="grid grid-cols-2 gap-1.5">
                        {NAV_LINKS.map(l => (
                            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-us-low text-xs font-us-mono font-bold uppercase text-slate-700 dark:text-gray-300">
                                {l.label}
                            </a>
                        ))}
                    </nav>
                    <div className="grid grid-cols-2 gap-1.5">
                        {services.map(({ icon: Icon, label, onClick }) => (
                            <button key={label} type="button" onClick={runAndClose(onClick)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-left text-slate-700 dark:text-gray-300">
                                <Icon className="w-4 h-4 shrink-0 text-sky-600 dark:text-us-cyan" /> {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                            className="sm:hidden px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-us-low text-sky-600 dark:text-us-cyan border border-slate-200 dark:border-white/10"
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <CurrencyToggle />
                        <button type="button" onClick={runAndClose(onOpenCheckout)} className="flex-1 px-3 py-2 rounded-lg bg-sky-50 dark:bg-us-high text-sky-700 dark:text-us-cyan border border-sky-200 dark:border-us-cyan/40 text-xs font-us-mono font-bold uppercase flex items-center justify-center gap-1.5">
                            <Truck className="w-4 h-4" /> Despacho &amp; Pago
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
