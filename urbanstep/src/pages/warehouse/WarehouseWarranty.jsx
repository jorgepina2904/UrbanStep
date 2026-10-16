import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, Send, CheckCheck } from 'lucide-react';
import Card from '../../ui/Card';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { warrantyService, RESOLUTIONS } from '../../services/warrantyService';
import SetupBanner, { selectClass } from './SetupBanner';

const BATCH_STATUS = { abierto: 'Abierto', enviado: 'Enviado al proveedor', resuelto: 'Resuelto' };

/** Calzado con falla de fábrica: se agrupa por proveedor, se reclama y se resuelve el lote. */
export default function WarehouseWarranty() {
    const { user } = useAuth();
    const who = user?.name || 'Usuario';
    const [state, setState] = useState({ rows: [], available: true, loading: true });
    const [candidates, setCandidates] = useState([]);
    const [selected, setSelected] = useState({});
    const [resolving, setResolving] = useState(null);
    const [resolution, setResolution] = useState('reposicion');
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        const [batches, cands] = await Promise.all([warrantyService.list(), warrantyService.getCandidates().catch(() => [])]);
        setState({ ...batches, loading: false });
        setCandidates(cands);
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const bySupplier = useMemo(() => {
        const map = new Map();
        candidates.forEach(c => {
            const g = map.get(c.supplierId || 'none') || { supplierId: c.supplierId, supplierName: c.supplierName, items: [] };
            g.items.push(c);
            map.set(c.supplierId || 'none', g);
        });
        return [...map.values()];
    }, [candidates]);

    const act = async (fn, msg) => {
        setBusy(true);
        try { await fn(); toast.success(msg); await refresh(); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
    };

    const createBatch = (group) => {
        const items = group.items.filter(i => selected[i.key]);
        act(async () => { await warrantyService.createBatch({ supplierId: group.supplierId, supplierName: group.supplierName, items, user: who }); setSelected({}); }, 'Lote de garantía creado');
    };

    return (
        <div className="space-y-6">
            {!state.available && !state.loading && <SetupBanner />}

            <Card className="p-6 space-y-4">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-600" /> Calzado con falla de fábrica por reclamar</h3>
                    <p className="text-xs text-gray-500 mt-1">Viene de las Notas de Crédito con motivo "producto dañado" (no reingresan a venta). Agrúpalos por proveedor para reclamar.</p>
                </div>
                {bySupplier.length === 0 && <p className="text-sm text-gray-400">No hay renglones pendientes de reclamo.</p>}
                {bySupplier.map(g => (
                    <div key={g.supplierId || 'none'} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
                        <p className="font-bold text-sm">{g.supplierName}</p>
                        {g.items.map(i => (
                            <label key={i.key} className="flex items-center gap-2 text-xs">
                                <input type="checkbox" checked={Boolean(selected[i.key])} onChange={(e) => setSelected({ ...selected, [i.key]: e.target.checked })} />
                                {i.qty} × {i.name} {i.color ? `· ${i.color}` : ''} {i.size ? `· T${i.size}` : ''} <span className="text-gray-400">({i.creditNote})</span>
                            </label>
                        ))}
                        <Button size="sm" disabled={busy || !state.available || !g.items.some(i => selected[i.key])} onClick={() => createBatch(g)}>Crear lote de garantía</Button>
                    </div>
                ))}
            </Card>

            <Card className="p-6 space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white">Lotes de garantía</h3>
                {state.rows.map(b => (
                    <article key={b.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div><p className="font-mono font-black text-sm">{b.id}</p><p className="text-xs text-gray-500">{b.supplierName} · {new Date(b.createdAt).toLocaleDateString('es-VE')}</p></div>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-800">{BATCH_STATUS[b.status]}{b.resolution ? ` · ${RESOLUTIONS[b.resolution]}` : ''}</span>
                        </div>
                        <ul className="text-xs text-gray-700 dark:text-gray-300">{b.items.map(i => <li key={i.id}>{i.qty} × {i.name} {i.color ? `· ${i.color}` : ''} {i.size ? `· T${i.size}` : ''}</li>)}</ul>
                        <div className="flex gap-2">
                            {b.status === 'abierto' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => warrantyService.markSent(b.id), 'Lote marcado como enviado')}><Send className="w-4 h-4 mr-1.5" />Marcar enviado</Button>}
                            {b.status !== 'resuelto' && <Button size="sm" variant="success" disabled={busy} onClick={() => { setResolving(b); setResolution('reposicion'); }}><CheckCheck className="w-4 h-4 mr-1.5" />Resolver</Button>}
                        </div>
                    </article>
                ))}
                {state.rows.length === 0 && !state.loading && <p className="text-sm text-gray-400">Aún no hay lotes.</p>}
            </Card>

            <Modal isOpen={Boolean(resolving)} onClose={() => setResolving(null)} title={`Resolver ${resolving?.id || ''}`} size="sm">
                {resolving && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="gar-res" className="block text-sm font-medium mb-1.5">Resultado del reclamo</label>
                            <select id="gar-res" className={selectClass} value={resolution} onChange={(e) => setResolution(e.target.value)}>
                                {Object.entries(RESOLUTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        {resolution === 'reposicion' && <p className="text-xs text-gray-500">Los pares repuestos reingresan a la tienda principal (con Kardex).</p>}
                        <div className="flex gap-2">
                            <Button variant="secondary" className="flex-1" onClick={() => setResolving(null)}>Cancelar</Button>
                            <Button className="flex-1" isLoading={busy} onClick={() => act(async () => { await warrantyService.resolve(resolving.id, resolution, who); setResolving(null); }, 'Lote resuelto')}>Confirmar</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
