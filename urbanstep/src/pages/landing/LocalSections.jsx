import React, { useEffect, useState } from 'react';
import { Store, MapPin, Clock, Map as MapIcon, Bike, Siren, MessageCircle, Truck, Package, CreditCard, Ruler, ShieldCheck, ArrowRight, Crown } from 'lucide-react';
import { DELIVERY_ZONES, STORE, STORE_HOURS_LABEL, getDropWindow, getStoreStatus, whatsappLink } from './storeInfo';
import { bodyText, heading, kicker, mutedText, scrollToId } from './ui';

/** Re-evalúa una función dependiente de la hora cada `ms` sin re-renderizar el resto de la página. */
function useClock(compute, ms) {
    const [value, setValue] = useState(() => compute(new Date()));
    useEffect(() => {
        const t = setInterval(() => setValue(compute(new Date())), ms);
        return () => clearInterval(t);
    }, [compute, ms]);
    return value;
}

function StatusPill({ status }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-us-mono font-bold uppercase ${status.isOpen
            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {status.label}
        </span>
    );
}

/** Calculadora de entrega por zona de Lara + radar de cobertura. */
export function DeliveryZonesSection({ selectedZone, onSelectZone, renderDualPrice, onDispatch }) {
    const status = useClock(getStoreStatus, 60000);
    const zone = DELIVERY_ZONES.find(z => z.value === selectedZone) || DELIVERY_ZONES[0];
    const fee = renderDualPrice(zone.national ? 5 : 3);
    const local = DELIVERY_ZONES.filter(z => !z.national);

    return (
        <section id="despacho" className="scroll-mt-32 py-14 bg-slate-100/70 dark:bg-us-ink border-y border-slate-200 dark:border-white/10">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-7 space-y-4">
                    <p className={kicker}>Cobertura Lara metropolitana</p>
                    <h2 className={`${heading} text-2xl sm:text-3xl`}>Calcula tu entrega express (45 min)</h2>
                    <p className={`text-sm ${bodyText}`}>
                        Elige tu zona en Barquisimeto o Cabudare. Nuestro motorizado lleva tu par y una talla adicional de respaldo
                        para que te pruebes en casa antes de confirmar el pago.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2" role="radiogroup" aria-label="Zona de entrega">
                        {DELIVERY_ZONES.map(z => {
                            const active = z.value === zone.value;
                            return (
                                <button
                                    key={z.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => onSelectZone(z.value)}
                                    className={`text-left p-3.5 rounded-xl border transition-all ${active
                                        ? 'bg-sky-50 border-sky-500 dark:bg-us-cyan/10 dark:border-us-cyan/60 shadow-md'
                                        : 'bg-white border-slate-200 hover:border-sky-300 dark:bg-us-elevated dark:border-white/10 dark:hover:border-white/30'}`}
                                >
                                    <span className={`font-us-mono text-[10px] uppercase font-bold ${z.national ? 'text-orange-500 dark:text-orange-400' : 'text-sky-600 dark:text-us-cyan'}`}>{z.area}</span>
                                    <span className="block font-us-display text-sm font-black text-slate-900 dark:text-white mt-1">{z.landmark}</span>
                                    <span className={`block text-xs mt-1 ${mutedText}`}>Tiempo: <strong className="text-slate-900 dark:text-white">{z.eta}</strong></span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-us-panel border border-slate-200 dark:border-white/10">
                        <div className="text-xs">
                            <p className="font-us-mono uppercase font-bold text-slate-500 dark:text-gray-400">Tu entrega</p>
                            <p className="text-slate-900 dark:text-white mt-0.5">
                                <strong>{zone.area}</strong> · llega en <strong>{zone.eta}</strong> · flete <strong>{fee.primary}</strong>{' '}
                                <span className="font-us-mono text-emerald-600 dark:text-emerald-400">({fee.secondary})</span>
                            </p>
                        </div>
                        <button type="button" onClick={onDispatch} className="shrink-0 px-4 py-2.5 rounded-lg bg-us-cyan text-black font-us-mono text-xs font-bold uppercase hover:brightness-110 flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                            <Truck className="w-4 h-4" /> Despachar a esta zona
                        </button>
                    </div>
                </div>

                {/* Radar visual de cobertura */}
                <div className="lg:col-span-5 bg-white dark:bg-us-ink rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col justify-between gap-4 relative overflow-hidden shadow-xl">
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#00e5ff_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="relative z-10 flex items-start justify-between gap-3">
                        <div>
                            <p className="font-us-mono text-[10px] text-sky-600 dark:text-us-cyan uppercase font-bold">Radar metropolitano</p>
                            <h3 className={`${heading} text-lg`}>Zonas de despacho</h3>
                        </div>
                        <StatusPill status={status.isOpen ? { isOpen: true, label: 'Despachando ahora' } : status} />
                    </div>

                    <div className="relative z-10 h-60 rounded-xl bg-slate-50 dark:bg-[#14161f] border border-slate-200 dark:border-white/10 p-4 flex flex-col justify-between overflow-hidden">
                        <div className="flex justify-between items-start gap-2 text-[11px] font-us-mono">
                            <span className="bg-white/90 dark:bg-[#1c1f2b]/90 px-2.5 py-1 rounded border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                                <strong>HQ Trinitarias</strong> <span className="text-sky-600 dark:text-us-cyan">● Hub</span>
                            </span>
                            <span className="bg-white/90 dark:bg-[#1c1f2b]/90 px-2 py-1 rounded border border-slate-200 dark:border-white/10 text-orange-500 dark:text-orange-400">
                                Cabudare: 45 min
                            </span>
                        </div>
                        <div className="relative flex items-center justify-center my-auto">
                            <div className="w-44 h-44 rounded-full border border-us-cyan/20 animate-ping absolute motion-reduce:animate-none" />
                            <div className="w-32 h-32 rounded-full border border-us-cyan/40 flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-us-cyan/10 border border-us-cyan flex flex-col items-center justify-center text-center shadow-lg shadow-cyan-500/30">
                                    <Store className="w-5 h-5 text-sky-600 dark:text-us-cyan" />
                                    <span className="font-us-mono text-[9px] font-bold text-slate-900 dark:text-white">TRINITARIAS</span>
                                </div>
                            </div>
                        </div>
                        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-us-mono text-slate-600 dark:text-gray-400 bg-white/80 dark:bg-us-carbon/80 p-2 rounded-lg border border-slate-200 dark:border-white/5">
                            {local.map(z => (
                                <li key={z.id} className="truncate">📍 {z.landmark}: {z.eta}</li>
                            ))}
                        </ul>
                    </div>

                    <p className="relative z-10 p-3 bg-slate-50 dark:bg-us-elevated rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-gray-300 flex items-start gap-2">
                        <Bike className="w-5 h-5 shrink-0 text-sky-600 dark:text-us-cyan" />
                        <span><strong className="text-slate-900 dark:text-white">Garantía de talla:</strong> llevamos el par elegido + 1 talla complementaria para que te pruebes en puerta.</span>
                    </p>
                </div>
            </div>
        </section>
    );
}

/** Banner del drop semanal con cuenta regresiva hasta el jueves 6:00 PM (hora de Venezuela). */
export function DropBanner({ whatsappPhone }) {
    const drop = useClock(getDropWindow, 1000);
    const waUrl = whatsappLink(whatsappPhone, 'Hola UrbanStep, quiero apartar mi talla del drop semanal');
    const units = [['días', drop.days], ['hrs', drop.hours], ['min', drop.minutes], ['seg', drop.seconds]];

    return (
        <section id="drop" aria-labelledby="drop-title" className="scroll-mt-32 border-y border-orange-500/30 bg-gradient-to-r from-orange-50 via-white to-cyan-50 dark:from-[#20100a] dark:via-[#161219] dark:to-[#0d161a] py-6 px-4">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-500 dark:text-orange-400 shrink-0">
                        <Siren className="w-7 h-7 animate-pulse motion-reduce:animate-none" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-orange-500 text-black font-us-mono text-[10px] font-black uppercase tracking-wider">{drop.isLive ? 'Drop en vivo' : 'Drop semanal'}</span>
                            <span className="font-us-mono text-[11px] text-slate-500 dark:text-gray-400 uppercase">Stock limitado • Lara &amp; nacional</span>
                        </div>
                        <h3 id="drop-title" className={`${heading} text-lg md:text-xl mt-0.5`}>Ediciones limitadas de barras &amp; calle</h3>
                        <p className={`text-xs ${bodyText}`}>Nuevos pares todos los jueves a las 6:00 PM. Aparta tu talla antes de que se agote.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    {drop.isLive ? (
                        <p className="font-us-display text-2xl font-black uppercase text-orange-500 dark:text-orange-400">🔥 ¡Ya está disponible!</p>
                    ) : (
                        <div className="flex items-center gap-1.5" role="timer" aria-label={`Faltan ${drop.days} días, ${drop.hours} horas y ${drop.minutes} minutos para el próximo drop`}>
                            {units.map(([label, value]) => (
                                <div key={label} className="w-14 py-1.5 rounded-lg bg-white dark:bg-us-carbon border border-slate-200 dark:border-white/10 text-center">
                                    <span className="block font-us-display text-lg font-black text-slate-900 dark:text-white tabular-nums">{String(value).padStart(2, '0')}</span>
                                    <span className="block font-us-mono text-[9px] uppercase text-slate-500 dark:text-gray-400">{label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {waUrl ? (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-us-mono text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all">
                            <MessageCircle className="w-[18px] h-[18px]" /> Apartar talla vía WhatsApp
                        </a>
                    ) : (
                        <button type="button" onClick={() => scrollToId('club')} className="w-full sm:w-auto px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-us-mono text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all">
                            <Crown className="w-[18px] h-[18px]" /> Únete al club para no perderlo
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}

/** Tienda física (estado en vivo, horario, pagos en taquilla) + centro de servicios al cliente. */
export function StoreHubSection({ paymentMethods, onPickup, onOpenOrders, onOpenPayment, onOpenFitGuide, onOpenAuthenticity }) {
    const status = useClock(getStoreStatus, 60000);
    const services = [
        { icon: Package, title: 'Rastrear mi pedido', text: 'Historial en vivo por ticket o cédula y ubicación del motorizado.', onClick: onOpenOrders, tone: 'text-sky-600 dark:text-us-cyan bg-sky-500/10' },
        { icon: CreditCard, title: 'Verificar pago', text: 'Reporta tu referencia de Pago Móvil o Zelle para el despacho.', onClick: onOpenPayment, tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
        { icon: Ruler, title: 'Guía de tallas (CM/US)', text: 'Equivalencias y consejos de calce según la silueta.', onClick: onOpenFitGuide, tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
        { icon: ShieldCheck, title: 'Garantía & cambio 7 días', text: '100% originales, doble caja y cambio de talla rápido.', onClick: onOpenAuthenticity, tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' }
    ];

    return (
        <section id="hub-fisico" className="scroll-mt-32 py-16 max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-7 bg-white dark:bg-us-panel rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 flex flex-col justify-between shadow-xl">
                    <div className="space-y-4">
                        <StatusPill status={status} />
                        <h2 className={`${heading} text-2xl sm:text-3xl`}>
                            Hub oficial UrbanStep <span className="text-sky-600 dark:text-us-cyan">Las Trinitarias</span>
                        </h2>
                        <p className={`text-sm leading-relaxed ${bodyText}`}>
                            Visítanos para probarte todas las siluetas en persona, validar el calzado con nuestros especialistas o retirar tus
                            compras web de inmediato sin costo de flete.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="bg-slate-50 dark:bg-us-carbon p-3.5 rounded-xl border border-slate-200 dark:border-white/5 space-y-1">
                                <p className="font-us-mono text-[10px] text-slate-500 dark:text-gray-400 uppercase font-bold flex items-center gap-1">
                                    <MapPin className="w-4 h-4 text-sky-600 dark:text-us-cyan" /> Ubicación exacta
                                </p>
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{STORE.address} ({STORE.reference})</p>
                                <p className={`text-[11px] ${mutedText}`}>{STORE.city}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-us-carbon p-3.5 rounded-xl border border-slate-200 dark:border-white/5 space-y-1">
                                <p className="font-us-mono text-[10px] text-slate-500 dark:text-gray-400 uppercase font-bold flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-sky-600 dark:text-us-cyan" /> Horarios de atención
                                </p>
                                {STORE_HOURS_LABEL.map(h => (
                                    <p key={h.days} className="text-xs text-slate-700 dark:text-gray-300">{h.days}: <span className="font-us-mono font-bold text-sky-700 dark:text-us-cyan">{h.hours}</span></p>
                                ))}
                            </div>
                        </div>
                        {paymentMethods.length > 0 && (
                            <div className="bg-slate-50 dark:bg-us-elevated p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                                <p className="font-us-mono text-[10px] text-sky-700 dark:text-us-cyan uppercase font-bold tracking-wider">Métodos disponibles en taquilla:</p>
                                <div className="flex flex-wrap gap-2 text-xs font-us-mono">
                                    {paymentMethods.map(pm => (
                                        <span key={pm.id || pm.label} className="px-2.5 py-1 rounded bg-white dark:bg-us-mid text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/5">{pm.label || pm.name}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="pt-5 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-3 mt-5">
                        <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-us-cyan text-black font-us-mono text-xs font-bold uppercase rounded-lg hover:brightness-110 flex items-center gap-1.5 transition-all">
                            <MapIcon className="w-4 h-4" /> Abrir en Google Maps
                        </a>
                        <button type="button" onClick={onPickup} className="px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-us-high dark:hover:bg-us-highest font-us-mono text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 transition-all">
                            <Store className="w-4 h-4 text-us-cyan" /> Seleccionar retiro en tienda
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping motion-reduce:animate-none" />
                        <h3 className="font-us-mono text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300">Centro de servicios al cliente</h3>
                    </div>
                    {services.map(({ icon: Icon, title, text, onClick, tone }) => (
                        <button key={title} type="button" onClick={onClick} className="group text-left p-4 rounded-2xl border bg-white dark:bg-us-carbon border-slate-200 dark:border-white/10 hover:border-sky-400 dark:hover:border-us-cyan/50 hover:-translate-y-0.5 transition-all flex items-start gap-3.5 shadow-sm">
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}><Icon className="w-5 h-5" /></span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{title}</span>
                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                                <span className={`block text-xs mt-0.5 leading-snug ${mutedText}`}>{text}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
