import { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { productService } from '../services/productService';
import { stockMovementService, MOVEMENT_TYPES } from '../services/stockMovementService';
import { formatCurrency } from '../utils/formatCurrency';
import { useAuth } from '../contexts/AuthContext';
import { 
    Ban, 
    CheckCircle, 
    Trash2, 
    Edit3, 
    Search, 
    AlertCircle, 
    Layers, 
    History, 
    ArrowUpRight, 
    ArrowDownRight, 
    Check, 
    X,
    Package,
    Truck,
    SlidersHorizontal,
    Tag,
    AlertTriangle
} from 'lucide-react';
import VariantAvailabilityModal from '../ui/VariantAvailabilityModal';
import LabelPrintModal from '../ui/LabelPrintModal';
import CurrencyToggle from '../components/CurrencyToggle';
import { useCurrency } from '../contexts/CurrencyContext';

// Helper de auditoría de agotamiento por talla y color
export function getProductDepletionInfo(product) {
  if (!product) return { isFullyOut: true, hasPartialDepletion: false, depletedSizes: [], depletedColors: [] };

  const isFullyOut = Number(product.stock || 0) <= 0;
  const depletedSizes = [];
  const depletedColors = [];

  // 1. Análisis en colorVariants
  if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    product.colorVariants.forEach(variant => {
      const colorName = variant.color || 'Único';
      const vStock = variant.sizeStock || {};
      const vTotal = variant.total !== undefined ? Number(variant.total) : Object.values(vStock).reduce((a, b) => a + Number(b || 0), 0);
      
      if (vTotal <= 0 && !depletedColors.includes(colorName)) {
        depletedColors.push(colorName);
      }

      Object.entries(vStock).forEach(([sz, qty]) => {
        if (Number(qty || 0) <= 0 && !depletedSizes.includes(sz)) {
          depletedSizes.push(sz);
        }
      });
    });
  } 
  // 2. Análisis en sizeStock tradicional
  else if (product.sizeStock && typeof product.sizeStock === 'object') {
    Object.entries(product.sizeStock).forEach(([sz, qty]) => {
      if (Number(qty || 0) <= 0 && !depletedSizes.includes(sz)) {
        depletedSizes.push(sz);
      }
    });
  }

  // 3. Verificación de variantes explícitamente pausadas/deshabilitadas
  if (product.disabledVariants && typeof product.disabledVariants === 'object') {
    Object.keys(product.disabledVariants).forEach(key => {
      const parts = key.split('_');
      if (parts.length === 2 && !depletedSizes.includes(parts[1])) {
        depletedSizes.push(parts[1]);
      }
    });
  }

  const uniqueSizes = [...new Set(depletedSizes)];
  const uniqueColors = [...new Set(depletedColors)];
  const hasPartialDepletion = !isFullyOut && (uniqueSizes.length > 0 || uniqueColors.length > 0);

  return {
    isFullyOut,
    hasPartialDepletion,
    depletedSizes: uniqueSizes,
    depletedColors: uniqueColors
  };
}
import toast from 'react-hot-toast';

/**
 * Inventory.jsx — Gestión Integral de Stock con Kardex y Trazabilidad
 */
