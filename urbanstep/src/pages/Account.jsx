import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Package, MapPin, Heart, Download, Trash2, Check, Truck, PackageCheck, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { productService } from '../services/productService';
import { accountService, wishlistService, addressBookService } from '../services/storefrontService';
import { usdToVes, resolveSaleRate } from '../utils/money';
import { bcvService } from '../services/bcvService';

const TRACK_STEPS = [
    { key: 'pendiente', label: 'Empacando', icon: Package },
    { key: 'asignado', label: 'Listo para despacho', icon: PackageCheck },
    { key: 'en_camino', label: 'En ruta', icon: Truck },
    { key: 'entregado', label: 'Entregado', icon: Check }
];

const Tracking = ({ order }) => {
    const status = order.delivery?.status;
    if (!order.delivery) {
        return <p className="text-xs text-gray-500 flex items-center gap-1.5"><Store className="w-4 h-4" /> Retiro en tienda o compra en mostrador</p>;
    }
    if (status === 'cancelado') return <p className="text-xs font-semibold text-red-600">Entrega cancelada</p>;
    const current = Math.max(0, TRACK_STEPS.findIndex(s => s.key === status));
    return (
        <ol className="flex items-center gap-1 text-[11px]" aria-label="Estado de la entrega">
            {TRACK_STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i <= current;
                return (
                    <li key={step.key} aria-current={i === current ? 'step' : undefined} className="flex items-center gap-1 flex-1 min-w-0">
                        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}><Icon className="w-3.5 h-3.5" /></span>
                        <span className={`truncate ${done ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-400'}`}>{step.label}</span>
                        {i < TRACK_STEPS.length - 1 && <span className={`flex-1 h-0.5 min-w-2 ${i < current ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-800'}`} />}
                    </li>
                );
            })}
        </ol>
    );
};

