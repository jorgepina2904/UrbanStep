import React from 'react';
import { Truck, X, Copy, Home, Store, Check, CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DELIVERY_ZONES, SHIPPING_OPTIONS, STORE, STORE_HOURS_LABEL, zoneByValue } from './storeInfo';
import { fieldInput, fieldLabel, useEscapeKey } from './ui';

const copyText = async (label, value) => {
    try {
        await navigator.clipboard.writeText(String(value));
        toast.success(`${label} copiado`, { icon: '📋' });
    } catch {
        toast.error('No se pudo copiar; selecciónalo manualmente');
    }
};

function PaymentDetail({ label, value }) {
    if (!value) return null;
    return (
        <p className="flex items-center justify-between gap-2">
            <span><strong className="font-sans text-gray-900">{label}:</strong> {value}</span>
            <button type="button" onClick={() => copyText(label, value)} aria-label={`Copiar ${label}`} className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-white">
                <Copy className="w-3.5 h-3.5" />
            </button>
        </p>
    );
}

/** Formulario de despacho y pago (fondo blanco en ambos temas, como el diseño). */
export default function CheckoutModal({
    isOpen, onClose, form, onFormChange, onZoneChange, contactConsent, onConsent, shippingOption, onShippingChange,
    paymentMethods, tryOnRequest, onBackupSize, onClearTryOn, subtotal, promo, effectiveShippingUsd, totalCartUsd,
    renderDualPrice, formatUSD, isSubmitting, onSubmit
}) {
    useEscapeKey(isOpen && !isSubmitting, onClose);
    if (!isOpen) return null;

    const isPickup = shippingOption === 'pickup';
    const zone = zoneByValue(form.zone);
    const selectedPm = paymentMethods.find(pm => pm.id === form.paymentMethod);
    const total = renderDualPrice(totalCartUsd);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <div className="bg-white text-gray-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4 my-auto us-fade-in">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <Truck className="w-[22px] h-[22px] text-blue-600" />
                        <h3 id="checkout-title" className="font-us-display text-base font-black uppercase tracking-tight text-gray-900">Datos de despacho &amp; pago</h3>
                    </div>
                    <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar" className="text-gray-400 hover:text-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-3.5 text-left text-xs">
                    <div>
                        <label htmlFor="co-name" className={fieldLabel}>Nombre completo del cliente *</label>
                        <input id="co-name" type="text" required autoComplete="name" value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} placeholder="Ej. Carlos Mendoza" className={fieldInput} />
                    </div>

                    <div>
                        <label htmlFor="co-phone" className={fieldLabel}>Teléfono WhatsApp *</label>
                        <input id="co-phone" type="tel" required autoComplete="tel" value={form.phone} onChange={(e) => onFormChange({ phone: e.target.value })} placeholder="0414-5551234" className={fieldInput} />
                        <label className="mt-2 flex items-start gap-2 text-[11px] text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={contactConsent} onChange={(e) => onConsent(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span>Guardar mi bolsa y avisarme por WhatsApp si no termino mi compra.</span>
                        </label>
                    </div>

                    <fieldset>
                        <legend className={fieldLabel}>Modalidad de entrega *</legend>
                        <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
                            {SHIPPING_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    aria-pressed={shippingOption === opt.id}
                                    onClick={() => onShippingChange(opt.id)}
                                    className={`py-2 px-1 rounded-lg text-[11px] font-bold leading-tight transition-all ${shippingOption === opt.id ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {opt.label}
                                    <span className="block text-[10px] font-us-mono opacity-80">{opt.costUsd === 0 ? 'Gratis' : `+${formatUSD(opt.costUsd)}`}</span>
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    {isPickup ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2">
                            <Store className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Retiro en {STORE.address}</p>
                                <p>{STORE.city}</p>
                                <p className="text-[11px] mt-1">{STORE_HOURS_LABEL.map(h => `${h.days}: ${h.hours}`).join(' · ')}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label htmlFor="co-zone" className={fieldLabel}>Zona / municipio</label>
                                <select id="co-zone" value={form.zone} onChange={(e) => onZoneChange(e.target.value)} className={fieldInput}>
                                    {DELIVERY_ZONES.map(z => <option key={z.id} value={z.value}>{z.value} · {z.eta}</option>)}
                                </select>
                                <p className="mt-1 text-[11px] text-gray-500">Tiempo estimado: <strong className="text-gray-800">{zone.eta}</strong>{zone.national ? ' según la agencia de encomienda' : ' desde la confirmación'}</p>
                            </div>
                            <div>
                                <label htmlFor="co-address" className={fieldLabel}>{zone.national ? 'Dirección y agencia de destino *' : 'Dirección exacta de entrega *'}</label>
                                <input id="co-address" type="text" required autoComplete="street-address" value={form.address} onChange={(e) => onFormChange({ address: e.target.value })}
                                    placeholder={zone.national ? 'Ciudad, estado y agencia Zoom/MRW/Tealca' : 'Urb. El Parral, Calle 4 con Av. Los Leones, Casa #12'} className={fieldInput} />
                            </div>
                        </>
                    )}

                    {tryOnRequest && (
                        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-950 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <p className="flex items-start gap-2"><Home className="w-4 h-4 shrink-0 mt-0.5 text-sky-700" />
                                    <span><strong>Prueba de 2 tallas en puerta:</strong> {tryOnRequest.productName} ({tryOnRequest.color}) talla {tryOnRequest.size}</span>
                                </p>
                                <button type="button" onClick={onClearTryOn} className="text-[11px] font-bold text-sky-700 hover:underline shrink-0">Quitar</button>
                            </div>
                            {shippingOption === 'delivery_lara' ? (
                                tryOnRequest.backupOptions.length > 0 ? (
                                    <label className="flex items-center gap-2">
                                        <span className="font-bold">Talla de respaldo:</span>
                                        <select value={tryOnRequest.backupSize || ''} onChange={(e) => onBackupSize(e.target.value)} className="bg-white border border-sky-300 rounded-md px-2 py-1 text-xs">
                                            {tryOnRequest.backupOptions.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                                        </select>
                                    </label>
                                ) : (
                                    <p className="text-[11px]">No hay otra talla disponible en ese color; el motorizado llevará solo tu talla.</p>
                                )
                            ) : (
                                <p className="text-[11px] font-semibold text-amber-700">La prueba en puerta solo aplica con Delivery Express Lara.</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label htmlFor="co-pay" className={fieldLabel}>Método de pago preferido *</label>
                        <select id="co-pay" value={form.paymentMethod} onChange={(e) => onFormChange({ paymentMethod: e.target.value })} className={`${fieldInput} font-medium`}>
                            {paymentMethods.map(pm => (
                                <option key={pm.id} value={pm.id}>{pm.label || pm.name} ({pm.currency === 'VES' ? 'Bs. tasa BCV' : '$ USD'})</option>
                            ))}
                        </select>
                        {selectedPm && (
                            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-1 font-us-mono">
                                <PaymentDetail label="Banco" value={selectedPm.bank} />
                                <PaymentDetail label="Teléfono" value={selectedPm.phone} />
                                <PaymentDetail label="RIF/Cédula" value={selectedPm.rif} />
                                <PaymentDetail label="Correo" value={selectedPm.email} />
                                <PaymentDetail label="Titular" value={selectedPm.holder} />
                                <PaymentDetail label="Cuenta" value={selectedPm.accountNumber || selectedPm.account} />
                                {selectedPm.instructions && <p className="font-sans text-[11px] text-amber-700 font-semibold pt-1">{selectedPm.instructions}</p>}
                                {selectedPm.requiresReference && (
                                    <p className="font-sans text-[11px] text-gray-500 flex items-center gap-1 pt-0.5"><CreditCard className="w-3.5 h-3.5" /> Tras confirmar podrás reportar tu número de referencia.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="co-notes" className={fieldLabel}>Indicaciones para el motorizado (opcional)</label>
                        <input id="co-notes" type="text" value={form.notes} onChange={(e) => onFormChange({ notes: e.target.value })} placeholder="Ej. llevar cambio de $20, casa de rejas negras" className={fieldInput} />
                    </div>

                    <div className="bg-cyan-50/70 border border-cyan-100 rounded-xl p-3 space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-600"><span>Calzados</span><span className="font-us-mono">{formatUSD(subtotal)}</span></div>
                        {promo.discountUsd > 0 && <div className="flex justify-between text-[11px] text-emerald-700"><span>Descuentos</span><span className="font-us-mono">-{formatUSD(promo.discountUsd)}</span></div>}
                        <div className="flex justify-between text-[11px] text-gray-600"><span>Despacho</span><span className="font-us-mono">{effectiveShippingUsd === 0 ? 'Gratis' : formatUSD(effectiveShippingUsd)}</span></div>
                        <div className="flex items-center justify-between pt-1 border-t border-cyan-100">
                            <span className="font-bold text-gray-900 text-xs">Total final del pedido:</span>
                            <div className="text-right">
                                <span className="font-us-display text-lg font-black text-gray-900 block">{total.primary}</span>
                                <span className="font-us-mono text-xs font-bold text-emerald-700 block">{total.secondary}</span>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-[#009b68] hover:bg-[#008658] disabled:opacity-60 disabled:cursor-wait text-white font-us-display text-sm font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando pedido…</> : <><Check className="w-4 h-4" /> Enviar pedido a despacho</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

/** Confirmación del pedido con accesos a reportar el pago y rastrear el envío. */
export function OrderSuccessModal({ data, onClose, onVerifyPayment, onTrack, formatUSD, formatBs }) {
    useEscapeKey(Boolean(data), onClose);
    if (!data) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="order-ok-title">
            <div className="bg-white text-gray-900 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 us-fade-in">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center">
                    <Check className="w-8 h-8" />
                </div>
                <h3 id="order-ok-title" className="font-us-display text-xl font-black uppercase">¡Pedido confirmado!</h3>
                <p className="text-xs text-gray-600">
                    Tu orden quedó registrada con el folio <strong className="text-blue-600 font-us-mono">{data.receiptNumber}</strong>. Nuestro equipo ya está preparando tus sneakers.
                </p>
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-left text-xs space-y-1.5 font-us-mono">
                    <p className="text-gray-500">Cliente: <strong className="text-gray-900">{data.customerName}</strong></p>
                    <p className="text-gray-500">Entrega: <strong className="text-gray-900">{data.deliveryAddress}</strong></p>
                    {data.eta && <p className="text-gray-500">Tiempo estimado: <strong className="text-gray-900">{data.eta}</strong></p>}
                    <p className="text-gray-500">Pago: <strong className="text-emerald-700">{data.paymentLabel}</strong></p>
                    <div className="pt-2 border-t border-gray-200 flex justify-between gap-2 font-bold text-sm">
                        <span>Monto a pagar:</span>
                        <span className="text-emerald-700 text-right">{formatUSD(data.totalUsd)} ({formatBs(data.totalBs)})</span>
                    </div>
                </div>
                <div className="space-y-2 pt-1">
                    <button type="button" onClick={onVerifyPayment} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
                        <CreditCard className="w-4 h-4" /> Reportar / verificar comprobante de pago
                    </button>
                    <button type="button" onClick={onTrack} className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-2 border border-gray-200 active:scale-95 transition-all">
                        <Truck className="w-4 h-4 text-blue-600" /> Rastrear envío y motorizado de esta orden
                    </button>
                    <button type="button" onClick={onClose} className="w-full py-2 rounded-xl hover:bg-gray-100 text-gray-500 font-medium text-xs transition-colors">
                        Cerrar y volver a la tienda
                    </button>
                </div>
            </div>
        </div>
    );
}