export default function Inventory() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'movements'
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');

  // Adjust stock modal & Variant availability subscreen
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [targetProduct, setTargetProduct] = useState(null);
  const [availabilityProduct, setAvailabilityProduct] = useState(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [labelProduct, setLabelProduct] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    newStock: '',
    reason: 'Ajuste manual de conteo físico',
    size: '',
    color: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data || []);
      const movs = await stockMovementService.getAll({ limit: 200 });
      setMovements(movs || []);
    } catch {
      toast.error('Error cargando el inventario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('products_updated', handleUpdate);
    window.addEventListener('stock_movements_updated', handleUpdate);
    return () => {
      window.removeEventListener('products_updated', handleUpdate);
      window.removeEventListener('stock_movements_updated', handleUpdate);
    };
  }, [loadData]);

  // Open adjust modal
  const handleOpenAdjust = (product) => {
    setTargetProduct(product);
    const defaultColor = (product.colors && product.colors[0]) || product.color || 'Negro';
    setAdjustForm({
      newStock: String(product.stock),
      reason: 'Ajuste manual de conteo físico',
      size: (product.sizes && product.sizes[0]) || '',
      color: defaultColor,
      detailNotes: ''
    });
    setShowAdjustModal(true);
  };

  const handleConfirmAdjust = async (e) => {
    if (e) e.preventDefault();
    const qty = parseInt(adjustForm.newStock);
    if (isNaN(qty) || qty < 0) {
      toast.error('El stock no puede ser un valor negativo');
      return;
    }

    try {
      const fullReason = adjustForm.detailNotes 
        ? `${adjustForm.reason} (${adjustForm.detailNotes})` 
        : adjustForm.reason;

      await productService.updateStock(
        targetProduct.id, 
        qty, 
        null, 
        fullReason,
        user?.name || 'Administrador',
        adjustForm.color || null
      );
      setShowAdjustModal(false);
      setTargetProduct(null);
      toast.success(qty === 0 ? 'Stock ajustado a 0 (Producto deshabilitado automáticamente)' : 'Stock ajustado y movimiento registrado en Kardex');
      await loadData();
    } catch (err) {
      toast.error('Error actualizando stock: ' + err.message);
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      const updated = await productService.toggleStatus(product.id);
      toast.success(updated.disabled ? `"${product.name}" deshabilitado del catálogo` : `"${product.name}" habilitado para la venta`);
      await loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteProduct = async (product) => {
    try {
      const hasSales = await productService.hasSalesHistory(product.id);
      if (hasSales) {
        toast.error(
          `⛔ Prohibido por Ley SENIAT y VEN-NIIF: "${product.name}" posee ventas registradas en los libros contables. ` +
          `La ley prohíbe eliminar registros con trazabilidad fiscal. Abriendo subpantalla de disponibilidad para deshabilitarlo.`,
          { duration: 6500 }
        );
        setAvailabilityProduct(product);
        setShowAvailabilityModal(true);
        return;
      }

      if (!window.confirm(`¿Estás seguro de intentar eliminar permanentemente "${product.name}"? Esta acción solo se permite si no tiene ventas registradas.`)) return;

      await productService.delete(product.id);
      toast.success(`Producto "${product.name}" eliminado correctamente`);
      await loadData();
    } catch (err) {
      toast.error(err.message, { duration: 6000 });
      setAvailabilityProduct(product);
      setShowAvailabilityModal(true);
    }
  };

  const availableSuppliers = Array.from(new Set(products.map(p => p.supplierName).filter(Boolean)));

  const cleanSearch = (search || '').trim().toLowerCase();
  const filtered = products.filter(p => {
    const matchesSearch = !cleanSearch ||
      (p.name && p.name.toLowerCase().includes(cleanSearch)) ||
      (p.sku && p.sku.toLowerCase().includes(cleanSearch)) ||
      (p.brand && p.brand.toLowerCase().includes(cleanSearch)) ||
      (p.category && p.category.toLowerCase().includes(cleanSearch)) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(cleanSearch));

    const isOut = p.stock <= 0;
    const isLow = p.stock > 0 && p.stock <= p.minStock;
    const isOk = p.stock > p.minStock && !p.disabled;
    const isDisabled = Boolean(p.disabled);
    const depletion = getProductDepletionInfo(p);
    const isPartial = depletion.hasPartialDepletion;

    const matchesFilter = filter === 'all' ||
      (filter === 'ok' && isOk && !isPartial) ||
      (filter === 'partial' && isPartial) ||
      (filter === 'low' && isLow) ||
      (filter === 'out' && isOut) ||
      (filter === 'disabled' && isDisabled);

    const matchesSupplier = supplierFilter === 'all' || p.supplierName === supplierFilter;

    return matchesSearch && matchesFilter && matchesSupplier;
  });

  const filteredMovements = movements.filter(m => {
    const q = movementSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      (m.productName && m.productName.toLowerCase().includes(q)) ||
      (m.sku && m.sku.toLowerCase().includes(q)) ||
      (m.reason && m.reason.toLowerCase().includes(q)) ||
      (m.userName && m.userName.toLowerCase().includes(q));

    const matchesType = movementTypeFilter === 'all' || m.type === movementTypeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: products.length,
    active: products.filter(p => !p.disabled && p.stock > 0).length,
    disabled: products.filter(p => p.disabled).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
    outOfStock: products.filter(p => p.stock <= 0).length,
    partialDepletion: products.filter(p => !p.disabled && p.stock > 0 && getProductDepletionInfo(p).hasPartialDepletion).length,
    totalUnits: products.reduce((s, p) => s + Math.max(0, p.stock || 0), 0),
    totalValue: products.reduce((s, p) => s + ((p.cost || 0) * Math.max(0, p.stock || 0)), 0),
  };

  if (loading && products.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            Inventario & Trazabilidad de Existencias
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Control de existencias sin negativos • Agotamiento por talla y color • Registro de Kardex
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyToggle />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Total Unidades', value: stats.totalUnits, sub: `${stats.active} modelos activos`, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Valorización (Costo)', value: formatCurrency(stats.totalValue), sub: 'Inversión en almacén', color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Agotamiento Talla/Color', value: stats.partialDepletion, sub: 'Quiebre de variantes', color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Stock Bajo', value: stats.lowStock, sub: 'Requiere reposición', color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Agotados Totales', value: stats.outOfStock, sub: `${stats.disabled} deshabilitados`, color: 'text-red-600 dark:text-red-400' },
        ].map((stat, i) => (
          <Card key={i} className="p-3.5 shadow-sm border border-gray-200/80 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className={`text-xl sm:text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Tabs navigation without scrollbars */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-px scrollbar-none overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'stock'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Control de Existencias ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'movements'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          Kardex / Historial de Movimientos ({movements.length})
        </button>
      </div>

      {/* TAB 1: STOCK TABLE */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Search & Filters without scrollbars */}
          <Card padding={false} className="p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, SKU, marca, categoría o proveedor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs"
                />
              </div>

              {/* Supplier Filter Select */}
              <div className="w-full md:w-60">
                <select
                  value={supplierFilter}
                  onChange={e => setSupplierFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">📦 Todos los Proveedores</option>
                  {availableSuppliers.map(sup => (
                    <option key={sup} value={sup}>
                      🚚 {sup}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'ok', label: 'Stock Completo' },
                  { key: 'partial', label: '⚠️ Agotamiento Talla/Color' },
                  { key: 'low', label: 'Stock Bajo' },
                  { key: 'out', label: 'Agotados Totales' },
                  { key: 'disabled', label: 'Deshabilitados' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      filter === f.key
                        ? f.key === 'partial'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                          : 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Inventory Table */}
          <Card padding={false} className="overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px] tracking-wider">
                    <th className="text-left px-5 py-3.5 font-bold">Producto</th>
                    <th className="text-left px-4 py-3.5 font-bold">SKU</th>
                    <th className="text-left px-4 py-3.5 font-bold">Proveedor</th>
                    <th className="text-center px-4 py-3.5 font-bold">Stock Actual</th>
                    <th className="text-center px-4 py-3.5 font-bold">Mínimo</th>
                    <th className="text-center px-4 py-3.5 font-bold">Estado</th>
                    <th className="text-right px-4 py-3.5 font-bold">Valor (Costo)</th>
                    <th className="text-center px-5 py-3.5 font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.map(product => {
                    const isOutOfStock = product.stock <= 0;
                    const isDisabled = Boolean(product.disabled);

                    return (
                      <tr key={product.id} className={`hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors ${isDisabled ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 shadow-sm">
                              {product.imageUrl || product.image ? (
                                <img
                                  src={product.imageUrl || product.image}
                                  alt={product.name}
                                  className="w-full h-full object-contain p-0.5"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const fb = e.target.parentElement.querySelector('.inv-fb');
                                    if (fb) fb.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <span className={`inv-fb text-base ${product.imageUrl || product.image ? 'hidden' : 'flex'}`}>👟</span>
                            </div>
                            <div className="min-w-0">
                              <p className={`font-bold truncate ${isDisabled ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                {product.name}
                              </p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                {product.brand} • {product.category} {product.color ? `• ${product.color}` : ''}
                              </p>
                              {/* Depletion Alert Pill */}
                              {(() => {
                                const depl = getProductDepletionInfo(product);
                                if (!depl.hasPartialDepletion) return null;
                                return (
                                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                      Agotado: {depl.depletedSizes.length > 0 ? `Tallas [${depl.depletedSizes.join(', ')}]` : ''}
                                      {depl.depletedColors.length > 0 ? `${depl.depletedSizes.length > 0 ? ' • ' : ''}Colores [${depl.depletedColors.join(', ')}]` : ''}
                                    </span>
                                  </div>
                                );
                              })()}

                              {/* Color variants preview */}
                              {product.colorVariants && product.colorVariants.length > 0 ? (
                                <div className="flex items-center gap-1 mt-1 overflow-x-auto pb-0.5 max-w-xs scrollbar-none">
                                  {product.colorVariants.map(v => {
                                    const vTot = v.total !== undefined ? v.total : Object.values(v.sizeStock || {}).reduce((a, b) => a + b, 0);
                                    const isColDepleted = vTot <= 0;
                                    return (
                                      <span
                                        key={v.color}
                                        title={`${v.color}: ${vTot} pares ${isColDepleted ? '(Color Agotado)' : ''}`}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 border ${
                                          isColDepleted
                                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 line-through'
                                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60'
                                        }`}
                                      >
                                        <span>{v.color}:</span>
                                        <span>{vTot}p</span>
                                        {isColDepleted && <span className="text-[8px] no-underline">⚠️</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : product.sizes && product.sizes.length > 0 ? (
                                <div className="flex items-center gap-1 mt-1 overflow-x-auto pb-0.5 max-w-xs scrollbar-none">
                                  {product.sizes.map(s => {
                                    const q = product.sizeStock ? product.sizeStock[s] : null;
                                    const isSizeDepleted = q !== null && q <= 0;
                                    return (
                                      <span
                                        key={s}
                                        title={q !== null ? `Talla ${s}: ${q} pares ${isSizeDepleted ? '(Agotada)' : ''}` : `Talla ${s}`}
                                        className={`px-1.5 py-0.5 rounded font-mono text-[9px] border ${
                                          isSizeDepleted
                                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 line-through font-bold'
                                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-transparent font-bold'
                                        }`}
                                      >
                                        {s}{q !== null ? `:${q}` : ''}
                                        {isSizeDepleted && ' 🚫'}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                          {product.sku}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 max-w-[150px] truncate" title={`Proveedor: ${product.supplierName || 'Distribuidora Deportiva Ávila C.A.'}`}>
                            <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate font-medium">{product.supplierName || 'Distribuidora Deportiva Ávila C.A.'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenAdjust(product)}
                            className={`font-black text-sm px-2.5 py-1 rounded-lg hover:ring-2 hover:ring-blue-400 transition-all ${
                              isOutOfStock ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30' : product.stock <= product.minStock ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800'
                            }`}
                            title="Clic para registrar movimiento / editar cantidad"
                          >
                            {product.stock}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-center text-gray-500 dark:text-gray-400 font-mono">
                          {product.minStock}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {(() => {
                            const depl = getProductDepletionInfo(product);
                            if (isDisabled) {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                  Deshabilitado
                                </span>
                              );
                            }
                            if (isOutOfStock) {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                  Agotado Total (0)
                                </span>
                              );
                            }
                            if (depl.hasPartialDepletion) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-xs"
                                  title={`Tallas agotadas: ${depl.depletedSizes.join(', ')}`}
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  Agotado Talla/Color
                                </span>
                              );
                            }
                            if (product.stock <= product.minStock) {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                  Stock Bajo
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                En Stock
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-white font-mono">
                          {formatCurrency((product.cost || 0) * (product.stock || 0))}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Ajustar Stock con registro de movimiento */}
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(product)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-500 hover:text-blue-600 transition-colors"
                              title="Ajustar existencia (Kardex)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Subpantalla de Disponibilidad y Deshabilitación por Tallas/Colores */}
                            <button
                              type="button"
                              onClick={() => {
                                setAvailabilityProduct(product);
                                setShowAvailabilityModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                              title="Gestionar disponibilidad por tallas y colores (Subpantalla SGF)"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {/* Etiquetas con código de barras */}
                            <button
                              type="button"
                              onClick={() => setLabelProduct(product)}
                              aria-label={`Imprimir etiquetas de ${product.name}`}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-500 hover:text-indigo-600 transition-colors"
                              title="Imprimir etiquetas con código de barras"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>

                            {/* Deshabilitar / Habilitar */}
                            <button
                              type="button"
                              onClick={() => {
                                setAvailabilityProduct(product);
                                setShowAvailabilityModal(true);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isDisabled
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40'
                                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40'
                              }`}
                              title={isDisabled ? 'Ver disponibilidad (Deshabilitado)' : 'Deshabilitar producto o variantes'}
                            >
                              {isDisabled ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>

                            {/* Eliminar protegido */}
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
                              title="Eliminar (Protegido si tiene ventas)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No se encontraron productos en el inventario</p>
                <p className="text-xs text-gray-400 mt-1">Prueba cambiando los filtros o el término de búsqueda</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: KARDEX MOVEMENTS TABLE */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Movement filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar movimiento por producto, SKU, motivo o usuario..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'ajuste_manual', label: 'Ajustes' },
                { key: 'recepcion_compra', label: 'Compras (+)' },
                { key: 'salida_venta', label: 'Ventas (-)' },
                { key: 'edicion_producto', label: 'Edición' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setMovementTypeFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    movementTypeFilter === f.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Movements table */}
          <Card padding={false} className="overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Fecha / Hora</th>
                    <th className="px-4 py-3">Producto & SKU</th>
                    <th className="px-4 py-3 text-center">Tipo</th>
                    <th className="px-4 py-3 text-center">Variación</th>
                    <th className="px-4 py-3 text-center">Stock Antes → Después</th>
                    <th className="px-4 py-3">Motivo / Detalle</th>
                    <th className="px-4 py-3">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        No hay movimientos registrados en el Kardex
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov) => {
                      const isPositive = mov.delta > 0;
                      return (
                        <tr key={mov.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                            {new Date(mov.createdAt).toLocaleString('es-VE')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900 dark:text-white">{mov.productName}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{mov.sku} {mov.size ? `• Talla: ${mov.size}` : ''}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              mov.type === 'recepcion_compra'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : mov.type === 'salida_venta'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}>
                              {mov.typeLabel || mov.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold font-mono">
                            <span className={`inline-flex items-center gap-0.5 text-xs ${
                              isPositive ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-red-500 font-black'
                            }`}>
                              {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {isPositive ? `+${mov.delta}` : mov.delta}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-gray-700 dark:text-gray-300">
                            <span className="text-gray-400">{mov.previousStock}</span>
                            <span className="mx-1 text-gray-300">→</span>
                            <span className="text-gray-900 dark:text-white font-black">{mov.newStock}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {mov.reason}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-400">
                            {mov.userName || 'Sistema'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: AJUSTE DE EXISTENCIAS CON AUDITORÍA DE MOVIMIENTO */}
      {showAdjustModal && targetProduct && (
        <Modal
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          title={`Ajuste de Stock: ${targetProduct.name}`}
          size="md"
        >
          <form onSubmit={handleConfirmAdjust} className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/80 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1">
              <p className="text-gray-500 dark:text-gray-400 font-mono">SKU: <strong className="text-gray-900 dark:text-white">{targetProduct.sku}</strong></p>
              <p className="text-gray-500 dark:text-gray-400">Proveedor: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{targetProduct.supplierName || 'Distribuidora Deportiva Ávila C.A.'}</strong></p>
              <p className="text-gray-500 dark:text-gray-400">Stock actual registrado: <strong className="text-blue-600 dark:text-blue-400 font-bold text-sm">{targetProduct.stock} unidades</strong></p>
            </div>

            {targetProduct.colors && targetProduct.colors.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Variante de Color
                </label>
                <select
                  value={adjustForm.color}
                  onChange={(e) => setAdjustForm({ ...adjustForm, color: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 dark:text-white"
                >
                  {targetProduct.colors.map(c => (
                    <option key={c} value={c}>Color: {c}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Nueva Cantidad Total de Existencias *
              </label>
              <Input
                type="number"
                min="0"
                value={adjustForm.newStock}
                onChange={(e) => setAdjustForm({ ...adjustForm, newStock: e.target.value })}
                required
                autoFocus
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Diferencia: {parseInt(adjustForm.newStock || 0) - targetProduct.stock > 0 ? `+${parseInt(adjustForm.newStock || 0) - targetProduct.stock}` : parseInt(adjustForm.newStock || 0) - targetProduct.stock} unidades
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Motivo del Ajuste (Para el Kardex de Auditoría) *
              </label>
              <select
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 dark:text-white mb-2"
              >
                <option value="Ajuste manual de conteo físico">Ajuste manual por conteo físico</option>
                <option value="Reingreso por devolución de cliente">Reingreso por cambio/devolución</option>
                <option value="Merma por zapato defectuoso o daño">Merma o daño de producto</option>
                <option value="Corrección de ingreso previo">Corrección de ingreso previo</option>
                <option value="Otro motivo justificado">Otro motivo justificado</option>
              </select>

              <Input
                type="text"
                placeholder="Detalle u observación opcional..."
                value={adjustForm.detailNotes || ''}
                onChange={(e) => setAdjustForm({ ...adjustForm, detailNotes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button type="button" variant="secondary" onClick={() => setShowAdjustModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="flex items-center gap-1.5 font-bold">
                <Check className="w-4 h-4" />
                Registrar Movimiento
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <LabelPrintModal
        isOpen={Boolean(labelProduct)}
        onClose={() => setLabelProduct(null)}
        product={labelProduct}
      />

      {/* Subpantalla SGF: Disponibilidad y Agotamiento de Variantes */}
      <VariantAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        product={availabilityProduct}
        onSaved={() => loadData()}
      />
    </div>
  );
}
