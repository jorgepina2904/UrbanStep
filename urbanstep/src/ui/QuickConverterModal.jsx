import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { useCurrency } from '../contexts/CurrencyContext';
import { DollarSign, ArrowRightLeft, Sparkles, TrendingUp } from 'lucide-react';

export default function QuickConverterModal({ isOpen, onClose }) {
    const { rate, toBs, formatBs } = useCurrency();
    const [usdInput, setUsdInput] = useState('');
    const [bsInput, setBsInput] = useState('');

    const handleUsdChange = (val) => {
        setUsdInput(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setBsInput((num * rate).toFixed(2));
        } else {
            setBsInput('');
        }
    };

    const handleBsChange = (val) => {
        setBsInput(val);
        const num = parseFloat(val);
        if (!isNaN(num) && rate > 0) {
            setUsdInput((num / rate).toFixed(2));
        } else {
            setUsdInput('');
        }
    };

    const setQuickAmount = (amount) => {
        handleUsdChange(amount.toString());
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="💱 Conversor Rápido de Precios (BCV)" size="sm">
            <div className="space-y-4">
                {/* Rate banner */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold">
                        <TrendingUp className="w-4 h-4" />
                        <span>Tasa Oficial BCV:</span>
                    </div>
                    <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                        {formatBs(rate)} / USD
                    </span>
                </div>

                {/* Conversion inputs */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                            Monto en Dólares ($ USD)
                        </label>
                        <Input
                            type="number"
                            step="0.5"
                            value={usdInput}
                            onChange={(e) => handleUsdChange(e.target.value)}
                            placeholder="0.00"
                            className="text-lg font-bold text-blue-600"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-center -my-1">
                        <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                            <ArrowRightLeft className="w-4 h-4" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Monto en Bolívares (Bs. VES)
                        </label>
                        <Input
                            type="number"
                            step="10"
                            value={bsInput}
                            onChange={(e) => handleBsChange(e.target.value)}
                            placeholder="0.00"
                            className="text-lg font-bold text-emerald-600"
                        />
                    </div>
                </div>

                {/* Quick amount presets */}
                <div>
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                        Montos Frecuentes:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {[5, 10, 20, 40, 50, 100].map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => setQuickAmount(amt)}
                                className="py-1.5 px-2 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-xs font-bold text-gray-800 dark:text-gray-200 transition-colors"
                            >
                                ${amt} <span className="text-[10px] text-gray-400 font-normal">({formatBs(toBs(amt))})</span>
                            </button>
                        ))}
                    </div>
                </div>

                <Button variant="secondary" className="w-full text-xs" onClick={onClose}>
                    Cerrar Conversor
                </Button>
            </div>
        </Modal>
    );
}
