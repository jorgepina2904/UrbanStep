import React, { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { settingsService, DEFAULT_SETTINGS } from '../services/settingsService';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { useShift } from '../contexts/ShiftContext';
import { cashRegisterService } from '../services/cashRegisterService';
import { testSupabaseConnection, isSupabaseConfigured } from '../services/supabaseClient';
import { VENEZUELA_BANKS, SHIPPING_CARRIERS } from '../data/venezuelaData';
import { auditService } from '../services/auditService';
import { 
    Store, 
    DollarSign, 
    CreditCard, 
    Truck, 
    Database, 
    Save, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    TrendingUp,
    ExternalLink,
    Copy,
    Building2,
    Receipt,
    Shield,
    Search,
    Trash2,
    Clock,
    FileText,
    Activity,
    Monitor,
    Key,
    Eye,
    EyeOff,
    Plus,
    Users,
    UserCheck,
    UserX,
    PlayCircle,
    Lock,
    Smartphone,
    Coins,
    Edit2,
    Check
} from 'lucide-react';
import { userService } from '../services/userService';
import toast from 'react-hot-toast';

// Action labels in Spanish
const ACTION_LABELS = {
    login: 'Inicio de sesión',
    logout: 'Cierre de sesión',
    create: 'Creación',
    update: 'Actualización',
    delete: 'Eliminación',
    shift_open: 'Apertura de turno',
    shift_close: 'Cierre de turno',
    sale_create: 'Venta realizada',
    sale_void: 'Venta anulada',
    product_create: 'Producto creado',
    product_update: 'Producto actualizado',
    product_delete: 'Producto eliminado',
    customer_create: 'Cliente creado',
    customer_update: 'Cliente actualizado',
    inventory_adjust: 'Ajuste de inventario',
    settings_change: 'Cambio de configuración',
    delivery_create: 'Delivery creado',
    delivery_update: 'Delivery actualizado',
    rate_update: 'Tasa actualizada',
    price_override: 'Precio modificado',
};

const MODULE_ICONS = {
    auth: '🔐',
    sales: '💰',
    products: '📦',
    customers: '👥',
    inventory: '📋',
    settings: '⚙️',
    shifts: '🕐',
    delivery: '🚚',
};

export default function Settings() {
    const { rate, updateRate, refreshRate, isRefreshing, lastUpdated, formatBs } = useCurrency();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('company');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [manualRateInput, setManualRateInput] = useState('');
    const [dbStatus, setDbStatus] = useState(null);
    const [testingDb, setTestingDb] = useState(false);

    // Audit state
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditSummary, setAuditSummary] = useState(null);
    const [auditSearch, setAuditSearch] = useState('');
    const [auditModuleFilter, setAuditModuleFilter] = useState('all');

    // Cash Registers (Cajas) & Shifts Management
    const { activeShift, openShift, closeShift } = useShift();
    const [cajas, setCajas] = useState(() => cashRegisterService.getAll());
    const [showCajaModal, setShowCajaModal] = useState(false);
    const [editingCaja, setEditingCaja] = useState(null);
    const [cajaForm, setCajaForm] = useState({ name: '', location: '', pin: '', active: true });
    const [showPinModal, setShowPinModal] = useState(false);
    const [targetCajaForPin, setTargetCajaForPin] = useState(null);
    const [newPinInput, setNewPinInput] = useState('');
    const [revealedPins, setRevealedPins] = useState({});

    // Users (Cajeros, Supervisores, Admins)
    const [users, setUsers] = useState(() => userService.getAll());
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Cajero',
        assignedCaja: '',
        branch: 'Sede Principal',
        active: true
    });
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [userSearch, setUserSearch] = useState('');

    // Admin Cash Register Shift Opening
    const [showAdminShiftModal, setShowAdminShiftModal] = useState(false);
    const [adminShiftForm, setAdminShiftForm] = useState({
        cajaId: '',
        cashierId: '',
        initialCashUsd: '50',
        initialCashBs: '2000',
        notes: 'Aperturado por Administrador General'
    });

    // Keep cajas and users in sync
    useEffect(() => {
        const cajaHandler = () => setCajas(cashRegisterService.getAll());
        const userHandler = () => setUsers(userService.getAll());
        window.addEventListener('cash_registers_changed', cajaHandler);
        window.addEventListener('users_changed', userHandler);
        return () => {
            window.removeEventListener('cash_registers_changed', cajaHandler);
            window.removeEventListener('users_changed', userHandler);
        };
    }, []);

    // Payment Methods Management
    const [paymentMethods, setPaymentMethods] = useState(() => settingsService.getPaymentMethods());
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);
    const [paymentMethodForm, setPaymentMethodForm] = useState({
        label: '',
        currency: 'USD',
        type: 'digital',
        bank: '',
        phone: '',
        rif: '',
        email: '',
        holder: '',
        account: '',
        instructions: '',
        requiresReference: true,
        active: true
    });

    useEffect(() => {
        const payHandler = () => setPaymentMethods(settingsService.getPaymentMethods());
        window.addEventListener('payment_methods_updated', payHandler);
        return () => window.removeEventListener('payment_methods_updated', payHandler);
    }, []);

    const handleOpenCreatePaymentMethod = () => {
        setEditingPaymentMethod(null);
        setPaymentMethodForm({
            label: '',
            currency: 'USD',
            type: 'digital',
            bank: '',
            phone: '',
            rif: '',
            email: '',
            holder: '',
            account: '',
            instructions: '',
            requiresReference: true,
            active: true
        });
        setShowPaymentModal(true);
    };

    const handleOpenEditPaymentMethod = (pm) => {
        setEditingPaymentMethod(pm);
        setPaymentMethodForm({
            label: pm.label || '',
            currency: pm.currency || 'USD',
            type: pm.type || 'digital',
            bank: pm.bank || '',
            phone: pm.phone || '',
            rif: pm.rif || '',
            email: pm.email || '',
            holder: pm.holder || '',
            account: pm.account || '',
            instructions: pm.instructions || '',
            requiresReference: pm.requiresReference ?? true,
            active: pm.active ?? true
        });
        setShowPaymentModal(true);
    };

    const handleSavePaymentMethod = (e) => {
        if (e) e.preventDefault();
        if (!paymentMethodForm.label.trim()) {
            toast.error('El nombre del método de pago es obligatorio');
            return;
        }

        if (editingPaymentMethod) {
            settingsService.updatePaymentMethod(editingPaymentMethod.id, paymentMethodForm);
            toast.success(`Método "${paymentMethodForm.label}" actualizado`);
        } else {
            settingsService.addPaymentMethod(paymentMethodForm);
            toast.success(`Nuevo método "${paymentMethodForm.label}" registrado con éxito`);
        }
        setPaymentMethods(settingsService.getPaymentMethods());
        setShowPaymentModal(false);
    };

    const handleTogglePaymentMethod = (id) => {
        const updated = settingsService.togglePaymentMethod(id);
        setPaymentMethods(settingsService.getPaymentMethods());
        toast.success(`Método ${updated.label} ${updated.active ? 'habilitado' : 'desactivado'}`);
    };

    const handleDeletePaymentMethod = (id, label) => {
        if (window.confirm(`¿Estás seguro de eliminar el método de pago "${label}"?`)) {
            settingsService.deletePaymentMethod(id);
            setPaymentMethods(settingsService.getPaymentMethods());
            toast.success(`Método "${label}" eliminado`);
        }
    };

    const [form, setForm] = useState(DEFAULT_SETTINGS);

    const loadSettings = useCallback(async () => {
        setLoading(false);
        const data = await settingsService.getSettings();
        setForm(data);
        setManualRateInput(rate.toString());
    }, [rate]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const loadAuditData = useCallback(() => {
        const logs = auditService.getLogs({
            module: auditModuleFilter !== 'all' ? auditModuleFilter : undefined,
            search: auditSearch || undefined,
            limit: 100,
        });
        const summary = auditService.getSummary();
        setAuditLogs(logs);
        setAuditSummary(summary);
    }, [auditModuleFilter, auditSearch]);

    // Load audit data when tab is active
    useEffect(() => {
        if (activeTab === 'audit') {
            loadAuditData();
        }
    }, [activeTab, loadAuditData]);

    const handleGenerateDemoAudit = () => {
        auditService.generateDemoData(user);
        toast.success('Datos de demostración generados');
        loadAuditData();
    };

    const handleClearAudit = () => {
        if (window.confirm('¿Estás seguro de eliminar todos los registros de auditoría?')) {
            auditService.clearAll();
            toast.success('Registros de auditoría eliminados');
            loadAuditData();
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await settingsService.saveSettings(form);
            auditService.log({
                userId: user?.id, userName: user?.name, userRole: user?.role, userEmail: user?.email,
                action: 'settings_change', actionLabel: 'Configuración del sistema actualizada',
                module: 'settings', entityType: 'settings',
            });
            toast.success('Configuración guardada exitosamente');
        } catch (err) {
            toast.error('Error al guardar configuración: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateRate = (e) => {
        e.preventDefault();
        const num = parseFloat(manualRateInput);
        if (isNaN(num) || num <= 0) {
            toast.error('Ingresa una tasa válida');
            return;
        }
        updateRate(num, 'Ajuste Manual en Configuración');
        auditService.log({
            userId: user?.id, userName: user?.name, userRole: user?.role,
            action: 'rate_update', actionLabel: `Tasa BCV actualizada a ${formatBs(num)}`,
            module: 'settings', entityType: 'rate', details: { newRate: num },
        });
        toast.success(`Tasa BCV actualizada a ${formatBs(num)} / USD`);
    };

    const handleRefreshLiveRate = async () => {
        try {
            const res = await refreshRate();
            setManualRateInput(res.rate.toString());
            toast.success(`Tasa actualizada desde la API: ${formatBs(res.rate)} / USD`);
        } catch {
            toast.error('No se pudo conectar con la API en vivo');
        }
    };

    const handleTestSupabase = async () => {
        setTestingDb(true);
        try {
            const res = await testSupabaseConnection();
            setDbStatus(res);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast(res.message, { icon: 'ℹ️' });
            }
        } finally {
            setTestingDb(false);
        }
    };

    const copySchemaInstructions = () => {
        navigator.clipboard.writeText('supabase_schema.sql');
        toast.success('Nombre del archivo copiado al portapapeles');
    };

    // Handlers para Cajas Registradoras
    const handleOpenCreateCaja = () => {
        setEditingCaja(null);
        setCajaForm({
            name: `Caja ${cajas.length + 1}`,
            location: 'Planta Principal - Mostrador',
            pin: '1234',
            active: true
        });
        setShowCajaModal(true);
    };

    const handleOpenEditCaja = (caja) => {
        setEditingCaja(caja);
        setCajaForm({
            name: caja.name,
            location: caja.location,
            pin: caja.pin,
            active: caja.active
        });
        setShowCajaModal(true);
    };

    const handleSaveCaja = async (e) => {
        if (e) e.preventDefault();
        try {
            if (!cajaForm.name.trim()) {
                toast.error('El nombre de la caja es obligatorio');
                return;
            }
            if (!cajaForm.pin || !cajaForm.pin.trim() || cajaForm.pin.trim().length < 4) {
                toast.error('La clave o PIN debe contener al menos 4 dígitos numéricos');
                return;
            }

            if (editingCaja) {
                await cashRegisterService.update(editingCaja.id, cajaForm, user);
                toast.success(`Caja ${cajaForm.name} actualizada con éxito`);
            } else {
                await cashRegisterService.create(cajaForm, user);
                toast.success(`Caja ${cajaForm.name} creada exitosamente`);
            }
            setCajas(cashRegisterService.getAll());
            setShowCajaModal(false);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleToggleCajaActive = async (id) => {
        try {
            await cashRegisterService.toggleActive(id, user);
            setCajas(cashRegisterService.getAll());
            toast.success('Estado de caja actualizado');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeleteCaja = async (id) => {
        const target = cajas.find(c => c.id === id);
        if (!target) return;

        if (cajas.length <= 1) {
            toast.error('Debe existir al menos una caja registradora en el sistema');
            return;
        }

        if (activeShift && activeShift.cajaId === id) {
            toast.error('No puedes eliminar una caja que tiene un turno de trabajo abierto');
            return;
        }

        if (window.confirm(`¿Estás seguro de eliminar "${target.name}"? Esta acción se registrará en auditoría.`)) {
            try {
                await cashRegisterService.delete(id, user);
                setCajas(cashRegisterService.getAll());
                toast.success(`Caja ${target.name} eliminada`);
            } catch (err) {
                toast.error(err.message);
            }
        }
    };

    const handleOpenChangePin = (caja) => {
        setTargetCajaForPin(caja);
        setNewPinInput('');
        setShowPinModal(true);
    };

    const handleSaveNewPin = async (e) => {
        if (e) e.preventDefault();
        if (!newPinInput || newPinInput.trim().length < 4) {
            toast.error('Ingresa una clave o PIN de al menos 4 dígitos');
            return;
        }

        try {
            await cashRegisterService.updatePin(targetCajaForPin.id, newPinInput.trim(), user);
            setCajas(cashRegisterService.getAll());
            toast.success(`Nueva clave/PIN asignada a ${targetCajaForPin.name}`);
            setShowPinModal(false);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const toggleRevealPin = (id) => {
        setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Handlers para Usuarios del Sistema
    const handleOpenCreateUser = () => {
        setEditingUser(null);
        setUserForm({
            name: '',
            email: '',
            password: '1234',
            role: 'Cajero',
            assignedCaja: cajas[0]?.name || 'Caja 1',
            branch: 'Sede Principal',
            active: true
        });
        setShowUserModal(true);
    };

    const handleOpenEditUser = (u) => {
        setEditingUser(u);
        setUserForm({
            name: u.name,
            email: u.email,
            password: u.password || '',
            role: u.role,
            assignedCaja: u.assignedCaja || '',
            branch: u.branch || 'Sede Principal',
            active: u.active
        });
        setShowUserModal(true);
    };

    const handleSaveUser = async (e) => {
        if (e) e.preventDefault();
        try {
            if (!userForm.name.trim()) {
                toast.error('El nombre completo es obligatorio');
                return;
            }
            if (!userForm.email.trim()) {
                toast.error('El correo institucional es obligatorio');
                return;
            }
            if (!userForm.password.trim() || userForm.password.length < 4) {
                toast.error('La contraseña debe tener al menos 4 caracteres');
                return;
            }

            const payload = { ...userForm };
            if (payload.role === 'Cajero') {
                if (!payload.assignedCaja) {
                    payload.assignedCaja = cajas.find(c => c.active)?.name || 'Caja 1';
                }
            } else if (payload.role === 'Cliente') {
                payload.assignedCaja = 'Tienda Online';
            }

            if (editingUser) {
                await userService.update(editingUser.id, payload, user);
                toast.success(`Usuario ${payload.name} actualizado`);
            } else {
                await userService.create({ ...payload, adminUser: user });
                toast.success(`Usuario ${payload.name} (${payload.role}) creado exitosamente`);
            }
            setUsers(userService.getAll());
            setShowUserModal(false);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleToggleUserActive = async (id) => {
        try {
            const updated = await userService.toggleActive(id, user);
            setUsers(userService.getAll());
            toast.success(`Usuario ${updated.name} ${updated.active ? 'habilitado' : 'deshabilitado'}`);
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Apertura de Caja ejecutada por el Administrador
    const handleOpenAdminShiftModal = (preselectedCajaId = null, preselectedCashierId = null) => {
        const caja = (preselectedCajaId && cajas.find(c => c.id === preselectedCajaId)) || cajas.find(c => c.active) || cajas[0];
        const cashier = (preselectedCashierId && users.find(u => u.id === preselectedCashierId)) || users.find(u => u.active && u.role === 'Cajero') || users.find(u => u.active) || users[0];

        setAdminShiftForm({
            cajaId: caja?.id || '',
            cashierId: cashier?.id || '',
            initialCashUsd: '50',
            initialCashBs: '2000',
            notes: 'Aperturado oficialmente por Administrador General'
        });
        setShowAdminShiftModal(true);
    };

    const handleSaveAdminShift = async (e) => {
        if (e) e.preventDefault();
        const targetCaja = cajas.find(c => c.id === adminShiftForm.cajaId);
        const targetCashier = users.find(u => u.id === adminShiftForm.cashierId);

        if (!targetCaja) {
            toast.error('Selecciona una caja registradora habilitada');
            return;
        }
        if (!targetCashier) {
            toast.error('Selecciona el usuario/cajero responsable de la caja');
            return;
        }

        try {
            await openShift({
                cashierId: targetCashier.id,
                cashierName: targetCashier.name,
                cajaId: targetCaja.id,
                cajaName: targetCaja.name,
                cajaLocation: targetCaja.location,
                initialCashUsd: parseFloat(adminShiftForm.initialCashUsd) || 0,
                initialCashBs: parseFloat(adminShiftForm.initialCashBs) || 0,
                notes: adminShiftForm.notes || 'Aperturado por Administrador General'
            });

            // Asignar caja al usuario en su ficha
            await userService.assignCaja(targetCashier.id, targetCaja.name, user);
            setUsers(userService.getAll());

            auditService.log({
                userId: user?.id,
                userName: user?.name,
                userRole: user?.role,
                userEmail: user?.email,
                action: 'shift_open',
                actionLabel: `Admin aperturó ${targetCaja.name} asignando al cajero ${targetCashier.name}`,
                module: 'shifts',
                entityType: 'shift',
                details: {
                    caja: targetCaja.name,
                    cashier: targetCashier.name,
                    initialCashUsd: adminShiftForm.initialCashUsd,
                    initialCashBs: adminShiftForm.initialCashBs
                }
            });

            toast.success(`¡Caja ${targetCaja.name} aperturada! Asignada a ${targetCashier.name}`);
            setShowAdminShiftModal(false);
        } catch (err) {
            toast.error(err.message || 'Error al aperturar turno');
        }
    };

    const tabs = [
        { id: 'company', label: 'Empresa & SENIAT', icon: Building2 },
        { id: 'users', label: 'Usuarios & Cajeros', icon: Users },
        { id: 'cajas', label: 'Cajas Registradoras', icon: Monitor },
        { id: 'currency', label: 'Moneda & Tasa BCV', icon: DollarSign },
        { id: 'payments', label: 'Cuentas de Pago', icon: CreditCard },
        { id: 'logistics', label: 'Envíos & Delivery', icon: Truck },
        { id: 'audit', label: 'Auditoría', icon: Shield },
        { id: 'database', label: 'Supabase & Cloud', icon: Database },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Store className="w-7 h-7 text-blue-600" />
                        Configuración del Sistema
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Ajusta los datos de facturación venezolana, tasas de cambio del BCV, cuentas bancarias y envíos.
                    </p>
                </div>
                {activeTab !== 'audit' && (
                    <Button variant="primary" onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto gap-1 scrollbar-none no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                                isActive
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab 1: Datos de la Empresa / SENIAT */}
            {activeTab === 'company' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            Identificación Fiscal (SENIAT)
                        </h2>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre Comercial de la Tienda</label>
                            <Input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="Ej: UrbanStep Venezuela" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Razón Social Legal</label>
                            <Input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} placeholder="Ej: UrbanStep Calzados C.A." />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Registro de Información Fiscal (RIF)</label>
                            <Input value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} placeholder="Ej: J-50123456-7" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Dirección Fiscal Completa</label>
                            <textarea value={form.fiscalAddress} onChange={(e) => setForm({ ...form, fiscalAddress: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Avenida, Centro Comercial, Local, Ciudad, Estado" />
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-indigo-600" />
                            Contacto & Formato de Comprobante
                        </h2>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Teléfono Principal de la Tienda</label>
                            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+58 212-951-4000 o 0414-1234567" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico de Contacto</label>
                            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contacto@urbanstep.com.ve" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nota al Pie del Ticket Térmico</label>
                            <textarea value={form.ticketFooter} onChange={(e) => setForm({ ...form, ticketFooter: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Condiciones de cambio, garantía de calzado o agradecimiento" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Tab: Usuarios & Asignación de Cajeros */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-6 h-6 text-blue-600" />
                                Gestión de Usuarios del Sistema y Cajeros
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Crea cuentas para cajeros y supervisores, asigna sus cajas registradoras y apertura turnos directamente como administrador.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => handleOpenAdminShiftModal()}
                                className="flex items-center gap-1.5 shadow-sm border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            >
                                <PlayCircle className="w-4 h-4 text-emerald-600" />
                                Aperturar Caja como Admin
                            </Button>
                            <Button variant="primary" onClick={handleOpenCreateUser} className="flex items-center gap-1.5 shadow-md">
                                <Plus className="w-4 h-4" />
                                Nuevo Usuario
                            </Button>
                        </div>
                    </div>

                    {/* Active shift banner if open */}
                    {activeShift && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black">
                                    ✓
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">Turno de Caja Activo y Operando</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold uppercase tracking-wider">
                                            {activeShift.cajaName}
                                        </span>
                                    </div>
                                    <p className="text-xs text-emerald-100 mt-0.5">
                                        Cajero en Mostrador: <strong className="text-white">{activeShift.cashierName}</strong> · Fondo Inicial: <strong>${activeShift.initialCashUsd}</strong> / <strong>{formatBs(activeShift.initialCashBs)}</strong> · Aperturado a las {new Date(activeShift.openedAt).toLocaleTimeString('es-VE')}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                onClick={async () => {
                                    if (window.confirm(`¿Deseas cerrar el turno actual de ${activeShift.cajaName}?`)) {
                                        await closeShift({ closedAt: new Date().toISOString() });
                                        toast.success('Turno de caja cerrado');
                                    }
                                }}
                                className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs shrink-0"
                            >
                                Cerrar Turno
                            </Button>
                        </div>
                    )}

                    {/* KPI mini-cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <Card className="p-3.5">
                            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Total Cuentas</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{users.length}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">En base de datos</p>
                        </Card>
                        <Card className="p-3.5 border-l-4 border-l-emerald-500">
                            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Cajeros de Tienda</p>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                {users.filter(u => u.role === 'Cajero').length}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Asignados a terminal</p>
                        </Card>
                        <Card className="p-3.5 border-l-4 border-l-blue-500">
                            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Supervisores</p>
                            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                                {users.filter(u => u.role === 'Supervisor').length}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Auditoría & Cortes</p>
                        </Card>
                        <Card className="p-3.5 border-l-4 border-l-purple-500">
                            <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Administradores</p>
                            <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                                {users.filter(u => u.role === 'Admin').length}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Acceso general</p>
                        </Card>
                        <Card className="p-3.5 border-l-4 border-l-cyan-500">
                            <p className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">Clientes Ecommerce</p>
                            <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                                {users.filter(u => u.role === 'Cliente').length}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Desde la landing</p>
                        </Card>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'Admin', label: '👑 Admins' },
                                { id: 'Cajero', label: '⚡ Cajeros' },
                                { id: 'Supervisor', label: '💼 Supervisores' },
                                { id: 'Cliente', label: '🛍️ Clientes' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    type="button"
                                    onClick={() => setUserRoleFilter(filter.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        userRoleFilter === filter.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative min-w-[220px]">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                placeholder="Buscar usuario, correo o caja..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Users Table */}
                    <Card className="overflow-hidden border border-gray-200 dark:border-gray-800">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3.5">Usuario / Personal</th>
                                        <th className="px-5 py-3.5">Correo / Acceso</th>
                                        <th className="px-5 py-3.5">Rol de Sistema</th>
                                        <th className="px-5 py-3.5">Caja / Terminal</th>
                                        <th className="px-5 py-3.5">Estado</th>
                                        <th className="px-5 py-3.5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {users
                                        .filter(u => {
                                            const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                                            const q = userSearch.toLowerCase().trim();
                                            const matchSearch = !q || (
                                                u.name.toLowerCase().includes(q) ||
                                                u.email.toLowerCase().includes(q) ||
                                                (u.assignedCaja && u.assignedCaja.toLowerCase().includes(q)) ||
                                                (u.role && u.role.toLowerCase().includes(q))
                                            );
                                            return matchRole && matchSearch;
                                        })
                                        .map((u) => {
                                        const isCurrentUser = user?.id === u.id || user?.email === u.email;
                                        const roleColors = {
                                            Admin: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200',
                                            Supervisor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200',
                                            Cajero: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200',
                                            Cliente: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200',
                                        };

                                        return (
                                            <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center text-sm border border-blue-200 dark:border-blue-800">
                                                            {u.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                {u.name}
                                                                {isCurrentUser && (
                                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Tú</span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-gray-400">{u.branch || 'Sede Principal'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{u.email}</span>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                                                        <Store className="w-3.5 h-3.5 text-gray-400" />
                                                        {u.role === 'Cliente' ? (
                                                            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">🛍️ Tienda Online</span>
                                                        ) : (
                                                            u.assignedCaja || (u.role === 'Cajero' ? <span className="text-amber-500 font-bold">¡Asignar Caja!</span> : 'Sin caja fija')
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <Badge variant={u.active ? 'success' : 'default'} className="text-[11px]">
                                                        {u.active ? 'Habilitado' : 'Deshabilitado'}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {u.role === 'Cajero' && u.active && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenAdminShiftModal(null, u.id)}
                                                                className="px-2.5 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 rounded-lg flex items-center gap-1 transition-colors"
                                                                title="Aperturar turno para este cajero"
                                                            >
                                                                <PlayCircle className="w-3.5 h-3.5" />
                                                                Aperturar Caja
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleUserActive(u.id)}
                                                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                                                u.active
                                                                    ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                                                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                                            }`}
                                                        >
                                                            {u.active ? 'Deshabilitar' : 'Habilitar'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditUser(u)}
                                                            className="px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                                        >
                                                            Editar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Tab: Cajas Registradoras & Seguridad de Claves */}
            {activeTab === 'cajas' && (
                <div className="space-y-6">
                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Monitor className="w-6 h-6 text-blue-600" />
                                Gestión de Cajas Registradoras y Claves
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Crea más cajas para tu tienda, asigna claves/PINes de acceso de 4 dígitos y apertura turnos de mostrador.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => handleOpenAdminShiftModal()}
                                className="flex items-center gap-1.5 shadow-sm border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            >
                                <PlayCircle className="w-4 h-4 text-emerald-600" />
                                Aperturar Caja (Admin)
                            </Button>
                            <Button variant="primary" onClick={handleOpenCreateCaja} className="flex items-center gap-1.5 shadow-md">
                                <Plus className="w-4 h-4" />
                                Nueva Caja
                            </Button>
                        </div>
                    </div>

                    {/* KPI mini-cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-4">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total de Cajas</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{cajas.length}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Terminales registrados</p>
                        </Card>
                        <Card className="p-4">
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Cajas Habilitadas</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                {cajas.filter(c => c.active).length}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Listas para abrir turno</p>
                        </Card>
                        <Card className="p-4">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Turno en Sesión</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 truncate">
                                {activeShift ? `${activeShift.cajaName} (${activeShift.cashierName})` : 'Ningún turno abierto'}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                {activeShift ? 'Estado: Operando ✓' : 'Todos los terminales en espera'}
                            </p>
                        </Card>
                    </div>

                    {/* Cajas Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cajas.map((caja) => {
                            const isShiftActiveHere = activeShift && activeShift.cajaId === caja.id;
                            const isPinRevealed = revealedPins[caja.id];
                            return (
                                <Card key={caja.id} className="p-5 flex flex-col justify-between hover:border-blue-400/50 transition-all shadow-sm">
                                    <div className="space-y-3">
                                        {/* Card Top */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 font-black text-sm flex items-center justify-center border border-blue-200 dark:border-blue-800">
                                                    {caja.name.includes(' ') ? caja.name.split(' ')[1] : caja.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-base text-gray-900 dark:text-white">{caja.name}</h3>
                                                    <p className="text-[10px] font-mono text-gray-400">{caja.id}</p>
                                                </div>
                                            </div>
                                            <Badge variant={caja.active ? 'success' : 'default'} className="text-[10px]">
                                                {caja.active ? 'Habilitada' : 'Desactivada'}
                                            </Badge>
                                        </div>

                                        {/* Location */}
                                        <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                                            <Store className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="truncate">{caja.location || 'Ubicación General'}</span>
                                        </div>

                                        {/* Shift Indicator */}
                                        <div className="flex items-center justify-between text-xs pt-1">
                                            <span className="text-gray-500">Estado de Turno:</span>
                                            {isShiftActiveHere ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                    Turno Abierto
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-gray-400">Sin turno activo</span>
                                            )}
                                        </div>

                                        {/* Clave / PIN container */}
                                        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                                    <Key className="w-3.5 h-3.5" />
                                                    Clave / PIN de Seguridad
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRevealPin(caja.id)}
                                                    className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs"
                                                    title={isPinRevealed ? 'Ocultar PIN' : 'Ver PIN'}
                                                >
                                                    {isPinRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-base font-black tracking-widest text-amber-900 dark:text-amber-200">
                                                    {isPinRevealed ? caja.pin : '••••'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenChangePin(caja)}
                                                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    Cambiar Clave
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleCajaActive(caja.id)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                                caja.active
                                                    ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                            }`}
                                        >
                                            {caja.active ? 'Desactivar' : 'Habilitar'}
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {caja.active && !isShiftActiveHere && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenAdminShiftModal(caja.id)}
                                                    className="px-2.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <PlayCircle className="w-3.5 h-3.5" />
                                                    Aperturar
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditCaja(caja)}
                                                className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCaja(caja.id)}
                                                className="p-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                                title="Eliminar caja"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tab 2: Moneda & Tasa BCV */}
            {activeTab === 'currency' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                                Tasa Oficial del Banco Central (BCV)
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Esta tasa rige todas las conversiones de precios, cálculo del Punto de Venta y emisión de comprobantes en Bolívares.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-blue-200">Tasa Activa en el Sistema</p>
                                    <p className="text-3xl font-extrabold mt-1">
                                        {formatBs(rate)} <span className="text-sm font-normal text-blue-200">/ USD</span>
                                    </p>
                                </div>
                                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">Oficial BCV</span>
                            </div>
                            <p className="text-xs text-blue-100 mt-3">Última actualización: {new Date(lastUpdated).toLocaleString('es-VE')}</p>
                        </div>
                        <form onSubmit={handleUpdateRate} className="space-y-3">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Modificar Tasa Manualmente (Bs./USD)</label>
                            <div className="flex gap-2">
                                <Input type="number" step="0.01" value={manualRateInput} onChange={(e) => setManualRateInput(e.target.value)} placeholder="42.50" className="flex-1" />
                                <Button type="submit" variant="primary">Aplicar</Button>
                            </div>
                        </form>
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                            <Button variant="secondary" onClick={handleRefreshLiveRate} disabled={isRefreshing} className="w-full flex items-center justify-center gap-2">
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? 'Consultando BCV...' : 'Consultar Tasa Oficial en Vivo (DolarAPI)'}
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-amber-500" />
                            Impuestos Comerciales (Venezuela)
                        </h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">IVA General (16%)</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Impuesto al Valor Agregado establecido por el SENIAT</p>
                                    </div>
                                    <Badge variant="primary" className="text-sm">16.00%</Badge>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">IGTF Divisas (3%)</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Impuesto a Grandes Transacciones Financieras sobre pagos en dólares en efectivo o Zelle</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={form.igtfActive} onChange={(e) => setForm({ ...form, igtfActive: e.target.checked })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Tab 3: Cuentas y Métodos de Pago */}
            {activeTab === 'payments' && (
                <div className="space-y-6">
                    {/* Header bar with Stats & Add Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50/60 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800">
                        <div>
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Métodos de Pago del Sistema
                                </h2>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Administra las pasarelas, cuentas receptoras y métodos disponibles para cobro en POS y tienda online.
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleOpenCreatePaymentMethod}
                            className="flex items-center gap-2 shadow-md shadow-blue-500/20 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Método de Pago
                        </Button>
                    </div>

                    {/* Quick KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Card className="p-3.5">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Métodos</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{paymentMethods.length}</p>
                        </Card>
                        <Card className="p-3.5">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Habilitados</p>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {paymentMethods.filter(m => m.active).length}
                            </p>
                        </Card>
                        <Card className="p-3.5">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Moneda USD ($)</p>
                            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                                {paymentMethods.filter(m => m.currency === 'USD').length}
                            </p>
                        </Card>
                        <Card className="p-3.5">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Moneda Bs. (VES)</p>
                            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                                {paymentMethods.filter(m => m.currency === 'VES').length}
                            </p>
                        </Card>
                    </div>

                    {/* Payment Methods Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paymentMethods.map((pm) => {
                            const isUsd = pm.currency === 'USD';
                            const isMobile = pm.type === 'movil';
                            const isCard = pm.type === 'tarjeta';
                            const isCash = pm.type === 'efectivo';
                            const isDigital = pm.type === 'digital';

                            return (
                                <Card
                                    key={pm.id}
                                    className={`p-5 flex flex-col justify-between transition-all border ${
                                        pm.active
                                            ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm'
                                            : 'border-gray-200/60 dark:border-gray-800/50 bg-gray-50/60 dark:bg-gray-900/40 opacity-75'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        {/* Card Top: Type Icon, Label & Status Badge */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                    isUsd
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                                                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-200 dark:border-blue-800'
                                                }`}>
                                                    {isMobile ? <Smartphone className="w-4 h-4" /> :
                                                     isCard ? <CreditCard className="w-4 h-4" /> :
                                                     isCash ? (isUsd ? <DollarSign className="w-4 h-4" /> : <Coins className="w-4 h-4" />) :
                                                     isDigital ? <Building2 className="w-4 h-4" /> :
                                                     <CreditCard className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                                                        {pm.label}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded ${
                                                            isUsd 
                                                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                                                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                                        }`}>
                                                            {pm.currency}
                                                        </span>
                                                        {pm.isCustom && (
                                                            <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.2 rounded border border-purple-200/50 dark:border-purple-800/50">
                                                                Personalizado
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Active Switch */}
                                            <button
                                                type="button"
                                                onClick={() => handleTogglePaymentMethod(pm.id)}
                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                    pm.active ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                                                }`}
                                                title={pm.active ? 'Desactivar método' : 'Habilitar método'}
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                        pm.active ? 'translate-x-4' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Method Specific Details */}
                                        <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50/70 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 font-mono">
                                            {pm.bank && (
                                                <p className="truncate">
                                                    <span className="text-gray-400 font-sans text-[10px] block">Banco / Plataforma:</span>
                                                    <strong>{pm.bank}</strong>
                                                </p>
                                            )}
                                            {pm.phone && (
                                                <p>
                                                    <span className="text-gray-400 font-sans text-[10px] block">Teléfono:</span>
                                                    <strong>{pm.phone}</strong>
                                                </p>
                                            )}
                                            {pm.rif && (
                                                <p>
                                                    <span className="text-gray-400 font-sans text-[10px] block">RIF / Cédula:</span>
                                                    <strong>{pm.rif}</strong>
                                                </p>
                                            )}
                                            {pm.email && (
                                                <p className="truncate">
                                                    <span className="text-gray-400 font-sans text-[10px] block">Correo / Cuenta:</span>
                                                    <strong>{pm.email}</strong>
                                                </p>
                                            )}
                                            {pm.account && (
                                                <p className="truncate">
                                                    <span className="text-gray-400 font-sans text-[10px] block">N° de Cuenta:</span>
                                                    <strong>{pm.account}</strong>
                                                </p>
                                            )}
                                            {pm.holder && (
                                                <p className="truncate">
                                                    <span className="text-gray-400 font-sans text-[10px] block">Titular:</span>
                                                    <strong>{pm.holder}</strong>
                                                </p>
                                            )}
                                            {pm.instructions && (
                                                <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-gray-700/50 line-clamp-2">
                                                    {pm.instructions}
                                                </p>
                                            )}
                                        </div>

                                        {/* Reference requirement badge */}
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-400">Comprobante:</span>
                                            {pm.requiresReference ? (
                                                <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Requiere N° Referencia
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-medium">
                                                    Sin referencia previa
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditPaymentMethod(pm)}
                                            className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Editar
                                        </button>

                                        {pm.isCustom && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePaymentMethod(pm.id, pm.label)}
                                                className="p-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                                                title="Eliminar método de pago"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tab 4: Envíos & Delivery */}
            {activeTab === 'logistics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 space-y-4">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-600" />
                            Agencias de Encomiendas Nacionales
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Habilita las opciones de envío disponibles en el cobro del POS y pedidos web.</p>
                        <div className="space-y-2">
                            {SHIPPING_CARRIERS.map((carrier) => (
                                <div key={carrier.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{carrier.name}</p>
                                        <p className="text-xs text-gray-500">Tiempo estimado: {carrier.estimatedTime}</p>
                                    </div>
                                    <Badge variant="success">Habilitado</Badge>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card className="p-6 space-y-4">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Delivery Motorizado Local</h2>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tarifa Plana de Delivery en la Ciudad ($ USD)</label>
                            <Input type="number" step="0.5" value={form.localDeliveryCost} onChange={(e) => setForm({ ...form, localDeliveryCost: parseFloat(e.target.value) || 0 })} placeholder="3.50" />
                            <p className="text-xs text-gray-500 mt-1">Equivalente actual: {formatBs((form.localDeliveryCost || 0) * rate)}</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* Tab 5: AUDITORÍA */}
            {activeTab === 'audit' && (
                <div className="space-y-6">
                    {/* Audit KPIs */}
                    {auditSummary && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Total Registros</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{auditSummary.totalLogs}</p>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Acciones Hoy</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{auditSummary.todayCount}</p>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Esta Semana</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{auditSummary.weekCount}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Audit Filters & Actions */}
                    <Card className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar en registros de auditoría..."
                                    value={auditSearch}
                                    onChange={(e) => setAuditSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                            <select
                                value={auditModuleFilter}
                                onChange={(e) => setAuditModuleFilter(e.target.value)}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Todos los módulos</option>
                                <option value="auth">🔐 Autenticación</option>
                                <option value="sales">💰 Ventas</option>
                                <option value="products">📦 Productos</option>
                                <option value="customers">👥 Clientes</option>
                                <option value="inventory">📋 Inventario</option>
                                <option value="shifts">🕐 Turnos</option>
                                <option value="delivery">🚚 Delivery</option>
                                <option value="settings">⚙️ Configuración</option>
                            </select>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={handleGenerateDemoAudit} className="text-xs flex items-center gap-1">
                                    <Activity className="w-3.5 h-3.5" />
                                    Demo
                                </Button>
                                <Button variant="secondary" onClick={handleClearAudit} className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Limpiar
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Audit Activity by Module */}
                    {auditSummary && auditSummary.byModule.length > 0 && (
                        <Card className="p-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" />
                                Actividad por Módulo (Últimos 7 días)
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {auditSummary.byModule.slice(0, 8).map(([mod, count]) => (
                                    <div key={mod} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                                        <span className="text-sm">{MODULE_ICONS[mod] || '📌'}</span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white capitalize truncate">{mod}</p>
                                            <p className="text-[10px] text-gray-500">{count} acciones</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Audit Logs Table */}
                    <Card padding={false}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Fecha/Hora</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Usuario</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Módulo</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-gray-900 dark:text-white font-mono">
                                                    {new Date(log.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 text-[10px] font-bold">
                                                        {(log.userName || 'S').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-gray-900 dark:text-white">{log.userName}</p>
                                                        <p className="text-[10px] text-gray-500">{log.userRole || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">
                                                    {MODULE_ICONS[log.module] || '📌'} {log.module}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-gray-700 dark:text-gray-300">{log.actionLabel || ACTION_LABELS[log.action] || log.action}</p>
                                                {log.entityId && <p className="text-[10px] text-gray-400 font-mono">{log.entityId}</p>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {auditLogs.length === 0 && (
                            <div className="text-center py-12">
                                <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">No hay registros de auditoría</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Genera datos de demostración o las acciones se registrarán automáticamente</p>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Tab 6: Supabase Cloud & Vercel */}
            {activeTab === 'database' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Database className="w-5 h-5 text-blue-600" />
                            Estado de la Conexión Supabase
                        </h2>
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {isSupabaseConfigured() ? 'Modo Supabase Cloud Conectado' : 'Modo Almacenamiento Local (Local/Demo)'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isSupabaseConfigured()
                                        ? 'Tus datos se sincronizan con la base de datos PostgreSQL de Supabase en tiempo real.'
                                        : 'El sistema funciona de forma autónoma con persistencia local en tu navegador. Puedes conectar Supabase cuando desees.'}
                                </p>
                            </div>
                        </div>
                        <Button variant="secondary" onClick={handleTestSupabase} disabled={testingDb} className="w-full flex items-center justify-center gap-2">
                            <RefreshCw className={`w-4 h-4 ${testingDb ? 'animate-spin' : ''}`} />
                            {testingDb ? 'Verificando...' : 'Probar Conectividad con Supabase'}
                        </Button>
                        {dbStatus && (
                            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${dbStatus.success ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'}`}>
                                {dbStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                                <span>{dbStatus.message}</span>
                            </div>
                        )}
                    </Card>
                    <Card className="p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ExternalLink className="w-5 h-5 text-indigo-600" />
                            Configuración para Vercel & Supabase
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Para pasar a producción en Vercel con base de datos real:</p>
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs font-mono space-y-2">
                            <p className="text-gray-400"># 1. Ejecutar script en Supabase SQL Editor:</p>
                            <div className="flex justify-between items-center bg-gray-800 px-3 py-1.5 rounded">
                                <span>urbanstep/supabase_schema.sql</span>
                                <button onClick={copySchemaInstructions} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                    <Copy className="w-3.5 h-3.5" /> Copiar
                                </button>
                            </div>
                            <p className="text-gray-400 pt-2"># 2. Agregar en Vercel Environment Variables:</p>
                            <p className="text-emerald-400">VITE_SUPABASE_URL=https://tu-id.supabase.co</p>
                            <p className="text-emerald-400">VITE_SUPABASE_ANON_KEY=tu-anon-key</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal: Crear / Editar Caja Registradora */}
            <Modal
                isOpen={showCajaModal}
                onClose={() => setShowCajaModal(false)}
                title={editingCaja ? `Editar Caja: ${editingCaja.name}` : '➕ Crear Nueva Caja Registradora'}
                size="md"
            >
                <form onSubmit={handleSaveCaja} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Nombre de la Caja
                        </label>
                        <Input
                            type="text"
                            value={cajaForm.name}
                            onChange={(e) => setCajaForm({ ...cajaForm, name: e.target.value })}
                            placeholder="Ej: Caja 4, Caja Express, Caja Piso 2"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Ubicación en la Tienda
                        </label>
                        <Input
                            type="text"
                            value={cajaForm.location}
                            onChange={(e) => setCajaForm({ ...cajaForm, location: e.target.value })}
                            placeholder="Ej: Planta Baja - Lateral Este, Piso 1 - Zona Deportiva"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                            <span>Clave / PIN de Seguridad de Apertura (4-6 dígitos)</span>
                            <span className="text-[10px] text-gray-400">Solo números</span>
                        </label>
                        <Input
                            type="password"
                            maxLength={6}
                            value={cajaForm.pin}
                            onChange={(e) => setCajaForm({ ...cajaForm, pin: e.target.value.replace(/\D/g, '') })}
                            placeholder="1234"
                            className="font-mono text-center tracking-[0.4em] text-lg font-bold"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="cajaActiveCheckbox"
                            checked={cajaForm.active}
                            onChange={(e) => setCajaForm({ ...cajaForm, active: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="cajaActiveCheckbox" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            Caja habilitada para operaciones de cobro y apertura de turnos
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button type="button" variant="secondary" onClick={() => setShowCajaModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingCaja ? 'Actualizar Caja' : 'Crear Caja'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Asignar / Cambiar Clave PIN */}
            <Modal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                title={`🔑 Asignar Clave / PIN - ${targetCajaForPin?.name || 'Caja'}`}
                size="sm"
            >
                <form onSubmit={handleSaveNewPin} className="space-y-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                        <p className="font-bold text-amber-900 dark:text-amber-200">Terminal: {targetCajaForPin?.name}</p>
                        <p className="text-amber-700 dark:text-amber-300">Ubicación: {targetCajaForPin?.location}</p>
                        <p className="text-[11px] text-amber-600/90 dark:text-amber-400">
                            Esta clave será solicitada al cajero para autorizar la apertura del turno de caja y registrar el fondo base.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Nueva Clave / PIN (4 a 6 dígitos)
                        </label>
                        <Input
                            type="password"
                            maxLength={6}
                            value={newPinInput}
                            onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="Ej: 5678"
                            className="font-mono text-center tracking-[0.5em] text-xl font-bold"
                            autoFocus
                            required
                        />
                        <p className="text-[11px] text-gray-400 mt-1 text-center">
                            Ingresa mínimo 4 números para la clave de seguridad
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <Button type="button" variant="secondary" onClick={() => setShowPinModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={newPinInput.length < 4}>
                            Guardar Nueva Clave
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Crear / Editar Usuario */}
            <Modal
                isOpen={showUserModal}
                onClose={() => setShowUserModal(false)}
                title={editingUser ? `Editar Usuario: ${editingUser.name}` : '➕ Crear Nuevo Usuario del Sistema'}
                size="md"
            >
                <form onSubmit={handleSaveUser} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Nombre Completo del Personal
                        </label>
                        <Input
                            type="text"
                            value={userForm.name}
                            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                            placeholder="Ej: Carlos Pérez"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Correo Institucional / Identificador de Login
                        </label>
                        <Input
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            placeholder="cajero1@urbanstep.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Contraseña de Acceso
                        </label>
                        <Input
                            type="password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            placeholder="••••••••"
                            required
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Mínimo 4 caracteres para acceso seguro</p>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Rol en el Sistema
                                </label>
                                <select
                                    value={userForm.role}
                                    onChange={(e) => {
                                        const newRole = e.target.value;
                                        setUserForm({
                                            ...userForm,
                                            role: newRole,
                                            assignedCaja: newRole === 'Cliente' ? 'Tienda Online' : (newRole === 'Cajero' ? (cajas[0]?.name || 'Caja 1') : userForm.assignedCaja)
                                        });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Admin">👑 Administrador (Acceso Total)</option>
                                    <option value="Cajero">⚡ Cajero (Asignado al Módulo de Caja & POS)</option>
                                    <option value="Supervisor">💼 Supervisor (Reportes & Auditoría)</option>
                                    <option value="Cliente">🛍️ Cliente (Experiencia Ecommerce Online)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    {userForm.role === 'Cajero' ? 'Caja Asignada (Obligatoria)' : 'Terminal / Ubicación'}
                                </label>
                                {userForm.role === 'Cliente' ? (
                                    <input
                                        type="text"
                                        disabled
                                        value="Tienda Online / Ecommerce"
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-100 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed"
                                    />
                                ) : (
                                    <select
                                        value={userForm.assignedCaja}
                                        onChange={(e) => setUserForm({ ...userForm, assignedCaja: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 ${
                                            userForm.role === 'Cajero' && !userForm.assignedCaja
                                                ? 'border-amber-400 ring-2 ring-amber-400/20'
                                                : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500'
                                        }`}
                                    >
                                        <option value="">{userForm.role === 'Cajero' ? '-- Selecciona una caja obligatoria --' : 'Sin caja fija'}</option>
                                        {cajas.map((c) => (
                                            <option key={c.id} value={c.name}>{c.name} ({c.location})</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Callout de asistencia según rol */}
                        {userForm.role === 'Cajero' && (
                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <span>⚡ Asignación de Caja Registradora Requerida</span>
                                </p>
                                <p>
                                    Este usuario será asignado al módulo de caja registradora (<strong>/cashier</strong>) para apertura de turnos, cobros multimoneda ($/Bs) y facturación fiscal en el terminal seleccionado.
                                </p>
                            </div>
                        )}

                        {userForm.role === 'Cliente' && (
                            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-800 dark:text-cyan-300 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <span>🛍️ Experiencia Exclusiva de Cliente Ecommerce</span>
                                </p>
                                <p>
                                    Los clientes disfrutan de la tienda virtual desde la landing: catálogo exclusivo, carrito de compras, gestión de perfil y pedidos con delivery geolocalizado en el Estado Lara. No tienen acceso al sistema interno.
                                </p>
                            </div>
                        )}

                        {userForm.role === 'Admin' && (
                            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-300">
                                <strong>👑 Acceso Total:</strong> Administración de productos, finanzas, usuarios, apertura de cajas y libros de venta fiscal SENIAT.
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Sucursal / Sede
                        </label>
                        <Input
                            type="text"
                            value={userForm.branch}
                            onChange={(e) => setUserForm({ ...userForm, branch: e.target.value })}
                            placeholder="Sede Principal - Barquisimeto"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="userActiveCheckbox"
                            checked={userForm.active}
                            onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="userActiveCheckbox" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            Usuario habilitado para iniciar sesión en el sistema
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button type="button" variant="secondary" onClick={() => setShowUserModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Aperturar Turno de Caja por Administrador */}
            <Modal
                isOpen={showAdminShiftModal}
                onClose={() => setShowAdminShiftModal(false)}
                title="⚡ Aperturar Caja Registradora (Administrador)"
                size="md"
            >
                <form onSubmit={handleSaveAdminShift} className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 text-xs space-y-1">
                        <p className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-blue-600" />
                            Autorización Oficial de Apertura de Caja
                        </p>
                        <p className="text-blue-700 dark:text-blue-300">
                            Como Administrador, puedes autorizar la apertura de una caja física, designar al cajero que la operará y dotarlo con el fondo inicial de sencillo en USD y Bolívares.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Seleccionar Caja Registradora
                        </label>
                        <select
                            value={adminShiftForm.cajaId}
                            onChange={(e) => setAdminShiftForm({ ...adminShiftForm, cajaId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">-- Selecciona una caja --</option>
                            {cajas.filter(c => c.active).map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} — {c.location} {activeShift?.cajaId === c.id ? '(Turno ya abierto)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Asignar Cajero Operador
                        </label>
                        <select
                            value={adminShiftForm.cashierId}
                            onChange={(e) => setAdminShiftForm({ ...adminShiftForm, cashierId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">-- Selecciona el cajero --</option>
                            {users.filter(u => u.active).map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.role}) — {u.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Fondo Base Efectivo ($ USD)
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={adminShiftForm.initialCashUsd}
                                onChange={(e) => setAdminShiftForm({ ...adminShiftForm, initialCashUsd: e.target.value })}
                                placeholder="50.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Fondo Base Efectivo (Bs.)
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={adminShiftForm.initialCashBs}
                                onChange={(e) => setAdminShiftForm({ ...adminShiftForm, initialCashBs: e.target.value })}
                                placeholder="2000.00"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Observaciones de Apertura
                        </label>
                        <Input
                            type="text"
                            value={adminShiftForm.notes}
                            onChange={(e) => setAdminShiftForm({ ...adminShiftForm, notes: e.target.value })}
                            placeholder="Fondo entregado en billetes de baja denominación..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button type="button" variant="secondary" onClick={() => setShowAdminShiftModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5">
                            <PlayCircle className="w-4 h-4" />
                            Aperturar Turno de Caja
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal para Crear/Editar Método de Pago */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title={editingPaymentMethod ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
                size="md"
            >
                <form onSubmit={handleSavePaymentMethod} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Nombre del Método de Pago *
                        </label>
                        <Input
                            value={paymentMethodForm.label}
                            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, label: e.target.value })}
                            placeholder="Ej: Binance Pay USDT, Zinli, Wally, Banesco Panamá..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Moneda de Cobro
                            </label>
                            <select
                                value={paymentMethodForm.currency}
                                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, currency: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white font-bold"
                            >
                                <option value="USD">Dólares ($ USD)</option>
                                <option value="VES">Bolívares (Bs. VES)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Tipo de Operación
                            </label>
                            <select
                                value={paymentMethodForm.type}
                                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white"
                            >
                                <option value="digital">Billetera Digital / Cripto</option>
                                <option value="movil">Pago Móvil</option>
                                <option value="tarjeta">Punto / Tarjeta de Débito</option>
                                <option value="banco">Transferencia Bancaria</option>
                                <option value="efectivo">Efectivo en Tienda</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Banco, Entidad o Red (Opcional)
                        </label>
                        <Input
                            value={paymentMethodForm.bank}
                            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, bank: e.target.value })}
                            placeholder="Ej: Banesco, Mercantil, Red TRC20, Binance Pay ID..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Teléfono / Pay ID
                            </label>
                            <Input
                                value={paymentMethodForm.phone}
                                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, phone: e.target.value })}
                                placeholder="0414-1234567 o Pay ID"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Cédula o RIF Titular
                            </label>
                            <Input
                                value={paymentMethodForm.rif}
                                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, rif: e.target.value })}
                                placeholder="J-50123456-7 o V-12345678"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Correo Electrónico
                            </label>
                            <Input
                                type="email"
                                value={paymentMethodForm.email}
                                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, email: e.target.value })}
                                placeholder="pagos@tuempresa.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Nombre del Titular
                            </label>
                            <Input
                                value={paymentMethodForm.holder}
                                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, holder: e.target.value })}
                                placeholder="UrbanStep C.A."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Número de Cuenta o Wallet
                        </label>
                        <Input
                            value={paymentMethodForm.account}
                            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, account: e.target.value })}
                            placeholder="0134-XXXX-XX-XXXXXXXXXX o Dirección Wallet"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Instrucciones para el Cajero o Cliente
                        </label>
                        <Input
                            value={paymentMethodForm.instructions}
                            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, instructions: e.target.value })}
                            placeholder="Ej: Solicitar captura de pantalla y confirmar en la app antes de emitir factura"
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">Exigir N° de Referencia Bancaria</p>
                            <p className="text-[11px] text-gray-400">Obliga al cajero a escribir la referencia antes de confirmar</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={paymentMethodForm.requiresReference}
                            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, requiresReference: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">Habilitado para uso inmediato</p>
                            <p className="text-[11px] text-gray-400">Aparecerá en la pantalla de cobro del POS y terminal de caja</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={paymentMethodForm.active}
                            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, active: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingPaymentMethod ? 'Guardar Cambios' : 'Registrar Método'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
