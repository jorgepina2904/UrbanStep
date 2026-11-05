import React, { useEffect, useState } from 'react';
import { UserCheck, X, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { collectErrors, validateAddress, validateDocument, validatePersonName, validatePhoneVE } from '../../utils/validators';
import { fieldError, fieldInput, fieldLabel, modalBtnPrimary, modalClose, modalMuted, modalOverlay, modalPanel, useEscapeKey } from './ui';

const rules = (f) => ({
    name: () => validatePersonName(f.name),
    docNumber: () => validateDocument(f.docType, f.docNumber),
    phone: () => validatePhoneVE(f.phone),
    address: () => validateAddress(f.address)
});

/**
 * Último paso del registro con Google: los datos que Google no entrega (cédula/RIF, teléfono y
 * dirección) y que la factura fiscal y el delivery necesitan.
 */
export default function CompleteProfileModal({ isOpen, user, onClose, onCompleted }) {
    const [form, setForm] = useState({ name: '', docType: 'V', docNumber: '', phone: '', address: '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) setForm(prev => ({ ...prev, name: user?.name || '', phone: user?.phone || '' }));
    }, [isOpen, user]);

    useEscapeKey(isOpen && !saving, onClose);
    if (!isOpen) return null;

    const field = (key) => ({
        value: form[key],
        'aria-invalid': Boolean(errors[key]),
        'aria-describedby': errors[key] ? `cp-${key}-error` : undefined,
        onChange: (e) => {
            setForm(prev => ({ ...prev, [key]: e.target.value }));
            if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
        }
    });
    const err = (key) => (errors[key] ? <p id={`cp-${key}-error`} className={fieldError}>{errors[key]}</p> : null);

    const submit = async (e) => {
        e.preventDefault();
        const found = collectErrors(rules(form));
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        setSaving(true);
        setError('');
        try {
            onCompleted(await authService.completeGoogleProfile(user, form));
        } catch (ex) {
            setError(ex.message || 'No se pudo guardar tu registro');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={modalOverlay} role="dialog" aria-modal="true" aria-labelledby="cp-title">
            <div className={`${modalPanel} w-full max-w-md p-6 relative space-y-4 my-auto us-fade-in`}>
                <button type="button" onClick={onClose} disabled={saving} aria-label="Completar más tarde" className={`absolute top-4 right-4 ${modalClose}`}>
                    <X className="w-5 h-5" />
                </button>
                <div className="text-center space-y-1">
                    <div className="w-12 h-12 bg-blue-600 text-white dark:bg-us-cyan dark:text-black rounded-xl mx-auto flex items-center justify-center mb-2">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <h3 id="cp-title" className="font-us-display text-lg font-black uppercase">Completa tu registro</h3>
                    <p className={`text-xs ${modalMuted}`}>Entraste con Google como <strong>{user?.email}</strong>. Necesitamos estos datos para tu factura fiscal y el delivery.</p>
                </div>

                {error && <p role="alert" className="p-3 rounded-lg text-xs border bg-red-50 border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">{error}</p>}

                <form onSubmit={submit} className="space-y-2.5 text-left text-xs" noValidate>
                    <div>
                        <label htmlFor="cp-name" className={fieldLabel}>Nombre y apellido *</label>
                        <input id="cp-name" type="text" autoComplete="name" className={fieldInput} {...field('name')} />
                        {err('name')}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label htmlFor="cp-doc" className={fieldLabel}>Doc.</label>
                            <select id="cp-doc" className={`${fieldInput} px-2`} value={form.docType} onChange={(e) => setForm(prev => ({ ...prev, docType: e.target.value }))}>
                                {['V', 'E', 'J', 'G', 'P'].map(t => <option key={t} value={t}>{t}-</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label htmlFor="cp-docNumber" className={fieldLabel}>Cédula / RIF *</label>
                            <input id="cp-docNumber" type="text" inputMode="numeric" placeholder="28123456" className={fieldInput} {...field('docNumber')} />
                            {err('docNumber')}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="cp-phone" className={fieldLabel}>Teléfono WhatsApp *</label>
                        <input id="cp-phone" type="tel" autoComplete="tel" placeholder="0414-1234567" className={fieldInput} {...field('phone')} />
                        {err('phone')}
                    </div>
                    <div>
                        <label htmlFor="cp-address" className={fieldLabel}>Dirección de entrega *</label>
                        <input id="cp-address" type="text" autoComplete="street-address" placeholder="Urb., calle y referencia en Barquisimeto/Cabudare" className={fieldInput} {...field('address')} />
                        {err('address')}
                    </div>
                    <button type="submit" disabled={saving} className={`w-full py-2.5 font-bold uppercase tracking-wider rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 ${modalBtnPrimary}`}>
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : 'Guardar y continuar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
