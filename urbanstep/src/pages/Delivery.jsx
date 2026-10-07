import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import CustomerSelector from '../ui/CustomerSelector';
import { deliveryService } from '../services/deliveryService';
import { productService } from '../services/productService';
import { saleService } from '../services/saleServices';
import { formatCurrency } from '../utils/formatCurrency';
import { useCurrency } from '../contexts/CurrencyContext';
import { VENEZUELA_BANKS } from '../data/venezuelaData';
import {
    MapPin, Truck, Clock, DollarSign, Search, Navigation,
    Package, CheckCircle, AlertCircle, Phone, User, FileText,
    Route, Bike, XCircle, Eye, RefreshCw, ShoppingCart, Plus, Trash2, CreditCard, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const LARA_PRESETS = [
    { name: 'Las Trinitarias (Este)', lat: 10.0678, lng: -69.3474, address: 'Av. Los Leones, C.C. Las Trinitarias, Barquisimeto' },
    { name: 'Carrera 19 (Centro)', lat: 10.0695, lng: -69.3175, address: 'Carrera 19 con Calle 25, Barquisimeto Centro' },
    { name: 'Metrópolis (Oeste)', lat: 10.0573, lng: -69.3785, address: 'Av. La Salle, C.C. Metrópolis, Barquisimeto' },
    { name: 'Santa Rosa', lat: 10.0620, lng: -69.2880, address: 'Pueblo de Santa Rosa, Barquisimeto, Edo. Lara' },
    { name: 'Cabudare (Palavecino)', lat: 10.0333, lng: -69.2667, address: 'Av. Intercomunal Barquisimeto-Cabudare, Palavecino' },
    { name: 'Zona Industrial II', lat: 10.0820, lng: -69.3620, address: 'Av. Circunvalación Norte, Zona Industrial, Barquisimeto' },
    { name: 'Quíbor (Jiménez)', lat: 9.9286, lng: -69.6200, address: 'Av. Pedro León Torres, Quíbor, Edo. Lara' },
    { name: 'Carora (Torres)', lat: 10.1747, lng: -70.0828, address: 'Av. Francisco de Miranda, Carora, Edo. Lara' }
];

// Leaflet CSS is loaded dynamically
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

/**
 * Leaflet Map component for delivery destination selection
 */
function DeliveryMap({ center, zoom = 13, marker, onMapClick, storeLocation, height = '350px' }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const storeMarkerRef = useRef(null);
    const routeLineRef = useRef(null);

    useEffect(() => {
        // Load Leaflet CSS
        if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS;
            document.head.appendChild(link);
        }

        // Import and initialize Leaflet
        import('leaflet').then((L) => {
            if (mapInstanceRef.current) return;

            // Fix default marker icon issue
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const map = L.map(mapRef.current).setView([center[0], center[1]], zoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map);

            // Store marker (green)
            if (storeLocation) {
                const storeIcon = L.divIcon({
                    html: '<div style="background:#16a34a;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><span style="color:white;font-size:16px;">🏪</span></div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    className: '',
                });
                storeMarkerRef.current = L.marker([storeLocation.lat, storeLocation.lng], { icon: storeIcon })
                    .addTo(map)
                    .bindPopup('<b>UrbanStep Tienda</b><br>Punto de origen');
            }

            // Click handler
            map.on('click', (e) => {
                if (onMapClick) {
                    onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
                }
            });

            mapInstanceRef.current = map;

            // Set initial marker if provided
            if (marker) {
                const destIcon = L.divIcon({
                    html: '<div style="background:#dc2626;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><span style="color:white;font-size:16px;">📍</span></div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    className: '',
                });
                markerRef.current = L.marker([marker.lat, marker.lng], { icon: destIcon })
                    .addTo(map)
                    .bindPopup('<b>Destino de entrega</b>');
            }
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Update marker when marker prop changes
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        import('leaflet').then((L) => {
            // Remove old markers
            if (markerRef.current) {
                mapInstanceRef.current.removeLayer(markerRef.current);
            }
            if (routeLineRef.current) {
                mapInstanceRef.current.removeLayer(routeLineRef.current);
            }

            if (marker) {
                const destIcon = L.divIcon({
                    html: '<div style="background:#dc2626;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><span style="color:white;font-size:16px;">📍</span></div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    className: '',
                });
                markerRef.current = L.marker([marker.lat, marker.lng], { icon: destIcon })
                    .addTo(mapInstanceRef.current)
                    .bindPopup('<b>Destino de entrega</b>');

                // Draw route line if store location exists
                if (storeLocation) {
                    routeLineRef.current = L.polyline(
                        [[storeLocation.lat, storeLocation.lng], [marker.lat, marker.lng]],
                        { color: '#3b82f6', weight: 3, dashArray: '8, 8', opacity: 0.7 }
                    ).addTo(mapInstanceRef.current);

                    // Fit bounds to show both markers
                    const bounds = L.latLngBounds(
                        [storeLocation.lat, storeLocation.lng],
                        [marker.lat, marker.lng]
                    );
                    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
                } else {
                    mapInstanceRef.current.setView([marker.lat, marker.lng], 15);
                }
            }
        });
    }, [marker?.lat, marker?.lng]);

    return (
        <div
            ref={mapRef}
            style={{ height, width: '100%', borderRadius: '12px', zIndex: 1 }}
            className="border border-gray-200 dark:border-gray-700"
        />
    );
}

/**
 * Status badge for deliveries
 */
function DeliveryStatusBadge({ status }) {
    const map = {
        pendiente: { variant: 'warning', label: 'Pendiente', icon: Clock },
        asignado: { variant: 'info', label: 'Asignado', icon: User },
        en_camino: { variant: 'primary', label: 'En Camino', icon: Truck },
        entregado: { variant: 'success', label: 'Entregado', icon: CheckCircle },
        cancelado: { variant: 'danger', label: 'Cancelado', icon: XCircle },
    };
    const config = map[status] || map.pendiente;
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
            status === 'pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' :
            status === 'asignado' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' :
            status === 'en_camino' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800' :
            status === 'entregado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' :
            'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
        }`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
}

export default function Delivery() {
    const { rate, formatBs } = useCurrency();
    const [deliveries, setDeliveries] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list'); // 'list', 'map', 'new'
    const [statusFilter, setStatusFilter] = useState('all');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);

    // New delivery order form state
    const [showNewModal, setShowNewModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [deliveryCalc, setDeliveryCalc] = useState(null);

    // Customer & Product Order states
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedProductSize, setSelectedProductSize] = useState('');
    const [productQty, setProductQty] = useState(1);
    const [orderItems, setOrderItems] = useState([]);

    // Venezuelan Payment states
    const [paymentMethod, setPaymentMethod] = useState('pagomovil');
    const [paymentBank, setPaymentBank] = useState('0134 - Banesco');
    const [paymentReference, setPaymentReference] = useState('');

    const [newDeliveryForm, setNewDeliveryForm] = useState({
        customerName: '',
        customerPhone: '',
        destinationAddress: '',
        specialInstructions: '',
    });

    const config = deliveryService.getConfig();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [deliveriesData, statsData, prods] = await Promise.all([
                deliveryService.getAll(statusFilter !== 'all' ? { status: statusFilter } : {}),
                deliveryService.getStats(),
                productService.getActive().catch(() => [])
            ]);
            setDeliveries(deliveriesData);
            setStats(statsData);
            setAvailableProducts(prods || []);
        } catch (err) {
            toast.error('Error al cargar datos de delivery');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSelectCustomer = (cust) => {
        setSelectedCustomer(cust);
        if (cust) {
            const fullName = cust.id === 'publico' ? 'Cliente General' : `${cust.firstName || ''} ${cust.lastName || ''}`.trim();
            setNewDeliveryForm(prev => ({
                ...prev,
                customerName: fullName,
                customerPhone: cust.phone || prev.customerPhone,
                destinationAddress: cust.address ? `${cust.address}, ${cust.city || 'Barquisimeto'}` : prev.destinationAddress
            }));
        }
    };

    const handleAddOrderItem = () => {
        if (!selectedProductId) {
            toast.error('Selecciona un calzado o producto del inventario');
            return;
        }
        const product = availableProducts.find(p => p.id === selectedProductId);
        if (!product) return;

        const size = selectedProductSize || (product.sizes?.[0] || 'N/A');
        const qty = Math.max(1, parseInt(productQty) || 1);

        if (qty > product.stock) {
            toast.error(`Solo quedan ${product.stock} pares disponibles`);
            return;
        }

        const existingIdx = orderItems.findIndex(i => i.productId === product.id && i.size === size);
        if (existingIdx >= 0) {
            const updated = [...orderItems];
            updated[existingIdx].quantity += qty;
            updated[existingIdx].subtotal = updated[existingIdx].quantity * updated[existingIdx].price;
            setOrderItems(updated);
        } else {
            setOrderItems(prev => [
                ...prev,
                {
                    productId: product.id,
                    name: product.name,
                    brand: product.brand,
                    sku: product.sku,
                    size,
                    price: product.price,
                    quantity: qty,
                    imageUrl: product.imageUrl || product.image,
                    subtotal: qty * product.price
                }
            ]);
        }

        toast.success(`${product.name} (${size}) agregado al pedido`);
        setSelectedProductId('');
        setSelectedProductSize('');
        setProductQty(1);
    };

    const handleRemoveOrderItem = (productId, size) => {
        setOrderItems(prev => prev.filter(i => !(i.productId === productId && i.size === size)));
    };

    const handleSearchAddress = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const results = await deliveryService.searchAddress(searchQuery);
            setSearchResults(results);
            if (results.length === 0) {
                toast('No se encontraron resultados para esa dirección', { icon: '🔍' });
            }
        } catch {
            toast.error('Error buscando dirección');
        } finally {
            setSearching(false);
        }
    };

    const handleSelectLocation = async (location) => {
        setSelectedLocation(location);
        setNewDeliveryForm(prev => ({ ...prev, destinationAddress: location.address }));
        setSearchResults([]);

        // Calculate delivery cost
        const calc = deliveryService.calculateDeliveryCost({
            destinationLat: location.lat,
            destinationLng: location.lng,
        });
        setDeliveryCalc(calc);
    };

    const handleMapClick = async (coords) => {
        setSelectedLocation(coords);
        
        // Reverse geocode
        const geo = await deliveryService.reverseGeocode(coords.lat, coords.lng);
        setNewDeliveryForm(prev => ({ ...prev, destinationAddress: geo.address }));

        // Calculate cost
        const calc = deliveryService.calculateDeliveryCost({
            destinationLat: coords.lat,
            destinationLng: coords.lng,
        });
        setDeliveryCalc(calc);
    };

    const itemsSubtotalUsd = orderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const shippingCostUsd = deliveryCalc?.available ? deliveryCalc.costUsd : 0;
    const grandTotalUsd = itemsSubtotalUsd + shippingCostUsd;

    const handleCreateDelivery = async () => {
        if (!selectedLocation || !deliveryCalc?.available) {
            toast.error('Selecciona un destino válido en el mapa del Estado Lara');
            return;
        }
        if (!newDeliveryForm.customerName.trim()) {
            toast.error('Selecciona o ingresa el nombre del cliente');
            return;
        }
        if (orderItems.length === 0) {
            toast.error('Debes añadir al menos un calzado o producto al pedido');
            return;
        }

        try {
            // 1. Crear venta oficial en el sistema UrbanStep
            const sale = await saleService.create({
                customerId: selectedCustomer?.id || 'publico',
                customer: newDeliveryForm.customerName,
                customerPhone: newDeliveryForm.customerPhone,
                customerDoc: selectedCustomer?.docNumber || '',
                items: orderItems.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    size: item.size,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.subtotal
                })),
                subtotal: itemsSubtotalUsd,
                tax: 0,
                igtf: 0,
                shippingCost: shippingCostUsd,
                total: grandTotalUsd,
                paymentMethod,
                paymentReference,
                paymentBank,
                shippingCarrier: 'delivery_local',
                deliveryData: {
                    address: newDeliveryForm.destinationAddress,
                    distanceKm: deliveryCalc.distanceKm,
                    costUsd: shippingCostUsd,
                    estimatedMinutes: deliveryCalc.estimatedMinutes
                }
            });

            // 2. Crear registro logístico de delivery
            await deliveryService.createDelivery({
                saleId: sale.id,
                customerName: newDeliveryForm.customerName,
                customerPhone: newDeliveryForm.customerPhone,
                destinationAddress: newDeliveryForm.destinationAddress,
                destinationLat: selectedLocation.lat,
                destinationLng: selectedLocation.lng,
                distanceKm: deliveryCalc.distanceKm,
                deliveryCostUsd: deliveryCalc.costUsd,
                deliveryCostBs: Number((deliveryCalc.costUsd * rate).toFixed(2)),
                estimatedMinutes: deliveryCalc.estimatedMinutes,
                specialInstructions: newDeliveryForm.specialInstructions,
            });

            toast.success(`¡Pedido #${sale.receiptNumber} facturado y Delivery asignado!`);
            setShowNewModal(false);
            resetNewForm();
            loadData();
        } catch (err) {
            console.error('Error procesando pedido de delivery:', err);
            toast.error('Error al procesar pedido: ' + err.message);
        }
    };

    const handleUpdateStatus = async (deliveryId, newStatus) => {
        try {
            await deliveryService.updateStatus(deliveryId, newStatus);
            toast.success(`Estado actualizado a: ${newStatus}`);
            loadData();
        } catch (err) {
            toast.error('Error: ' + err.message);
        }
    };

    const resetNewForm = () => {
        setSelectedLocation(null);
        setDeliveryCalc(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedCustomer(null);
        setOrderItems([]);
        setSelectedProductId('');
        setSelectedProductSize('');
        setProductQty(1);
        setPaymentReference('');
        setNewDeliveryForm({ customerName: '', customerPhone: '', destinationAddress: '', specialInstructions: '' });
    };

    const statuses = [
        { id: 'all', label: 'Todos' },
        { id: 'pendiente', label: 'Pendientes' },
        { id: 'asignado', label: 'Asignados' },
        { id: 'en_camino', label: 'En Camino' },
        { id: 'entregado', label: 'Entregados' },
        { id: 'cancelado', label: 'Cancelados' },
    ];

    if (loading && deliveries.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Truck className="w-7 h-7 text-blue-600" />
                        Módulo de Delivery
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Gestión de entregas a domicilio con geolocalización y cálculo de tarifas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={loadData} className="flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </Button>
                    <Button variant="primary" onClick={() => { resetNewForm(); setShowNewModal(true); }} className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        Nuevo Delivery
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Hoy', value: stats.todayCount, icon: Package, color: 'blue' },
                        { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'amber' },
                        { label: 'En Camino', value: stats.enCamino, icon: Truck, color: 'indigo' },
                        { label: 'Ingresos Delivery', value: formatCurrency(stats.totalRevenueUsd), icon: DollarSign, color: 'emerald' },
                    ].map((kpi, i) => (
                        <Card key={i} hover>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</p>
                                </div>
                                <div className={`p-2.5 rounded-xl bg-${kpi.color}-100 dark:bg-${kpi.color}-900/30 text-${kpi.color}-600 dark:text-${kpi.color}-400`}>
                                    <kpi.icon className="w-5 h-5" />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Status Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {statuses.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setStatusFilter(s.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                            statusFilter === s.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Deliveries List */}
            <div className="space-y-3">
                {deliveries.map(delivery => (
                    <Card key={delivery.id} hover className="!p-0 overflow-hidden">
                        <div className="flex flex-col sm:flex-row">
                            {/* Left info */}
                            <div className="flex-1 p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            <Package className="w-4 h-4 text-blue-500" />
                                            {delivery.id}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {new Date(delivery.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                    <DeliveryStatusBadge status={delivery.status} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-medium">{delivery.customerName || 'Sin nombre'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                        <Route className="w-3.5 h-3.5 text-blue-400" />
                                        <span>{delivery.distanceKm?.toFixed(1)} km · {delivery.estimatedTimeMin} min</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 sm:col-span-2">
                                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                        <span className="truncate">{delivery.destinationAddress || 'Sin dirección'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(delivery.deliveryCostUsd)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        ({formatBs(delivery.deliveryCostBs || 0)})
                                    </span>

                                    <div className="flex gap-1 ml-auto">
                                        {delivery.status === 'pendiente' && (
                                            <>
                                                <button onClick={() => handleUpdateStatus(delivery.id, 'en_camino')} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                                    Despachar
                                                </button>
                                                <button onClick={() => handleUpdateStatus(delivery.id, 'cancelado')} className="px-2.5 py-1 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                                    Cancelar
                                                </button>
                                            </>
                                        )}
                                        {delivery.status === 'en_camino' && (
                                            <button onClick={() => handleUpdateStatus(delivery.id, 'entregado')} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Marcar Entregado
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setSelectedDelivery(delivery); setShowDetailModal(true); }}
                                            className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                                        >
                                            <Eye className="w-3 h-3" />
                                            Ver
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {deliveries.length === 0 && (
                    <div className="text-center py-16">
                        <Truck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No hay deliveries registrados</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Crea uno nuevo para comenzar</p>
                    </div>
                )}
            </div>

            {/* === NEW DELIVERY ORDER & DISPATCH MODAL === */}
            <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="🛵 Nuevo Pedido de Delivery — Estado Lara" size="xl">
                <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
                    {/* PASO 1: SELECCIÓN DE CLIENTE */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                1. Datos del Cliente
                            </h3>
                            <span className="text-[11px] text-gray-400">Selecciona o ingresa datos</span>
                        </div>

                        <div>
                            <CustomerSelector
                                selectedCustomer={selectedCustomer}
                                onSelect={handleSelectCustomer}
                                placeholder="Buscar cliente registrado por nombre, cédula o teléfono..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    Nombre Completo del Receptor *
                                </label>
                                <Input
                                    value={newDeliveryForm.customerName}
                                    onChange={(e) => setNewDeliveryForm(p => ({ ...p, customerName: e.target.value }))}
                                    placeholder="Ej: Pedro Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-emerald-500" />
                                    Teléfono de Contacto *
                                </label>
                                <Input
                                    value={newDeliveryForm.customerPhone}
                                    onChange={(e) => setNewDeliveryForm(p => ({ ...p, customerPhone: e.target.value }))}
                                    placeholder="0414-5551234"
                                />
                            </div>
                        </div>
                    </div>

                    {/* PASO 2: SELECCIÓN DE CALZADOS Y PRENDAS */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <ShoppingCart className="w-4 h-4" />
                                2. Calzados y Productos del Pedido
                            </h3>
                            <Badge variant="primary">{orderItems.length} seleccionados</Badge>
                        </div>

                        {/* Product Picker */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                            <div className="sm:col-span-6">
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    Seleccionar Calzado del Catálogo
                                </label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => {
                                        setSelectedProductId(e.target.value);
                                        const prod = availableProducts.find(p => p.id === e.target.value);
                                        if (prod && prod.sizes?.length > 0) {
                                            setSelectedProductSize(prod.sizes[0]);
                                        }
                                    }}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
                                >
                                    <option value="">-- Elige un modelo de zapato --</option>
                                    {availableProducts.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.brand}) — {formatCurrency(p.price)} [{p.stock} disp.]
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    Talla
                                </label>
                                {(() => {
                                    const currProd = availableProducts.find(p => p.id === selectedProductId);
                                    const sizes = currProd?.sizes || ['38', '39', '40', '41', '42', '43'];
                                    return (
                                        <select
                                            value={selectedProductSize}
                                            onChange={(e) => setSelectedProductSize(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
                                        >
                                            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    );
                                })()}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    Cantidad
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={productQty}
                                    onChange={(e) => setProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={handleAddOrderItem}
                                    className="w-full py-2 flex items-center justify-center gap-1 font-bold text-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Añadir
                                </Button>
                            </div>
                        </div>

                        {/* Order Items Table */}
                        {orderItems.length > 0 ? (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mt-3">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-[10px]">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Calzado</th>
                                            <th className="px-3 py-2 text-center">Talla</th>
                                            <th className="px-3 py-2 text-center">Cant.</th>
                                            <th className="px-3 py-2 text-right">Precio ($)</th>
                                            <th className="px-3 py-2 text-right">Subtotal</th>
                                            <th className="px-3 py-2 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                                        {orderItems.map((item, idx) => (
                                            <tr key={`${item.productId}-${item.size}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 font-sans">
                                                <td className="px-3 py-2 flex items-center gap-2">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt={item.name} className="w-7 h-7 object-cover rounded border" />
                                                    ) : <span>👟</span>}
                                                    <span className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{item.name}</span>
                                                </td>
                                                <td className="px-3 py-2 text-center font-bold text-blue-600">{item.size}</td>
                                                <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right font-mono">{formatCurrency(item.price)}</td>
                                                <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">{formatCurrency(item.subtotal)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveOrderItem(item.productId, item.size)}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-2.5 bg-gray-100/70 dark:bg-gray-800/60 flex justify-between items-center text-xs font-bold px-3">
                                    <span>Subtotal Calzados:</span>
                                    <span className="text-sm font-black text-gray-900 dark:text-white">
                                        {formatCurrency(itemsSubtotalUsd)} <span className="text-xs text-emerald-600 font-medium">({formatBs(itemsSubtotalUsd * rate)})</span>
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-center font-medium">
                                ⚠️ No has añadido calzados todavía. Selecciona un zapato arriba y haz clic en "Añadir".
                            </p>
                        )}
                    </div>

                    {/* PASO 3: DESTINO EN ESTADO LARA & MAPA */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                3. Destino y Ruta en Estado Lara (Deslimitado)
                            </h3>
                            <span className="text-[10px] text-gray-400">Origen: C.C. Las Trinitarias, Barquisimeto</span>
                        </div>

                        {/* Presets Lara */}
                        <div>
                            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Destinos Frecuentes en Lara:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {LARA_PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => handleSelectLocation(preset)}
                                        className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                                    >
                                        📍 {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Address Search */}
                        <div className="flex gap-2">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                                placeholder="Buscar dirección en Barquisimeto / Cabudare / Lara..."
                                className="flex-1"
                            />
                            <Button variant="primary" onClick={handleSearchAddress} disabled={searching} className="shrink-0">
                                {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </Button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 max-h-36 overflow-y-auto">
                                {searchResults.map((result, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => handleSelectLocation(result)}
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors flex items-start gap-2"
                                    >
                                        <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                        <span className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{result.address}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Leaflet Map */}
                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <DeliveryMap
                                center={[config.storeLat, config.storeLng]}
                                zoom={13}
                                marker={selectedLocation}
                                onMapClick={handleMapClick}
                                storeLocation={{ lat: config.storeLat, lng: config.storeLng }}
                                height="280px"
                            />
                        </div>

                        {/* Delivery Calculation */}
                        {deliveryCalc && (
                            <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                                        <Bike className="w-4 h-4" />
                                        Flete de Envío Calculado
                                    </span>
                                    <span className="text-base font-black text-blue-700 dark:text-blue-300">
                                        {formatCurrency(deliveryCalc.costUsd)}
                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 ml-1">
                                            ({formatBs(deliveryCalc.costUsd * rate)})
                                        </span>
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                    <div className="p-2 bg-white dark:bg-gray-900/60 rounded-lg">
                                        <p className="text-gray-400">Distancia</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{deliveryCalc.distanceKm.toFixed(1)} km</p>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-gray-900/60 rounded-lg">
                                        <p className="text-gray-400">Tiempo de Entrega</p>
                                        <p className="font-bold text-gray-900 dark:text-white">~{deliveryCalc.estimatedMinutes} min</p>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-gray-900/60 rounded-lg col-span-2 sm:col-span-1">
                                        <p className="text-gray-400">Zona</p>
                                        <p className="font-bold text-emerald-600">Edo. Lara Cobertura 100%</p>
                                    </div>
                                </div>
                                {newDeliveryForm.destinationAddress && (
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
                                        📍 <strong>Punto:</strong> {newDeliveryForm.destinationAddress}
                                    </p>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-amber-500" />
                                Instrucciones de Entrega / Punto de Referencia
                            </label>
                            <textarea
                                value={newDeliveryForm.specialInstructions}
                                onChange={(e) => setNewDeliveryForm(p => ({ ...p, specialInstructions: e.target.value }))}
                                rows={2}
                                placeholder="Ej: Casa blanca portón negro, frente al abasto. Llamar antes de salir."
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* PASO 4: FORMA DE PAGO & TOTALES */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4" />
                            4. Forma de Pago y Liquidación
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {[
                                { id: 'pagomovil', label: 'Pago Móvil', icon: '📱' },
                                { id: 'punto', label: 'Punto de Venta', icon: '💳' },
                                { id: 'zelle', label: 'Zelle USD', icon: '💵' },
                                { id: 'efectivo_usd', label: 'Efectivo $', icon: '💲' },
                                { id: 'efectivo_bs', label: 'Efectivo Bs.', icon: '🇻🇪' },
                            ].map((method) => (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                                        paymentMethod === method.id
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span className="text-base">{method.icon}</span>
                                    <span>{method.label}</span>
                                </button>
                            ))}
                        </div>

                        {(paymentMethod === 'pagomovil' || paymentMethod === 'punto' || paymentMethod === 'zelle') && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                        Banco Emisor / Receptor
                                    </label>
                                    <select
                                        value={paymentBank}
                                        onChange={(e) => setPaymentBank(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 font-medium"
                                    >
                                        {VENEZUELA_BANKS.map(b => (
                                            <option key={b.code} value={`${b.code} - ${b.name}`}>{b.code} - {b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                        Número de Referencia (Últimos 6 dígitos)
                                    </label>
                                    <Input
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder="Ej: 987654"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Gran Total Dual Box */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-blue-950 text-white shadow-xl space-y-2">
                            <div className="flex justify-between text-xs text-gray-300">
                                <span>Subtotal Calzados:</span>
                                <span>{formatCurrency(itemsSubtotalUsd)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-300">
                                <span>Flete Delivery (Lara):</span>
                                <span>{formatCurrency(shippingCostUsd)}</span>
                            </div>
                            <div className="pt-2 border-t border-white/20 flex justify-between items-baseline">
                                <span className="text-xs uppercase font-extrabold tracking-wider text-blue-200">
                                    Total General del Pedido:
                                </span>
                                <span className="text-2xl font-black text-white">
                                    {formatCurrency(grandTotalUsd)}
                                </span>
                            </div>
                            <div className="flex justify-between items-baseline text-emerald-300 text-xs font-mono font-bold">
                                <span>Total en Bolívares (Tasa BCV {rate.toFixed(2)}):</span>
                                <span className="text-base">{formatBs(grandTotalUsd * rate)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowNewModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1 flex items-center justify-center gap-2 py-3 font-bold shadow-lg shadow-blue-500/25"
                            onClick={handleCreateDelivery}
                            disabled={!selectedLocation || !deliveryCalc?.available || orderItems.length === 0}
                        >
                            <Truck className="w-4 h-4" />
                            Facturar y Despachar Pedido ({formatCurrency(grandTotalUsd)})
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* === DETAIL MODAL === */}
            <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Detalle de Delivery" size="lg">
                {selectedDelivery && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedDelivery.id}</p>
                            <DeliveryStatusBadge status={selectedDelivery.status} />
                        </div>

                        <DeliveryMap
                            center={[selectedDelivery.destinationLatitude || config.storeLat, selectedDelivery.destinationLongitude || config.storeLng]}
                            zoom={14}
                            marker={selectedDelivery.destinationLatitude ? { lat: selectedDelivery.destinationLatitude, lng: selectedDelivery.destinationLongitude } : null}
                            storeLocation={{ lat: config.storeLat, lng: config.storeLng }}
                            height="250px"
                        />

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Cliente</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{selectedDelivery.customerName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Teléfono</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{selectedDelivery.customerPhone || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Distancia</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{selectedDelivery.distanceKm?.toFixed(1)} km</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Costo</p>
                                <p className="font-bold text-emerald-600">{formatCurrency(selectedDelivery.deliveryCostUsd)}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-gray-500 mb-0.5">Dirección de destino</p>
                                <p className="text-gray-900 dark:text-white text-xs">{selectedDelivery.destinationAddress}</p>
                            </div>
                            {selectedDelivery.specialInstructions && (
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 mb-0.5">Instrucciones</p>
                                    <p className="text-gray-900 dark:text-white text-xs">{selectedDelivery.specialInstructions}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Cerrar</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
