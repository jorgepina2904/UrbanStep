import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Truck, Wind, Zap, Pause, Play, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { productService } from '../../services/productService';
import { getColorHex } from '../../utils/shoeSizes';
import { heroSpecs } from './storeInfo';
import { heading } from './ui';

const SLIDE_MS = 5000;
const FALLBACK_IMG = '/brand/urbanstep-emblem.png';

const prefersReducedMotion = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

const productColors = (p) => (Array.isArray(p?.colors) && p.colors.length > 0 ? p.colors : (p?.color ? [p.color] : []));

const sizesInStock = (product, color) => {
    const map = productService.getColorSizeStock(product, color) || product?.sizeStock || null;
    if (!map) return product?.sizes || [];
    return Object.entries(map).filter(([, qty]) => Number(qty) > 0).map(([size]) => size);
};

function SpecBadge({ className, icon, label, value }) {
    return (
        <div className={`absolute z-20 bg-white/95 dark:bg-us-elevated/95 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 shadow-xl flex items-center gap-2 max-w-[46%] ${className}`}>
            {icon}
            <div className="min-w-0">
                <p className="font-us-mono text-[10px] text-slate-500 dark:text-gray-400 uppercase truncate">{label}</p>
                <p className="font-us-display text-xs text-slate-900 dark:text-white uppercase font-black truncate">{value}</p>
            </div>
        </div>
    );
}

/**
 * Hero con carrusel de los más vendidos: rota cada 5 s con barra de progreso (se pausa al pasar el
 * mouse o enfocar), fichas técnicas por producto, selector de color y compra directa.
 */
