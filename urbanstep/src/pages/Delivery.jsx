import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { deliveryService, FLEET_DRIVERS } from '../services/deliveryService';
import { userService } from '../services/userService';
import { formatCurrency } from '../utils/formatCurrency';
import { useCurrency } from '../contexts/CurrencyContext';
import {
    MapPin, Truck, Clock, DollarSign, Search, Navigation,
    Package, CheckCircle, AlertCircle, Phone, User, FileText,
    Route, Bike, XCircle, Eye, RefreshCw, ShoppingCart, Plus, Trash2, 
    CreditCard, Sparkles, MessageCircle, ExternalLink, Send, ShieldCheck,
    Star, ArrowRight, CheckCircle2, ChevronRight
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

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

/**
 * Single Delivery Route Map component
 */
function DeliveryMap({ center, zoom = 13, marker, onMapClick, storeLocation, height = '350px' }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const storeMarkerRef = useRef(null);
    const routeLineRef = useRef(null);

    useEffect(() => {
        if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS;
            document.head.appendChild(link);
        }

        import('leaflet').then((L) => {
            if (!mapRef.current) return;
            if (mapInstanceRef.current) return;

            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const map = L.map(mapRef.current).setView([center[0], center[1]], zoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(map);

            if (storeLocation) {
                const storeIcon = L.divIcon({
                    html: '<div style="background:#16a34a;width:34px;height:34px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:16px;">🏪</div>',
                    iconSize: [34, 34],
                    iconAnchor: [17, 34],
                    className: '',
                });
                storeMarkerRef.current = L.marker([storeLocation.lat, storeLocation.lng], { icon: storeIcon })
                    .addTo(map)
                    .bindPopup('<b>🏪 UrbanStep Store</b><br>C.C. Las Trinitarias, Barquisimeto');
            }

            map.on('click', (e) => {
                if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
            });

            mapInstanceRef.current = map;

            if (marker) {
                const destIcon = L.divIcon({
                    html: '<div style="background:#dc2626;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:16px;">📍</div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    className: '',
                });
                markerRef.current = L.marker([marker.lat, marker.lng], { icon: destIcon })
                    .addTo(map)
                    .bindPopup('<b>Destino de Entrega</b>');
            }
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current) return;
        import('leaflet').then((L) => {
            if (markerRef.current) mapInstanceRef.current.removeLayer(markerRef.current);
            if (routeLineRef.current) mapInstanceRef.current.removeLayer(routeLineRef.current);

            if (marker) {
                const destIcon = L.divIcon({
                    html: '<div style="background:#dc2626;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:16px;">📍</div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    className: '',
                });
                markerRef.current = L.marker([marker.lat, marker.lng], { icon: destIcon })
                    .addTo(mapInstanceRef.current)
                    .bindPopup('<b>Destino de Entrega</b>');

                if (storeLocation) {
                    routeLineRef.current = L.polyline(
                        [[storeLocation.lat, storeLocation.lng], [marker.lat, marker.lng]],
                        { color: '#3b82f6', weight: 3, dashArray: '8, 8', opacity: 0.8 }
                    ).addTo(mapInstanceRef.current);

                    const bounds = L.latLngBounds([storeLocation.lat, storeLocation.lng], [marker.lat, marker.lng]);
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
            style={{ height, width: '100%', borderRadius: '14px', zIndex: 1 }}
            className="border border-gray-200 dark:border-gray-700 shadow-inner"
        />
    );
}

/**
 * Multi Delivery Radar Map component for Live Tracking
 */
function MultiDeliveryMap({ deliveries, storeLocation, height = '520px', onSelectDelivery }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS;
            document.head.appendChild(link);
        }

        import('leaflet').then((L) => {
            if (!mapRef.current) return;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const store = storeLocation || { lat: 10.06833, lng: -69.28499 };
            const map = L.map(mapRef.current).setView([store.lat, store.lng], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(map);

            const storeIcon = L.divIcon({
                html: '<div style="background:#16a34a;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.35);font-size:18px;">🏪</div>',
                iconSize: [36, 36],
                iconAnchor: [18, 36],
            });
            L.marker([store.lat, store.lng], { icon: storeIcon })
                .addTo(map)
                .bindPopup('<div style="font-family:sans-serif;font-size:12px;"><b>🏪 UrbanStep Store</b><br/>C.C. Las Trinitarias, Barquisimeto<br/><span style="color:#16a34a;font-weight:bold;">Centro de Despacho Principal</span></div>');

            const allPoints = [[store.lat, store.lng]];

            deliveries.forEach((d) => {
                if (!d.destinationLatitude || !d.destinationLongitude) return;
                allPoints.push([d.destinationLatitude, d.destinationLongitude]);

                const color = d.status === 'en_camino' ? '#4f46e5' :
                              d.status === 'entregado' ? '#16a34a' :
                              d.status === 'asignado' ? '#2563eb' : '#d97706';

                const iconEmoji = d.status === 'en_camino' ? '🛵' :
                                  d.status === 'entregado' ? '✅' :
                                  d.status === 'asignado' ? '👤' : '📦';

                const markerIcon = L.divIcon({
                    html: `<div style="background:${color};width:34px;height:34px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:15px;color:white;">${iconEmoji}</div>`,
                    iconSize: [34, 34],
                    iconAnchor: [17, 34],
                });

                const popupHtml = `
                    <div style="font-family:sans-serif;font-size:12px;min-width:190px;">
                        <b style="color:${color};font-size:13px;">${d.id}</b><br/>
                        <b>Cliente:</b> ${d.customerName || 'Cliente'}<br/>
                        <b>Dirección:</b> ${d.destinationAddress || 'Sin dirección'}<br/>
                        <b>Motorizado:</b> ${d.driverName || 'Sin asignar'}<br/>
                        <b>Distancia:</b> ${d.distanceKm?.toFixed(1)} km (~${d.estimatedTimeMin} min)<br/>
                        <b>Estado:</b> <span style="text-transform:capitalize;font-weight:bold;color:${color};">${d.status}</span>
                    </div>
                `;

                L.marker([d.destinationLatitude, d.destinationLongitude], { icon: markerIcon })
                    .addTo(map)
                    .bindPopup(popupHtml);

                if (d.status === 'en_camino' || d.status === 'asignado') {
                    L.polyline([[store.lat, store.lng], [d.destinationLatitude, d.destinationLongitude]], {
                        color,
                        weight: 3,
                        dashArray: '6, 6',
                        opacity: 0.75
                    }).addTo(map);
                }
            });

            if (allPoints.length > 1) {
                map.fitBounds(allPoints, { padding: [45, 45] });
            }

            mapInstanceRef.current = map;
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [deliveries]);

    return (
        <div
            ref={mapRef}
            style={{ height, width: '100%', borderRadius: '16px', zIndex: 1 }}
            className="border border-gray-200 dark:border-gray-700 shadow-inner"
        />
    );
}

/**
 * Status badge with pulse animations
 */
function DeliveryStatusBadge({ status }) {
    const map = {
        pendiente: { bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800', label: 'Pendiente', icon: Clock, pulse: false },
        asignado: { bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800', label: 'Asignado', icon: User, pulse: false },
        en_camino: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800', label: 'En Camino', icon: Truck, pulse: true },
        entregado: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800', label: 'Entregado', icon: CheckCircle, pulse: false },
        cancelado: { bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800', label: 'Cancelado', icon: XCircle, pulse: false },
    };
    const config = map[status] || map.pendiente;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bg}`}>
            {config.pulse && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />}
            <Icon className="w-3.5 h-3.5" />
            {config.label}
        </span>
    );
}

export default function Delivery() {
    const { rate, formatBs } = useCurrency();
    const [deliveries, setDeliveries] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list'); // 'list', 'map', 'fleet'
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [detailItems, setDetailItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // Driver assignment modal & dynamic fleet
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [deliveryToAssign, setDeliveryToAssign] = useState(null);
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [customDriverForm, setCustomDriverForm] = useState({ name: '', phone: '', vehicle: '' });
    const [isCustomDriver, setIsCustomDriver] = useState(false);

    // Flota de motorizados sincronizada con la base de datos de usuarios
    const [fleetDrivers, setFleetDrivers] = useState(() => {
        const motorizados = userService.getAll().filter(u => u.role === 'Motorizado' && u.active);
        if (motorizados.length > 0) {
            return motorizados.map(m => ({
                id: m.id,
                name: m.name,
                phone: m.phone || '0412-5551234',
                vehicle: m.vehicle || 'Bera SBR 150 Azul',
                plate: m.plate || 'AB1C23D',
                rating: m.rating || 4.9,
                deliveriesCount: m.deliveriesCount || 0,
                active: m.active
            }));
        }
        return FLEET_DRIVERS;
    });

    useEffect(() => {
        const updateDrivers = () => {
            const motorizados = userService.getAll().filter(u => u.role === 'Motorizado' && u.active);
            if (motorizados.length > 0) {
                setFleetDrivers(motorizados.map(m => ({
                    id: m.id,
                    name: m.name,
                    phone: m.phone || '0412-5551234',
                    vehicle: m.vehicle || 'Bera SBR 150 Azul',
                    plate: m.plate || 'AB1C23D',
                    rating: m.rating || 4.9,
                    deliveriesCount: m.deliveriesCount || 0,
                    active: m.active
                })));
            } else {
                setFleetDrivers(FLEET_DRIVERS);
            }
        };
        window.addEventListener('users_changed', updateDrivers);
        return () => window.removeEventListener('users_changed', updateDrivers);
    }, []);

    const config = deliveryService.getConfig();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [deliveriesData, statsData] = await Promise.all([
                deliveryService.getAll(statusFilter !== 'all' ? { status: statusFilter } : {}),
                deliveryService.getStats()
            ]);
            setDeliveries(deliveriesData);
            setStats(statsData);
        } catch (err) {
            toast.error('Error al cargar datos de delivery');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        loadData();
        const handler = () => loadData();
        window.addEventListener('deliveries_updated', handler);
        return () => window.removeEventListener('deliveries_updated', handler);
    }, [loadData]);

    // Load detail items when detail modal opens
    useEffect(() => {
        if (selectedDelivery && selectedDelivery.saleId) {
            setLoadingItems(true);
            deliveryService.getDeliveryOrderItems(selectedDelivery.saleId)
                .then(items => setDetailItems(items))
                .catch(() => setDetailItems([]))
                .finally(() => setLoadingItems(false));
        } else {
            setDetailItems([]);
        }
    }, [selectedDelivery]);

    // 1-Click WhatsApp to Customer
    const handleOpenWhatsAppCustomer = (delivery) => {
        const rawPhone = delivery.customerPhone || '';
        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '58' + cleanPhone.slice(1);
        } else if (!cleanPhone.startsWith('58')) {
            cleanPhone = '58' + cleanPhone;
        }

        const driverInfo = delivery.driverName 
            ? `\n🛵 *Conductor asignado:* ${delivery.driverName} (${delivery.driverVehicle || 'Moto'}) - 📞 ${delivery.driverPhone || 'Contacto Tienda'}`
            : '';

        const text = encodeURIComponent(
            `👟 *¡Hola ${delivery.customerName || 'Estimado Cliente'}! Saludos de UrbanStep Store* 👋\n\n` +
            `Te informamos que tu pedido de calzado está listo y gestionado para entrega:\n` +
            `📦 *Envío:* ${delivery.id}\n` +
            `📍 *Destino:* ${delivery.destinationAddress || 'Barquisimeto'}\n` +
            `⏱️ *Tiempo estimado:* ~${delivery.estimatedTimeMin || 30} minutos\n` +
            `📊 *Estado actual:* ${delivery.status.toUpperCase()}${driverInfo}\n\n` +
            `💵 *Monto flete:* ${formatCurrency(delivery.deliveryCostUsd)} (${formatBs(delivery.deliveryCostBs || 0)})\n\n` +
            `¡Gracias por preferir a UrbanStep!`
        );

        window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    };

    // 1-Click WhatsApp to Driver
    const handleOpenWhatsAppDriver = (delivery) => {
        const rawPhone = delivery.driverPhone || '';
        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '58' + cleanPhone.slice(1);
        } else if (!cleanPhone.startsWith('58')) {
            cleanPhone = '58' + cleanPhone;
        }

        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${delivery.originLatitude || config.storeLat},${delivery.originLongitude || config.storeLng}&destination=${delivery.destinationLatitude},${delivery.destinationLongitude}&travelmode=driving`;

        const text = encodeURIComponent(
            `🛵 *HOJA DE RUTA — URBANSTEP DELIVERY*\n\n` +
            `Hola ${delivery.driverName || 'Compañero'}, tienes un despacho asignado:\n` +
            `📦 *Orden:* ${delivery.id}\n` +
            `👤 *Cliente:* ${delivery.customerName}\n` +
            `📞 *Teléfono Cliente:* ${delivery.customerPhone}\n` +
            `📍 *Dirección:* ${delivery.destinationAddress}\n` +
            `📝 *Instrucciones:* ${delivery.specialInstructions || 'Entregar en mano'}\n` +
            `🗺️ *Ruta Google Maps:* ${googleMapsUrl}\n` +
            `💵 *Flete:* ${formatCurrency(delivery.deliveryCostUsd)} (${formatBs(delivery.deliveryCostBs || 0)})\n\n` +
            `Por favor confirma recepción y avisa al salir a ruta.`
        );

        window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    };

    // 1-Click Turn-by-Turn GPS Google Maps
    const handleOpenGoogleMaps = (delivery) => {
        const originLat = delivery.originLatitude || config.storeLat;
        const originLng = delivery.originLongitude || config.storeLng;
        const destLat = delivery.destinationLatitude;
        const destLng = delivery.destinationLongitude;

        if (!destLat || !destLng) {
            toast.error('Coordenadas de destino no disponibles');
            return;
        }

        const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
        window.open(url, '_blank');
    };

    // Status Actions
    const handleUpdateStatus = async (deliveryId, newStatus) => {
        try {
            await deliveryService.updateStatus(deliveryId, newStatus);
            toast.success(`Estado de entrega actualizado a: ${newStatus}`);
            loadData();
        } catch (err) {
            toast.error('Error: ' + err.message);
        }
    };

    const handleDeleteDelivery = async (deliveryId) => {
        if (window.confirm(`¿Estás seguro de eliminar el registro de delivery ${deliveryId} de la base de datos?`)) {
            try {
                await deliveryService.deleteDelivery(deliveryId);
                toast.success('Registro de delivery eliminado');
                loadData();
            } catch (err) {
                toast.error(err.message);
            }
        }
    };

    // Driver Modal Trigger & Submit
    const handleOpenAssignModal = (delivery) => {
        setDeliveryToAssign(delivery);
        setIsCustomDriver(false);
        setSelectedDriverId(fleetDrivers[0]?.id || 'mot-1');
        setCustomDriverForm({ name: '', phone: '', vehicle: '' });
        setShowAssignModal(true);
    };

    const handleConfirmAssignDriver = async () => {
        if (!deliveryToAssign) return;

        let driverData = null;
        if (isCustomDriver) {
            if (!customDriverForm.name.trim() || !customDriverForm.phone.trim()) {
                toast.error('Ingresa nombre y teléfono del motorizado');
                return;
            }
            driverData = {
                driverName: customDriverForm.name.trim(),
                driverPhone: customDriverForm.phone.trim(),
                driverVehicle: customDriverForm.vehicle.trim() || 'Motocicleta Externa'
            };
        } else {
            const found = fleetDrivers.find(d => d.id === selectedDriverId) || FLEET_DRIVERS.find(d => d.id === selectedDriverId);
            if (!found) {
                toast.error('Selecciona un motorizado de la flota');
                return;
            }
            driverData = {
                driverName: found.name,
                driverPhone: found.phone,
                driverVehicle: found.vehicle
            };
        }

        try {
            await deliveryService.assignDriver(deliveryToAssign.id, driverData);
            toast.success(`¡Motorizado ${driverData.driverName} asignado exitosamente!`);
            setShowAssignModal(false);
            loadData();
        } catch (err) {
            toast.error('Error asignando motorizado: ' + err.message);
        }
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
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                        <Truck className="w-8 h-8 text-blue-600" />
                        Centro Logístico de Delivery — Estado Lara
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Despachos en tiempo real, geolocalización satelital, flota de motorizados y enlace con WhatsApp
                    </p>
                </div>
                <div className="flex gap-2.5">
                    <Button variant="primary" onClick={loadData} className="flex items-center gap-1.5 shadow-sm">
                        <RefreshCw className="w-4 h-4" />
                        Actualizar Despachos
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                    <Card hover className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Envíos</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{stats.total}</p>
                                <span className="text-[10px] text-gray-400">{stats.todayCount} hoy</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600">
                                <Package className="w-5 h-5" />
                            </div>
                        </div>
                    </Card>

                    <Card hover className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-amber-600">Por Asignar</p>
                                <p className="text-2xl font-black text-amber-600 mt-0.5">{stats.pendientes}</p>
                                <span className="text-[10px] text-amber-500 font-medium">Requieren Chofer</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                    </Card>

                    <Card hover className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-indigo-600">En Ruta / Asignados</p>
                                <p className="text-2xl font-black text-indigo-600 mt-0.5">{(stats.asignados || 0) + (stats.enCamino || 0)}</p>
                                <span className="text-[10px] text-indigo-500 font-medium">{stats.enCamino} en calle</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600">
                                <Bike className="w-5 h-5" />
                            </div>
                        </div>
                    </Card>

                    <Card hover className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-emerald-600">Entregados</p>
                                <p className="text-2xl font-black text-emerald-600 mt-0.5">{stats.entregados}</p>
                                <span className="text-[10px] text-emerald-500 font-medium">Exitosos</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                    </Card>

                    <Card hover className="p-4 col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Fletes Cobrados</p>
                                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{formatCurrency(stats.totalRevenueUsd)}</p>
                                <span className="text-[10px] text-emerald-600 font-mono font-bold">{formatBs(stats.totalRevenueUsd * rate)}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Navigation Tabs (List, Map, Fleet) */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 gap-4">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'list'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <Package className="w-4 h-4" />
                    Lista de Envíos ({deliveries.length})
                </button>
                <button
                    onClick={() => setActiveTab('map')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'map'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <MapPin className="w-4 h-4" />
                    Radar en Vivo (Lara)
                </button>
                <button
                    onClick={() => setActiveTab('fleet')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'fleet'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <Bike className="w-4 h-4" />
                    Flota de Motorizados ({FLEET_DRIVERS.length})
                </button>
            </div>

            {/* === TAB 1: LIST VIEW === */}
            {activeTab === 'list' && (
                <div className="space-y-4">
                    {/* Status Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {statuses.map(s => {
                            const count = s.id === 'all' ? deliveries.length : deliveries.filter(d => d.status === s.id).length;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setStatusFilter(s.id)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                        statusFilter === s.id
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{s.label}</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                        statusFilter === s.id ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Deliveries Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {deliveries.map(delivery => (
                            <Card key={delivery.id} hover className="p-4 flex flex-col justify-between border border-gray-200 dark:border-gray-800 transition-all shadow-sm">
                                <div className="space-y-3">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                                                    {delivery.id}
                                                </span>
                                                {delivery.saleId && (
                                                    <span className="text-[11px] font-mono text-gray-400">
                                                        Venta #{delivery.saleId}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-1">
                                                {delivery.createdAt ? new Date(delivery.createdAt).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Hoy'}
                                            </p>
                                        </div>
                                        <DeliveryStatusBadge status={delivery.status} />
                                    </div>

                                    {/* Customer & Destination Details */}
                                    <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-2 border border-gray-100 dark:border-gray-700/60 text-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                                                <User className="w-3.5 h-3.5 text-blue-500" />
                                                <span>{delivery.customerName || 'Cliente General'}</span>
                                            </div>
                                            {delivery.customerPhone && (
                                                <span className="font-mono text-gray-500">{delivery.customerPhone}</span>
                                            )}
                                        </div>

                                        <div className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300">
                                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{delivery.destinationAddress || 'Dirección de destino en Lara'}</span>
                                        </div>

                                        {delivery.specialInstructions && (
                                            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/40 italic">
                                                📝 "{delivery.specialInstructions}"
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 dark:border-gray-700/60 text-[11px] text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Route className="w-3.5 h-3.5 text-blue-500" />
                                                {delivery.distanceKm?.toFixed(1)} km · ~{delivery.estimatedTimeMin} min
                                            </span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(delivery.deliveryCostUsd)} ({formatBs(delivery.deliveryCostBs || 0)})
                                            </span>
                                        </div>
                                    </div>

                                    {/* Assigned Driver Badge */}
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                                🛵
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                    {delivery.driverName ? delivery.driverName : '⚠️ Sin Motorizado Asignado'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 truncate">
                                                    {delivery.driverVehicle ? `${delivery.driverVehicle} • ${delivery.driverPhone || ''}` : 'Asigna un conductor para iniciar ruta'}
                                                </p>
                                            </div>
                                        </div>
                                        {delivery.driverPhone && (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenWhatsAppDriver(delivery)}
                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-xs"
                                                title="Enviar orden al WhatsApp del motorizado"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Card Action Bar */}
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        {delivery.customerPhone && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleOpenWhatsAppCustomer(delivery)}
                                                className="!py-1 !px-2.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1"
                                                title="Notificar estado por WhatsApp al cliente"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                WhatsApp
                                            </Button>
                                        )}
                                        {delivery.destinationLatitude && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleOpenGoogleMaps(delivery)}
                                                className="!py-1 !px-2.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 flex items-center gap-1"
                                                title="Abrir GPS en Google Maps"
                                            >
                                                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                                                GPS Ruta
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 ml-auto">
                                        {delivery.status === 'pendiente' && (
                                            <>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleOpenAssignModal(delivery)}
                                                    className="!py-1 !px-2.5 text-xs flex items-center gap-1 font-bold"
                                                >
                                                    <Bike className="w-3.5 h-3.5" />
                                                    Asignar
                                                </Button>
                                                <button
                                                    onClick={() => handleUpdateStatus(delivery.id, 'cancelado')}
                                                    className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    Cancelar
                                                </button>
                                            </>
                                        )}

                                        {delivery.status === 'asignado' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleUpdateStatus(delivery.id, 'en_camino')}
                                                className="!py-1 !px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1"
                                            >
                                                <Truck className="w-3.5 h-3.5" />
                                                Despachar a Ruta
                                            </Button>
                                        )}

                                        {delivery.status === 'en_camino' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleUpdateStatus(delivery.id, 'entregado')}
                                                className="!py-1 !px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Confirmar Entrega
                                            </Button>
                                        )}

                                        <button
                                            onClick={() => { setSelectedDelivery(delivery); setShowDetailModal(true); }}
                                            className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Ver
                                        </button>

                                        <button
                                            onClick={() => handleDeleteDelivery(delivery.id)}
                                            className="p-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg"
                                            title="Eliminar de base de datos"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {deliveries.length === 0 && (
                        <div className="text-center py-16 bg-white dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <Truck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-600 dark:text-gray-300 font-bold">No hay entregas en este filtro</p>
                            <p className="text-xs text-gray-400 mt-1">Crea un nuevo pedido de delivery o cambia de pestaña</p>
                        </div>
                    )}
                </div>
            )}

            {/* === TAB 2: LIVE RADAR MAP === */}
            {activeTab === 'map' && (
                <div className="space-y-4">
                    <Card className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Navigation className="w-4 h-4 text-blue-600" />
                                    Radar de Envíos UrbanStep (Estado Lara)
                                </h3>
                                <p className="text-xs text-gray-500">Punto de Origen: C.C. Las Trinitarias, Barquisimeto</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1 font-semibold text-amber-600">
                                    <span className="w-3 h-3 rounded-full bg-amber-500" /> Pendiente
                                </span>
                                <span className="flex items-center gap-1 font-semibold text-blue-600">
                                    <span className="w-3 h-3 rounded-full bg-blue-600" /> Asignado
                                </span>
                                <span className="flex items-center gap-1 font-semibold text-indigo-600">
                                    <span className="w-3 h-3 rounded-full bg-indigo-600" /> En Camino
                                </span>
                                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                                    <span className="w-3 h-3 rounded-full bg-emerald-600" /> Entregado
                                </span>
                            </div>
                        </div>

                        <MultiDeliveryMap
                            deliveries={deliveries}
                            storeLocation={{ lat: config.storeLat, lng: config.storeLng }}
                            height="540px"
                        />
                    </Card>
                </div>
            )}

            {/* === TAB 3: FLEET MOTORIZADOS === */}
            {activeTab === 'fleet' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {FLEET_DRIVERS.map(driver => {
                            const activeDeliveries = deliveries.filter(d => d.driverName === driver.name && (d.status === 'asignado' || d.status === 'en_camino'));
                            const totalDone = deliveries.filter(d => d.driverName === driver.name && d.status === 'entregado').length;

                            return (
                                <Card key={driver.id} hover className="p-5 flex flex-col justify-between border border-gray-200 dark:border-gray-700">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-blue-500/20">
                                                🛵
                                            </div>
                                            <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                {driver.rating}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-base text-gray-900 dark:text-white">{driver.name}</h3>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{driver.vehicle}</p>
                                            <p className="text-[11px] font-mono text-gray-400">Placa: {driver.plate}</p>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Teléfono:</span>
                                                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{driver.phone}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Rutas activas hoy:</span>
                                                <span className={`font-bold ${activeDeliveries.length > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                    {activeDeliveries.length} en curso
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Entregas históricas:</span>
                                                <span className="font-bold text-emerald-600">{driver.deliveriesCount + totalDone}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const cleanPhone = driver.phone.replace(/\D/g, '').replace(/^0/, '58');
                                                window.open(`https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(driver.name)},%20saludos%20desde%20la%20central%20de%20UrbanStep`, '_blank');
                                            }}
                                            className="w-full py-2 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800"
                                        >
                                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                                            WhatsApp Directo
                                        </button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* === DRIVER ASSIGNMENT MODAL === */}
            <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="🛵 Asignar Motorizado de la Flota" size="md">
                {deliveryToAssign && (
                    <div className="space-y-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 text-xs space-y-1">
                            <p className="font-bold text-blue-900 dark:text-blue-300">
                                Envío #{deliveryToAssign.id} · {deliveryToAssign.customerName}
                            </p>
                            <p className="text-blue-800 dark:text-blue-400 truncate">
                                📍 {deliveryToAssign.destinationAddress}
                            </p>
                        </div>

                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setIsCustomDriver(false)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    !isCustomDriver ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm' : 'text-gray-500'
                                }`}
                            >
                                Flota UrbanStep
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsCustomDriver(true)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    isCustomDriver ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm' : 'text-gray-500'
                                }`}
                            >
                                Repartidor Externo
                            </button>
                        </div>

                        {!isCustomDriver ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {FLEET_DRIVERS.map(driver => (
                                    <div
                                        key={driver.id}
                                        onClick={() => setSelectedDriverId(driver.id)}
                                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                            selectedDriverId === driver.id
                                                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                                                🛵
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{driver.name}</p>
                                                <p className="text-[11px] text-gray-500">{driver.vehicle} · {driver.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                                            {driver.rating}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Nombre del Motorizado *
                                    </label>
                                    <Input
                                        value={customDriverForm.name}
                                        onChange={(e) => setCustomDriverForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Ej: José Márquez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Teléfono Celular *
                                    </label>
                                    <Input
                                        value={customDriverForm.phone}
                                        onChange={(e) => setCustomDriverForm(p => ({ ...p, phone: e.target.value }))}
                                        placeholder="0412-1234567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Modelo de Moto / Vehículo
                                    </label>
                                    <Input
                                        value={customDriverForm.vehicle}
                                        onChange={(e) => setCustomDriverForm(p => ({ ...p, vehicle: e.target.value }))}
                                        placeholder="Ej: Empire Keeway Arsen II 150"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setShowAssignModal(false)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button variant="primary" onClick={handleConfirmAssignDriver} className="flex-1 font-bold">
                                Confirmar Asignación
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* === DETAIL MODAL WITH SNEAKER ITEMS BREAKDOWN === */}
            <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="📦 Hoja de Despacho y Contenido del Paquete" size="lg">
                {selectedDelivery && (
                    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <p className="text-base font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    {selectedDelivery.id}
                                </p>
                                <p className="text-xs text-gray-400">
                                    Fecha: {new Date(selectedDelivery.createdAt).toLocaleString('es-VE')}
                                </p>
                            </div>
                            <DeliveryStatusBadge status={selectedDelivery.status} />
                        </div>

                        {/* Calzados en el Paquete */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                <ShoppingCart className="w-4 h-4" />
                                Calzados y Artículos en este Pedido
                            </h4>

                            {loadingItems ? (
                                <p className="text-xs text-gray-400 py-3 text-center">Cargando calzados de la venta...</p>
                            ) : detailItems.length > 0 ? (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                    {detailItems.map((item, idx) => (
                                        <div key={idx} className="p-2.5 flex items-center justify-between bg-white dark:bg-gray-800">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">👟</span>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                                                    <p className="text-[11px] text-gray-500">
                                                        {item.brand} • Talla: <strong className="text-blue-600">{item.size}</strong> {item.color ? `• Color: ${item.color}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-900 dark:text-white">{item.quantity}x {formatCurrency(item.price)}</p>
                                                <p className="text-[11px] font-bold text-emerald-600">{formatCurrency(item.subtotal)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-500 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-500" />
                                    <span>Paquete de Calzado UrbanStep Store — Despacho a Domicilio</span>
                                </div>
                            )}
                        </div>

                        {/* Map Route */}
                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <DeliveryMap
                                center={[selectedDelivery.destinationLatitude || config.storeLat, selectedDelivery.destinationLongitude || config.storeLng]}
                                zoom={14}
                                marker={selectedDelivery.destinationLatitude ? { lat: selectedDelivery.destinationLatitude, lng: selectedDelivery.destinationLongitude } : null}
                                storeLocation={{ lat: config.storeLat, lng: config.storeLng }}
                                height="220px"
                            />
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="text-gray-400">Cliente Receptor:</p>
                                <p className="font-bold text-gray-900 dark:text-white">{selectedDelivery.customerName}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Teléfono Contacto:</p>
                                <p className="font-bold text-gray-900 dark:text-white">{selectedDelivery.customerPhone || '—'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Motorizado Asignado:</p>
                                <p className="font-bold text-blue-600">{selectedDelivery.driverName || 'Sin asignar'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Vehículo / Moto:</p>
                                <p className="font-bold text-gray-900 dark:text-white">{selectedDelivery.driverVehicle || '—'}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-gray-400">Dirección Completa:</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{selectedDelivery.destinationAddress}</p>
                            </div>
                            {selectedDelivery.specialInstructions && (
                                <div className="col-span-2">
                                    <p className="text-gray-400">Instrucciones Especiales:</p>
                                    <p className="text-amber-600 dark:text-amber-400 font-medium">{selectedDelivery.specialInstructions}</p>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions in Detail */}
                        <div className="flex gap-2 pt-2">
                            {selectedDelivery.customerPhone && (
                                <Button
                                    variant="secondary"
                                    onClick={() => handleOpenWhatsAppCustomer(selectedDelivery)}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                                >
                                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                                    WhatsApp Cliente
                                </Button>
                            )}
                            {selectedDelivery.destinationLatitude && (
                                <Button
                                    variant="secondary"
                                    onClick={() => handleOpenGoogleMaps(selectedDelivery)}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-700 bg-blue-50 dark:bg-blue-950/40"
                                >
                                    <Navigation className="w-4 h-4 text-blue-600" />
                                    GPS Turn-by-Turn
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
