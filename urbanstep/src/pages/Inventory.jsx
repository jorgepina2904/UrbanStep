import { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { productService } from '../services/productService';
import { formatCurrency } from '../utils/formatCurrency';
import { Ban, CheckCircle, Trash2, Edit3, Search, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Inventory.jsx — Gestión Integral de Stock con Restricción de Negativos
 * Auto-deshabilitación de productos agotados y protección de historial
 */
export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingStock, setEditingStock] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data || []);
    } catch {
      toast.error('Error cargando el inventario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('products_updated', handleUpdate);
    return () => window.removeEventListener('products_updated', handleUpdate);
  }, [loadProducts]);

  const handleStockUpdate = async (productId) => {
    const qty = parseInt(newStockValue);
    if (isNaN(qty) || qty < 0) {
      toast.error('El stock no puede ser un valor negativo');
      return;
    }
    try {
      await productService.updateStock(productId, qty);
      setEditingStock(null);
      setNewStockValue('');
      toast.success(qty === 0 ? 'Stock actualizado a 0 (Producto deshabilitado automáticamente)' : 'Stock actualizado exitosamente');
      await loadProducts();
    } catch (err) {
      toast.error('Error actualizando stock: ' + err.message);
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      const updated = await productService.toggleStatus(product.id);
      toast.success(updated.disabled ? `"${product.name}" deshabilitado del catálogo` : `"${product.name}" habilitado para la venta`);
      await loadProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`¿Estás seguro de intentar eliminar "${product.name}"?`)) return;

    try {
      await productService.delete(product.id);
      toast.success(`Producto "${product.name}" eliminado correctamente`);
      await loadProducts();
    } catch (err) {
      // Bloqueo de seguridad: posee ventas o compras
      toast.error(err.message, { duration: 5000 });
    }
  };

  const cleanSearch = (search || '').trim().toLowerCase();
  const filtered = products.filter(p => {
    const matchesSearch = !cleanSearch ||
      (p.name && p.name.toLowerCase().includes(cleanSearch)) ||
      (p.sku && p.sku.toLowerCase().includes(cleanSearch)) ||
      (p.brand && p.brand.toLowerCase().includes(cleanSearch)) ||
      (p.category && p.category.toLowerCase().includes(cleanSearch));

    const isOut = p.stock <= 0;
    const isLow = p.stock > 0 && p.stock <= p.minStock;
    const isOk = p.stock > p.minStock && !p.disabled;
    const isDisabled = Boolean(p.disabled);

    const matchesFilter = filter === 'all' ||
      (filter === 'ok' && isOk) ||
      (filter === 'low' && isLow) ||
      (filter === 'out' && isOut) ||
      (filter === 'disabled' && isDisabled);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: products.length,
    active: products.filter(p => !p.disabled && p.stock > 0).length,
    disabled: products.filter(p => p.disabled).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
    outOfStock: products.filter(p => p.stock <= 0).length,
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventario de Calzado & Productos</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Control de existencias sin valores negativos • Deshabilitación automática al agotar stock
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Unidades', value: stats.totalUnits, sub: `${stats.active} disponibles`, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Valorización (Costo)', value: formatCurrency(stats.totalValue), sub: 'Costo total de compra', color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Stock Bajo', value: stats.lowStock, sub: 'Requiere reposición', color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Agotados / Deshabilitados', value: `${stats.outOfStock} / ${stats.disabled}`, sub: 'Retirados de venta', color: 'text-red-600 dark:text-red-400' },
        ].map((stat, i) => (
          <Card key={i} className="p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card padding={false} className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU, marca o categoría..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'ok', label: 'En Stock' },
              { key: 'low', label: 'Stock Bajo' },
              { key: 'out', label: 'Agotados' },
              { key: 'disabled', label: 'Deshabilitados' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filter === f.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
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
      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 uppercase text-[10px] tracking-wider">
                <th className="text-left px-5 py-3.5 font-bold">Producto</th>
                <th className="text-left px-4 py-3.5 font-bold">SKU</th>
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
                              className="w-full h-full object-cover"
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
                          {product.sizes && product.sizes.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 overflow-x-auto pb-0.5 max-w-xs scrollbar-none">
                              {product.sizes.map(s => {
                                const q = product.sizeStock ? product.sizeStock[s] : null;
                                return (
                                  <span
                                    key={s}
                                    title={q !== null ? `Talla ${s}: ${q} pares` : `Talla ${s}`}
                                    className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${
                                      q !== null && q <= 0
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 line-through opacity-60'
                                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold'
                                    }`}
                                  >
                                    {s}{q !== null ? `:${q}` : ''}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {editingStock === product.id ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <input
                            type="number"
                            value={newStockValue}
                            onChange={e => setNewStockValue(e.target.value)}
                            className="w-16 px-2 py-1 text-center rounded-lg border border-blue-400 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
                            min="0"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleStockUpdate(product.id);
                              if (e.key === 'Escape') setEditingStock(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleStockUpdate(product.id)}
                            className="p-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                            title="Confirmar nuevo stock"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStock(product.id);
                            setNewStockValue(String(product.stock));
                          }}
                          className={`font-black text-sm px-2 py-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                            isOutOfStock ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30' : product.stock <= product.minStock ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'
                          }`}
                          title="Clic para editar stock"
                        >
                          {product.stock}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-gray-500 dark:text-gray-400 font-mono">
                      {product.minStock}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {isDisabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          Deshabilitado
                        </span>
                      ) : isOutOfStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                          Agotado (0)
                        </span>
                      ) : product.stock <= product.minStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Stock Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          En Stock
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-white font-mono">
                      {formatCurrency((product.cost || 0) * (product.stock || 0))}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Editar Stock */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStock(product.id);
                            setNewStockValue(String(product.stock));
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Ajustar existencia"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Deshabilitar / Habilitar */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(product)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDisabled
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40'
                          }`}
                          title={isDisabled ? 'Habilitar para venta en POS' : 'Deshabilitar producto'}
                        >
                          {isDisabled ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>

                        {/* Eliminar protegido */}
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar (Protegido si tiene ventas o compras)"
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
  );
}
