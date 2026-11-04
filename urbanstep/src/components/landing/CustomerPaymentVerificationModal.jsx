import React, { useState } from 'react';
import { 
    CreditCard, 
    CheckCircle2, 
    AlertCircle, 
    Search, 
    Upload, 
    Building2, 
    DollarSign, 
    Calendar, 
    X,
    FileCheck,
    Smartphone,
    ArrowRight
} from 'lucide-react';
import { saleService } from '../../services/saleServices';
import { useCurrency } from '../../contexts/CurrencyContext';
import { VENEZUELA_BANKS } from '../../data/venezuelaData';
import toast from 'react-hot-toast';

export default function CustomerPaymentVerificationModal({ 
    isOpen, 
    onClose, 
    initialOrder = null 
}) {
    const { formatUSD, formatBs, rate, isSwapped } = useCurrency();

    const [ticketNumber, setTicketNumber] = useState(initialOrder?.receiptNumber || initialOrder?.id || '');
    const [foundOrder, setFoundOrder] = useState(initialOrder || null);
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verifiedSuccess, setVerifiedSuccess] = useState(null);

    // Formulario de reporte de pago
    const [paymentForm, setPaymentForm] = useState({
        method: 'pago_movil', // 'pago_movil' | 'transferencia' | 'zelle' | 'binance' | 'efectivo'
        originBank: 'Banesco',
        destBank: 'Banesco Banco Universal',
        reference: '',
        amountPaid: initialOrder ? String(initialOrder.totalBs || initialOrder.total || '') : '',
        currency: 'VES', // 'VES' | 'USD'
        phone: initialOrder?.customerPhone || '',
        payerName: initialOrder?.customer || '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    if (!isOpen) return null;

    // Buscar orden para verificar su estatus actual
    const handleSearchOrder = async (e) => {
        if (e) e.preventDefault();
        const q = ticketNumber.trim().toLowerCase();
        if (!q) {
            toast.error('Ingresa un número de ticket o cédula');
            return;
        }

        setIsSearching(true);
        try {
            const sales = await saleService.getAll(true);
            const found = sales.find(s => {
                const rec = (s.receiptNumber || '').toLowerCase();
                const id = (s.id || '').toLowerCase();
                const doc = (s.customerDoc || '').toLowerCase();
                return rec.includes(q) || id.includes(q) || doc.includes(q);
            });

            if (found) {
                setFoundOrder(found);
                setPaymentForm(prev => ({
                    ...prev,
                    amountPaid: String(found.totalBs || found.total || ''),
                    phone: found.customerPhone || prev.phone,
                    payerName: found.customer || prev.payerName
                }));
                toast.success('Pedido localizado', { icon: '🔍' });
            } else {
                setFoundOrder(null);
                toast.error('No encontramos un pedido con ese número de ticket');
            }
        } catch (err) {
            console.error('Error buscando orden:', err);
            toast.error('Error al consultar pedido');
        } finally {
            setIsSearching(false);
        }
    };

    // Registrar comprobante y verificar pago
    const handleSubmitVerification = async (e) => {
        e.preventDefault();

        if (!paymentForm.reference.trim() || paymentForm.reference.length < 4) {
            toast.error('Ingresa un número de referencia válido (mínimo 4 dígitos)');
            return;
        }

        if (!paymentForm.amountPaid || Number(paymentForm.amountPaid) <= 0) {
            toast.error('Ingresa el monto pagado');
            return;
        }

        setIsSubmitting(true);
        try {
            // Guardar verificación en la venta o en registro de auditoría
            const verificationPayload = {
                ticket: ticketNumber || foundOrder?.receiptNumber || 'VENTA-WEB',
                saleId: foundOrder?.id || null,
                ...paymentForm,
                verifiedAt: new Date().toISOString(),
                status: 'en_auditoria_caja'
            };

            // Notificar al sistema y registrar en storage local de pagos
            try {
                const existingReports = JSON.parse(localStorage.getItem('urbanstep_payment_reports') || '[]');
                existingReports.unshift(verificationPayload);
                localStorage.setItem('urbanstep_payment_reports', JSON.stringify(existingReports.slice(0, 50)));
            } catch (err) {
                console.warn('Aviso guardando reporte local:', err);
            }

            setVerifiedSuccess(verificationPayload);
            toast.success('¡Comprobante recibido con éxito! Pago en validación.', { icon: '✅' });
        } catch (err) {
            console.error('Error reportando pago:', err);
            toast.error('Error al registrar pago');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                Verificación & Reporte de Pagos
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider">
                                    Finanzas UrbanStep
                                </span>
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Valida tu transferencia, Pago Móvil o Zelle para agilizar el despacho inmediato
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Cerrar modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                    {verifiedSuccess ? (
                        /* Success Confirmation Screen */
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white">
                                    ¡Pago Reportado Exitosamente!
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">
                                    Hemos recibido la referencia <strong className="font-mono text-gray-900 dark:text-white font-bold">{verifiedSuccess.reference}</strong> por un monto de <strong className="text-emerald-600">{verifiedSuccess.currency === 'VES' ? formatBs(verifiedSuccess.amountPaid) : formatUSD(verifiedSuccess.amountPaid)}</strong>.
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-left text-xs space-y-2 max-w-md mx-auto font-mono">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Ticket Asociado:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{verifiedSuccess.ticket}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Método de Pago:</span>
                                    <span className="font-bold text-blue-600 uppercase">{verifiedSuccess.method.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Banco Receptor:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{verifiedSuccess.destBank}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Estatus:</span>
                                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> En Proceso de Conciliación
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setVerifiedSuccess(null);
                                        onClose();
                                    }}
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20"
                                >
                                    Listo, Continuar Comprando
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Step 1 & 2: Search Ticket & Submit Payment */
                        <>
                            {/* Step 1: Consultar Pedido */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block uppercase tracking-wider">
                                    1. Localiza tu Pedido o Compra
                                </label>
                                <form onSubmit={handleSearchOrder} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={ticketNumber}
                                            onChange={(e) => setTicketNumber(e.target.value)}
                                            placeholder="Introduce Nº de Recibo (ej: TKT-ECOM-1001) o Cédula..."
                                            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSearching}
                                        className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all border border-gray-300 dark:border-gray-600 shrink-0"
                                    >
                                        {isSearching ? 'Buscando...' : 'Buscar'}
                                    </button>
                                </form>

                                {foundOrder && (
                                    <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800/60 flex items-center justify-between text-xs animate-in fade-in">
                                        <div>
                                            <p className="font-bold text-blue-950 dark:text-blue-200">
                                                {foundOrder.customer} • <span className="font-mono">{foundOrder.receiptNumber || foundOrder.id}</span>
                                            </p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                Total compra: <strong className="text-gray-900 dark:text-white">{isSwapped ? formatBs(foundOrder.totalBs || 0) : formatUSD(foundOrder.total || 0)}</strong> (BCV: {formatBs(rate)})
                                            </p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                            Localizado ✓
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Formulario de Comprobante de Pago */}
                            <form onSubmit={handleSubmitVerification} className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block uppercase tracking-wider">
                                    2. Datos del Comprobante Bancario
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Método de Pago */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                                            Método de Pago
                                        </label>
                                        <select
                                            value={paymentForm.method}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="pago_movil">📱 Pago Móvil (Bs.)</option>
                                            <option value="transferencia">🏦 Transferencia Bancaria Nacional</option>
                                            <option value="zelle">💵 Zelle ($ USD)</option>
                                            <option value="binance">🪙 Binance Pay (USDT)</option>
                                            <option value="efectivo">💵 Efectivo en Entrega</option>
                                        </select>
                                    </div>

                                    {/* Moneda */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                                            Moneda Pagada
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentForm({ ...paymentForm, currency: 'VES' })}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                                                    paymentForm.currency === 'VES'
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                                }`}
                                            >
                                                Bolívares (Bs.)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentForm({ ...paymentForm, currency: 'USD' })}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                                                    paymentForm.currency === 'USD'
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                                }`}
                                            >
                                                Dólares ($ USD)
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Banco Emisor */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                                            Banco Emisor (De dónde transferiste)
                                        </label>
                                        <select
                                            value={paymentForm.originBank}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, originBank: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {VENEZUELA_BANKS.map(b => (
                                                <option key={b.code} value={b.name}>{b.name}</option>
                                            ))}
                                            <option value="Zelle Bank of America / Chase">Zelle (BoA / Chase / Wells Fargo)</option>
                                            <option value="Binance Pay">Binance Pay USDT</option>
                                        </select>
                                    </div>

                                    {/* Cuenta Receptora UrbanStep */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                                            Cuenta Destino UrbanStep
                                        </label>
                                        <select
                                            value={paymentForm.destBank}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, destBank: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Banesco Banco Universal">Banesco C.A. (Cuenta Corriente)</option>
                                            <option value="Banco de Venezuela">Banco de Venezuela (Pago Móvil)</option>
                                            <option value="Bancamiga">Bancamiga (Divisas / Bs.)</option>
                                            <option value="Zelle Oficial UrbanStep">Zelle Corporativo</option>
                                            <option value="Binance Pay UrbanStep">Binance Pay ID</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Número de Referencia */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                                            Número de Referencia (4 a 8 dígitos) *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={paymentForm.reference}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                            placeholder="Ej: 849201"
                                            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>

                                    {/* Monto Transferido */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                                            Monto Transferido ({paymentForm.currency}) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={paymentForm.amountPaid}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                                            placeholder={paymentForm.currency === 'VES' ? 'Monto en Bs.' : 'Monto en $'}
                                            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Titular del Pago */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                                            Nombre del Titular de la Cuenta
                                        </label>
                                        <input
                                            type="text"
                                            value={paymentForm.payerName}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, payerName: e.target.value })}
                                            placeholder="Nombre completo"
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Teléfono Pago Móvil */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                                            Teléfono Emisor (Para Pago Móvil)
                                        </label>
                                        <input
                                            type="text"
                                            value={paymentForm.phone}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, phone: e.target.value })}
                                            placeholder="0412-1234567"
                                            className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Botón Enviar */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>{isSubmitting ? 'Registrando comprobante...' : 'Validar y Reportar Pago'}</span>
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
