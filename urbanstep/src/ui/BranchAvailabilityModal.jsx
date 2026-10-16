import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { branchService, PRINCIPAL_ID } from '../services/branchService';
import { transferService } from '../services/transferService';

/**
 * Consulta en caja: ¿esta talla y color están en otra sucursal o depósito?
 * El cajero puede dejar una SOLICITUD de traslado (no mueve existencias hasta que el origen la despacha).
 */
export default function BranchAvailabilityModal({ isOpen, onClose, product, color, size, requestedBy }) {
    const [rows, setRows] = useState(null);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        if (!isOpen || !product) return undefined;
        let alive = true;
        setRows(null);
        branchService.findElsewhere(product, color, size).then(r => { if (alive) setRows(r.filter(x => x.branchId !== PRINCIPAL_ID)); });
        return () => { alive = false; };
    }, [isOpen, product, color, size]);

    const request = async (row) => {
        setBusyId(row.branchId);
        try {
            const id = await transferService.create({
                fromId: row.branchId, toId: PRINCIPAL_ID,
                items: [{ product, color, size, qty: 1 }],
                user: requestedBy || 'Cajero', notes: 'Solicitado desde caja por falta de talla', dispatch: false
            });
            toast.success(`Traslado ${id} solicitado a ${row.branchName}`);
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📍 Disponibilidad en otras sucursales" size="sm">
            <div className="space-y-3">
                <p className="text-sm"><strong>{product?.name}</strong> · {color} · Talla {size}</p>
                {rows === null && <p role="status" className="text-xs text-gray-500">Consultando…</p>}
                {rows?.length === 0 && <p className="text-sm text-gray-500">No hay existencia de esta variante en otras ubicaciones.</p>}
                {rows?.map(r => (
                    <div key={r.branchId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                        <span className="text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4 text-blue-600" />{r.branchName}: <strong>{r.qty}</strong> par(es)</span>
                        <Button size="sm" isLoading={busyId === r.branchId} onClick={() => request(r)}>Solicitar traslado</Button>
                    </div>
                ))}
            </div>
        </Modal>
    );
}
