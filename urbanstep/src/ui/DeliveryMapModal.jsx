import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { deliveryService } from '../services/deliveryService';
import { useCurrency } from '../contexts/CurrencyContext';
import {
    MapPin,
    Truck,
    Navigation,
    Search,
    Clock,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    User,
    Phone,
    FileText,
    Store,
    Route,
    X,
    Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Leaflet CSS CDN is also imported in index.html
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

// Destinos populares en Barquisimeto y Estado Lara para selección rápida del cajero
const LARA_PRESETS = [
    { name: 'Barquisimeto Este (Trinitarias)', lat: 10.0715, lng: -69.2980, address: 'Av. Los Leones, C.C. Las Trinitarias, Barquisimeto, Edo. Lara' },
    { name: 'Barquisimeto Centro (Carrera 19)', lat: 10.0645, lng: -69.3175, address: 'Carrera 19 con Calle 25, Centro, Barquisimeto, Edo. Lara' },
    { name: 'Barquisimeto Oeste (Metrópolis)', lat: 10.0520, lng: -69.3780, address: 'Av. Florencio Jiménez, C.C. Metrópolis, Barquisimeto, Edo. Lara' },
    { name: 'Santa Rosa (Divina Pastora)', lat: 10.0722, lng: -69.2785, address: 'Pueblo de Santa Rosa, Santuario Divina Pastora, Edo. Lara' },
    { name: 'Cabudare Centro (Av. La Mata)', lat: 10.0335, lng: -69.2620, address: 'Av. La Mata, Cabudare, Palavecino, Edo. Lara' },
    { name: 'Cabudare (Valle Hondo / Recreo)', lat: 10.0450, lng: -69.2480, address: 'Urb. Valle Hondo, Cabudare, Palavecino, Edo. Lara' },
    { name: 'Zona Industrial II', lat: 10.0890, lng: -69.3550, address: 'Av. Circunvalación Norte, Zona Industrial II, Barquisimeto, Edo. Lara' },
    { name: 'Tamaca / El Cují', lat: 10.1550, lng: -69.3250, address: 'Av. Intercomunal Barquisimeto-Duaca, Tamaca, Edo. Lara' },
    { name: 'Carora (Torres)', lat: 10.1740, lng: -70.0820, address: 'Av. Francisco de Miranda, Carora, Edo. Lara' },
    { name: 'Quíbor (Jiménez)', lat: 9.9280, lng: -69.6200, address: 'Av. Pedro León Torres, Quíbor, Edo. Lara' },
    { name: 'Sanare (Andrés Eloy Blanco)', lat: 9.7150, lng: -69.6580, address: 'Centro Poblado Sanare, Edo. Lara' }
];

export default function DeliveryMapModal({
    isOpen,
    onClose,
    onConfirm,
    initialData = null,
    customer = null
}) {
    const { rate, formatBs, formatUSD } = useCurrency();
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const originMarkerRef = useRef(null);
    const destMarkerRef = useRef(null);
    const routeLineRef = useRef(null);

    const config = deliveryService.getConfig();
    const storeLocation = { lat: config.storeLat, lng: config.storeLng, address: config.storeAddress };

    // Initial state
    const [selectedCoords, setSelectedCoords] = useState(
        initialData?.lat && initialData?.lng
            ? { lat: initialData.lat, lng: initialData.lng }
            : { lat: 10.4850, lng: -66.8650 } // Las Mercedes default nearby
    );

    const [customerName, setCustomerName] = useState(
        initialData?.customerName ||
        (customer?.id && customer?.id !== 'publico' ? `${customer.firstName} ${customer.lastName}` : '') ||
        'Cliente'
    );
    const [customerPhone, setCustomerPhone] = useState(
        initialData?.customerPhone || customer?.phone || ''
    );
    const [destinationAddress, setDestinationAddress] = useState(
        initialData?.address || ''
    );
    const [notes, setNotes] = useState(initialData?.notes || '');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [deliveryCalc, setDeliveryCalc] = useState(null);

    // Sync customer info if customer changes while open
    useEffect(() => {
        if (customer && customer.id !== 'publico' && !initialData) {
            setCustomerName(`${customer.firstName} ${customer.lastName}`);
            if (customer.phone) setCustomerPhone(customer.phone);
            if (customer.address) setDestinationAddress(customer.address);
        }
    }, [customer, initialData]);

    // Calculate delivery whenever coordinates change
    const updateCalculation = useCallback((coords) => {
        if (!coords) return;
        const calc = deliveryService.calculateDeliveryCost({
            destinationLat: coords.lat,
            destinationLng: coords.lng,
        });
        setDeliveryCalc(calc);
    }, []);

    // Reverse geocode coords to address
    const reverseGeocodeCoords = async (coords) => {
        try {
            const geo = await deliveryService.reverseGeocode(coords.lat, coords.lng);
            if (geo?.address) {
                setDestinationAddress(geo.address);
            }
        } catch (e) {
            console.error('Reverse geocode error:', e);
        }
    };

    // Initialize or update Map
    useEffect(() => {
        if (!isOpen) return;

        // Ensure Leaflet CSS
        if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS;
            document.head.appendChild(link);
        }

        let isCancelled = false;

        import('leaflet').then((L) => {
            if (isCancelled || !mapContainerRef.current) return;

            // Fix default marker icon issue in Vite
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            // Initialize map if not yet created
            if (!mapInstanceRef.current) {
                const map = L.map(mapContainerRef.current, {
                    zoomControl: true,
                    attributionControl: false,
                }).setView([storeLocation.lat, storeLocation.lng], 13);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                }).addTo(map);

                // Origin Store Marker (Green Shop)
                const storeIcon = L.divIcon({
                    html: `
                        <div style="background:#16a34a;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.4);">
                            <span style="font-size:18px;">🏪</span>
                        </div>
                    `,
                    iconSize: [36, 36],
                    iconAnchor: [18, 36],
                    className: '',
                });

                originMarkerRef.current = L.marker([storeLocation.lat, storeLocation.lng], { icon: storeIcon })
                    .addTo(map)
                    .bindPopup(`<b>🏪 UrbanStep Tienda</b><br><span style="font-size:11px;">${storeLocation.address}</span>`);

                // Map Click Listener to pick destination
                map.on('click', (e) => {
                    const newCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
                    setSelectedCoords(newCoords);
                    updateCalculation(newCoords);
                    reverseGeocodeCoords(newCoords);
                });

                mapInstanceRef.current = map;
            }

            const map = mapInstanceRef.current;

            // Invalidate size after modal animation
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 200);

            // Destination Marker (Red Pin with pulse)
            const destIcon = L.divIcon({
                html: `
                    <div style="background:#ef4444;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(239,68,68,0.5);">
                        <span style="font-size:18px;">📍</span>
                    </div>
                `,
                iconSize: [36, 36],
                iconAnchor: [18, 36],
                className: '',
            });

            if (destMarkerRef.current) {
                destMarkerRef.current.setLatLng([selectedCoords.lat, selectedCoords.lng]);
            } else {
                destMarkerRef.current = L.marker([selectedCoords.lat, selectedCoords.lng], {
                    icon: destIcon,
                    draggable: true,
                }).addTo(map);

                destMarkerRef.current.on('dragend', (e) => {
                    const latlng = e.target.getLatLng();
                    const newCoords = { lat: latlng.lat, lng: latlng.lng };
                    setSelectedCoords(newCoords);
                    updateCalculation(newCoords);
                    reverseGeocodeCoords(newCoords);
                });
            }

            // Draw connecting route polyline
            if (routeLineRef.current) {
                routeLineRef.current.setLatLngs([
                    [storeLocation.lat, storeLocation.lng],
                    [selectedCoords.lat, selectedCoords.lng]
                ]);
            } else {
                routeLineRef.current = L.polyline(
                    [[storeLocation.lat, storeLocation.lng], [selectedCoords.lat, selectedCoords.lng]],
                    {
                        color: '#3b82f6',
                        weight: 4,
                        dashArray: '8, 8',
                        opacity: 0.85
                    }
                ).addTo(map);
            }

            // Fit bounds to show both markers comfortably
            const bounds = L.latLngBounds(
                [storeLocation.lat, storeLocation.lng],
                [selectedCoords.lat, selectedCoords.lng]
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });

            updateCalculation(selectedCoords);
        });

        return () => {
            isCancelled = true;
        };
    }, [isOpen, selectedCoords.lat, selectedCoords.lng, updateCalculation, storeLocation.lat, storeLocation.lng, storeLocation.address]);

    // Clean up map when modal closes
    useEffect(() => {
        if (!isOpen && mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            originMarkerRef.current = null;
            destMarkerRef.current = null;
            routeLineRef.current = null;
        }
    }, [isOpen]);

    // Handle Preset Selection
    const handleSelectPreset = (preset) => {
        const coords = { lat: preset.lat, lng: preset.lng };
        setSelectedCoords(coords);
        setDestinationAddress(preset.address);
        updateCalculation(coords);

        if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([preset.lat, preset.lng], 14, { duration: 1.2 });
        }
    };

    // Address Search
    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const results = await deliveryService.searchAddress(searchQuery);
            setSearchResults(results);
            if (results.length === 0) {
                toast('No se encontraron ubicaciones para esa búsqueda', { icon: '🔍' });
            }
        } catch {
            toast.error('Error buscando dirección');
        } finally {
            setSearching(false);
        }
    };

    const handleSelectSearchResult = (result) => {
        const coords = { lat: result.lat, lng: result.lng };
        setSelectedCoords(coords);
        setDestinationAddress(result.address);
        setSearchResults([]);
        setSearchQuery('');
        updateCalculation(coords);

        if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([result.lat, result.lng], 15, { duration: 1.2 });
        }
    };

    // Confirm delivery selection and apply to invoice
    const handleConfirm = () => {
        if (!deliveryCalc || !deliveryCalc.available) {
            toast.error(deliveryCalc?.error || 'Por favor selecciona un destino válido');
            return;
        }

        if (!customerName.trim()) {
            toast.error('Ingresa el nombre del receptor');
            return;
        }

        if (!destinationAddress.trim()) {
            toast.error('Ingresa la dirección detallada de entrega');
            return;
        }

        const deliveryPayload = {
            available: true,
            costUsd: deliveryCalc.costUsd,
            costBs: Number((deliveryCalc.costUsd * rate).toFixed(2)),
            distanceKm: deliveryCalc.distanceKm,
            estimatedMinutes: deliveryCalc.estimatedMinutes,
            lat: selectedCoords.lat,
            lng: selectedCoords.lng,
            address: destinationAddress.trim(),
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            notes: notes.trim(),
            originAddress: storeLocation.address,
        };

        onConfirm(deliveryPayload);
        toast.success(`🛵 Tarifa de delivery calculada: ${formatUSD(deliveryPayload.costUsd)} (${formatBs(deliveryPayload.costBs)})`);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🛵 Destino de Delivery & Cálculo de Recorrido"
            size="lg"
        >
            <div className="space-y-4">
                {/* Store Origin Banner */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            🏪
                        </div>
                        <div>
                            <span className="font-bold text-gray-900 dark:text-white">Punto de Despacho (Origen):</span>
                            <p className="text-gray-500 dark:text-gray-400 text-[11px] truncate max-w-sm sm:max-w-md">
                                {storeLocation.address}
                            </p>
                        </div>
                    </div>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
                        Base $2.00 + $0.50/km
                    </span>
                </div>

                {/* Map & Search Container */}
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-100 dark:bg-gray-800">
                    {/* Floating Search Bar */}
                    <div className="absolute top-3 left-3 right-3 z-[1000] space-y-1.5 pointer-events-auto">
                        <form onSubmit={handleSearch} className="flex gap-1.5 shadow-lg rounded-xl overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-1 border border-gray-200/80 dark:border-gray-700/80">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar dirección o zona en Barquisimeto / Lara (ej: Los Leones, Cabudare, Santa Rosa)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={searching}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                            >
                                {searching ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Navigation className="w-3.5 h-3.5" />
                                        <span>Buscar</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-1.5 max-h-48 overflow-y-auto space-y-1">
                                {searchResults.map((res, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => handleSelectSearchResult(res)}
                                        className="w-full text-left p-2 rounded-lg text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-800 dark:text-gray-200 flex items-start gap-2 transition-colors"
                                    >
                                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2 leading-tight">{res.address}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Leaflet Map Div */}
                    <div
                        ref={mapContainerRef}
                        style={{ height: '320px', width: '100%', zIndex: 1 }}
                    />

                    {/* Map Hint Overlay */}
                    <div className="absolute bottom-2 left-2 z-[1000] bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 pointer-events-none">
                        <MapPin className="w-3 h-3 text-red-400" />
                        <span>Haz clic o arrastra el pin rojo en el mapa para marcar el destino</span>
                    </div>
                </div>

                {/* Lara Quick Presets Chips */}
                <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                        Zonas frecuentes de Barquisimeto y Estado Lara (Selección rápida):
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                        {LARA_PRESETS.map((p) => (
                            <button
                                key={p.name}
                                type="button"
                                onClick={() => handleSelectPreset(p)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 border border-gray-200 dark:border-gray-700 transition-all flex items-center gap-1"
                            >
                                <MapPin className="w-3 h-3 text-blue-500" />
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Real-Time Calculation Metrics Card */}
                {deliveryCalc && (
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                        deliveryCalc.available
                            ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border-blue-200 dark:border-blue-800/60'
                            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                    }`}>
                        {deliveryCalc.available ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-xs border border-gray-100 dark:border-gray-700">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Distancia</span>
                                    <div className="flex items-center justify-center gap-1 mt-0.5">
                                        <Route className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        <span className="text-base font-extrabold text-gray-900 dark:text-white">
                                            {deliveryCalc.distanceKm} km
                                        </span>
                                    </div>
                                </div>

                                <div className="p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-xs border border-gray-100 dark:border-gray-700">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Tiempo Estimado</span>
                                    <div className="flex items-center justify-center gap-1 mt-0.5">
                                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        <span className="text-base font-extrabold text-gray-900 dark:text-white">
                                            {deliveryCalc.estimatedTimeLabel}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-xs border border-gray-100 dark:border-gray-700">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Tarifa USD</span>
                                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                        <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                                            {deliveryCalc.costUsd.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-xs border border-gray-100 dark:border-gray-700">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">En Bolívares</span>
                                    <span className="text-sm font-extrabold text-gray-900 dark:text-white block mt-1">
                                        {formatBs(deliveryCalc.costUsd * rate)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-semibold">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{deliveryCalc.error}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Recipient & Address Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            Nombre de quien recibe
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Nombre y Apellido del cliente"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-blue-500" />
                            Teléfono de contacto
                        </label>
                        <input
                            type="text"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="0412-1234567"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                            Dirección exacta / Edificio / Apartamento / Punto de referencia
                        </label>
                        <input
                            type="text"
                            value={destinationAddress}
                            onChange={(e) => setDestinationAddress(e.target.value)}
                            placeholder="Ej: Av. Principal, Res. Las Acacias, Torre B, Piso 4 Apto 4-A"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                            Instrucciones para el motorizado (Opcional)
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Llamar al llegar a la garita, timbre averiado"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!deliveryCalc?.available}
                        className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all ${
                            deliveryCalc?.available
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-95'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                        }`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                            Confirmar y Aplicar {deliveryCalc?.available ? `(${formatUSD(deliveryCalc.costUsd)})` : ''}
                        </span>
                    </button>
                </div>
            </div>
        </Modal>
    );
}