/** Comprobante en PDF del pedido (documento informativo; la factura fiscal la emite la tienda). */
const downloadReceiptPdf = (order, formatUsd) => {
    const rate = resolveSaleRate(order, bcvService.getRate().rate);
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    let y = 14;
    doc.setFontSize(14).setFont(undefined, 'bold').text('UrbanStep Venezuela C.A.', 10, y); y += 6;
    doc.setFontSize(9).setFont(undefined, 'normal').text('RIF: J-50123456-7', 10, y); y += 8;
    doc.setFont(undefined, 'bold').text(`Comprobante ${order.receiptNumber || order.id}`, 10, y); y += 5;
    doc.setFont(undefined, 'normal').text(`Fecha: ${new Date(order.date).toLocaleString('es-VE')}`, 10, y); y += 5;
    doc.text(`Cliente: ${order.customer || ''}`, 10, y); y += 5;
    doc.text(`Tasa BCV: Bs ${rate.toFixed(2)} / USD`, 10, y); y += 8;
    (order.items || []).forEach((i) => {
        const line = `${i.quantity} x ${String(i.name).slice(0, 34)}${i.size ? ` (T${i.size})` : ''}`;
        doc.text(line, 10, y);
        doc.text(formatUsd(i.price * i.quantity), 138, y, { align: 'right' });
        y += 5;
    });
    y += 3;
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL USD', 10, y); doc.text(formatUsd(order.total), 138, y, { align: 'right' }); y += 5;
    const totalBs = Number(order.totalBs) > 0 ? Number(order.totalBs) : usdToVes(order.total, rate);
    doc.text('TOTAL Bs.', 10, y); doc.text(`Bs ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 138, y, { align: 'right' });
    doc.save(`Comprobante_${order.receiptNumber || order.id}.pdf`);
};

export default function Account() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { formatUSD, formatBs } = useCurrency();
    const [tab, setTab] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wishIds, setWishIds] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [addrForm, setAddrForm] = useState({ label: 'Casa', address: '', zone: '', phone: '' });

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [o, all] = await Promise.all([accountService.getOrders(user), productService.getAll()]);
            setOrders(o);
            setCatalog(all);
            setWishIds(wishlistService.get(user));
            setAddresses(addressBookService.list(user));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const refresh = () => user && setWishIds(wishlistService.get(user));
        window.addEventListener('wishlist_changed', refresh);
        window.addEventListener('deliveries_updated', load);
        return () => { window.removeEventListener('wishlist_changed', refresh); window.removeEventListener('deliveries_updated', load); };
    }, [user, load]);

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
                <p className="text-lg font-bold">Inicia sesión para ver tu cuenta</p>
                <Link to="/landing?login=true" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold">Iniciar sesión</Link>
            </div>
        );
    }

    const wished = wishIds.map(id => catalog.find(p => p.id === id)).filter(Boolean);

    const addAddress = (e) => {
        e.preventDefault();
        try {
            addressBookService.add(user, addrForm);
            setAddresses(addressBookService.list(user));
            setAddrForm({ label: 'Casa', address: '', zone: '', phone: '' });
            toast.success('Dirección guardada');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const tabs = [
        { id: 'orders', label: 'Mis pedidos', icon: Package },
        { id: 'addresses', label: 'Direcciones', icon: MapPin },
        { id: 'wishlist', label: `Deseos (${wished.length})`, icon: Heart }
    ];

    const fieldClass = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
            <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <button type="button" onClick={() => navigate('/landing')} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-blue-600"><ChevronLeft className="w-4 h-4" /> Tienda</button>
                <button type="button" onClick={() => { logout(); navigate('/landing'); }} className="text-sm font-semibold text-red-600">Cerrar sesión</button>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-black">Hola, {user.name}</h1>
                    <p className="text-sm text-gray-500">{user.email}</p>
                </div>

                <div role="tablist" className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                                <Icon className="w-4 h-4" /> {t.label}
                            </button>
                        );
                    })}
                </div>

                {tab === 'orders' && (
                    <section className="space-y-4" aria-label="Historial de pedidos">
                        {loading && <p role="status" className="text-sm text-gray-500">Cargando pedidos…</p>}
                        {!loading && orders.length === 0 && (
                            <p className="text-sm text-gray-500">Aún no tienes pedidos asociados a este correo. <Link to="/landing" className="text-blue-600 font-semibold">Ir a la tienda</Link></p>
                        )}
                        {orders.map(o => (
                            <article key={o.id} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-black font-mono text-sm">{o.receiptNumber || o.id}</p>
                                        <p className="text-xs text-gray-500">{new Date(o.date).toLocaleString('es-VE')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black">{formatUSD(o.total)}</p>
                                        <p className="text-xs text-emerald-600 font-semibold">{formatBs(Number(o.totalBs) > 0 ? o.totalBs : usdToVes(o.total, resolveSaleRate(o, bcvService.getRate().rate)))}</p>
                                    </div>
                                </div>
                                <ul className="text-sm text-gray-700 dark:text-gray-300">
                                    {(o.items || []).map((i, idx) => <li key={idx}>{i.quantity} × {i.name} {i.size ? `· T${i.size}` : ''} {i.color ? `· ${i.color}` : ''}</li>)}
                                </ul>
                                <Tracking order={o} />
                                <button type="button" onClick={() => downloadReceiptPdf(o, formatUSD)} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
                                    <Download className="w-4 h-4" /> Descargar comprobante (PDF)
                                </button>
                            </article>
                        ))}
                    </section>
                )}

                {tab === 'addresses' && (
                    <section className="space-y-4" aria-label="Libreta de direcciones">
                        {addresses.length === 0 && <p className="text-sm text-gray-500">Guarda tus direcciones para agilizar tus próximas compras.</p>}
                        {addresses.map(a => (
                            <div key={a.id} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-start justify-between gap-3">
                                <div className="text-sm">
                                    <p className="font-bold">{a.label} {a.isDefault && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">Principal</span>}</p>
                                    <p className="text-gray-600 dark:text-gray-400">{a.address}{a.zone ? ` (${a.zone})` : ''}</p>
                                    {a.phone && <p className="text-xs text-gray-500">{a.phone}</p>}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    {!a.isDefault && <button type="button" className="text-xs font-semibold text-blue-600" onClick={() => setAddresses(addressBookService.setDefault(user, a.id))}>Hacer principal</button>}
                                    <button type="button" aria-label={`Eliminar dirección ${a.label}`} className="text-red-600" onClick={() => setAddresses(addressBookService.remove(user, a.id))}><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                        <form onSubmit={addAddress} className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input aria-label="Nombre de la dirección" className={fieldClass} value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} placeholder="Casa, Oficina…" />
                            <input aria-label="Teléfono de contacto" className={fieldClass} value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} placeholder="Teléfono" />
                            <input aria-label="Zona o sector" className={`${fieldClass} sm:col-span-2`} value={addrForm.zone} onChange={(e) => setAddrForm({ ...addrForm, zone: e.target.value })} placeholder="Zona / urbanización" />
                            <textarea aria-label="Dirección completa" className={`${fieldClass} sm:col-span-2`} rows={2} value={addrForm.address} onChange={(e) => setAddrForm({ ...addrForm, address: e.target.value })} placeholder="Dirección completa" />
                            <button type="submit" className="sm:col-span-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">Guardar dirección</button>
                        </form>
                    </section>
                )}

                {tab === 'wishlist' && (
                    <section aria-label="Lista de deseos">
                        {wished.length === 0 && <p className="text-sm text-gray-500">Toca el corazón en un modelo para guardarlo aquí.</p>}
                        <div className="grid grid-cols-2 gap-4">
                            {wished.map(p => (
                                <div key={p.id} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    <Link to={`/producto/${p.id}`}>
                                        <div className="aspect-square bg-gray-100 dark:bg-gray-800"><img src={p.imageUrl || p.image} alt={p.name} className="w-full h-full object-contain p-3" /></div>
                                        <div className="p-3"><p className="text-sm font-bold truncate">{p.name}</p><p className="text-sm">{formatUSD(p.price)}</p></div>
                                    </Link>
                                    <button type="button" className="w-full py-2 text-xs font-semibold text-red-600 border-t border-gray-100 dark:border-gray-800" onClick={() => wishlistService.toggle(user, p.id)}>Quitar</button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
