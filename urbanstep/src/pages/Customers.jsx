import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Users, Search, Plus, Edit2, Trash2, Eye,
    ShoppingBag, TrendingUp, Shield
} from 'lucide-react';

import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Table } from '../ui/Table';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { customerService } from '../services/customerService';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { hasPermission } from '../utils/permissions';
import { DOC_TYPES, VENEZUELA_STATES, PHONE_PREFIXES } from '../data/venezuelaData';

const PUBLIC_ID = 'publico';
const EMPTY_FORM = {
    docType: 'V',
    rawDoc: '',
    firstName: '',
    lastName: '',
    email: '',
    phonePrefix: '0414',
    phoneRaw: '',
    state: 'Distrito Capital',
    city: 'Caracas',
    address: ''
};

const fullName = (c) => `${c.firstName} ${c.lastName}`.trim();

const KpiChip = ({ icon: Icon, label, value, subvalue, color }) => (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 gap-1 border border-gray-100 dark:border-gray-800">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        {subvalue && <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{subvalue}</p>}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{label}</p>
    </div>
);

export default function Customers() {
    const { user } = useAuth();
    const { toBs, formatBs, formatUSD } = useCurrency();
    const canWrite = hasPermission(user?.role, 'customers');
    const canDelete = user?.role === 'Admin';

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selected, setSelected] = useState(null);

    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const [history, setHistory] = useState([]);
    const [histLoading, setHistLoading] = useState(false);

    const loadCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await customerService.getAll();
            setCustomers(data);
        } catch {
            toast.error('Error al cargar clientes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadCustomers(); }, [loadCustomers]);

    const filtered = customers.filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            fullName(c).toLowerCase().includes(q) ||
            (c.docNumber || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q)
        );
    });

    const totalRevenue = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormErrors({});
        setShowForm(true);
    };

    const openEdit = (customer) => {
        setEditing(customer);
        const docParts = (customer.docNumber || '').split('-');
        const phoneParts = (customer.phone || '').split('-');

        setForm({
            docType: docParts[0] || 'V',
            rawDoc: docParts[1] || customer.docNumber || '',
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email === '-' ? '' : customer.email,
            phonePrefix: phoneParts[0] || '0414',
            phoneRaw: phoneParts[1] || customer.phone || '',
            state: customer.state || 'Distrito Capital',
            city: customer.city || 'Caracas',
            address: customer.address === '-' ? '' : customer.address,
        });
        setFormErrors({});
        setShowForm(true);
    };

    const openDetail = async (customer) => {
        setSelected(customer);
        setShowDetail(true);
        setHistory([]);
        setHistLoading(true);
        try {
            const sales = await customerService.getPurchaseHistory(customer.id);
            setHistory(sales);
        } catch {
            toast.error('No se pudo cargar el historial');
        } finally {
            setHistLoading(false);
        }
    };

    const validate = () => {
        const errors = {};
        if (!form.firstName.trim()) errors.firstName = 'El nombre es obligatorio';
        if (!form.lastName.trim()) errors.lastName = 'El apellido es obligatorio';
        if (!form.rawDoc.trim() && !editing) errors.rawDoc = 'La cédula o RIF es obligatorio';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const docNumber = `${form.docType}-${form.rawDoc.trim()}`;
            const phone = form.phoneRaw.trim() ? `${form.phonePrefix}-${form.phoneRaw.trim()}` : '-';

            const payload = {
                docType: form.docType,
                docNumber,
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email || '-',
                phone,
                state: form.state,
                city: form.city,
                address: form.address || '-',
            };

            if (editing) {
                await customerService.update(editing.id, payload);
                toast.success('Cliente actualizado correctamente');
            } else {
                await customerService.create(payload);
                toast.success('Cliente registrado exitosamente');
            }
            setShowForm(false);
            await loadCustomers();
        } catch (err) {
            toast.error(err?.message || 'Error al guardar el cliente');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (customer) => {
        try {
            const updated = await customerService.toggleStatus(customer.id);
            toast.success(updated.disabled ? `Cliente ${fullName(customer)} deshabilitado` : `Cliente ${fullName(customer)} habilitado`);
            await loadCustomers();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (customer) => {
        if (!window.confirm(`¿Intentar eliminar a ${fullName(customer)}?`)) return;
        try {
            await customerService.delete(customer.id);
            toast.success('Cliente eliminado');
            await loadCustomers();
        } catch (err) {
            toast.error(err?.message || 'Error al eliminar cliente', { duration: 5000 });
        }
    };

    const columns = [
        {
            header: 'Cliente / Cédula',
            cell: (c) => (
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        c.id === PUBLIC_ID
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            : c.disabled
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-600'
                                : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                    }`}>
                        {c.id === PUBLIC_ID ? '🛒' : fullName(c).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className={`font-bold truncate ${c.disabled ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                {fullName(c)}
                            </p>
                            {c.docNumber && c.id !== PUBLIC_ID && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                                    {c.docNumber}
                                </span>
                            )}
                            {c.disabled && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                    Deshabilitado
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.email === '-' ? 'Sin correo' : c.email}</p>
                    </div>
                </div>
            ),
        },
        {
            header: 'Ubicación',
            cell: (c) => (
                <div className="text-xs">
                    <span className="font-medium text-gray-800 dark:text-gray-200 block">{c.city || 'Caracas'}</span>
                    <span className="text-gray-400">{c.state || 'Distrito Capital'}</span>
                </div>
            ),
        },
        {
            header: 'Teléfono',
            cell: (c) => (
                <span className="text-xs font-mono text-gray-600 dark:text-gray-300">
                    {c.phone === '-' ? '—' : c.phone}
                </span>
            ),
        },
        {
            header: 'Total Compras',
            cell: (c) => (
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{formatUSD(c.totalSpent || 0)}</p>
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{formatBs(toBs(c.totalSpent || 0))}</p>
                </div>
            ),
        },
        {
            header: 'Acciones',
            cell: (c) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(c)} title="Ver detalles e historial">
                        <Eye className="w-4 h-4 text-blue-600" />
                    </Button>
                    {canWrite && c.id !== PUBLIC_ID && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="Editar">
                            <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </Button>
                    )}
                    {canWrite && c.id !== PUBLIC_ID && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(c)}
                            title={c.disabled ? "Habilitar cliente" : "Deshabilitar cliente"}
                        >
                            {c.disabled ? (
                                <span className="text-emerald-600 text-xs font-bold">✓ Activar</span>
                            ) : (
                                <span className="text-amber-600 text-xs font-bold">⊘ Desactivar</span>
                            )}
                        </Button>
                    )}
                    {canDelete && c.id !== PUBLIC_ID && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} title="Eliminar (Protegido si posee historial de compras)">
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-7 h-7 text-blue-600" />
                        Directorio de Clientes (CRM)
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Gestión de clientes de Venezuela con Cédula, RIF, contactos y trazabilidad de compras.
                    </p>
                </div>
                {canWrite && (
                    <Button variant="primary" onClick={openCreate} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Nuevo Cliente
                    </Button>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiChip icon={Users} label="Total Registrados" value={customers.length} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600" />
                <KpiChip icon={Shield} label="Clientes VIP" value={customers.filter(c => c.totalSpent >= 1000).length} color="bg-purple-100 dark:bg-purple-900/30 text-purple-600" />
                <KpiChip 
                    icon={TrendingUp} 
                    label="Ventas Acumuladas" 
                    value={formatUSD(totalRevenue)} 
                    subvalue={formatBs(toBs(totalRevenue))} 
                    color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" 
                />
                <KpiChip 
                    icon={ShoppingBag} 
                    label="Ticket Promedio" 
                    value={formatUSD(customers.length > 0 ? totalRevenue / customers.length : 0)} 
                    color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" 
                />
            </div>

            {/* Search & Table */}
            <Card className="p-4 space-y-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, Cédula, RIF, teléfono o ciudad..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                </div>

                <Table columns={columns} data={filtered} loading={loading} />
            </Card>

            {/* Create / Edit Customer Modal */}
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={editing ? '✏️ Editar Cliente' : '👤 Registrar Nuevo Cliente en Venezuela'}
                size="md"
            >
                <div className="space-y-4">
                    {/* Document Section */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo Doc.</label>
                            <select
                                value={form.docType}
                                onChange={(e) => setForm({ ...form, docType: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white"
                            >
                                {DOC_TYPES.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Número de Cédula o RIF *</label>
                            <Input
                                value={form.rawDoc}
                                onChange={(e) => setForm({ ...form, rawDoc: e.target.value })}
                                placeholder="Ej: 18456123 o 31234567-8"
                                autoFocus
                            />
                            {formErrors.rawDoc && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.rawDoc}</p>}
                        </div>
                    </div>

                    {/* Name */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                            <Input
                                value={form.firstName}
                                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                placeholder="Ej: Alejandro"
                            />
                            {formErrors.firstName && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.firstName}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Apellido *</label>
                            <Input
                                value={form.lastName}
                                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                placeholder="Ej: Mendoza"
                            />
                            {formErrors.lastName && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.lastName}</p>}
                        </div>
                    </div>

                    {/* Phone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Teléfono Venezolano</label>
                            <div className="flex gap-2">
                                <select
                                    value={form.phonePrefix}
                                    onChange={(e) => setForm({ ...form, phonePrefix: e.target.value })}
                                    className="w-24 px-2 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white font-mono"
                                >
                                    {PHONE_PREFIXES.map(p => (
                                        <option key={p.prefix} value={p.prefix}>{p.prefix}</option>
                                    ))}
                                </select>
                                <Input
                                    value={form.phoneRaw}
                                    onChange={(e) => setForm({ ...form, phoneRaw: e.target.value })}
                                    placeholder="1234567"
                                    className="flex-1 font-mono"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="cliente@correo.com"
                            />
                        </div>
                    </div>

                    {/* State & City */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                            <select
                                value={form.state}
                                onChange={(e) => setForm({ ...form, state: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white"
                            >
                                {VENEZUELA_STATES.map(s => (
                                    <option key={s.name} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Ciudad / Municipio</label>
                            <Input
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                placeholder="Ej: Caracas (Chacao)"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Dirección de Entrega / Despacho</label>
                        <textarea
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            rows={2}
                            placeholder="Calle, avenida, edificio, punto de referencia o agencia MRW/Zoom de destino"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Cliente'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Customer Detail Modal */}
            {selected && (
                <Modal
                    isOpen={showDetail}
                    onClose={() => setShowDetail(false)}
                    title={`👤 Expediente de ${fullName(selected)}`}
                    size="lg"
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl text-xs">
                            <div>
                                <span className="text-gray-400 block">Cédula / RIF:</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selected.docNumber || '—'}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block">Teléfono:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{selected.phone || '—'}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block">Ubicación:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{selected.city}, {selected.state}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block">Total Invertido:</span>
                                <span className="font-bold text-emerald-600">{formatUSD(selected.totalSpent || 0)}</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Historial de Compras en Tienda</h3>
                            {histLoading ? (
                                <div className="py-6 text-center"><Spinner /></div>
                            ) : history.length === 0 ? (
                                <p className="text-xs text-gray-400 py-4 text-center">Este cliente no registra compras aún.</p>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {history.map(sale => (
                                        <div key={sale.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{sale.receiptNumber || sale.id}</p>
                                                <p className="text-gray-400">{new Date(sale.date).toLocaleString('es-VE')} • {sale.paymentMethodLabel || sale.paymentMethod}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-blue-600 dark:text-blue-400">{formatUSD(sale.total)}</p>
                                                <p className="text-[10px] text-emerald-600">{formatBs(toBs(sale.total))}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
