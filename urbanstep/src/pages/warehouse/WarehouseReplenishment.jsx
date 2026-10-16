import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Flame, FileDown, MessageCircle, Copy } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { useCurrency } from '../../contexts/CurrencyContext';
import { saleService } from '../../services/saleServices';
import { productService } from '../../services/productService';
import { purchaseService } from '../../services/purchaseService';
import { branchService } from '../../services/branchService';
import { computeReplenishment, DEFAULT_REPLENISHMENT, buildPurchaseOrderText, buildWhatsAppUrl } from '../../services/replenishmentService';

const PARAM_FIELDS = [
    ['windowDays', 'Ventana de análisis (días)'],
    ['leadDays', 'Plazo del proveedor (días)'],
    ['coverDays', 'Cobertura deseada (días)'],
    ['safetyDays', 'Días de seguridad']
];

/** Sugerencias de compra por proveedor según la velocidad de venta, con orden en PDF / WhatsApp. */
export default function WarehouseReplenishment() {
    const { formatUSD } = useCurrency();
    const [params, setParams] = useState(DEFAULT_REPLENISHMENT);
    const [report, setReport] = useState(null);
    const [suppliers, setSuppliers] = useState([]);

    const run = useCallback(async () => {
        const [sales, products, supp, branchRows] = await Promise.all([saleService.getAll(), productService.getAll(), purchaseService.getSuppliers().catch(() => []), branchService.getBranchStock()]);
        const externalStock = {};
        branchRows.forEach(r => {
            const key = `${r.productId}|${String(r.color).trim().toLowerCase()}|${r.size}`;
            externalStock[key] = (externalStock[key] || 0) + r.qty;
        });
        setSuppliers(supp || []);
        setReport(computeReplenishment({ sales, products, externalStock, params }));
    }, [params]);

    useEffect(() => { run(); }, [run]);

    const supplierPhone = (id) => (suppliers.find(s => s.id === id)?.phone) || '';

    const downloadPdf = (group) => {
        const doc = new jsPDF();
        doc.setFontSize(14).text('Orden de compra · UrbanStep Venezuela C.A.', 14, 16);
        doc.setFontSize(10).text(`Proveedor: ${group.supplierName}`, 14, 24).text(`Fecha: ${new Date().toLocaleDateString('es-VE')}`, 14, 30);
        autoTable(doc, {
            startY: 36,
            head: [['Modelo', 'Color', 'Talla', 'Pares', 'Costo unit. ($)', 'Subtotal ($)']],
            body: group.lines.map(l => [l.name, l.color, l.size, l.suggestedQty, l.unitCostUsd.toFixed(2), l.lineCostUsd.toFixed(2)]),
            foot: [['', '', 'Total', group.totalQty, '', group.totalCostUsd.toFixed(2)]]
        });
        doc.save(`Orden_Compra_${group.supplierName.replace(/\W+/g, '_')}.pdf`);
    };

    const whatsapp = (group) => {
        const phone = supplierPhone(group.supplierId);
        if (!phone) { toast.error('Este proveedor no tiene teléfono registrado'); return; }
        window.open(buildWhatsAppUrl(phone, buildPurchaseOrderText(group)), '_blank', 'noopener');
    };

    const copyText = async (group) => {
        try { await navigator.clipboard.writeText(buildPurchaseOrderText(group)); toast.success('Orden copiada'); } catch { toast.error('No se pudo copiar'); }
    };

    return (
        <div className="space-y-6">
            <Card className="p-6 space-y-3">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Reabastecimiento inteligente</h3>
                <p className="text-xs text-gray-500">Calcula cuántos pares vende cada talla y color por día y propone pedir cuando la existencia total (tienda + sucursales) no alcanza para el plazo del proveedor más los días de seguridad.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {PARAM_FIELDS.map(([key, label]) => (
                        <Input key={key} label={label} type="number" min="1" step="1" value={params[key]} onChange={(e) => setParams({ ...params, [key]: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                    ))}
                </div>
            </Card>

            {report && report.bySupplier.length === 0 && (
                <Card className="p-6 text-sm text-gray-500 text-center">Sin sugerencias: ninguna variante vendida en la ventana está por debajo de su punto de reorden.</Card>
            )}

            {report?.bySupplier.map(group => (
                <Card key={group.supplierId} className="p-6 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">{group.supplierName}</h4>
                            <p className="text-xs text-gray-500">{group.totalQty} pares · {formatUSD(group.totalCostUsd)} estimado{group.urgentCount > 0 ? ` · ${group.urgentCount} urgente(s)` : ''}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="secondary" onClick={() => downloadPdf(group)}><FileDown className="w-4 h-4 mr-1.5" />PDF</Button>
                            <Button size="sm" variant="success" onClick={() => whatsapp(group)}><MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp</Button>
                            <Button size="sm" variant="secondary" onClick={() => copyText(group)}><Copy className="w-4 h-4 mr-1.5" />Copiar</Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                    <th className="px-3 py-2 text-left">Modelo</th><th className="px-3 py-2">Color</th><th className="px-3 py-2">Talla</th>
                                    <th className="px-3 py-2 text-right">Existencia</th><th className="px-3 py-2 text-right">Vende / sem.</th><th className="px-3 py-2 text-right">Días de cobertura</th><th className="px-3 py-2 text-right">Pedir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-[11px]">
                                {group.lines.map(l => (
                                    <tr key={`${l.productId}-${l.color}-${l.size}`}>
                                        <td className="px-3 py-2 font-sans">{l.urgent && <Flame aria-label="Urgente" className="inline w-3.5 h-3.5 text-red-500 mr-1" />}{l.name}</td>
                                        <td className="px-3 py-2 text-center">{l.color}</td><td className="px-3 py-2 text-center">{l.size}</td>
                                        <td className="px-3 py-2 text-right">{l.stock}</td><td className="px-3 py-2 text-right">{l.velocityWeekly}</td>
                                        <td className={`px-3 py-2 text-right ${l.urgent ? 'text-red-600 font-bold' : ''}`}>{l.daysOfCover}</td>
                                        <td className="px-3 py-2 text-right font-black text-blue-600">{l.suggestedQty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ))}

            {report && report.byModel.length > 0 && (
                <Card className="p-6 space-y-2">
                    <h4 className="font-bold text-gray-900 dark:text-white">Velocidad de venta semanal por modelo</h4>
                    <ul className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        {report.byModel.slice(0, 12).map(m => <li key={m.productId} className="flex justify-between border-b border-gray-100 dark:border-gray-800 py-1"><span>{m.name} <span className="text-gray-400">· {m.brand}</span></span><strong>{m.weeklyVelocity} pares/sem.</strong></li>)}
                    </ul>
                </Card>
            )}
        </div>
    );
}
