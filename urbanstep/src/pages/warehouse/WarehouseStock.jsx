import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search } from 'lucide-react';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { branchService } from '../../services/branchService';
import SetupBanner, { selectClass } from './SetupBanner';

/** Existencias por sucursal, alta de sucursales y carga de existencias en depósitos. */
export default function WarehouseStock({ onBranchesChanged }) {
    const [state, setState] = useState({ branches: [], matrix: [], available: true, loading: true });
    const [search, setSearch] = useState('');
    const [branchForm, setBranchForm] = useState({ name: '', type: 'tienda', address: '' });
    const [load, setLoad] = useState({ branchId: '', productId: '', color: '', size: '', qty: '' });

    const refresh = useCallback(async () => {
        const [{ branches, matrix }, { available }] = await Promise.all([branchService.getStockMatrix(), branchService.list()]);
        setState({ branches, matrix, available, loading: false });
        onBranchesChanged?.(branches);
    }, [onBranchesChanged]);

    useEffect(() => { refresh(); }, [refresh]);

    const activeBranches = state.branches.filter(b => b.active);
    const loadable = activeBranches.filter(b => !b.isPrincipal);
    const selectedProduct = useMemo(() => state.matrix.find(m => m.product.id === load.productId)?.product, [state.matrix, load.productId]);
    const colors = selectedProduct ? (selectedProduct.colors?.length ? selectedProduct.colors : [selectedProduct.color || 'Único']) : [];
    const sizes = selectedProduct ? (selectedProduct.sizes || []).map(String) : [];

    const filtered = state.matrix.filter(m => {
        const q = search.trim().toLowerCase();
        return !q || m.product.name.toLowerCase().includes(q) || String(m.product.sku || '').toLowerCase().includes(q) || String(m.product.brand || '').toLowerCase().includes(q);
    });

    const addBranch = async (e) => {
        e.preventDefault();
        try {
            await branchService.create(branchForm);
            toast.success('Sucursal creada');
            setBranchForm({ name: '', type: 'tienda', address: '' });
            await refresh();
        } catch (err) { toast.error(err.message); }
    };

    const loadStock = async (e) => {
        e.preventDefault();
        try {
            const qty = parseInt(load.qty, 10);
            if (!load.branchId || !selectedProduct || !load.size || !(qty > 0)) throw new Error('Completa sucursal, modelo, talla y cantidad');
            await branchService.moveStock(load.branchId, { productId: selectedProduct.id, name: selectedProduct.name, sku: selectedProduct.sku, color: load.color || colors[0], size: load.size, delta: qty });
            toast.success(`${qty} par(es) cargados`);
            setLoad({ ...load, qty: '' });
            await refresh();
        } catch (err) { toast.error(err.message); }
    };

    return (
        <div className="space-y-6">
            {!state.available && !state.loading && <SetupBanner />}

            <Card className="p-6 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Existencias por ubicación</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input aria-label="Buscar modelo" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar modelo, SKU o marca"
                            className="pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm" />
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[55vh]">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0">
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                <th className="px-3 py-2 text-left">Modelo</th>
                                {activeBranches.map(b => <th key={b.id} className="px-3 py-2 text-right">{b.name}{b.isPrincipal ? ' ★' : ''}</th>)}
                                <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                            {filtered.map(({ product, perBranch, total }) => (
                                <tr key={product.id}>
                                    <td className="px-3 py-2 font-sans"><p className="font-semibold">{product.name}</p><p className="text-gray-400">{product.brand} · {product.sku}</p></td>
                                    {activeBranches.map(b => <td key={b.id} className={`px-3 py-2 text-right ${(perBranch[b.id] || 0) === 0 ? 'text-gray-300' : ''}`}>{perBranch[b.id] || 0}</td>)}
                                    <td className="px-3 py-2 text-right font-black">{total}</td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={activeBranches.length + 2} className="px-3 py-6 text-center text-gray-400 font-sans">Sin resultados.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <p className="text-[11px] text-gray-500">★ La tienda principal es la que vende en caja y en la tienda web; su existencia se administra en Inventario.</p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-3">
                    <h3 className="font-bold text-gray-900 dark:text-white">Cargar existencias en una sucursal o depósito</h3>
                    <form onSubmit={loadStock} className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label htmlFor="ld-branch" className="block text-sm font-medium mb-1.5">Ubicación</label>
                            <select id="ld-branch" className={selectClass} value={load.branchId} onChange={(e) => setLoad({ ...load, branchId: e.target.value })}>
                                <option value="">Selecciona…</option>
                                {loadable.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label htmlFor="ld-prod" className="block text-sm font-medium mb-1.5">Modelo</label>
                            <select id="ld-prod" className={selectClass} value={load.productId} onChange={(e) => setLoad({ ...load, productId: e.target.value, color: '', size: '' })}>
                                <option value="">Selecciona…</option>
                                {state.matrix.map(m => <option key={m.product.id} value={m.product.id}>{m.product.name} ({m.product.sku})</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="ld-color" className="block text-sm font-medium mb-1.5">Color</label>
                            <select id="ld-color" className={selectClass} value={load.color || colors[0] || ''} onChange={(e) => setLoad({ ...load, color: e.target.value })}>
                                {colors.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="ld-size" className="block text-sm font-medium mb-1.5">Talla</label>
                            <select id="ld-size" className={selectClass} value={load.size} onChange={(e) => setLoad({ ...load, size: e.target.value })}>
                                <option value="">—</option>
                                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <Input label="Pares a sumar" type="number" min="1" step="1" value={load.qty} onChange={(e) => setLoad({ ...load, qty: e.target.value })} />
                        <div className="flex items-end"><Button type="submit" className="w-full" disabled={!state.available || loadable.length === 0}><Plus className="w-4 h-4 mr-2" />Cargar</Button></div>
                    </form>
                    <p className="text-[11px] text-gray-500">Para mover pares entre la tienda principal y otra ubicación usa un traslado, no esta carga.</p>
                </Card>

                <Card className="p-6 space-y-3">
                    <h3 className="font-bold text-gray-900 dark:text-white">Sucursales y depósitos</h3>
                    <ul className="text-sm divide-y divide-gray-100 dark:divide-gray-800">
                        {state.branches.map(b => (
                            <li key={b.id} className="py-2 flex items-center justify-between gap-2">
                                <span>{b.name} <span className="text-xs text-gray-400">· {b.type === 'deposito' ? 'Depósito' : 'Tienda'}{b.isPrincipal ? ' · Principal' : ''}</span></span>
                                {!b.isPrincipal && state.available && (
                                    <button type="button" className={`text-xs font-bold ${b.active ? 'text-amber-600' : 'text-emerald-600'}`}
                                        onClick={async () => { try { await branchService.setActive(b.id, !b.active); await refresh(); } catch (err) { toast.error(err.message); } }}>
                                        {b.active ? 'Desactivar' : 'Activar'}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                    <form onSubmit={addBranch} className="grid grid-cols-2 gap-3 pt-2">
                        <Input label="Nueva ubicación" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="Sucursal Centro" />
                        <div>
                            <label htmlFor="br-type" className="block text-sm font-medium mb-1.5">Tipo</label>
                            <select id="br-type" className={selectClass} value={branchForm.type} onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value })}>
                                <option value="tienda">Tienda</option><option value="deposito">Depósito</option>
                            </select>
                        </div>
                        <Input className="col-span-2" label="Dirección" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
                        <Button type="submit" variant="secondary" className="col-span-2" disabled={!state.available}>Crear ubicación</Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}

