import React, { useState } from 'react';
import { ShieldCheck, Truck, RefreshCw, Wallet, Crown, ChevronDown, MessageCircle, ShoppingBag, MapPin, Sparkles, Send, BadgeCheck, Ruler, ArrowRight, Sun, Moon, Lock, User } from 'lucide-react';
import { VIP_TIERS } from '../../utils/loyalty';
import { isValidPhone } from '../../services/marketingService';
import { STORE, whatsappLink, whatsappNumber } from './storeInfo';
import { bodyText, heading, kicker, mutedText } from './ui';
import StoreWordmark from './StoreWordmark';

/** Franja superior con las promociones automáticas vigentes (solo aparece si existen). */
export function PromoBar({ promotions = [] }) {
    const messages = promotions
        .filter(p => p.automatico && p.activo && p.descripcion)
        .map(p => p.descripcion);
    if (messages.length === 0) return null;
    return (
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-fuchsia-600 text-white text-center text-[11px] sm:text-xs font-us-mono font-bold tracking-wide px-4 py-1.5 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{messages.join('  ·  ')}</span>
        </div>
    );
}

/** Cuatro razones para comprar, justo debajo del hero. */
export function TrustStrip() {
    const items = [
        { icon: ShieldCheck, title: '100% originales', text: 'Distribuidores oficiales de cada marca' },
        { icon: Truck, title: 'Delivery en 45 min', text: 'Barquisimeto y Cabudare, envíos nacionales' },
        { icon: RefreshCw, title: 'Cambios por talla', text: '7 días con su caja original' },
        { icon: Wallet, title: 'Paga en $ o Bs.', text: 'Pago Móvil, Zelle, punto y efectivo' }
    ];
    return (
        <section aria-label="Beneficios de comprar en UrbanStep" className="border-b border-slate-200 dark:border-white/10 bg-white dark:bg-us-carbon">
            <ul className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map(({ icon: Icon, title, text }) => (
                    <li key={title} className="flex items-start gap-3">
                        <span className="shrink-0 w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-us-cyan/10 text-sky-600 dark:text-us-cyan flex items-center justify-center"><Icon className="w-5 h-5" aria-hidden="true" /></span>
                        <span>
                            <span className="block font-us-display text-sm font-black uppercase text-slate-900 dark:text-white">{title}</span>
                            <span className={`block text-xs ${mutedText}`}>{text}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Club VIP: niveles reales del programa de puntos. Sin sesión, el formulario abre el registro de
 * cliente con el WhatsApp o correo ya escrito; con sesión de cliente muestra su progreso.
 */
export function VipClubSection({ isLoggedIn, loyalty, onJoin }) {
    const [contact, setContact] = useState('');
    const [error, setError] = useState('');

    const submit = (e) => {
        e.preventDefault();
        const value = contact.trim();
        if (EMAIL_RE.test(value)) onJoin({ email: value.toLowerCase() });
        else if (isValidPhone(value)) onJoin({ phone: value });
        else { setError('Escribe un WhatsApp (ej: 0414-5551234) o un correo válido'); return; }
        setError('');
        setContact('');
    };

    return (
        <section id="club" aria-labelledby="vip-title" className="scroll-mt-32 py-14 max-w-7xl mx-auto px-4">
            <div className="bg-gradient-to-br from-sky-50 via-white to-fuchsia-50 dark:from-us-elevated dark:via-us-carbon dark:to-[#1a1420] border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl">
                <div className="absolute -right-16 -top-16 w-80 h-80 bg-us-cyan/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-7 space-y-4">
                        <p className="inline-flex items-center gap-2 px-3 py-1 bg-us-cyan/10 border border-us-cyan/30 rounded-full text-sky-700 dark:text-us-cyan font-us-mono text-xs font-bold uppercase tracking-wider">
                            <Crown className="w-4 h-4" aria-hidden="true" /> UrbanStep VIP Crew
                        </p>
                        <h2 id="vip-title" className={`${heading} text-3xl sm:text-4xl leading-tight`}>Únete al club &amp; cada par que compras suma</h2>
                        <p className={`text-sm leading-relaxed ${bodyText}`}>
                            Ganas 1 punto por cada dólar. Sube de nivel y tus descuentos y el envío gratis se aplican solos en la bolsa al iniciar sesión.
                        </p>

                        {loyalty ? (
                            <div className="p-4 rounded-2xl bg-white/80 dark:bg-us-ink/80 border border-slate-200 dark:border-white/10 space-y-2">
                                <div className="flex items-baseline justify-between gap-3">
                                    <p className="font-us-display text-lg font-black uppercase text-slate-900 dark:text-white">{loyalty.tier.name}</p>
                                    <p className="font-us-mono text-sm font-bold text-sky-700 dark:text-us-cyan">{loyalty.points} pts</p>
                                </div>
                                <div className="h-2 rounded-full bg-slate-200 dark:bg-us-mid overflow-hidden" role="progressbar" aria-valuenow={loyalty.progressPct} aria-valuemin={0} aria-valuemax={100}>
                                    <div className="h-full bg-us-cyan" style={{ width: `${loyalty.progressPct}%` }} />
                                </div>
                                <p className={`text-xs ${mutedText}`}>
                                    {loyalty.next ? <>Te faltan <strong className="text-slate-900 dark:text-white">{loyalty.toNext} pts</strong> para {loyalty.next.name}: {loyalty.next.perk.toLowerCase()}.</> : 'Alcanzaste el nivel máximo: 5% de descuento y envío gratis en cada pedido.'}
                                </p>
                            </div>
                        ) : !isLoggedIn ? (
                            <form className="pt-1 space-y-1.5" onSubmit={submit} noValidate>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <label htmlFor="club-contact" className="sr-only">Tu WhatsApp o correo</label>
                                    <input
                                        id="club-contact"
                                        type="text"
                                        value={contact}
                                        onChange={(e) => { setContact(e.target.value); setError(''); }}
                                        placeholder="Tu WhatsApp (ej: 0414-5551234) o correo"
                                        aria-invalid={Boolean(error)}
                                        aria-describedby={error ? 'club-error' : undefined}
                                        className="flex-1 bg-white dark:bg-us-ink border border-slate-300 dark:border-white/20 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-sky-500 dark:focus:border-us-cyan"
                                    />
                                    <button type="submit" className="px-6 py-3 bg-us-cyan hover:brightness-110 text-black font-us-mono text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                                        Registrarme al club <Send className="w-4 h-4" />
                                    </button>
                                </div>
                                {error && <p id="club-error" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
                            </form>
                        ) : null}

                        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-us-mono text-slate-600 dark:text-gray-400">
                            {['Beneficios automáticos', 'Envío gratis en nivel VIP', 'Cero spam garantizado'].map(t => (
                                <li key={t} className="flex items-center gap-1.5"><span className="text-sky-600 dark:text-us-cyan font-bold">✓</span>{t}</li>
                            ))}
                        </ul>
                    </div>

                    <ol className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                        {VIP_TIERS.map((t, i) => {
                            const current = loyalty?.tier?.id === t.id;
                            return (
                                <li key={t.id} className={`rounded-2xl border p-4 ${i === 2
                                    ? 'bg-gradient-to-br from-sky-600 to-indigo-700 dark:from-cyan-600 dark:to-blue-800 text-white border-transparent'
                                    : 'bg-white/80 dark:bg-us-ink/70 border-slate-200 dark:border-white/10'} ${current ? 'ring-2 ring-us-cyan' : ''}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`font-us-mono text-[10px] font-bold tracking-widest ${i === 2 ? 'text-sky-100' : 'text-sky-600 dark:text-us-cyan'}`}>NIVEL {i + 1}{current ? ' · TU NIVEL' : ''}</p>
                                        <p className={`font-us-mono text-xs font-bold ${i === 2 ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t.minPoints} pts</p>
                                    </div>
                                    <p className={`font-us-display text-base font-black uppercase mt-1 ${i === 2 ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t.name}</p>
                                    <p className={`text-xs ${i === 2 ? 'text-sky-50' : mutedText}`}>{t.perk}</p>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>
        </section>
    );
}

const FAQ = [
    ['¿Cómo calculan el precio en bolívares y qué métodos reciben?', 'Todos los precios se muestran en dólares y en bolívares a la tasa oficial del BCV del día, sin recargos ni comisiones ocultas. Puedes pagar con Pago Móvil, punto de venta o Biopago (en tienda o con terminal inalámbrico en el delivery), efectivo en $ o Bs., Zelle y transferencia.'],
    ['¿Cómo funciona el servicio de probarme 2 tallas en mi casa?', 'En Barquisimeto y Cabudare toca "Probar" en el modelo que te guste: agregamos tu talla a la bolsa y anotamos una talla de respaldo para el motorizado. Él espera hasta 10 minutos mientras te pruebas ambos pares; pagas el que te calce perfecto y el otro regresa a la tienda.'],
    ['¿Cuánto tarda el delivery?', 'En Barquisimeto y Cabudare el despacho express llega en unos 45 minutos según tu zona. Puedes calcular el tiempo exacto en la sección de cobertura.'],
    ['¿Hacen envíos al resto del país?', 'Sí. Enviamos asegurado a toda Venezuela por Zoom, Tealca y MRW, en doble caja para proteger la caja original y con número de guía rastreable por WhatsApp. Los envíos se procesan el mismo día si el pago se confirma antes de las 2:00 PM.'],
    ['¿Cuál es la política de cambios de talla o modelo?', 'Tienes 7 días continuos desde la entrega. El calzado debe estar sin uso, con sus etiquetas, accesorios y la caja original en buen estado. El cambio se procesa con nota de crédito en la tienda de Las Trinitarias o coordinando el retiro por mensajería.'],
    ['¿Emiten factura fiscal?', 'Sí. Cada compra genera su comprobante con tu cédula o RIF, el desglose del IVA y el equivalente en bolívares a tasa BCV.'],
    ['Mi talla está agotada, ¿qué hago?', 'Toca "Avísame" en la tarjeta del modelo o la talla agotada en su ficha y déjanos tu WhatsApp o correo: te avisamos apenas llegue.'],
    ['¿Los zapatos son originales?', 'Trabajamos con distribuidores oficiales de cada marca. Si algún par llega con falla de fábrica lo gestionamos con garantía.']
];

export function FaqSection() {
    const [open, setOpen] = useState(0);
    return (
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-32 py-14 bg-slate-100/70 dark:bg-us-ink border-t border-slate-200 dark:border-white/10">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center space-y-2 mb-10">
                    <p className={kicker}>Transparencia &amp; seguridad</p>
                    <h2 id="faq-title" className={`${heading} text-2xl sm:text-3xl`}>Preguntas y condiciones de compra</h2>
                    <p className={`text-sm ${mutedText}`}>Pagos a tasa BCV, prueba en casa, despachos y cambios.</p>
                </div>
                <div className="space-y-3">
                    {FAQ.map(([q, a], i) => {
                        const isOpen = open === i;
                        return (
                            <div key={q} className="bg-white dark:bg-us-panel rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                                <button
                                    type="button"
                                    aria-expanded={isOpen}
                                    aria-controls={`faq-${i}`}
                                    onClick={() => setOpen(isOpen ? -1 : i)}
                                    className="w-full p-4 text-left flex items-center justify-between gap-4 font-us-mono text-xs sm:text-sm font-bold uppercase text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-us-cyan transition-colors"
                                >
                                    <span>{q}</span>
                                    <ChevronDown className={`w-5 h-5 shrink-0 text-sky-600 dark:text-us-cyan transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                </button>
                                {isOpen && (
                                    <p id={`faq-${i}`} className={`px-4 pb-4 pt-3 text-xs sm:text-sm leading-relaxed border-t border-slate-100 dark:border-white/5 ${bodyText}`}>{a}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

/** Pie de página: sede, cobertura, pagos a tasa BCV, atención y datos legales. */
export function SiteFooter({ rate, formatBs, paymentMethods = [], whatsappPhone, onLogin, onOpenCheckout, onOpenAuthenticity, onOpenFitGuide }) {
    const waNumber = whatsappNumber(whatsappPhone);
    const waUrl = whatsappLink(whatsappPhone, '¡Hola UrbanStep! Quisiera asesoría para elegir un par.');
    return (
        <footer className="bg-slate-900 dark:bg-[#0b0c0e] border-t border-white/10 pt-14 pb-24 md:pb-8 text-slate-400 dark:text-gray-400 text-xs">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
                <div className="space-y-4">
                    <StoreWordmark subtitle="Sneakers & streetwear store" onDark />
                    <p className="leading-relaxed">Hub autorizado de calzado técnico, running y streetwear para Barquisimeto, Cabudare y toda Venezuela. 100% pares originales con factura fiscal.</p>
                    <div className="font-us-mono text-[11px] space-y-1">
                        <p><strong className="text-white">RIF:</strong> {STORE.rif}</p>
                        <p><strong className="text-white">Sede:</strong> {STORE.address}, Barquisimeto, Estado Lara.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="font-us-mono text-xs font-bold uppercase text-white tracking-widest">Despacho &amp; cobertura</h4>
                    <ul className="space-y-2">
                        <li className="flex items-center gap-2"><span className="text-orange-400">●</span>Express 45 min Barquisimeto &amp; Cabudare</li>
                        <li className="flex items-center gap-2"><span className="text-us-cyan">●</span>Prueba de 2 tallas a domicilio</li>
                        <li className="flex items-center gap-2"><span className="text-emerald-400">●</span>Retiro inmediato en Las Trinitarias</li>
                        <li className="flex items-center gap-2"><span className="text-gray-300">●</span>Envíos nacionales: Zoom, MRW, Tealca</li>
                    </ul>
                    <button type="button" onClick={onOpenCheckout} className="text-us-cyan hover:underline font-us-mono text-[11px] font-bold flex items-center gap-1">
                        Abrir formulario de despacho <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="space-y-3">
                    <h4 className="font-us-mono text-xs font-bold uppercase text-white tracking-widest">Pagos a tasa BCV</h4>
                    <p className="text-[11px] leading-snug">Facturación transparente a tasa oficial BCV del día: <strong className="text-white">{formatBs(rate)} / USD</strong>.</p>
                    {paymentMethods.length > 0 && (
                        <ul className="grid grid-cols-2 gap-2 font-us-mono text-[11px]">
                            {paymentMethods.map(pm => (
                                <li key={pm.id || pm.label} className="bg-white/5 p-2 rounded border border-white/5 text-gray-300 truncate">✓ {pm.label || pm.name}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="space-y-3">
                    <h4 className="font-us-mono text-xs font-bold uppercase text-white tracking-widest">Atención &amp; concierge</h4>
                    <p className="text-gray-300">Asesoría directa en selección de siluetas y hormas deportivas.</p>
                    <ul className="space-y-2 font-us-mono">
                        {waUrl && (
                            <li><a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white hover:text-us-cyan"><MessageCircle className="w-[18px] h-[18px] text-emerald-400" />WhatsApp: +{waNumber}</a></li>
                        )}
                        <li><button type="button" onClick={onOpenAuthenticity} className="flex items-center gap-2 text-white hover:text-us-cyan"><BadgeCheck className="w-[18px] h-[18px] text-us-cyan" />Certificado de autenticidad</button></li>
                        <li><button type="button" onClick={onOpenFitGuide} className="flex items-center gap-2 text-white hover:text-us-cyan"><Ruler className="w-[18px] h-[18px] text-indigo-300" />Guía de tallas</button></li>
                        <li className="flex items-center gap-2 text-white"><RefreshCw className="w-[18px] h-[18px] text-orange-400" />Garantía de cambio: 7 días</li>
                        <li><a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white hover:text-us-cyan"><MapPin className="w-[18px] h-[18px] text-red-400" />Cómo llegar</a></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-us-mono text-gray-500">
                <p>© {new Date().getFullYear()} UrbanStep Venezuela C.A. • Todos los derechos reservados.</p>
                <nav aria-label="Enlaces del pie" className="flex flex-wrap items-center justify-center gap-4">
                    <a className="hover:text-us-cyan" href="#catalogo">Catálogo</a>
                    <a className="hover:text-us-cyan" href="#hub-fisico">Tienda Las Trinitarias</a>
                    <a className="hover:text-us-cyan" href="#faq">Condiciones</a>
                    <a className="hover:text-us-cyan" href="/cuenta">Mi cuenta</a>
                    <button type="button" className="hover:text-us-cyan" onClick={onLogin}>Acceso personal</button>
                </nav>
            </div>
        </footer>
    );
}

/** Botón flotante de WhatsApp (solo si se configuró VITE_WHATSAPP_PHONE). */
export function WhatsAppFab({ phone, raised }) {
    const url = whatsappLink(phone, '¡Hola UrbanStep! Quisiera información sobre un par.');
    if (!url) return null;
    return (
        <a
            href={url}
            target="_blank" rel="noopener noreferrer" aria-label="Escribirnos por WhatsApp"
            className={`fixed right-4 z-40 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl flex items-center justify-center transition-all md:bottom-24 md:right-5 ${raised ? 'bottom-24' : 'bottom-5'}`}
        >
            <MessageCircle className="w-6 h-6" aria-hidden="true" />
        </a>
    );
}

/** Barra fija inferior en móviles cuando hay artículos en la bolsa. */
export function MobileCartBar({ count, totalLabel, onOpen }) {
    if (count <= 0) return null;
    return (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none">
            <button type="button" onClick={onOpen} className="pointer-events-auto w-full py-3.5 rounded-2xl bg-us-cyan text-black font-us-mono font-black text-sm uppercase shadow-2xl flex items-center justify-center gap-2">
                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                Ver bolsa ({count}) · {totalLabel}
            </button>
        </div>
    );
}

/** Barra flotante de acceso rápido (escritorio): tema, bolsa, despacho y cuenta. */
export function FloatingDock({ isDark, toggleTheme, cartCount, onOpenCart, onOpenCheckout, isAuthenticated, accountLabel, onAccount }) {
    const btn = 'px-3 py-2 rounded-xl font-us-mono text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95';
    const ghost = `${btn} bg-slate-100 hover:bg-slate-200 text-sky-700 border border-slate-200 dark:bg-us-high dark:hover:bg-us-highest dark:text-us-cyan dark:border-us-cyan/40`;
    return (
        <div className="hidden md:flex fixed bottom-5 right-5 z-40 items-center gap-2 bg-white/95 dark:bg-us-elevated/95 backdrop-blur-xl p-2 rounded-2xl border border-slate-200 dark:border-us-cyan/40 shadow-2xl">
            <button type="button" onClick={toggleTheme} className={ghost} aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden xl:inline">{isDark ? 'Claro' : 'Oscuro'}</span>
            </button>
            <button type="button" onClick={onOpenCart} className={`${btn} bg-us-cyan text-black hover:brightness-110 shadow-lg`}>
                <ShoppingBag className="w-4 h-4" /> Bolsa{cartCount > 0 ? ` (${cartCount})` : ''}
            </button>
            <button type="button" onClick={onOpenCheckout} className={ghost}>
                <Truck className="w-4 h-4" /> <span className="hidden lg:inline">Despacho &amp; Pago</span>
            </button>
            <button type="button" onClick={onAccount} className={`${btn} bg-slate-900 text-white hover:bg-slate-800 dark:bg-us-high dark:hover:bg-us-highest border border-transparent dark:border-white/10`}>
                {isAuthenticated ? <User className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span className="hidden lg:inline max-w-[110px] truncate">{accountLabel}</span>
            </button>
        </div>
    );
}
