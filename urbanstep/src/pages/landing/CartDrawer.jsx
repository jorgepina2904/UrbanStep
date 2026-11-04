import React from 'react';
import { ShoppingBag, X, Trash2, Minus, Plus, Lock, ArrowRight, Truck, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import StoreWordmark from './StoreWordmark';
import { SHIPPING_OPTIONS } from './storeInfo';
import { useEscapeKey } from './ui';

/** Bolsa de compras lateral: renglones con tope de stock, entrega, cupón y totales en $ y Bs. */
export default function CartDrawer({
    isOpen, onClose, items, totalItemsCount, renderDualPrice, formatUSD,
    shippingOption, onShippingChange, shippingCostUsd, effectiveShippingUsd, subtotal, promo, totalCartUsd,
    couponInput, onCouponInput, onApplyCoupon, couponCode, onRemoveCoupon, tryOnRequest,
    isAuthenticated, onRemoveItem, onChangeQty, onCheckout, onBrowse
}) {
    useEscapeKey(isOpen, onClose);
    if (!isOpen) return null;
    const total = renderDualPrice(totalCartUsd);

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Bolsa de compras">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
            <aside className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-white dark:bg-us-surface border-l border-slate-200 dark:border-white/10 flex flex-col shadow-2xl us-slide-in">
                <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-us-carbon">
                    <div className="flex items-center gap-2.5">
                        <StoreWordmark subtitle={null} />
                        <span className="text-slate-300 dark:text-gray-600">|</span>
                        <ShoppingBag className="w-[18px] h-[18px] text-sky-600 dark:text-us-cyan" />
                        <span className="font-us-mono text-xs font-black uppercase text-slate-900 dark:text-white">Bolsa ({totalItemsCount})</span>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar bolsa" className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center py-16 space-y-4 px-6">
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-black border border-us-cyan/30 p-2.5 shadow-xl shadow-cyan-500/10 flex items-center justify-center">
                                <img src="/brand/urbanstep-emblem.png" alt="" className="w-full h-full object-contain" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-us-display font-black text-base uppercase text-slate-900 dark:text-white">Tu bolsa está vacía</p>
                                <p className="text-xs text-slate-500 dark:text-gray-400">Agrega tus siluetas favoritas desde el catálogo disponible hoy.</p>
                            </div>
                            <button type="button" onClick={onBrowse} className="px-5 py-2.5 rounded-xl bg-us-cyan text-black font-us-mono font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 active:scale-95 transition-all">
                                Explorar catálogo
                            </button>
                        </div>
                    ) : (
                        <>
                            <ul className="space-y-3">
                                {items.map((item) => {
                                    const atMax = item.maxStock !== undefined && item.quantity >= item.maxStock;
                                    const line = renderDualPrice(item.price * item.quantity);
                                    return (
                                        <li key={`${item.id}-${item.size}-${item.color || ''}`} className="bg-slate-50 dark:bg-us-elevated p-3 rounded-xl border border-slate-200 dark:border-white/10 flex items-start gap-3">
                                            <div className="w-16 h-16 rounded-lg bg-white dark:bg-us-mid flex items-center justify-center p-1 shrink-0 border border-slate-200 dark:border-white/5">
                                                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" /> : <span className="text-2xl">👟</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-us-mono font-bold uppercase text-sky-600 dark:text-us-cyan block">{item.brand}</span>
                                                        <h4 className="font-us-display text-xs font-bold uppercase text-slate-900 dark:text-white leading-tight truncate">{item.name}</h4>
                                                        <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                                                            Talla: <strong className="text-slate-900 dark:text-white">{item.size}</strong>
                                                            {item.color && <> • Color: <span className="text-slate-900 dark:text-white">{item.color}</span></>}
                                                        </p>
                                                    </div>
                                                    <button type="button" onClick={() => onRemoveItem(item)} aria-label={`Quitar ${item.name} de la bolsa`} className="text-slate-400 hover:text-red-500 p-0.5">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200 dark:border-white/10">
                                                    <div>
                                                        <span className="font-us-display text-sm font-black text-slate-900 dark:text-white">{line.primary}</span>
                                                        <span className="font-us-mono text-[10px] text-emerald-600 dark:text-us-cyan block font-bold">({line.secondary})</span>
                                                    </div>
                                                    <div className="flex items-center border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-us-carbon px-1 py-0.5">
                                                        <button type="button" onClick={() => onChangeQty(item, item.quantity - 1)} aria-label="Disminuir cantidad" className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white">
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="w-6 text-center font-us-mono text-xs font-bold text-slate-900 dark:text-white" aria-live="polite">{item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            disabled={atMax}
                                                            onClick={() => (atMax ? toast.error(`Stock máximo alcanzado (${item.maxStock} disponibles)`) : onChangeQty(item, item.quantity + 1))}
                                                            aria-label={atMax ? `Stock máximo alcanzado (${item.maxStock})` : 'Aumentar cantidad'}
                                                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            {tryOnRequest && (
                                <p className="p-3 rounded-xl bg-sky-50 dark:bg-us-cyan/10 border border-sky-200 dark:border-us-cyan/30 text-xs text-sky-900 dark:text-us-ice flex items-start gap-2">
                                    <Home className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span><strong>Prueba en puerta:</strong> {tryOnRequest.label}</span>
                                </p>
                            )}

                            <fieldset className="space-y-2">
                                <legend className="font-us-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-gray-400 font-bold mb-2">Modalidad de entrega:</legend>
                                {SHIPPING_OPTIONS.map(opt => {
                                    const active = shippingOption === opt.id;
                                    return (
                                        <label key={opt.id} className={`flex items-center justify-between gap-2 p-3 rounded-xl border cursor-pointer transition-all ${active
                                            ? 'border-sky-500 bg-sky-50 dark:border-us-cyan/60 dark:bg-us-cyan/10'
                                            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-us-panel dark:hover:bg-white/5'}`}>
                                            <span className="flex items-center gap-2 min-w-0">
                                                <input type="radio" name="shipping" value={opt.id} checked={active} onChange={() => onShippingChange(opt.id)} className="text-sky-600 focus:ring-0" />
                                                <span className="min-w-0">
                                                    <span className={`block text-xs font-semibold ${active ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-gray-300'}`}>{opt.label}</span>
                                                    <span className="block text-[10px] text-slate-500 dark:text-gray-500">{opt.detail}</span>
                                                </span>
                                            </span>
                                            <span className={`font-us-mono text-xs font-bold shrink-0 ${opt.costUsd === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-700 dark:text-us-cyan'}`}>
                                                {opt.costUsd === 0 ? 'Gratis' : `+${formatUSD(opt.costUsd)}`}
                                            </span>
                                        </label>
                                    );
                                })}
                            </fieldset>

                            <div className="space-y-1">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        aria-label="Código de cupón"
                                        value={couponInput}
                                        onChange={(e) => onCouponInput(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onApplyCoupon(); } }}
                                        placeholder="Código de cupón"
                                        className="flex-1 bg-white dark:bg-us-low border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-sky-500 dark:focus:border-us-cyan"
                                    />
                                    <button type="button" onClick={onApplyCoupon} className="px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-us-high dark:hover:bg-us-highest text-white rounded-lg font-us-mono text-xs font-bold uppercase">Aplicar</button>
                                </div>
                                {couponCode && (
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                        Cupón {couponCode} activo · <button type="button" className="underline" onClick={onRemoveCoupon}>quitar</button>
                                    </p>
                                )}
                            </div>

                            <div className="bg-slate-50 dark:bg-us-elevated p-3 rounded-xl border border-slate-200 dark:border-white/10 space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-500 dark:text-gray-400">
                                    <span>Subtotal calzados:</span>
                                    <span className="text-slate-900 dark:text-white font-bold font-us-mono">{formatUSD(subtotal)}</span>
                                </div>
                                {promo.applied.map((a) => (
                                    <div key={`${a.code}-${a.label}`} className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span>🏷️ {a.label || a.code}</span>
                                        <span className="font-us-mono">{a.discountUsd > 0 ? `-${formatUSD(a.discountUsd)}` : 'Envío gratis'}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-slate-500 dark:text-gray-400">
                                    <span>Flete / envío:</span>
                                    <span className="text-slate-900 dark:text-white font-bold font-us-mono">
                                        {promo.shippingDiscountUsd > 0 && <s className="mr-1 opacity-60">{formatUSD(shippingCostUsd)}</s>}
                                        {effectiveShippingUsd === 0 ? 'Gratis' : `+${formatUSD(effectiveShippingUsd)}`}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-baseline justify-between">
                                    <span className="font-us-display text-xs font-bold uppercase text-slate-900 dark:text-white">Total a pagar:</span>
                                    <div className="text-right">
                                        <span className="font-us-display text-lg font-black text-slate-900 dark:text-white block">{total.primary}</span>
                                        <span className="font-us-mono text-[11px] font-bold text-emerald-600 dark:text-us-cyan block">{total.secondary}</span>
                                    </div>
                                </div>
                            </div>

                            {!isAuthenticated && (
                                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 flex items-start gap-2 text-xs">
                                    <Lock className="w-[18px] h-[18px] shrink-0 text-amber-600 dark:text-amber-400" />
                                    <div>
                                        <p className="font-us-mono text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">Inicia sesión para comprar</p>
                                        <p className="text-[11px] text-amber-700 dark:text-amber-200/80 leading-snug">Debes tener una cuenta activa para despachar tu pedido y acumular puntos VIP. Tu bolsa se conserva.</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-us-carbon space-y-2">
                        <button type="button" onClick={onCheckout} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-us-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                            {isAuthenticated ? <><Truck className="w-4 h-4" /> Despacho &amp; pago</> : 'Iniciar sesión para comprar'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={onClose} className="w-full py-2 bg-white hover:bg-slate-100 dark:bg-us-low dark:hover:bg-us-mid text-sky-700 dark:text-us-cyan font-us-mono text-xs uppercase font-bold rounded-lg border border-sky-200 dark:border-us-cyan/30 transition-colors">
                            Seguir comprando
                        </button>
                    </div>
                )}
            </aside>
        </div>
    );
}
