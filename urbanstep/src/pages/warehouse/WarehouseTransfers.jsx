import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Truck, PackageCheck, X, Trash2 } from 'lucide-react';
import Card from '../../ui/Card';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { transferService, TRANSFER_STATUS } from '../../services/transferService';
import { branchService } from '../../services/branchService';
import { productService } from '../../services/productService';
import SetupBanner, { selectClass } from './SetupBanner';

const EMPTY_LINE = { productId: '', color: '', size: '', qty: '' };

/** Órdenes de traslado con despacho y recepción ciega (conteo sin ver lo enviado). */
export default function WarehouseTransfers({ branches }) {
    const { user } = useAuth();
    const who = user?.name || 'Usuario';
    const [state, setState] = useState({ rows: [], available: true, loading: true });
    const [products, setProducts] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ fromId: '', toId: '', notes: '', dispatch: true, lines: [{ ...EMPTY_LINE }] });
    const [available, setAvailable] = useState({});
    const [receiving, setReceiving] = useState(null);
    const [counts, setCounts] = useState({});
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const refresh = useCallback(async () => {
        const [t, p] = await Promise.all([transferService.list(), productService.getAll()]);
        setState({ ...t, loading: false });
        setProducts(p);
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const branchName = (id) => branches.find(b => b.id === id)?.name || id;
    const active = branches.filter(b => b.active);

    // Disponible de cada línea en el origen elegido
    useEffect(() => {
        let alive = true;
        (async () => {
            const next = {};
            for (const [i, l] of form.lines.entries()) {
                const p = products.find(x => x.id === l.productId);
                if (p && form.fromId && l.size) next[i] = await branchService.getVariantQty(form.fromId, p, l.color || p.colors?.[0] || p.color, l.size);
            }
            if (alive) setAvailable(next);
        })();
        return () => { alive = false; };
    }, [form.lines, form.fromId, products]);

    const setLine = (i, patch) => setForm({ ...form, lines: form.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const items = form.lines.map((l) => {
                const product = products.find(p => p.id === l.productId);
                if (!product) throw new Error('Elige el modelo en cada renglón');
                return { product, color: l.color || product.colors?.[0] || product.color || '', size: l.size, qty: l.qty };
            });
            const id = await transferService.create({ fromId: form.fromId, toId: form.toId, items, user: who, notes: form.notes, dispatch: form.dispatch });
            toast.success(`Traslado ${id} ${form.dispatch ? 'despachado' : 'solicitado'}`);
            setOpen(false);
            setForm({ fromId: '', toId: '', notes: '', dispatch: true, lines: [{ ...EMPTY_LINE }] });
            await refresh();
        } catch (err) { toast.error(err.message); } finally { setBusy(false); }
    };

    const act = async (fn, okMsg) => {
        setBusy(true);
        try { await fn(); toast.success(okMsg); await refresh(); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
    };

    const confirmReceive = async () => {
        setBusy(true);
        try {
            const res = await transferService.receive(receiving.id, counts, who);
            setResult(res);
            setReceiving(null);
            setCounts({});
            await refresh();
        } catch (err) { toast.error(err.message); } finally { setBusy(false); }
    };

    return (
        <div className="space-y-6">
            {!state.available && !state.loading && <SetupBanner />}

            <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><Truck className="w-5 h-5 text-blue-600" /> Órdenes de traslado</h3>
                    <Button onClick={() => setOpen(true)} disabled={!state.available}><Plus className="w-4 h-4 mr-2" />Nuevo traslado</Button>
                </div>

                <div className="space-y-3">
                    {state.rows.map(t => {
                        const st = TRANSFER_STATUS[t.status];
                        return (
                            <article key={t.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div>
                                        <p className="font-mono font-black text-sm">{t.id}</p>
                                        <p className="text-xs text-gray-500">{branchName(t.fromId)} → {branchName(t.toId)} · {new Date(t.createdAt).toLocaleDateString('es-VE')} · {t.requestedBy}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${st.tone}`}>{st.label}</span>
                                </div>
                                <ul className="text-xs text-gray-700 dark:text-gray-300">
                                    {t.items.map(i => (
                                        <li key={i.id}>
                                            {i.name} · {i.color} · T{i.size}: <strong>{i.sent}</strong> par(es)
                                            {i.received != null && (
                                                <span className={i.received === i.sent ? 'text-emerald-600' : 'text-red-600 font-bold'}> → recibidos {i.received}{i.received !== i.sent ? ` (${i.received - i.sent > 0 ? '+' : ''}${i.received - i.sent})` : ' ✓'}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2 flex-wrap pt-1">
                                    {t.status === 'solicitado' && <Button size="sm" disabled={busy} onClick={() => act(() => transferService.dispatch(t.id, who), 'Traslado despachado')}><Truck className="w-4 h-4 mr-1.5" />Despachar</Button>}
                                    {t.status === 'en_transito' && <Button size="sm" variant="success" disabled={busy} onClick={() => { setReceiving(t); setCounts({}); }}><PackageCheck className="w-4 h-4 mr-1.5" />Recibir</Button>}
                                    {['solicitado', 'en_transito'].includes(t.status) && <Button size="sm" variant="secondary" disabled={busy} onClick={() => window.confirm(`¿Cancelar el traslado ${t.id}?`) && act(() => transferService.cancel(t.id, who), 'Traslado cancelado')}><X className="w-4 h-4 mr-1.5" />Cancelar</Button>}
                                </div>
                            </article>
                        );
                    })}
                    {state.rows.length === 0 && !state.loading && <p className="text-sm text-gray-400 text-center py-6">Aún no hay traslados.</p>}
                </div>
            </Card>

            <Modal isOpen={open} onClose={() => setOpen(false)} title="🚚 Nuevo traslado" size="lg">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="tr-from" className="block text-sm font-medium mb-1.5">Origen</label>
                            <select id="tr-from" className={selectClass} value={form.fromId} onChange={(e) => setForm({ ...form, fromId: e.target.value })} required>
                                <option value="">Selecciona…</option>{active.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tr-to" className="block text-sm font-medium mb-1.5">Destino</label>
                            <select id="tr-to" className={selectClass} value={form.toId} onChange={(e) => setForm({ ...form, toId: e.target.value })} required>
                                <option value="">Selecciona…</option>{active.filter(b => b.id !== form.fromId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {form.lines.map((l, i) => {
                        const p = products.find(x => x.id === l.productId);
                        const colors = p ? (p.colors?.length ? p.colors : [p.color || 'Único']) : [];
                        const sizes = p ? (p.sizes || []).map(String) : [];
                        return (
                            <div key={i} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-12 sm:col-span-4">
                                    <label className="block text-xs font-medium mb-1" htmlFor={`tl-p-${i}`}>Modelo</label>
                                    <select id={`tl-p-${i}`} className={selectClass} value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value, color: '', size: '' })}>
                                        <option value="">Selecciona…</option>{products.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-4 sm:col-span-2">
                                    <label className="block text-xs font-medium mb-1" htmlFor={`tl-c-${i}`}>Color</label>
                                    <select id={`tl-c-${i}`} className={selectClass} value={l.color || colors[0] || ''} onChange={(e) => setLine(i, { color: e.target.value })}>
                                        {colors.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-4 sm:col-span-2">
                                    <label className="block text-xs font-medium mb-1" htmlFor={`tl-s-${i}`}>Talla</label>
                                    <select id={`tl-s-${i}`} className={selectClass} value={l.size} onChange={(e) => setLine(i, { size: e.target.value })}>
                                        <option value="">—</option>{sizes.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-3 sm:col-span-3">
                                    <Input label={`Pares${available[i] != null ? ` (disp. ${available[i]})` : ''}`} type="number" min="1" max={available[i] || undefined} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
                                </div>
                                <button type="button" aria-label="Quitar renglón" className="col-span-1 pb-2.5 text-red-600" onClick={() => setForm({ ...form, lines: form.lines.length > 1 ? form.lines.filter((_, idx) => idx !== i) : form.lines })}><Trash2 className="w-4 h-4" /></button>
                            </div>
                        );
                    })}
                    <button type="button" className="text-xs font-bold text-blue-600" onClick={() => setForm({ ...form, lines: [...form.lines, { ...EMPTY_LINE }] })}>+ Agregar otro modelo</button>

                    <Input label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej: reposición de tallas 40-42" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.dispatch} onChange={(e) => setForm({ ...form, dispatch: e.target.checked })} /> Despachar de inmediato (descuenta del origen y queda en tránsito)</label>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" className="flex-1" isLoading={busy}>{form.dispatch ? 'Crear y despachar' : 'Solicitar traslado'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(receiving)} onClose={() => setReceiving(null)} title={`📦 Recepción ciega ${receiving?.id || ''}`} size="md">
                {receiving && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Cuenta físicamente los pares que llegaron a <strong>{branchName(receiving.toId)}</strong>. Por control, la cantidad enviada no se muestra hasta confirmar.</p>
                        {receiving.items.map(i => (
                            <Input key={i.id} label={`${i.name} · ${i.color} · Talla ${i.size}`} type="number" min="0" step="1" value={counts[i.id] ?? ''} onChange={(e) => setCounts({ ...counts, [i.id]: e.target.value })} placeholder="Pares contados" />
                        ))}
                        <div className="flex gap-2">
                            <Button variant="secondary" className="flex-1" onClick={() => setReceiving(null)}>Cancelar</Button>
                            <Button variant="success" className="flex-1" isLoading={busy} onClick={confirmReceive}>Confirmar recepción</Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={Boolean(result)} onClose={() => setResult(null)} title={result?.status === 'recibido' ? '✅ Recepción conforme' : '⚠️ Recepción con diferencias'} size="sm">
                {result && (
                    <div className="space-y-3 text-sm">
                        {result.differences.length === 0
                            ? <p>Todos los pares coinciden con lo enviado.</p>
                            : result.differences.map(d => (
                                <p key={d.id} className="text-red-600">{d.name} T{d.size}: enviados {d.sent}, recibidos {d.received} ({d.diff > 0 ? '+' : ''}{d.diff}). Quedó registrado en auditoría.</p>
                            ))}
                        <Button className="w-full" onClick={() => setResult(null)}>Entendido</Button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
