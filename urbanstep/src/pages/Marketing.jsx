import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, ShoppingCart, BellRing, Crown, MessageCircle, Mail, Check } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useCurrency } from '../contexts/CurrencyContext';
import { cartRecoveryService, stockAlertService } from '../services/marketingService';
import { saleService } from '../services/saleServices';
import { customerService } from '../services/customerService';
import { returnService } from '../services/returnService';
import { computeLoyalty, VIP_TIERS } from '../utils/loyalty';
import SetupBanner from './warehouse/SetupBanner';

const TABS = [
    { id: 'carts', label: 'Carritos abandonados', icon: ShoppingCart },
    { id: 'alerts', label: 'Alertas de talla', icon: BellRing },
    { id: 'vip', label: 'Club VIP', icon: Crown }
];

const minutesAgo = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const humanAge = (min) => (min < 60 ? `${min} min` : min < 1440 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} d`);

function AbandonedCarts() {
    const { formatUSD } = useCurrency();
    const [state, setState] = useState({ rows: [], available: true, loading: true });
    const refresh = useCallback(async () => setState({ ...(await cartRecoveryService.listAbandoned()), loading: false }), []);
    useEffect(() => { refresh(); }, [refresh]);

    const contact = async (cart) => {
        window.open(cartRecoveryService.whatsappUrl(cart), '_blank', 'noopener');
        try { await cartRecoveryService.markContacted(cart.id); await refresh(); } catch (e) { toast.error(e.message); }
    };

    return (
        <div className="space-y-4">
            {!state.available && !state.loading && <SetupBanner detail="Tablas de marketing: modificaciones_fase5_marketing.sql" />}
            <Card className="p-6 space-y-3">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Clientes que no terminaron su compra</h3>
                    <p className="text-xs text-gray-500">Solo aparecen clientes que aceptaron ser contactados por WhatsApp. El mensaje incluye un enlace que restaura su bolsa.</p>
                </div>
                {state.rows.map(c => (
                    <article key={c.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-start justify-between gap-3 flex-wrap">
                        <div className="text-sm">
                            <p className="font-bold">{c.name} <span className="text-xs font-normal text-gray-400">· {c.phone}</span></p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{c.items.map(i => `${i.quantity}× ${i.name}${i.size ? ` T${i.size}` : ''}`).join(', ')}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatUSD(c.totalUsd)} · hace {humanAge(minutesAgo(c.updatedAt))} · {c.status === 'abierto' ? 'Sin contactar' : c.status === 'recuperado' ? 'Abrió el enlace' : `Contactado ${c.contacts}×`}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="success" onClick={() => contact(c)}><MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp</Button>
                            <Button size="sm" variant="secondary" aria-label={`Descartar carrito de ${c.name}`} onClick={async () => { await cartRecoveryService.dismiss(c.id); await refresh(); }}><Check className="w-4 h-4" /></Button>
                        </div>
                    </article>
                ))}
                {state.rows.length === 0 && !state.loading && <p className="text-sm text-gray-400 text-center py-6">No hay carritos pendientes de recuperar.</p>}
            </Card>
        </div>
    );
}

function StockAlerts() {
    const [state, setState] = useState({ ready: [], waiting: [], available: true, loading: true });
    const refresh = useCallback(async () => setState({ ...(await stockAlertService.listPending()), loading: false }), []);
    useEffect(() => { refresh(); }, [refresh]);

    const notify = async (a) => {
        window.open(a.isEmail ? stockAlertService.mailtoUrl(a) : stockAlertService.whatsappUrl(a), '_blank', 'noopener');
        await stockAlertService.markNotified(a.id);
        await refresh();
    };

    return (
        <div className="space-y-4">
            {!state.available && !state.loading && <SetupBanner detail="Tablas de marketing: modificaciones_fase5_marketing.sql" />}
            <Card className="p-6 space-y-3">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><BellRing className="w-5 h-5 text-emerald-600" /> Ya hay existencia: avisar ({state.ready.length})</h3>
                    <p className="text-xs text-gray-500">Clientes que pidieron aviso y la talla ya está disponible en la tienda.</p>
                </div>
                {state.ready.map(a => (
                    <div key={a.id} className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm"><strong>{a.customer}</strong> · {a.name} {a.color ? `· ${a.color}` : ''} · Talla {a.size} <span className="text-xs text-gray-400">({a.contact})</span></p>
                        <Button size="sm" variant="success" onClick={() => notify(a)}>{a.isEmail ? <><Mail className="w-4 h-4 mr-1.5" />Correo</> : <><MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp</>}</Button>
                    </div>
                ))}
                {state.ready.length === 0 && !state.loading && <p className="text-sm text-gray-400">Ninguna talla solicitada tiene existencia todavía.</p>}
            </Card>
            <Card className="p-6 space-y-2">
                <h3 className="font-bold text-gray-900 dark:text-white">Esperando reposición ({state.waiting.length})</h3>
                <p className="text-xs text-gray-500">Demanda real sin atender: úsala para decidir qué comprar.</p>
                {Object.entries(state.waiting.reduce((acc, a) => { const k = `${a.name} · ${a.color} · T${a.size}`; acc[k] = (acc[k] || 0) + 1; return acc; }, {}))
                    .sort((x, y) => y[1] - x[1]).map(([k, n]) => <p key={k} className="text-sm flex justify-between border-b border-gray-100 dark:border-gray-800 py-1"><span>{k}</span><strong>{n} cliente(s)</strong></p>)}
            </Card>
        </div>
    );
}

function VipClub() {
    const { formatUSD } = useCurrency();
    const [rows, setRows] = useState(null);

    useEffect(() => {
        (async () => {
            const [sales, customers, notes] = await Promise.all([saleService.getAll(), customerService.getAll(), returnService.getAll().catch(() => [])]);
            const byReceipt = new Map(sales.map(s => [s.receiptNumber, s]));
            const list = customers.filter(c => c.id !== 'publico').map((c) => {
                const mine = sales.filter(s => s.customerId === c.id);
                const myNotes = (notes || []).filter(n => byReceipt.get(n.affectedInvoiceNumber)?.customerId === c.id);
                return { customer: c, orders: mine.length, ...computeLoyalty({ sales: mine, creditNotes: myNotes }) };
            }).filter(r => r.orders > 0).sort((a, b) => b.points - a.points);
            setRows(list);
        })();
    }, []);

    const counts = useMemo(() => VIP_TIERS.map(t => ({ ...t, count: (rows || []).filter(r => r.tier.id === t.id).length })), [rows]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {counts.map(t => (
                    <Card key={t.id} className="p-4">
                        <p className="text-xs font-bold text-blue-600">{t.name}</p>
                        <p className="text-2xl font-black">{t.count}</p>
                        <p className="text-[11px] text-gray-500">{t.minPoints}+ puntos · {t.perk}</p>
                    </Card>
                ))}
            </div>
            <Card className="p-6 space-y-3">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Miembros del club</h3>
                <p className="text-xs text-gray-500">1 punto por cada USD comprado, neto de notas de crédito. Los beneficios se aplican solos en la tienda web cuando el cliente inicia sesión.</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                <th className="px-3 py-2 text-left">Cliente</th><th className="px-3 py-2 text-center">Compras</th><th className="px-3 py-2 text-right">Puntos</th><th className="px-3 py-2 text-left">Nivel</th><th className="px-3 py-2 text-right">Para subir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {(rows || []).map(r => (
                                <tr key={r.customer.id}>
                                    <td className="px-3 py-2">{r.customer.firstName} {r.customer.lastName} <span className="text-gray-400">{r.customer.phone}</span></td>
                                    <td className="px-3 py-2 text-center">{r.orders}</td>
                                    <td className="px-3 py-2 text-right font-mono font-bold">{r.points}</td>
                                    <td className="px-3 py-2 font-semibold">{r.tier.name}</td>
                                    <td className="px-3 py-2 text-right text-gray-500">{r.next ? `${formatUSD(r.toNext)} → ${r.next.name}` : 'Nivel máximo'}</td>
                                </tr>
                            ))}
                            {rows && rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Aún no hay clientes con compras registradas.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

/** Marketing y fidelización: recuperación de carritos, alertas de talla y Club VIP. */
export default function Marketing() {
    const [tab, setTab] = useState('carts');
    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Megaphone className="w-7 h-7 text-blue-600" /> Marketing & Fidelización</h2>
                <p className="text-sm text-gray-500 mt-1">Vende más a quienes ya te conocen: recupera carritos, avisa tallas y premia a tus mejores clientes.</p>
            </div>
            <div role="tablist" className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar">
                {TABS.map(t => {
                    const Icon = t.icon;
                    return (
                        <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
                            <Icon className="w-4 h-4" /> {t.label}
                        </button>
                    );
                })}
            </div>
            {tab === 'carts' && <AbandonedCarts />}
            {tab === 'alerts' && <StockAlerts />}
            {tab === 'vip' && <VipClub />}
        </div>
    );
}
