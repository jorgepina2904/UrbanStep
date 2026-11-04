import React, { useState, useEffect } from 'react';
import { 
    Package, 
    Search, 
    Clock, 
    CheckCircle2, 
    Truck, 
    MapPin, 
    AlertCircle, 
    ExternalLink, 
    ChevronRight, 
    ArrowRight,
    X,
    FileText,
    Calendar,
    Phone,
    User,
    CreditCard
} from 'lucide-react';
import { saleService } from '../../services/saleServices';
import { deliveryService } from '../../services/deliveryService';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function CustomerPurchaseHistoryModal({ 
    isOpen, 
    onClose, 
    currentUser = null,
    onOpenPaymentVerification = null
}) {
    const { formatUSD, formatBs, isSwapped } = useCurrency();
    const [searchQuery, setSearchQuery] = useState('');
    const [allSales, setAllSales] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [userOrders, setUserOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Cargar compras históricas
    useEffect(() => {
        if (!isOpen) return;

        const loadOrders = async () => {
            setLoading(true);
            try {
                const sales = await saleService.getAll(true);
                setAllSales(Array.isArray(sales) ? sales : []);

                try {
                    const dels = await deliveryService.getAll();
                    setDeliveries(Array.isArray(dels) ? dels : []);
                } catch (e) {
                    console.warn('Error cargando deliveries:', e);
                }

                // Si hay un usuario conectado, filtrar automáticamente sus compras
                if (currentUser) {
                    const uId = currentUser.id || currentUser.userId;
                    const uEmail = (currentUser.email || '').toLowerCase().trim();
                    const uName = (currentUser.name || '').toLowerCase().trim();

                    const matched = (sales || []).filter(s => {
                        const sCust = (s.customer || '').toLowerCase().trim();
                        const sId = String(s.customerId || '');
                        return (uId && sId === String(uId)) || (uName && sCust.includes(uName));
                    });

                    setUserOrders(matched);
                    if (matched.length > 0) {
                        setSelectedOrder(matched[0]);
                    }
                }
            } catch (err) {
                console.error('Error cargando historial de pedidos:', err);
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, [isOpen, currentUser]);

    // Búsqueda manual por Número de Pedido, Cédula o Teléfono
    const handleSearch = (e) => {
        if (e) e.preventDefault();
        const q = searchQuery.trim().toLowerCase();
        if (!q) return;

        setSearched(true);
        const results = allSales.filter(s => {
            const receipt = (s.receiptNumber || '').toLowerCase();
            const id = (s.id || '').toLowerCase();
            const customer = (s.customer || '').toLowerCase();
            const phone = (s.customerPhone || '').toLowerCase();
            const doc = (s.customerDoc || '').toLowerCase();

            return receipt.includes(q) || id.includes(q) || customer.includes(q) || phone.includes(q) || doc.includes(q);
        });

        setUserOrders(results);
        if (results.length > 0) {
            setSelectedOrder(results[0]);
        } else {
            setSelectedOrder(null);
        }
    };

    if (!isOpen) return null;

    // Vincular orden con su registro de delivery
    const getDeliveryInfo = (order) => {
        if (!order) return null;
        return deliveries.find(d => d.saleId === order.id || (order.receiptNumber && d.saleId === order.receiptNumber));
    };

    const currentDelivery = selectedOrder ? getDeliveryInfo(selectedOrder) : null;

    // Determinar etapas del pedido (1 a 5)
    const getOrderStage = (order, delivery) => {
        if (!order) return 1;
        if (delivery?.status === 'entregado' || order.status === 'entregado') return 5;
        if (delivery?.status === 'en_camino' || delivery?.status === 'despachado') return 4;
        if (delivery?.status === 'preparando' || delivery?.status === 'asignado') return 3;
        if (order.paymentStatus === 'verificado' || order.paymentMethod === 'pago_movil' || order.paymentMethod === 'zelle') return 2;
        return 1;
    };

    const currentStage = getOrderStage(selectedOrder, currentDelivery);

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                Historial de Compras & Rastreo
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">
                                    Cliente UrbanStep
                                </span>
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Consulta el estado en tiempo real, motorizado asignado y comprobantes de tus pedidos
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

                {/* Search Bar for Quick Tracking */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/80">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rastrea por Nº de Ticket (ej: TKT-ECOM-1001), Teléfono o Cédula..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 shrink-0"
                        >
                            Rastrear Pedido
                        </button>
                    </form>
                </div>

                {/* Content Area: Left Orders List, Right Detail */}
                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0">
                    {/* Orders List (Col 5) */}
                    <div className="md:col-span-5 border-r border-gray-100 dark:border-gray-800 p-4 space-y-2 overflow-y-auto max-h-[60vh] md:max-h-none">
                        <div className="flex items-center justify-between pb-2 mb-1 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider">
                                {userOrders.length} {userOrders.length === 1 ? 'Pedido Encontrado' : 'Pedidos Encontrados'}
                            </span>
                            {currentUser && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate max-w-[130px]">
                                    {currentUser.name}
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="py-12 text-center text-gray-400 text-xs">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                Buscando compras en la base de datos...
                            </div>
                        ) : userOrders.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 space-y-2 px-4">
                                <Package className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {searched ? 'No se encontraron compras con ese criterio' : 'No hay pedidos recientes vinculados'}
                                </p>
                                <p className="text-[11px] text-gray-400">
                                    Introduce tu número de ticket o cédula en la barra superior para rastrear tu envío.
                                </p>
                            </div>
                        ) : (
                            userOrders.map((ord) => {
                                const isSelected = selectedOrder?.id === ord.id;
                                const del = getDeliveryInfo(ord);
                                const stage = getOrderStage(ord, del);

                                return (
                                    <div
                                        key={ord.id}
                                        onClick={() => setSelectedOrder(ord)}
                                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-sm'
                                                : 'bg-white dark:bg-gray-850 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black font-mono text-gray-900 dark:text-white">
                                                {ord.receiptNumber || ord.id.slice(0, 8)}
                                            </span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                                stage === 5
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                    : stage === 4
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            }`}>
                                                {stage === 5 ? 'Entregado' : stage === 4 ? 'En Camino' : stage === 3 ? 'En Almacén' : 'Recibido'}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                                            {ord.items?.length || 1} {ord.items?.length === 1 ? 'par de calzado' : 'pares de calzado'}
                                        </p>

                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(ord.date).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs font-black text-gray-900 dark:text-white">
                                                {isSwapped ? formatBs(ord.totalBs || 0) : formatUSD(ord.total || 0)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Order Details & Stepper (Col 7) */}
                    <div className="md:col-span-7 p-4 sm:p-6 overflow-y-auto space-y-5 bg-gray-50/30 dark:bg-gray-900/30">
                        {selectedOrder ? (
                            <>
                                {/* Order Title Card */}
                                <div className="bg-white dark:bg-gray-800/70 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                                Ticket de Compra
                                            </span>
                                            <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white font-mono">
                                                {selectedOrder.receiptNumber || selectedOrder.id}
                                            </h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-gray-900 dark:text-white leading-none">
                                                {isSwapped ? formatBs(selectedOrder.totalBs || 0) : formatUSD(selectedOrder.total || 0)}
                                            </p>
                                            <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                {isSwapped ? formatUSD(selectedOrder.total || 0) : formatBs(selectedOrder.totalBs || 0)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <span>Cliente: <strong className="text-gray-900 dark:text-white">{selectedOrder.customer}</strong></span>
                                        <span>Método: <strong className="text-gray-900 dark:text-white">{selectedOrder.paymentMethod || 'Pago Móvil'}</strong></span>
                                    </div>
                                </div>

                                {/* Live Tracking Stepper */}
                                <div className="bg-white dark:bg-gray-800/70 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs">
                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-blue-600" />
                                        Estado y Trazabilidad del Envío
                                    </p>

                                    <div className="grid grid-cols-5 gap-1 relative">
                                        {[
                                            { step: 1, label: 'Recibido', desc: 'En cola' },
                                            { step: 2, label: 'Pago', desc: 'Confirmado' },
                                            { step: 3, label: 'Almacén', desc: 'Empacado' },
                                            { step: 4, label: 'En Ruta', desc: 'Con Motorizado' },
                                            { step: 5, label: 'Entregado', desc: 'Completado' },
                                        ].map((st) => {
                                            const isDone = currentStage >= st.step;
                                            const isCurrent = currentStage === st.step;

                                            return (
                                                <div key={st.step} className="flex flex-col items-center text-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                                        isDone
                                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                                    } ${isCurrent ? 'ring-4 ring-blue-500/20 scale-105' : ''}`}>
                                                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : st.step}
                                                    </div>
                                                    <span className={`text-[10px] font-bold mt-1.5 truncate max-w-full ${
                                                        isDone ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                                                    }`}>
                                                        {st.label}
                                                    </span>
                                                    <span className="text-[8px] text-gray-400 hidden sm:block">
                                                        {st.desc}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Delivery & Driver Info */}
                                {currentDelivery && (
                                    <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 text-xs space-y-2">
                                        <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                            Datos del Envío en Lara / Encomienda
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 dark:text-gray-300">
                                            <div>
                                                <span className="text-[10px] text-gray-400 block">Destino:</span>
                                                <span className="font-semibold">{currentDelivery.destinationAddress || 'Barquisimeto / Cabudare'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-400 block">Repartidor Asignado:</span>
                                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                    {currentDelivery.driverName || 'Motorizado de Guardia UrbanStep'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Items Breakdown */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Calzados en este pedido ({selectedOrder.items?.length || 1})
                                    </span>
                                    <div className="space-y-2">
                                        {(selectedOrder.items || []).map((it, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-2xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-3"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-lg">
                                                        👟
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                            {it.name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400 font-mono">
                                                            Talla: <strong className="text-blue-600 dark:text-blue-400">{it.size}</strong> {it.color ? `• Color: ${it.color}` : ''} • Cant: {it.quantity}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                        {isSwapped ? formatBs(it.totalUsd ? it.totalUsd * (selectedOrder.bcvRate || 1) : 0) : formatUSD(it.totalUsd || it.price)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Call to action for payment verification */}
                                {onOpenPaymentVerification && (
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClose();
                                                onOpenPaymentVerification(selectedOrder);
                                            }}
                                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            <span>¿Realizaste una transferencia? Verificar / Reportar Pago de esta orden</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-gray-400">
                                <Package className="w-12 h-12 mb-2 opacity-30" />
                                <p className="text-sm font-semibold">Selecciona una orden de la lista</p>
                                <p className="text-xs text-gray-400 mt-1">Podrás ver la trazabilidad y estatus del motorizado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
