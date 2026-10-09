import React, { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { purchaseService } from '../services/purchaseService';
import { productService } from '../services/productService';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    Truck, 
    Plus, 
    Search, 
    Building2, 
    FileText, 
    DollarSign, 
    Package, 
    Calendar, 
    Receipt, 
    User, 
    Phone, 
    Mail, 
    MapPin, 
    CheckCircle2, 
    Clock, 
    Layers,
    Trash2,
    Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Purchases() {
    const { rate, formatBs } = useCurrency();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' | 'suppliers'
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchPurchase, setSearchPurchase] = useState('');
    const [searchSupplier, setSearchSupplier] = useState('');

    // Purchase Modal
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [purchaseForm, setPurchaseForm] = useState({
        supplierId: '',
        invoiceNumber: '',
        controlNumber: '',
        notes: '',
        items: []
    });
    const [newItemRow, setNewItemRow] = useState({
        productId: '',
        size: '41',
        quantity: '5',
        unitCostUsd: '65'
    });

    // Supplier Modal
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [supplierForm, setSupplierForm] = useState({
        rif: '',
        companyName: '',
        commercialName: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        city: 'Caracas',
        creditDays: '15'
    });

    // View Purchase Detail Modal
    const [selectedPurchase, setSelectedPurchase] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [pList, sList, prodList] = await Promise.all([
                purchaseService.getAll(),
                purchaseService.getSuppliers(),
                productService.getAll()
            ]);
            setPurchases(pList || []);
            setSuppliers(sList || []);
            setProducts(prodList || []);
        } catch (err) {
            console.error('Error cargando compras:', err);
            toast.error('Error al sincronizar compras y proveedores');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const handleSync = () => loadData();
        window.addEventListener('purchases_updated', handleSync);
        window.addEventListener('suppliers_updated', handleSync);
        window.addEventListener('products_updated', handleSync);
        return () => {
            window.removeEventListener('purchases_updated', handleSync);
            window.removeEventListener('suppliers_updated', handleSync);
            window.removeEventListener('products_updated', handleSync);
        };
    }, [loadData]);

    // Handle adding item to purchase draft
    const handleAddItemToDraft = () => {
        if (!newItemRow.productId) {
            toast.error('Selecciona un modelo de calzado');
            return;
        }
        const qty = parseInt(newItemRow.quantity);
        const cost = parseFloat(newItemRow.unitCostUsd);
        if (isNaN(qty) || qty <= 0) {
            toast.error('La cantidad debe ser mayor a 0');
            return;
        }
        if (isNaN(cost) || cost < 0) {
            toast.error('El costo unitario no es válido');
            return;
        }

        const targetProd = products.find(p => p.id === newItemRow.productId);
        if (!targetProd) return;

        const selectedColor = newItemRow.color || targetProd.color || (targetProd.colors && targetProd.colors[0]) || 'Negro';

        setPurchaseForm(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    productId: targetProd.id,
                    name: targetProd.name,
                    brand: targetProd.brand,
                    color: selectedColor,
                    size: newItemRow.size,
                    quantity: qty,
                    unitCostUsd: cost,
                    subtotalUsd: Number((qty * cost).toFixed(2))
                }
            ]
        }));

        setNewItemRow(prev => ({
            ...prev,
            quantity: '5'
        }));
    };

    const handleRemoveItemFromDraft = (index) => {
        setPurchaseForm(prev => ({
            ...prev,
            items: prev.items.filter((_, idx) => idx !== index)
        }));
    };

    // Calculate totals for purchase draft
    const draftSubtotal = purchaseForm.items.reduce((sum, i) => sum + i.subtotalUsd, 0);
    const draftTax = draftSubtotal * 0.16; // 16% IVA
    const draftTotalUsd = draftSubtotal + draftTax;
    const draftTotalBs = draftTotalUsd * rate;

    // Save purchase order
    const handleSavePurchase = async (e) => {
        if (e) e.preventDefault();
        if (!purchaseForm.supplierId) {
            toast.error('Selecciona el proveedor de la compra');
            return;
        }
        if (purchaseForm.items.length === 0) {
            toast.error('Agrega al menos un artículo a la orden de compra');
            return;
        }

        const targetSupplier = suppliers.find(s => s.id === purchaseForm.supplierId);

        try {
            await purchaseService.create({
                supplierId: purchaseForm.supplierId,
                supplierName: targetSupplier?.name || targetSupplier?.companyName || 'Proveedor',
                supplierRif: targetSupplier?.rif || 'J-00000000-0',
                invoiceNumber: purchaseForm.invoiceNumber || `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                controlNumber: purchaseForm.controlNumber || `00-${Math.floor(10000 + Math.random() * 90000)}`,
                subtotalUsd: draftSubtotal,
                taxUsd: draftTax,
                totalUsd: draftTotalUsd,
                bcvRate: rate,
                items: purchaseForm.items,
                receivedBy: user?.name || 'Administrador',
                notes: purchaseForm.notes,
                status: 'recibido'
            });

            toast.success('¡Mercancía recibida e inventario actualizado exitosamente!');
            setShowPurchaseModal(false);
            setPurchaseForm({ supplierId: '', invoiceNumber: '', controlNumber: '', notes: '', items: [] });
            await loadData();
        } catch (err) {
            toast.error('Error al registrar compra: ' + err.message);
        }
    };

    // Save supplier
    const handleSaveSupplier = async (e) => {
        if (e) e.preventDefault();
        if (!supplierForm.rif.trim() || !supplierForm.companyName.trim()) {
            toast.error('El RIF y la Razón Social son campos requeridos');
            return;
        }

        try {
            if (editingSupplier) {
                await purchaseService.updateSupplier(editingSupplier.id, supplierForm);
                toast.success('Proveedor actualizado');
            } else {
                await purchaseService.createSupplier(supplierForm);
                toast.success('Proveedor registrado en el sistema');
            }
            setShowSupplierModal(false);
            setEditingSupplier(null);
            setSupplierForm({ rif: '', companyName: '', commercialName: '', contactName: '', phone: '', email: '', address: '', city: 'Caracas', creditDays: '15' });
            await loadData();
        } catch (err) {
            toast.error('Error al guardar proveedor: ' + err.message);
        }
    };

    // Total stats
    const totalPurchasedUsd = purchases.reduce((s, p) => s + (p.totalUsd || 0), 0);
    const totalUnitsReceived = purchases.reduce((s, p) => s + (p.itemsCount || 0), 0);

    const filteredPurchases = purchases.filter(p => {
        const q = searchPurchase.toLowerCase().trim();
        if (!q) return true;
        return (
            (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
            (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
            (p.controlNumber && p.controlNumber.toLowerCase().includes(q))
        );
    });

    const filteredSuppliers = suppliers.filter(s => {
        const q = searchSupplier.toLowerCase().trim();
        if (!q) return true;
        return (
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.companyName && s.companyName.toLowerCase().includes(q)) ||
            (s.rif && s.rif.toLowerCase().includes(q)) ||
            (s.phone && s.phone.toLowerCase().includes(q))
        );
    });

    if (loading && purchases.length === 0 && suppliers.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Truck className="w-7 h-7 text-blue-600" />
                        Compras a Proveedores & Recepción de Stock
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Control de compras SENIAT (Factura & Control), reabastecimiento directo de calzado y directorio de distribuidores.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === 'purchases' ? (
                        <Button 
                            variant="primary" 
                            onClick={() => {
                                setPurchaseForm({
                                    supplierId: suppliers[0]?.id || '',
                                    invoiceNumber: `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                                    controlNumber: `00-${Math.floor(10000 + Math.random() * 90000)}`,
                                    notes: '',
                                    items: []
                                });
                                setNewItemRow({
                                    productId: products[0]?.id || '',
                                    size: '41',
                                    quantity: '5',
                                    unitCostUsd: String(products[0]?.cost || 65)
                                });
                                setShowPurchaseModal(true);
                            }}
                            className="flex items-center gap-2 shadow-md"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Orden de Compra
                        </Button>
                    ) : (
                        <Button 
                            variant="primary" 
                            onClick={() => {
                                setEditingSupplier(null);
                                setSupplierForm({
                                    rif: 'J-',
                                    companyName: '',
                                    commercialName: '',
                                    contactName: '',
                                    phone: '',
                                    email: '',
                                    address: '',
                                    city: 'Caracas',
                                    creditDays: '15'
                                });
                                setShowSupplierModal(true);
                            }}
                            className="flex items-center gap-2 shadow-md"
                        >
                            <Plus className="w-4 h-4" />
                            Registrar Proveedor
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Compras Facturadas</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">${totalPurchasedUsd.toFixed(2)}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 font-bold">{formatBs(totalPurchasedUsd * rate)}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Órdenes Realizadas</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{purchases.length}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Historial contable SENIAT</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Pares / Unidades Ingresadas</p>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{totalUnitsReceived}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Ingresadas directamente al inventario</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Proveedores Activos</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{suppliers.length}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Distribuidores registrados</p>
                </Card>
            </div>

            {/* Navigation Tabs (without scrollbars) */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-px scrollbar-none overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveTab('purchases')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'purchases'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <Receipt className="w-4 h-4" />
                    Órdenes de Compra ({purchases.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'suppliers'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <Building2 className="w-4 h-4" />
                    Directorio de Proveedores ({suppliers.length})
                </button>
            </div>

            {/* TAB 1: PURCHASES */}
            {activeTab === 'purchases' && (
                <div className="space-y-4">
                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por N° Factura, Proveedor o N° Control SENIAT..."
                                value={searchPurchase}
                                onChange={(e) => setSearchPurchase(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono shrink-0">
                            Mostrando {filteredPurchases.length} de {purchases.length} compras
                        </p>
                    </div>

                    {/* Purchases Table */}
                    <Card padding={false} className="overflow-hidden shadow-sm">
                        <div className="overflow-x-auto scrollbar-none">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">N° Factura / Control</th>
                                        <th className="px-4 py-3">Proveedor</th>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Artículos</th>
                                        <th className="px-4 py-3">Total (USD)</th>
                                        <th className="px-4 py-3">Total (Bs. BCV)</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredPurchases.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                                No se encontraron compras registradas
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPurchases.map((pur) => (
                                            <tr key={pur.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">
                                                    <div>{pur.invoiceNumber}</div>
                                                    <div className="text-[10px] text-gray-400 font-normal">Control: {pur.controlNumber}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-800 dark:text-gray-200">{pur.supplierName}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono">{pur.supplierRif || 'J-RIF'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">
                                                    {new Date(pur.date).toLocaleDateString('es-VE')}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                                                    {pur.itemsCount || pur.items?.length || 1} pares
                                                </td>
                                                <td className="px-4 py-3 font-black text-gray-900 dark:text-white">
                                                    ${(pur.totalUsd || 0).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatBs(pur.totalBs || (pur.totalUsd * rate))}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="success" className="text-[10px]">
                                                        Recibido ✓
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPurchase(pur)}
                                                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Detalles
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 2: SUPPLIERS */}
            {activeTab === 'suppliers' && (
                <div className="space-y-4">
                    {/* Search bar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por Razón Social, RIF, teléfono..."
                                value={searchSupplier}
                                onChange={(e) => setSearchSupplier(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono shrink-0">
                            {filteredSuppliers.length} proveedores registrados
                        </p>
                    </div>

                    {/* Suppliers Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSuppliers.map((sup) => (
                            <Card key={sup.id} className="p-5 flex flex-col justify-between hover:border-blue-400 transition-all shadow-sm">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 font-black text-sm flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                            {sup.creditDays ? `${sup.creditDays} días crédito` : 'Contado'}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{sup.name || sup.companyName}</h3>
                                        <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{sup.rif}</p>
                                    </div>

                                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300 font-medium">
                                        {sup.contactName && (
                                            <p className="flex items-center gap-1.5 truncate">
                                                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span>{sup.contactName}</span>
                                            </p>
                                        )}
                                        {sup.phone && (
                                            <p className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span>{sup.phone}</span>
                                            </p>
                                        )}
                                        {sup.email && (
                                            <p className="flex items-center gap-1.5 truncate">
                                                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span>{sup.email}</span>
                                            </p>
                                        )}
                                        {sup.city && (
                                            <p className="flex items-center gap-1.5 truncate">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span>{sup.city}, {sup.state || 'Venezuela'}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400 font-mono">
                                        ID: {sup.id}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingSupplier(sup);
                                            setSupplierForm({
                                                rif: sup.rif || '',
                                                companyName: sup.name || sup.companyName || '',
                                                commercialName: sup.commercialName || '',
                                                contactName: sup.contactName || '',
                                                phone: sup.phone || '',
                                                email: sup.email || '',
                                                address: sup.address || '',
                                                city: sup.city || 'Caracas',
                                                creditDays: String(sup.creditDays || '15')
                                            });
                                            setShowSupplierModal(true);
                                        }}
                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Editar
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL: NUEVA COMPRA */}
            <Modal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                title="📦 Recepción de Mercancía & Orden de Compra"
                size="lg"
            >
                <form onSubmit={handleSavePurchase} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Proveedor *</label>
                            <select
                                value={purchaseForm.supplierId}
                                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                                required
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 dark:text-white"
                            >
                                <option value="">Seleccione proveedor...</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name || s.companyName} ({s.rif})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">N° Factura del Proveedor *</label>
                            <Input
                                value={purchaseForm.invoiceNumber}
                                onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                                placeholder="FAC-2026-001"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">N° Control SENIAT *</label>
                            <Input
                                value={purchaseForm.controlNumber}
                                onChange={(e) => setPurchaseForm({ ...purchaseForm, controlNumber: e.target.value })}
                                placeholder="00-123456"
                                required
                            />
                        </div>
                    </div>

                    {/* Add Items Box */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                            Agregar Calzado a la Recepción
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Producto / Silueta</label>
                                <select
                                    value={newItemRow.productId}
                                    onChange={(e) => {
                                        const p = products.find(prod => prod.id === e.target.value);
                                        setNewItemRow({
                                            ...newItemRow,
                                            productId: e.target.value,
                                            color: p ? (p.color || (p.colors && p.colors[0]) || 'Negro') : '',
                                            size: (p?.sizes && p.sizes[0]) || '40',
                                            unitCostUsd: p ? String(p.cost || 65) : newItemRow.unitCostUsd
                                        });
                                    }}
                                    className="w-full px-2.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Seleccione modelo...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.brand} {p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Color</label>
                                <select
                                    value={newItemRow.color || ''}
                                    onChange={(e) => setNewItemRow({ ...newItemRow, color: e.target.value })}
                                    className="w-full px-2.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white"
                                >
                                    {(() => {
                                        const p = products.find(prod => prod.id === newItemRow.productId);
                                        const cols = p?.colors && p.colors.length > 0 ? p.colors : [p?.color || 'Negro'];
                                        return cols.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ));
                                    })()}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Talla</label>
                                <select
                                    value={newItemRow.size}
                                    onChange={(e) => setNewItemRow({ ...newItemRow, size: e.target.value })}
                                    className="w-full px-2.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white"
                                >
                                    {(() => {
                                        const p = products.find(prod => prod.id === newItemRow.productId);
                                        const szs = p?.sizes && p.sizes.length > 0 ? p.sizes : ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
                                        return szs.map(sz => (
                                            <option key={sz} value={sz}>Talla {sz}</option>
                                        ));
                                    })()}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Cantidad</label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={newItemRow.quantity}
                                    onChange={(e) => setNewItemRow({ ...newItemRow, quantity: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2">
                            <div className="w-48">
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Costo Unitario ($ USD)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={newItemRow.unitCostUsd}
                                    onChange={(e) => setNewItemRow({ ...newItemRow, unitCostUsd: e.target.value })}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleAddItemToDraft}
                                className="flex items-center gap-1.5 text-xs font-bold"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Agregar Renglón
                            </Button>
                        </div>
                    </div>

                    {/* Items Table in Draft */}
                    {purchaseForm.items.length > 0 && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden text-xs">
                            <table className="w-full">
                                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <th className="p-2 text-left">Modelo</th>
                                        <th className="p-2 text-center">Color</th>
                                        <th className="p-2 text-center">Talla</th>
                                        <th className="p-2 text-center">Cantidad</th>
                                        <th className="p-2 text-right">Costo Unit.</th>
                                        <th className="p-2 text-right">Subtotal</th>
                                        <th className="p-2 text-center">Quitar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {purchaseForm.items.map((it, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2 font-bold">{it.brand} {it.name}</td>
                                            <td className="p-2 text-center font-semibold text-purple-600 dark:text-purple-400">{it.color || 'Negro'}</td>
                                            <td className="p-2 text-center font-mono">{it.size}</td>
                                            <td className="p-2 text-center font-bold text-blue-600">+{it.quantity}</td>
                                            <td className="p-2 text-right">${it.unitCostUsd.toFixed(2)}</td>
                                            <td className="p-2 text-right font-black">${it.subtotalUsd.toFixed(2)}</td>
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItemFromDraft(idx)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Summary Totals */}
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-4 text-white flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-blue-200">Total a Pagar al Proveedor</p>
                            <p className="text-2xl font-black mt-0.5">${draftTotalUsd.toFixed(2)} USD</p>
                            <p className="text-xs font-bold text-emerald-300 font-mono mt-0.5">
                                Equivalente Oficial BCV: {formatBs(draftTotalBs)}
                            </p>
                        </div>
                        <div className="text-right text-xs space-y-0.5 font-mono text-blue-200">
                            <p>Subtotal: ${draftSubtotal.toFixed(2)}</p>
                            <p>IVA SENIAT (16%): ${draftTax.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setShowPurchaseModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Confirmar & Recibir Stock
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: PROVEEDOR */}
            <Modal
                isOpen={showSupplierModal}
                onClose={() => setShowSupplierModal(false)}
                title={editingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
                size="md"
            >
                <form onSubmit={handleSaveSupplier} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">RIF Fiscal *</label>
                            <Input
                                value={supplierForm.rif}
                                onChange={(e) => setSupplierForm({ ...supplierForm, rif: e.target.value })}
                                placeholder="J-31245678-9"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Razón Social *</label>
                            <Input
                                value={supplierForm.companyName}
                                onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
                                placeholder="Distribuidora de Calzados Ávila C.A."
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Persona de Contacto</label>
                            <Input
                                value={supplierForm.contactName}
                                onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })}
                                placeholder="Lic. María Gómez"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                            <Input
                                value={supplierForm.phone}
                                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                                placeholder="+58 212-5551234"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                            <Input
                                type="email"
                                value={supplierForm.email}
                                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                                placeholder="ventas@distribuidora.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Días de Crédito Pactados</label>
                            <Input
                                type="number"
                                min="0"
                                value={supplierForm.creditDays}
                                onChange={(e) => setSupplierForm({ ...supplierForm, creditDays: e.target.value })}
                                placeholder="15"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Dirección / Sede</label>
                        <Input
                            value={supplierForm.address}
                            onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                            placeholder="Zona Industrial La Candelaria, Galpón 4"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <Button type="button" variant="secondary" onClick={() => setShowSupplierModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: VER DETALLE DE COMPRA */}
            {selectedPurchase && (
                <Modal
                    isOpen={Boolean(selectedPurchase)}
                    onClose={() => setSelectedPurchase(null)}
                    title={`Comprobante de Compra: ${selectedPurchase.invoiceNumber}`}
                    size="md"
                >
                    <div className="space-y-4 text-xs">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1.5 font-mono">
                            <p className="flex justify-between">
                                <span className="text-gray-500">Proveedor:</span>
                                <strong className="text-gray-900 dark:text-white">{selectedPurchase.supplierName}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-500">N° Factura:</span>
                                <strong className="text-gray-900 dark:text-white">{selectedPurchase.invoiceNumber}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-500">N° Control SENIAT:</span>
                                <strong className="text-gray-900 dark:text-white">{selectedPurchase.controlNumber}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-500">Fecha de Emisión:</span>
                                <strong className="text-gray-900 dark:text-white">{new Date(selectedPurchase.date).toLocaleString('es-VE')}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-500">Tasa Oficial BCV:</span>
                                <strong className="text-emerald-500">{formatBs(selectedPurchase.bcvRate || rate)} / USD</strong>
                            </p>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-center">
                            <p className="text-[11px] text-blue-600 dark:text-blue-300 font-bold uppercase">Total Cancelado</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">${selectedPurchase.totalUsd?.toFixed(2)}</p>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {formatBs(selectedPurchase.totalBs || (selectedPurchase.totalUsd * rate))}
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => setSelectedPurchase(null)}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
