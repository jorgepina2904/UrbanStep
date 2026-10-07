import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { useShift } from '../contexts/ShiftContext';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { DollarSign, Coins, CheckCircle, Monitor, Lock, AlertCircle, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShiftOpenModal({ isOpen, onClose }) {
    const { openShift } = useShift();
    const { user } = useAuth();

    const [step, setStep] = useState(1); // 1: select caja + PIN, 2: set initial cash
    const [selectedCaja, setSelectedCaja] = useState('');
    const [cajaPin, setCajaPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [validatedCaja, setValidatedCaja] = useState(null);

    const [initialUsd, setInitialUsd] = useState('50');
    const [initialBs, setInitialBs] = useState('500');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [cashRegisters, setCashRegisters] = useState(() => authService.getCashRegisters());

    React.useEffect(() => {
        if (isOpen) {
            setCashRegisters(authService.getCashRegisters());
        }
        const handler = () => setCashRegisters(authService.getCashRegisters());
        window.addEventListener('cash_registers_changed', handler);
        return () => window.removeEventListener('cash_registers_changed', handler);
    }, [isOpen]);

    const handleValidatePin = async (e) => {
        if (e) e.preventDefault();
        setPinError('');

        if (!selectedCaja) {
            setPinError('Selecciona una caja registradora');
            return;
        }
        if (!cajaPin.trim()) {
            setPinError('Ingresa el PIN de la caja');
            return;
        }

        const result = await authService.validateCajaCredentials(selectedCaja, cajaPin.trim());
        if (result.success) {
            setValidatedCaja(result.caja);
            setStep(2);
            toast.success(`✅ Caja ${result.caja.name} autenticada correctamente`);
        } else {
            setPinError(result.error);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            await openShift({
                cashierId: user?.id || 'u2',
                cashierName: user?.name || 'Cajero',
                cajaId: validatedCaja.id,
                cajaName: validatedCaja.name,
                cajaLocation: validatedCaja.location,
                initialCashUsd: parseFloat(initialUsd) || 0,
                initialCashBs: parseFloat(initialBs) || 0,
                notes,
            });
            toast.success(`¡Turno abierto en ${validatedCaja.name}!`);
            onClose();
            // Reset state
            setStep(1);
            setSelectedCaja('');
            setCajaPin('');
            setValidatedCaja(null);
        } catch (err) {
            toast.error('Error al abrir caja: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setSelectedCaja('');
        setCajaPin('');
        setPinError('');
        setValidatedCaja(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="🔓 Apertura de Turno de Caja" size="sm">
            {/* Step 1: Select Cash Register & Authenticate */}
            {step === 1 && (
                <form onSubmit={handleValidatePin} className="space-y-4">
                    {/* Cashier Info */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Cajero:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{user?.name || 'Cajero'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Sucursal:</span>
                            <span className="font-semibold">{user?.branch || 'Sede Principal'}</span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Selecciona la caja registradora e ingresa el PIN de seguridad para autorizar la apertura.
                    </p>

                    {/* Cash Register Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <Monitor className="w-3.5 h-3.5 text-blue-600" />
                            Seleccionar Caja Registradora
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {cashRegisters.map((caja) => (
                                <button
                                    key={caja.id}
                                    type="button"
                                    onClick={() => setSelectedCaja(caja.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                        selectedCaja === caja.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/30'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                        selectedCaja === caja.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {caja.name.includes(' ') ? caja.name.split(' ')[1] : caja.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold ${selectedCaja === caja.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                            {caja.name}
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                                            <MapPin className="w-3 h-3 shrink-0" />
                                            {caja.location}
                                        </p>
                                    </div>
                                    {selectedCaja === caja.id && (
                                        <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PIN Input */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            PIN de Seguridad de la Caja
                        </label>
                        <Input
                            type="password"
                            value={cajaPin}
                            onChange={(e) => setCajaPin(e.target.value)}
                            placeholder="Ingresa el PIN de 4 dígitos"
                            maxLength={4}
                            className="font-mono text-center tracking-[0.5em] text-lg"
                        />
                    </div>

                    {pinError && (
                        <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{pinError}</span>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button variant="secondary" className="flex-1 text-xs" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1 text-xs flex items-center justify-center gap-1 font-bold">
                            <Lock className="w-4 h-4" />
                            Verificar PIN
                        </Button>
                    </div>
                </form>
            )}

            {/* Step 2: Set Initial Cash */}
            {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Validated Caja Banner */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Cajero en Turno:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{user?.name || 'Cajero'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Caja Asignada:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{validatedCaja?.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Ubicación:</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{validatedCaja?.location}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Fecha y Hora:</span>
                            <span className="font-mono">{new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">PIN verificado ✓</span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ingresa el fondo o base de caja inicial en efectivo disponible en gaveta para cambio.
                    </p>

                    {/* Base Inputs */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                Fondo Base en Efectivo ($ USD)
                            </label>
                            <Input
                                type="number"
                                step="1"
                                value={initialUsd}
                                onChange={(e) => setInitialUsd(e.target.value)}
                                placeholder="50"
                                className="font-bold text-emerald-600"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-blue-600" />
                                Fondo Base en Efectivo Bolívares (Bs.)
                            </label>
                            <Input
                                type="number"
                                step="10"
                                value={initialBs}
                                onChange={(e) => setInitialBs(e.target.value)}
                                placeholder="500"
                                className="font-bold text-blue-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Observaciones de Apertura (Opcional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Ej: Billetes de $5, $10 y cambio en Bs. en caja"
                                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button variant="secondary" className="flex-1 text-xs" onClick={() => setStep(1)} disabled={submitting}>
                            ← Volver
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1 text-xs flex items-center justify-center gap-1 font-bold" disabled={submitting}>
                            <CheckCircle className="w-4 h-4" />
                            {submitting ? 'Abriendo...' : 'Iniciar Turno'}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
