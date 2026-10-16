import React, { useState } from 'react';
import { ShieldCheck, Truck, RefreshCw, Wallet, Crown, ChevronDown, MessageCircle, ShoppingBag, MapPin, Sparkles } from 'lucide-react';
import { VIP_TIERS } from '../../utils/loyalty';

const card = (isDark) => (isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm');
const muted = (isDark) => (isDark ? 'text-gray-400' : 'text-slate-500');
const strong = (isDark) => (isDark ? 'text-white' : 'text-slate-900');

/** Franja superior con las promociones vigentes (las automáticas de Supabase) o el mensaje de entrega. */
export function PromoBar({ promotions = [] }) {
    const messages = promotions
        .filter(p => p.automatico && p.activo && p.descripcion)
        .map(p => p.descripcion);
    const text = messages.length > 0 ? messages.join('  ·  ') : 'Delivery express en Barquisimeto y Cabudare · Paga en $ o en Bs. a tasa BCV';
    return (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-center text-[11px] sm:text-xs font-bold tracking-wide px-4 py-2 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{text}</span>
        </div>
    );
}

/** Cuatro razones para comprar, justo debajo del hero. */
export function TrustStrip({ isDark }) {
    const items = [
        { icon: ShieldCheck, title: '100% originales', text: 'Distribuidores oficiales de cada marca' },
        { icon: Truck, title: 'Delivery en 45 min', text: 'Barquisimeto y Cabudare, con envíos nacionales' },
        { icon: RefreshCw, title: 'Cambios por talla', text: '7 días con su caja original' },
        { icon: Wallet, title: 'Paga en $ o Bs.', text: 'Pago Móvil, Zelle, punto y efectivo' }
    ];
    return (
        <section aria-label="Beneficios de comprar en UrbanStep" className={`border-b ${isDark ? 'border-white/[0.06] bg-[#080a10]' : 'border-slate-200 bg-white'}`}>
            <ul className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map(({ icon: Icon, title, text }) => (
                    <li key={title} className="flex items-start gap-3">
                        <span className="shrink-0 w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center"><Icon className="w-5 h-5" aria-hidden="true" /></span>
                        <span>
                            <span className={`block text-sm font-black ${strong(isDark)}`}>{title}</span>
                            <span className={`block text-xs ${muted(isDark)}`}>{text}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Presentación del Club VIP con los tres niveles reales y su beneficio. */
export function VipClubSection({ isDark, isLoggedIn, onJoin }) {
    return (
        <section aria-labelledby="vip-title" className={`border-t py-16 ${isDark ? 'border-white/[0.06] bg-[#06080d]' : 'border-slate-200 bg-slate-50'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
                <div className="max-w-2xl">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-widest text-amber-500"><Crown className="w-4 h-4" aria-hidden="true" /> URBANSTEP VIP CLUB</p>
                    <h2 id="vip-title" className={`text-3xl sm:text-4xl font-black tracking-tight mt-2 ${strong(isDark)}`}>Cada par que compras suma.</h2>
                    <p className={`mt-2 text-sm ${muted(isDark)}`}>Ganas 1 punto por cada dólar que compras. Sube de nivel y recibe descuentos y envío gratis automáticamente al iniciar sesión.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {VIP_TIERS.map((t, i) => (
                        <article key={t.id} className={`rounded-3xl border p-6 space-y-3 ${i === 2 ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-transparent' : card(isDark)}`}>
                            <p className={`text-xs font-bold tracking-widest ${i === 2 ? 'text-blue-100' : 'text-blue-600'}`}>NIVEL {i + 1}</p>
                            <h3 className={`text-xl font-black ${i === 2 ? 'text-white' : strong(isDark)}`}>{t.name}</h3>
                            <p className={`text-3xl font-black ${i === 2 ? 'text-white' : strong(isDark)}`}>{t.minPoints}<span className="text-sm font-bold opacity-70"> pts</span></p>
                            <p className={`text-sm ${i === 2 ? 'text-blue-50' : muted(isDark)}`}>{t.perk}</p>
                        </article>
                    ))}
                </div>
                {!isLoggedIn && (
                    <button type="button" onClick={onJoin} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black shadow-lg shadow-blue-600/30">
                        Crear mi cuenta y empezar a sumar
                    </button>
                )}
            </div>
        </section>
    );
}

const FAQ = [
    ['¿Cómo pago si quiero hacerlo en bolívares?', 'Todos los precios se muestran en dólares y en bolívares a la tasa oficial del BCV del día. Puedes pagar con Pago Móvil, punto de venta, efectivo en bolívares o transferencia; el monto en Bs. se calcula con la tasa vigente al momento de tu pedido.'],
    ['¿Cuánto tarda el delivery?', 'En Barquisimeto y Cabudare el despacho express llega en unos 45 minutos. Para el resto del país enviamos por Zoom, Tealca o MRW; el tiempo depende de la empresa de encomienda.'],
    ['¿Puedo cambiar la talla?', 'Sí. Tienes 7 días continuos para cambiar tu par, siempre que esté sin uso y en su caja original. El cambio se procesa con nota de crédito.'],
    ['¿Emiten factura fiscal?', 'Sí. Cada compra genera su comprobante con tu cédula o RIF, el desglose del IVA y el equivalente en bolívares.'],
    ['Mi talla está agotada, ¿qué hago?', 'Toca la talla agotada en la ficha del modelo y déjanos tu WhatsApp o correo: te avisamos apenas llegue.'],
    ['¿Los zapatos son originales?', 'Trabajamos con distribuidores oficiales de cada marca. Si algún par llega con falla de fábrica lo gestionamos con garantía.']
];

export function FaqSection({ isDark }) {
    const [open, setOpen] = useState(0);
    return (
        <section aria-labelledby="faq-title" className={`border-t py-16 ${isDark ? 'border-white/[0.06] bg-[#07090e]' : 'border-slate-200 bg-white'}`}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
                <h2 id="faq-title" className={`text-3xl font-black tracking-tight ${strong(isDark)}`}>Preguntas frecuentes</h2>
                <div className="space-y-2">
                    {FAQ.map(([q, a], i) => (
                        <div key={q} className={`rounded-2xl border ${card(isDark)}`}>
                            <button type="button" aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen(open === i ? -1 : i)}
                                className={`w-full flex items-center justify-between gap-3 text-left px-5 py-4 text-sm font-bold ${strong(isDark)}`}>
                                {q}
                                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                            {open === i && <p id={`faq-${i}`} className={`px-5 pb-4 text-sm leading-relaxed ${muted(isDark)}`}>{a}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Pie de página completo: tienda, ayuda, cuenta, medios de pago y datos legales. */
export function SiteFooter({ isDark, rate, formatBs, paymentMethods = [], onLogin, BrandLogo }) {
    const linkClass = `block py-0.5 hover:text-blue-500 transition-colors ${muted(isDark)}`;
    return (
        <footer className={`border-t pt-12 pb-8 text-xs ${isDark ? 'border-white/[0.06] bg-[#05070c]' : 'border-slate-200 bg-white'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="col-span-2 md:col-span-1 space-y-3">
                    <BrandLogo variant="compact" size="sm" showSubtitle={false} />
                    <p className={muted(isDark)}>Sneakers y streetwear originales en Barquisimeto, Estado Lara, con envíos a toda Venezuela.</p>
                    <p className={`font-mono ${muted(isDark)}`}>RIF: J-50123456-7</p>
                </div>
                <nav aria-label="Tienda">
                    <p className={`font-black uppercase tracking-wider mb-2 ${strong(isDark)}`}>Tienda</p>
                    <a href="#catalogo" className={linkClass}>Catálogo</a>
                    <a href="/landing?cart=1" className={linkClass}>Mi bolsa</a>
                    <a href="/cuenta" className={linkClass}>Mi cuenta y pedidos</a>
                </nav>
                <nav aria-label="Ayuda">
                    <p className={`font-black uppercase tracking-wider mb-2 ${strong(isDark)}`}>Ayuda</p>
                    <a href="#faq" className={linkClass}>Preguntas frecuentes</a>
                    <span className={`block py-0.5 ${muted(isDark)}`}>Cambios: 7 días con su caja</span>
                    <span className={`block py-0.5 ${muted(isDark)}`}>Factura fiscal en cada compra</span>
                </nav>
                <div>
                    <p className={`font-black uppercase tracking-wider mb-2 ${strong(isDark)}`}>Visítanos</p>
                    <a href="https://www.google.com/maps?q=10.068330144675503,-69.28499381534304" target="_blank" rel="noopener noreferrer" className={`${linkClass} flex items-center gap-1`}>
                        <MapPin className="w-3.5 h-3.5 text-red-500" aria-hidden="true" /> Cómo llegar
                    </a>
                    <button type="button" onClick={onLogin} className={`${linkClass} text-left`}>Iniciar sesión</button>
                </div>
            </div>

            {paymentMethods.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 flex flex-wrap items-center gap-2">
                    <span className={`mr-1 ${muted(isDark)}`}>Medios de pago:</span>
                    {paymentMethods.map(pm => (
                        <span key={pm.id || pm.label} className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${card(isDark)} ${strong(isDark)}`}>{pm.label || pm.name}</span>
                    ))}
                </div>
            )}

            <div className={`max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-5 border-t flex flex-col sm:flex-row items-center justify-between gap-2 ${isDark ? 'border-white/[0.06]' : 'border-slate-200'} ${muted(isDark)}`}>
                <span>BCV: {formatBs(rate)} / USD</span>
                <span>© 2026 UrbanStep Venezuela C.A. Todos los derechos reservados</span>
            </div>
        </footer>
    );
}

/** Botón flotante de WhatsApp (solo si se configuró VITE_WHATSAPP_PHONE). */
export function WhatsAppFab({ phone, raised }) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    const normalized = digits.startsWith('0') ? `58${digits.slice(1)}` : digits;
    return (
        <a
            href={`https://wa.me/${normalized}?text=${encodeURIComponent('¡Hola UrbanStep! Quisiera información sobre un par.')}`}
            target="_blank" rel="noopener noreferrer" aria-label="Escribirnos por WhatsApp"
            className={`fixed right-4 z-40 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl flex items-center justify-center transition-all ${raised ? 'bottom-24' : 'bottom-5'}`}
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
            <button type="button" onClick={onOpen} className="pointer-events-auto w-full py-3.5 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-2xl flex items-center justify-center gap-2">
                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                Ver bolsa ({count}) · {totalLabel}
            </button>
        </div>
    );
}