export default function HeroCarousel({ slides, rate, formatBs, renderDualPrice, cartCount, onAddToCart, onOpenCart, onOpenCheckout, onBrowse }) {
    const [rawIndex, setIndex] = useState(0);
    const [color, setColor] = useState(null);
    const [hovered, setHovered] = useState(false);
    const [autoplay, setAutoplay] = useState(true);
    const [cycle, setCycle] = useState(0);

    const count = slides.length;
    const index = count > 0 ? rawIndex % count : 0;
    const product = slides[index] || null;
    const colors = useMemo(() => productColors(product), [product]);
    const activeColor = color && colors.some(c => c.toLowerCase() === color.toLowerCase()) ? color : (colors[0] || null);
    const image = product ? (productService.getColorVariantImage(product, activeColor) || product.imageUrl || product.image || FALLBACK_IMG) : FALLBACK_IMG;
    const specs = useMemo(() => (product ? heroSpecs(product, sizesInStock(product, activeColor)) : []), [product, activeColor]);
    const price = renderDualPrice(product?.price || 0);

    const brands = useMemo(() => {
        const unique = [...new Set(slides.map(s => s.brand).filter(Boolean))].slice(0, 4);
        if (unique.length < 2) return 'las mejores marcas';
        return `${unique.slice(0, -1).join(', ')} y ${unique[unique.length - 1]}`;
    }, [slides]);

    const goTo = useCallback((i) => {
        if (count === 0) return;
        setIndex(((i % count) + count) % count);
        setColor(null);
        setCycle(c => c + 1);
    }, [count]);

    const running = autoplay && !hovered && count > 1;

    useEffect(() => {
        if (!running) return;
        const timer = setInterval(() => {
            goTo(index + 1);
        }, SLIDE_MS);
        return () => clearInterval(timer);
    }, [running, index, goTo]);

    return (
        <section id="top" className="relative overflow-hidden bg-slate-50 dark:bg-us-ink border-b border-slate-200 dark:border-white/10 py-10 md:py-16">
            <div className="absolute -top-24 left-1/4 w-96 h-96 bg-cyan-400/10 dark:bg-us-cyan/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 right-10 w-96 h-96 bg-red-500/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                {/* Escenario del calzado + fichas técnicas */}
                <div
                    className="lg:col-span-7 flex flex-col items-center order-2 lg:order-1"
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    onFocus={() => setHovered(true)}
                    onBlur={() => setHovered(false)}
                >
                    <div className="relative w-full aspect-[4/3] max-h-[460px] flex items-center justify-center">
                        {/* Tarjeta de estudio: las fotos del inventario suelen venir con fondo blanco */}
                        <div className="absolute inset-x-[7%] inset-y-[3%] rounded-[2rem] bg-white shadow-2xl shadow-slate-300/60 dark:shadow-black/70 ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,229,255,0.12)_0%,transparent_70%)] pointer-events-none" />
                            <img
                                key={`${product?.id}-${activeColor}`}
                                src={image}
                                alt={product ? `${product.name}${activeColor ? ` en color ${activeColor}` : ''}` : 'Calzado deportivo UrbanStep'}
                                onError={(e) => {
                                    if (e.currentTarget.src !== FALLBACK_IMG && !e.currentTarget.src.endsWith(FALLBACK_IMG)) {
                                        e.currentTarget.src = FALLBACK_IMG;
                                    }
                                }}
                                className="relative w-full h-full object-contain mix-blend-multiply select-none us-fade-in"
                            />
                        </div>

                        {count > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); goTo(index - 1); }}
                                    aria-label="Calzado anterior"
                                    className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 dark:bg-us-elevated/90 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-white dark:hover:bg-us-high shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); goTo(index + 1); }}
                                    aria-label="Siguiente calzado"
                                    className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 dark:bg-us-elevated/90 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-white dark:hover:bg-us-high shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}

                        {product && specs.length === 3 && (
                            <>
                                <SpecBadge className="top-4 left-0 sm:left-6" label={specs[0].label} value={specs[0].value}
                                    icon={<span className="w-2.5 h-2.5 shrink-0 rounded-full bg-us-cyan animate-ping" />} />
                                <SpecBadge className="bottom-6 left-0 sm:left-10" label={specs[1].label} value={specs[1].value}
                                    icon={<Wind className="w-4 h-4 shrink-0 text-sky-600 dark:text-us-cyan" />} />
                                <SpecBadge className="top-10 right-0 sm:right-6" label={specs[2].label} value={specs[2].value}
                                    icon={<Zap className="w-4 h-4 shrink-0 text-orange-500 dark:text-orange-400" />} />
                            </>
                        )}

                        {colors.length > 1 && (
                            <div className="absolute bottom-6 right-0 sm:right-6 z-20 bg-black/70 backdrop-blur-md p-1.5 rounded-2xl flex flex-col items-center gap-1.5 border border-white/20 shadow-xl">
                                {colors.slice(0, 5).map((c) => {
                                    const selected = activeColor?.toLowerCase() === c.toLowerCase();
                                    return (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            title={`Ver en color ${c}`}
                                            aria-label={`Ver en color ${c}`}
                                            aria-pressed={selected}
                                            className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 ${selected ? 'ring-2 ring-us-cyan border-white scale-110' : 'border-white/50 opacity-80 hover:opacity-100'}`}
                                            style={{ background: getColorHex(c) }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {product && (
                        <div className="w-full max-w-md mt-3 flex items-center justify-between gap-3 bg-white dark:bg-us-elevated border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-sm">
                            <div className="min-w-0">
                                <p className="font-us-mono text-[10px] font-bold uppercase text-sky-600 dark:text-us-cyan">#{index + 1} más vendido · {product.brand}</p>
                                <p className="font-us-display text-sm font-black uppercase text-slate-900 dark:text-white truncate">{product.name}</p>
                                <p className="text-xs">
                                    <span className="font-black text-slate-900 dark:text-white">{price.primary}</span>{' '}
                                    <span className="font-us-mono text-emerald-600 dark:text-emerald-400">({price.secondary})</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onAddToCart(product, activeColor)}
                                className="shrink-0 px-3 py-2 rounded-lg bg-us-cyan text-black font-us-mono text-xs font-bold uppercase hover:brightness-110 flex items-center gap-1.5 active:scale-95 transition-all"
                            >
                                <ShoppingBag className="w-4 h-4" /> Agregar
                            </button>
                        </div>
                    )}

                    {count > 1 && (
                        <div className="w-full max-w-md mt-4 space-y-2">
                            <div className="w-full bg-slate-200 dark:bg-us-mid rounded-full h-1.5 overflow-hidden">
                                <div
                                    key={`${index}-${cycle}`}
                                    className="us-progress-bar h-full bg-sky-500 dark:bg-us-cyan"
                                    style={{ '--us-duration': `${SLIDE_MS}ms`, animationPlayState: running ? 'running' : 'paused' }}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs font-us-mono">
                                <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="Más vendidos">
                                    <button
                                        type="button"
                                        onClick={() => goTo(index - 1)}
                                        aria-label="Calzado anterior"
                                        title="Anterior"
                                        className="p-1 rounded bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-us-high dark:text-gray-400 dark:hover:text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    {slides.map((s, i) => (
                                        <button
                                            key={s.id || i}
                                            type="button"
                                            role="tab"
                                            aria-selected={i === index}
                                            onClick={() => goTo(i)}
                                            title={s.name}
                                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${i === index
                                                ? 'bg-us-cyan text-black'
                                                : 'bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-us-high dark:text-gray-400 dark:hover:text-white'}`}
                                        >
                                            {String(i + 1).padStart(2, '0')} <span className="hidden sm:inline">{String(s.brand || '').slice(0, 8)}</span>
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => goTo(index + 1)}
                                        aria-label="Siguiente calzado"
                                        title="Siguiente"
                                        className="p-1 rounded bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-us-high dark:text-gray-400 dark:hover:text-white transition-colors"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAutoplay(a => !a)}
                                    aria-label={autoplay ? 'Pausar carrusel' : 'Reanudar carrusel'}
                                    className="shrink-0 flex items-center gap-1 text-slate-500 dark:text-gray-500 uppercase text-[10px] hover:text-slate-900 dark:hover:text-white"
                                >
                                    {autoplay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                    {autoplay ? (hovered ? 'En pausa' : 'Auto 5s') : 'Pausado'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mensaje, métricas y llamados a la acción */}
                <div className="lg:col-span-5 space-y-4 order-1 lg:order-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-us-high rounded-full border border-slate-200 dark:border-white/10">
                        <span className="w-2 h-2 rounded-full bg-us-cyan animate-pulse" />
                        <span className="font-us-mono text-[10px] uppercase tracking-widest text-sky-700 dark:text-us-cyan">Sneakers store • Venezuela {new Date().getFullYear()}</span>
                    </div>
                    <div>
                        <p className="font-us-mono text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 mb-1">Collection</p>
                        <h1 className={`${heading} text-4xl sm:text-5xl leading-none`}>
                            The streets <span className="text-sky-600 dark:text-us-cyan">are yours.</span>
                        </h1>
                        <p className="text-slate-600 dark:text-gray-300 text-sm mt-3 leading-relaxed font-us-body">
                            Siluetas originales de <strong className="text-slate-900 dark:text-white">{brands}</strong>. Compra en tiempo real a tasa oficial BCV
                            con entrega express en Barquisimeto &amp; Cabudare (45 min) y prueba de 2 tallas en puerta.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2">
                        {[
                            { value: <>45<span className="text-sky-600 dark:text-us-cyan">m</span></>, label: 'Delivery Lara' },
                            { value: <>100<span className="text-sky-600 dark:text-us-cyan">%</span></>, label: 'Auténticos' },
                            { value: <span className="text-base sm:text-xl">{formatBs(rate).replace('Bs. ', 'Bs.')}</span>, label: 'Tasa BCV' }
                        ].map((m) => (
                            <div key={m.label} className="bg-white dark:bg-us-low p-2.5 rounded-lg border border-slate-200 dark:border-white/5 text-center sm:text-left">
                                <p className="font-us-display text-xl font-black text-slate-900 dark:text-white truncate">{m.value}</p>
                                <p className="font-us-mono text-[10px] text-slate-500 dark:text-gray-400 uppercase">{m.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        {cartCount > 0 ? (
                            <button type="button" onClick={onOpenCart} className="px-5 py-3 bg-us-cyan text-black font-us-mono text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 hover:brightness-110 flex items-center gap-2 active:scale-95 transition-all">
                                <ShoppingBag className="w-[18px] h-[18px]" /> Abrir bolsa ({cartCount})
                            </button>
                        ) : (
                            <button type="button" onClick={onBrowse} className="px-5 py-3 bg-us-cyan text-black font-us-mono text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 hover:brightness-110 flex items-center gap-2 active:scale-95 transition-all">
                                Ver catálogo <ArrowRight className="w-[18px] h-[18px]" />
                            </button>
                        )}
                        <button type="button" onClick={onOpenCheckout} className="px-5 py-3 bg-white hover:bg-slate-100 dark:bg-us-high dark:hover:bg-us-highest text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 font-us-mono text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 active:scale-95 transition-all">
                            <Truck className="w-[18px] h-[18px] text-sky-600 dark:text-us-cyan" /> Despacho &amp; Pago
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
