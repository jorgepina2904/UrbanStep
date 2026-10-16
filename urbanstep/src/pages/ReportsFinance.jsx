import React, { useState } from 'react';
import { TrendingUp, Users, AlertTriangle, Save } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { getCommissionConfig, saveCommissionConfig, getQuincenaRange } from '../services/commissionService';

const localDate = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MarginTable = ({ title, rows, labelKey, formatUSD }) => (
    <Card className="p-6 space-y-3">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white">{title}</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                        <th className="px-3 py-2 text-left">{labelKey === 'name' ? 'Modelo' : labelKey === 'brand' ? 'Marca' : 'Categoría'}</th>
                        <th className="px-3 py-2 text-right">Pares</th>
                        <th className="px-3 py-2 text-right">Ingresos</th>
                        <th className="px-3 py-2 text-right">Costo</th>
                        <th className="px-3 py-2 text-right">Utilidad</th>
                        <th className="px-3 py-2 text-right">Margen</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                    {rows.map((r) => (
                        <tr key={r[labelKey]}>
                            <td className="px-3 py-2 font-sans font-medium">
                                {r[labelKey]}{r.estimated && <span title="Costo estimado: el producto no tiene costo cargado" className="ml-1 text-amber-600">*</span>}
                            </td>
                            <td className="px-3 py-2 text-right">{r.units}</td>
                            <td className="px-3 py-2 text-right">{formatUSD(r.revenue)}</td>
                            <td className="px-3 py-2 text-right">{formatUSD(r.cost)}</td>
                            <td className={`px-3 py-2 text-right font-bold ${r.profit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatUSD(r.profit)}</td>
                            <td className={`px-3 py-2 text-right font-bold ${r.marginPct < 0 ? 'text-red-600' : 'text-blue-600'}`}>{r.marginPct.toFixed(1)}%</td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 font-sans">Sin ventas en el periodo.</td></tr>}
                </tbody>
            </table>
        </div>
    </Card>
);

/** Rentabilidad: margen bruto y neto por marca, categoría y modelo (Costo Promedio Ponderado). */
export function ProfitabilityView({ report, formatUSD, Exporter, bcvRate }) {
    const cards = [
        { label: 'Ingresos (sin IVA)', value: formatUSD(report.totalRevenueUsd), tone: 'border-l-blue-600' },
        { label: 'Costo de Ventas (CPP)', value: formatUSD(report.totalCostUsd), tone: 'border-l-gray-500' },
        { label: `Utilidad Bruta · ${report.profitMarginPct.toFixed(1)}%`, value: formatUSD(report.grossProfitUsd), tone: 'border-l-emerald-600' },
        { label: 'Comisiones de Vendedores', value: formatUSD(report.commissionsUsd), tone: 'border-l-amber-500' },
        { label: `Utilidad Neta · ${report.netMarginPct.toFixed(1)}%`, value: formatUSD(report.netProfitUsd), tone: 'border-l-purple-600' }
    ];
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((c) => (
                    <Card key={c.label} className={`p-4 border-l-4 ${c.tone}`}>
                        <p className="text-xs font-semibold text-gray-500">{c.label}</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{c.value}</p>
                    </Card>
                ))}
            </div>

            {report.costCoveragePct < 100 && (
                <p role="alert" className="flex items-center gap-2 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Solo el {report.costCoveragePct.toFixed(0)}% de las líneas vendidas tiene costo real cargado. El resto usa una estimación del 55% del precio (marcado con *). Registra las compras para obtener márgenes exactos.
                </p>
            )}

            <Card className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" /> Margen de Ganancia por Par Vendido
                    </h3>
                    <p className="text-xs text-gray-500">Costo promedio ponderado con flete e impuestos de importación prorrateados.</p>
                </div>
                <Exporter
                    reportTitle="Rentabilidad y Margen por Modelo"
                    categoryName="Capa 5: BI / Dashboards"
                    columns={[
                        { key: 'name', header: 'Modelo' },
                        { key: 'brand', header: 'Marca' },
                        { key: 'units', header: 'Pares' },
                        { key: 'revenue', header: 'Ingresos ($)' },
                        { key: 'cost', header: 'Costo ($)' },
                        { key: 'profit', header: 'Utilidad ($)' },
                        { key: 'marginPct', header: 'Margen (%)' }
                    ]}
                    rows={report.byProduct}
                    summaryCards={[
                        { label: 'Utilidad Bruta', value: formatUSD(report.grossProfitUsd) },
                        { label: 'Comisiones', value: formatUSD(report.commissionsUsd) },
                        { label: 'Utilidad Neta', value: formatUSD(report.netProfitUsd) }
                    ]}
                    filename="Rentabilidad_Margen_Modelos"
                    bcvRate={bcvRate}
                />
            </Card>

            <MarginTable title="Por marca" rows={report.byBrand} labelKey="brand" formatUSD={formatUSD} />
            <MarginTable title="Por categoría" rows={report.byCategory} labelKey="category" formatUSD={formatUSD} />
            <MarginTable title="Por modelo (top 15 por utilidad)" rows={report.byProduct.slice(0, 15)} labelKey="name" formatUSD={formatUSD} />
        </div>
    );
}

/** Comisiones por vendedor con base configurable y atajos de quincena. */
export function CommissionsView({ report, formatUSD, Exporter, bcvRate, onSetRange, onConfigSaved }) {
    const [config, setConfig] = useState(() => getCommissionConfig());
    const [newSeller, setNewSeller] = useState('');
    const [newSellerPct, setNewSellerPct] = useState('');

    const save = () => {
        saveCommissionConfig(config);
        onConfigSaved();
    };

    const applyQuincena = (offset) => {
        const r = getQuincenaRange(offset);
        onSetRange(localDate(r.from), localDate(r.to));
    };

    const addOverride = () => {
        if (!newSeller.trim() || newSellerPct === '') return;
        setConfig({ ...config, overrides: { ...config.overrides, [newSeller.trim()]: Number(newSellerPct) } });
        setNewSeller('');
        setNewSellerPct('');
    };

    return (
        <div className="space-y-6">
            <Card className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" /> Comisiones por Vendedor
                        </h3>
                        <p className="text-xs text-gray-500">
                            Base: {report.base === 'margen' ? 'margen de ganancia' : 'ventas sin IVA'} · neto de notas de crédito · total del periodo {formatUSD(report.totalCommissionUsd)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => applyQuincena(0)}>Quincena actual</Button>
                        <Button variant="secondary" size="sm" onClick={() => applyQuincena(-1)}>Quincena anterior</Button>
                    </div>
                </div>

                <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                    <legend className="px-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Reglas de comisión</legend>
                    <Input
                        label="% general"
                        type="number" min="0" max="100" step="0.1"
                        value={config.ratePct}
                        onChange={(e) => setConfig({ ...config, ratePct: e.target.value })}
                    />
                    <div className="w-full">
                        <label htmlFor="commission-base" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Base de cálculo</label>
                        <select
                            id="commission-base"
                            value={config.base}
                            onChange={(e) => setConfig({ ...config, base: e.target.value })}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm py-2.5 px-3"
                        >
                            <option value="ventas">Volumen de ventas (sin IVA)</option>
                            <option value="margen">Margen de ganancia</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button className="w-full" onClick={save}><Save className="w-4 h-4 mr-2" />Guardar reglas</Button>
                    </div>

                    <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <Input label="Vendedor con % propio" value={newSeller} onChange={(e) => setNewSeller(e.target.value)} placeholder="Nombre exacto" />
                        <Input label="% propio" type="number" min="0" max="100" step="0.1" value={newSellerPct} onChange={(e) => setNewSellerPct(e.target.value)} />
                        <Button variant="secondary" onClick={addOverride}>Agregar excepción</Button>
                    </div>
                    {Object.keys(config.overrides).length > 0 && (
                        <ul className="sm:col-span-3 flex flex-wrap gap-2 text-xs">
                            {Object.entries(config.overrides).map(([name, pct]) => (
                                <li key={name} className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                                    {name}: {pct}%
                                    <button
                                        type="button"
                                        aria-label={`Quitar excepción de ${name}`}
                                        className="ml-2 text-red-600"
                                        onClick={() => {
                                            const next = { ...config.overrides };
                                            delete next[name];
                                            setConfig({ ...config, overrides: next });
                                        }}
                                    >×</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </fieldset>

                <Exporter
                    reportTitle="Comisiones por Vendedor"
                    categoryName="Capa 5: BI / Dashboards"
                    columns={[
                        { key: 'seller', header: 'Vendedor' },
                        { key: 'salesCount', header: 'Facturas' },
                        { key: 'creditNotesCount', header: 'Notas de crédito' },
                        { key: 'netBaseUsd', header: 'Base neta ($)' },
                        { key: 'ratePct', header: '% comisión' },
                        { key: 'commissionUsd', header: 'Comisión ($)' }
                    ]}
                    rows={report.rows}
                    summaryCards={[{ label: 'Total comisiones', value: formatUSD(report.totalCommissionUsd) }]}
                    filename="Comisiones_Vendedores"
                    bcvRate={bcvRate}
                />

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                <th className="px-3 py-2 text-left">Vendedor</th>
                                <th className="px-3 py-2 text-center">Facturas</th>
                                <th className="px-3 py-2 text-center">NC</th>
                                <th className="px-3 py-2 text-right">Base neta</th>
                                <th className="px-3 py-2 text-right">%</th>
                                <th className="px-3 py-2 text-right">Comisión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                            {report.rows.map((r) => (
                                <tr key={r.seller}>
                                    <td className="px-3 py-2 font-sans font-medium">{r.seller}{r.estimatedCostLines > 0 && <span title="Margen con costo estimado" className="ml-1 text-amber-600">*</span>}</td>
                                    <td className="px-3 py-2 text-center">{r.salesCount}</td>
                                    <td className="px-3 py-2 text-center">{r.creditNotesCount}</td>
                                    <td className="px-3 py-2 text-right">{formatUSD(r.netBaseUsd)}</td>
                                    <td className="px-3 py-2 text-right">{r.ratePct}%</td>
                                    <td className="px-3 py-2 text-right font-black text-emerald-600">{formatUSD(r.commissionUsd)}</td>
                                </tr>
                            ))}
                            {report.rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 font-sans">Sin ventas en el periodo.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
