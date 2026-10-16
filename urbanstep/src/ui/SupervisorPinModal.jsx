import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { supervisorPinService } from '../services/supervisorPinService';

/** Pide el PIN de un Supervisor/Administrador antes de ejecutar una operación sensible. */
export default function SupervisorPinModal({ isOpen, onClose, onApproved, action = 'operación sensible', requestedBy = null }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (isOpen) { setPin(''); setError(''); }
    }, [isOpen]);

    const submit = async (e) => {
        e.preventDefault();
        setChecking(true);
        setError('');
        try {
            const res = await supervisorPinService.verify(pin, { action, requestedBy });
            if (res.ok) onApproved(res.approver);
            else { setError(res.error); setPin(''); }
        } catch (err) {
            setError(err.message);
        } finally {
            setChecking(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🔐 Autorización de Supervisor" size="sm">
            <form onSubmit={submit} className="space-y-4">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    Esta operación (<strong>{action}</strong>) requiere el PIN de un Supervisor o Administrador.
                </p>
                <Input
                    label="PIN de autorización"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    error={error}
                    placeholder="••••"
                />
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="flex-1" isLoading={checking} disabled={pin.length < 4}>
                        <ShieldCheck className="w-4 h-4 mr-2" /> Autorizar
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
