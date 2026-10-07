import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Users, ArrowRight, DollarSign, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import { formatCurrency } from '../utils/formatCurrency';
import { productService } from '../services/productService';
import { saleService } from '../services/saleServices';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';

/**
 * Dashboard page with dual USD/VES KPI cards and recent activity.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const { rate, toBs, formatBs, formatUSD } = useCurrency();
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesStats, allProducts, sales] = await Promise.all([
        saleService.getStats(),
        productService.getAll(),
        saleService.getAll(),
      ]);
      setStats(salesStats);
      setProducts(allProducts);
      setAllSales(sales);
      setRecentSales(sales.slice(0, 6));
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const lowStockProducts = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock');

  if (user?.role === 'Vendedor') {
    return <CashierDashboard user={user} allSales={allSales} lowStockProducts={lowStockProducts} />;
  }

  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const todayRev = stats?.todayRevenue || 0;

  const kpiCards = [
    {
      title: 'Ventas de Hoy',
      value: formatUSD(todayRev),
      subvalue: formatBs(toBs(todayRev)),
      subtitle: `${stats?.todaySales || 0} transacciones`,
      icon: <TrendingUp className="w-6 h-6" />,
      gradient: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/20',
    },
    {
      title: 'Total Productos',
      value: totalProducts,
      subvalue: `${totalStock} unidades en stock`,
      subtitle: 'Catálogo de tienda',
      icon: <Package className="w-6 h-6" />,
      gradient: 'from-blue-500 to-indigo-600',
      shadowColor: 'shadow-blue-500/20',
    },
    {
      title: 'Valor del Inventario',
      value: formatUSD(totalInventoryValue),
      subvalue: formatBs(toBs(totalInventoryValue)),
      subtitle: 'Precio de venta al público',
      icon: <DollarSign className="w-6 h-6" />,
      gradient: 'from-purple-500 to-violet-600',
      shadowColor: 'shadow-purple-500/20',
    },
    {
      title: 'Alertas de Stock',
      value: lowStockProducts.length,
      subvalue: lowStockProducts.length > 0 ? 'Reposición requerida' : 'Stock saludable',
      subtitle: 'Productos bajo mínimo',
      icon: <AlertTriangle className="w-6 h-6" />,
      gradient: 'from-amber-500 to-orange-600',
      shadowColor: 'shadow-amber-500/20',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Tasa BCV Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-lg border border-blue-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            🇻🇪 Sistema UrbanStep Venezuela
          </h2>
          <p className="text-xs text-blue-200 mt-0.5">
            Punto de Venta multimoneda optimizado para cobros en Bolívares (Pago Móvil, Punto) y Divisas (USD, Zelle).
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 shrink-0">
          <span className="text-xs font-medium text-blue-200 uppercase tracking-wider">Tasa Oficial BCV:</span>
          <span className="text-base font-extrabold text-white font-mono">{formatBs(rate)}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i} hover className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${kpi.gradient} opacity-10 rounded-full -translate-y-6 translate-x-6`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">{kpi.title}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{kpi.value}</p>
                {kpi.subvalue && (
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{kpi.subvalue}</p>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{kpi.subtitle}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.gradient} text-white shadow-lg ${kpi.shadowColor}`}>
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Últimas Ventas Emitidas</h3>
              <p className="text-xs text-gray-500">Transacciones comerciales en tienda y envíos</p>
            </div>
            <Link to="/pos" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Nueva Venta <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentSales.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No hay ventas registradas</p>
            ) : (
              recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                      {sale.paymentMethod === 'pagomovil' ? '📱' : sale.paymentMethod === 'zelle' ? '💵' : sale.paymentMethod === 'punto_venta' ? '💳' : '🧾'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{sale.customer}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {sale.receiptNumber || sale.id} • {sale.paymentMethodLabel || sale.paymentMethod} • {sale.cashier}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white">{formatUSD(sale.total)}</p>
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatBs(toBs(sale.total))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Alertas de Inventario</h3>
              <p className="text-xs text-gray-500">Calzados y prendas por agotarse</p>
            </div>
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-xs font-bold text-amber-700 dark:text-amber-400">
              {lowStockProducts.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">👟</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Niveles de stock óptimos</p>
              </div>
            ) : (
              lowStockProducts.slice(0, 5).map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.brand} • {product.category}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                    product.stock === 0
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  }`}>
                    {product.stock === 0 ? 'Agotado' : `${product.stock} pares`}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Vista del Cajero
 */
function CashierDashboard({ user, allSales, lowStockProducts }) {
  const { toBs, formatBs, formatUSD } = useCurrency();
  const todayKey = new Date().toISOString().split('T')[0];
  const mySales = allSales.filter(s => s.cashier === user?.name);
  const myTodaySales = mySales.filter(s => s.date && s.date.startsWith(todayKey));
  const myTodayRevenue = myTodaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const myAvgTicket = myTodaySales.length > 0 ? myTodayRevenue / myTodaySales.length : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Turno de Caja: {user?.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/pos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/25"
          >
            <ShoppingCart className="w-4 h-4" />
            Nueva Venta POS
          </Link>
          <Link
            to="/customers"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200"
          >
            <Users className="w-4 h-4" />
            Clientes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Mis Ventas Hoy</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{myTodaySales.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Tickets emitidos</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Mis Ingresos Hoy</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{formatUSD(myTodayRevenue)}</p>
          <p className="text-xs font-bold text-emerald-600 mt-0.5">{formatBs(toBs(myTodayRevenue))}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Ticket Promedio</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{formatUSD(myAvgTicket)}</p>
          <p className="text-xs font-bold text-emerald-600 mt-0.5">{formatBs(toBs(myAvgTicket))}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Mis Ventas Recientes</h3>
        <div className="space-y-2">
          {mySales.slice(0, 6).map(sale => (
            <div key={sale.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 text-xs">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{sale.customer}</p>
                <p className="text-gray-400">{sale.receiptNumber || sale.id} • {sale.paymentMethodLabel || sale.paymentMethod}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">{formatUSD(sale.total)}</p>
                <p className="text-emerald-600 font-semibold">{formatBs(toBs(sale.total))}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
