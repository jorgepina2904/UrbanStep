import React, { useContext, useState } from 'react';
import { Bell, Search, Sun, Moon, TrendingUp, RefreshCw } from 'lucide-react';
import { ThemeContext } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

export const Header = () => {
    const { isDark, toggleTheme } = useContext(ThemeContext);
    const { rate, updateRate, refreshRate, isRefreshing, formatBs } = useCurrency();
    const [showRateModal, setShowRateModal] = useState(false);
    const [newRateInput, setNewRateInput] = useState('');

    const handleOpenModal = () => {
        setNewRateInput(rate.toString());
        setShowRateModal(true);
    };

    const handleSaveRate = (e) => {
        e.preventDefault();
        const num = parseFloat(newRateInput);
        if (isNaN(num) || num <= 0) {
            toast.error('Ingresa una tasa válida');
            return;
        }
        updateRate(num, 'Cabecera Rápida');
        toast.success(`Tasa BCV actualizada: ${formatBs(num)}`);
        setShowRateModal(false);
    };

    const handleSyncLive = async () => {
        try {
            const updated = await refreshRate();
            setNewRateInput(updated.rate.toString());
            toast.success(`Tasa actualizada desde la API: ${formatBs(updated.rate)}`);
        } catch {
            toast.error('No se pudo conectar a la API del BCV');
        }
    };

    return (
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 transition-colors duration-200 shrink-0">
            {/* Search */}
            <div className="flex-1 flex items-center">
                <div className="relative w-72 sm:w-80">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="w-4 h-4 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar producto, cliente o factura..."
                        className="w-full pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
                    />
                </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-3">
                {/* BCV Rate Widget */}
                <button
                    onClick={handleOpenModal}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold transition-all border border-blue-200/50 dark:border-blue-800/50"
                    title="Clic para cambiar la tasa de cambio"
                >
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>BCV:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">{formatBs(rate)}</span>
                </button>

                {/* Notifications */}
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative text-gray-500 dark:text-gray-400">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                </button>

                {/* Dark/Light mode */}
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>

            {/* Quick Rate Modal */}
            <Modal isOpen={showRateModal} onClose={() => setShowRateModal(false)} title="🇻🇪 Tasa Oficial BCV" size="sm">
                <form onSubmit={handleSaveRate} className="space-y-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Indica la tasa del dólar oficial del Banco Central de Venezuela para los cálculos del sistema.
                    </p>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Tasa de Cambio (Bs. por 1 USD)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            value={newRateInput}
                            onChange={(e) => setNewRateInput(e.target.value)}
                            placeholder="42.50"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1 text-xs flex items-center justify-center gap-1"
                            onClick={handleSyncLive}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Consultando...' : 'Sincronizar BCV'}
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1 text-xs">
                            Guardar Tasa
                        </Button>
                    </div>
                </form>
            </Modal>
        </header>
    );
};

export default Header;