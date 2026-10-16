import React, { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Trash2 } from 'lucide-react';
import Card from './Card';
import Input from './Input';
import Button from './Button';
import { userService } from '../services/userService';
import { supervisorPinService, APPROVER_ROLES } from '../services/supervisorPinService';

/** Administración de PIN de autorización (solo Administradores). Los PIN se guardan cifrados en este equipo. */
export default function SupervisorPinSettings() {
    const approvers = userService.getAll().filter(u => APPROVER_ROLES.includes(u.role) && u.active);
    const [configured, setConfigured] = useState(() => supervisorPinService.listConfigured());
    const [pins, setPins] = useState({});

    const refresh = useCallback(() => setConfigured(supervisorPinService.listConfigured()), []);

    const save = async (user) => {
        try {
            await supervisorPinService.setPin({ userId: user.id, name: user.name, role: user.role }, pins[user.id] || '');
            setPins({ ...pins, [user.id]: '' });
            refresh();
            toast.success(`PIN de ${user.name} guardado`);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const remove = (user) => {
        supervisorPinService.removePin(user.id);
        refresh();
        toast.success(`PIN de ${user.name} eliminado`);
    };

    return (
        <Card className="p-6 space-y-4">
            <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-600" /> PIN de Supervisor
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                    Un cajero necesita el PIN de un Supervisor o Administrador para emitir Notas de Crédito. El PIN (4 a 8 dígitos) se guarda cifrado en este equipo; configúralo en cada terminal de caja.
                </p>
            </div>
            {approvers.length === 0 && <p className="text-xs text-gray-400">No hay supervisores ni administradores activos.</p>}
            <ul className="space-y-3">
                {approvers.map((u) => {
                    const has = configured.some(c => c.userId === u.id);
                    return (
                        <li key={u.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{u.name} <span className="text-xs text-gray-400">· {u.role}</span></p>
                                <p className={`text-[11px] ${has ? 'text-emerald-600' : 'text-amber-600'}`}>{has ? 'PIN configurado en este equipo' : 'Sin PIN'}</p>
                            </div>
                            <Input
                                label={has ? 'Nuevo PIN' : 'PIN'}
                                type="password" inputMode="numeric" autoComplete="off" maxLength={8}
                                value={pins[u.id] || ''}
                                onChange={(e) => setPins({ ...pins, [u.id]: e.target.value.replace(/\D/g, '') })}
                                placeholder="4 a 8 dígitos"
                            />
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => save(u)} disabled={(pins[u.id] || '').length < 4}>Guardar</Button>
                                {has && (
                                    <Button size="sm" variant="danger" aria-label={`Eliminar PIN de ${u.name}`} onClick={() => remove(u)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
