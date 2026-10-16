import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Tag, Trash2, Plus } from 'lucide-react';
import Card from './Card';
import Input from './Input';
import Button from './Button';
import { promotionService } from '../services/storefrontService';
import { PROMO_TYPES } from '../utils/promotions';

const EMPTY = { codigo: '', descripcion: '', tipo: 'porcentaje', valor: '', compra_minima_usd: '', automatico: false, vence_el: '', usos_maximos: '' };

/** Administración de cupones y promociones de la tienda en línea (tabla 'cupones' en Supabase). */
export default function PromotionsSettings() {
    const [state, setState] = useState({ rows: [], available: true, loading: true });
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const res = await promotionService.getAll();
        setState({ ...res, loading: false });
    }, []);

    useEffect(() => { load(); }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await promotionService.create({
                ...form,
                vence_el: form.vence_el ? new Date(`${form.vence_el}T23:59:59`).toISOString() : null
            });
            toast.success('Promoción creada');
            setForm(EMPTY);
            await load();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggle = async (row) => {
        try { await promotionService.setActive(row.id, !row.activo); await load(); } catch (err) { toast.error(err.message); }
    };
    const remove = async (row) => {
        if (!window.confirm(`¿Eliminar la promoción ${row.codigo || row.descripcion}?`)) return;
        try { await promotionService.remove(row.id); await load(); } catch (err) { toast.error(err.message); }
    };

    const selectClass = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm py-2.5 px-3';
    const needsValue = form.tipo === 'porcentaje' || form.tipo === 'monto_fijo';

    return (
        <div className="space-y-6">
            <Card className="p-6 space-y-4">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><Tag className="w-5 h-5 text-blue-600" /> Cupones y Promociones</h3>
                    <p className="text-xs text-gray-500 mt-1">Los cupones requieren código; las promociones automáticas (por ejemplo, envío gratis desde cierto monto) se aplican solas en la bolsa de compras.</p>
                </div>

                {!state.available && !state.loading && (
                    <p role="alert" className="p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
                        La tabla <code>cupones</code> no existe todavía. Ejecuta <code>modificaciones_fase1_ecommerce.sql</code> en el SQL Editor de Supabase para activar promociones y reseñas.
                    </p>
                )}

                <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                        <label htmlFor="promo-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo</label>
                        <select id="promo-type" className={selectClass} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                            {Object.entries(PROMO_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <Input label="Código" value={form.codigo} disabled={form.automatico} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="BIENVENIDA10" />
                    {needsValue
                        ? <Input label={form.tipo === 'porcentaje' ? 'Descuento (%)' : 'Descuento (USD)'} type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                        : <div />}
                    <Input label="Compra mínima (USD)" type="number" min="0" step="0.01" value={form.compra_minima_usd} onChange={(e) => setForm({ ...form, compra_minima_usd: e.target.value })} placeholder="0" />
                    <Input label="Vence el" type="date" value={form.vence_el} onChange={(e) => setForm({ ...form, vence_el: e.target.value })} />
                    <Input label="Usos máximos" type="number" min="1" step="1" value={form.usos_maximos} onChange={(e) => setForm({ ...form, usos_maximos: e.target.value })} placeholder="Ilimitado" />
                    <Input className="sm:col-span-2" label="Descripción visible al cliente" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Envío gratis desde $80" />
                    <label className="flex items-center gap-2 text-sm pb-2">
                        <input type="checkbox" checked={form.automatico} onChange={(e) => setForm({ ...form, automatico: e.target.checked, codigo: '' })} />
                        Aplicar automáticamente
                    </label>
                    <Button type="submit" className="sm:col-span-3" isLoading={saving} disabled={!state.available}><Plus className="w-4 h-4 mr-2" />Crear promoción</Button>
                </form>
                {form.tipo === 'dos_por_uno' && <p className="text-[11px] text-gray-500">El 2x1 aplica a todos los modelos. Para limitarlo a modelos concretos, completa <code>productos_ids</code> directamente en la tabla.</p>}
            </Card>

            <Card className="p-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                <th className="px-3 py-2 text-left">Código / Descripción</th><th className="px-3 py-2 text-left">Tipo</th>
                                <th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-right">Mín.</th>
                                <th className="px-3 py-2 text-center">Usos</th><th className="px-3 py-2 text-center">Estado</th><th className="px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {state.rows.map((r) => (
                                <tr key={r.id}>
                                    <td className="px-3 py-2"><p className="font-bold font-mono">{r.codigo || 'AUTOMÁTICA'}</p><p className="text-gray-500">{r.descripcion}</p></td>
                                    <td className="px-3 py-2">{PROMO_TYPES[r.tipo]}</td>
                                    <td className="px-3 py-2 text-right">{r.tipo === 'porcentaje' ? `${r.valor}%` : r.tipo === 'monto_fijo' ? `$${r.valor}` : '—'}</td>
                                    <td className="px-3 py-2 text-right">${Number(r.compra_minima_usd || 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-center">{r.usos_actuales}{r.usos_maximos ? ` / ${r.usos_maximos}` : ''}</td>
                                    <td className="px-3 py-2 text-center">
                                        <button type="button" onClick={() => toggle(r)} aria-pressed={r.activo} className={`px-2 py-0.5 rounded-full font-bold ${r.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>{r.activo ? 'Activa' : 'Pausada'}</button>
                                    </td>
                                    <td className="px-3 py-2 text-right"><button type="button" aria-label={`Eliminar ${r.codigo || r.descripcion}`} onClick={() => remove(r)} className="text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                            {state.rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">Sin promociones creadas.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
