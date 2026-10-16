import React, { useState, useEffect } from 'react';
import { branchService } from '../services/branchService';
import { Warehouse as WarehouseIcon, Truck, TrendingUp, ShieldAlert, Boxes } from 'lucide-react';
import WarehouseStock from './warehouse/WarehouseStock';
import WarehouseTransfers from './warehouse/WarehouseTransfers';
import WarehouseReplenishment from './warehouse/WarehouseReplenishment';
import WarehouseWarranty from './warehouse/WarehouseWarranty';

const TABS = [
    { id: 'stock', label: 'Existencias', icon: Boxes },
    { id: 'transfers', label: 'Traslados', icon: Truck },
    { id: 'replenish', label: 'Reabastecimiento', icon: TrendingUp },
    { id: 'warranty', label: 'Garantías y mermas', icon: ShieldAlert }
];

/** Almacén y sucursales: existencias por ubicación, traslados, reabastecimiento inteligente y garantías. */
export default function Warehouse() {
    const [tab, setTab] = useState('stock');
    const [branches, setBranches] = useState([]);

    useEffect(() => { branchService.list().then(({ branches: list }) => setBranches(list)); }, []);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <WarehouseIcon className="w-7 h-7 text-blue-600" /> Almacén & Sucursales
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Control de existencias por ubicación, traslados con recepción ciega, compras sugeridas y reclamos de garantía.</p>
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

            {tab === 'stock' && <WarehouseStock onBranchesChanged={setBranches} />}
            {tab === 'transfers' && <WarehouseTransfers branches={branches} />}
            {tab === 'replenish' && <WarehouseReplenishment />}
            {tab === 'warranty' && <WarehouseWarranty />}
        </div>
    );
}
