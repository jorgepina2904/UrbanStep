/**
 * deliveryService.js — Gestión de Delivery con Geolocalización
 * Calcula distancia, precio del recorrido, y gestiona entregas
 */
import { generateId } from '../utils/generateId';

const DELIVERIES_KEY = 'urbanstep_deliveries';

// Configuración por defecto (se puede sobreescribir desde store_settings)
const DEFAULT_CONFIG = {
    baseRateUsd: 2.00,      // Tarifa base en USD
    perKmUsd: 0.40,          // Costo por km en Lara
    maxDistanceKm: 99999,    // Deslimitado: cubre todo el Estado Lara y Venezuela
    storeLat: 10.0678,       // Latitud Tienda Principal (Barquisimeto, Estado Lara)
    storeLng: -69.3474,      // Longitud Tienda Principal (Barquisimeto, Estado Lara)
    storeAddress: 'Av. Los Leones con Av. Lara, C.C. Las Trinitarias, Nivel Galería, Barquisimeto, Edo. Lara',
};

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Estima el tiempo de entrega basado en distancia
 */
function estimateTime(distanceKm) {
    if (distanceKm > 100) return Math.ceil(distanceKm / 60) * 60; // Envíos nacionales interurbanos
    // Velocidad promedio de moto en ciudad: ~30 km/h
    const baseMinutes = 15; // Preparación y empaque
    const travelMinutes = (distanceKm / 30) * 60;
    return Math.ceil(baseMinutes + travelMinutes);
}

const getStoredDeliveries = () => {
    try {
        const raw = localStorage.getItem(DELIVERIES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveDeliveries = (deliveries) => {
    localStorage.setItem(DELIVERIES_KEY, JSON.stringify(deliveries.slice(0, 200)));
};

export const deliveryService = {
    /**
     * Calcula el costo del delivery basado en distancia (DESLIMITADO PARA LARA Y NACIONAL)
     */
    calculateDeliveryCost({ destinationLat, destinationLng, config = {} }) {
        const cfg = { ...DEFAULT_CONFIG, ...config };
        
        const rawDistance = calculateDistance(
            cfg.storeLat, cfg.storeLng,
            destinationLat, destinationLng
        );

        // Distancia en ruta estimada
        const routeDistance = rawDistance * 1.25;
        const roundedDistance = Math.max(0.5, Math.round(routeDistance * 10) / 10);

        // Tarifa por distancia escalonada y deslimitada
        let variableCost = 0;
        if (roundedDistance <= 20) {
            variableCost = roundedDistance * cfg.perKmUsd;
        } else if (roundedDistance <= 60) {
            variableCost = (20 * cfg.perKmUsd) + ((roundedDistance - 20) * 0.25);
        } else {
            // Flete nacional / municipios lejanos de Lara (Carora, etc.)
            variableCost = (20 * cfg.perKmUsd) + (40 * 0.25) + ((roundedDistance - 60) * 0.15);
        }

        const cost = cfg.baseRateUsd + variableCost;
        const roundedCost = Math.round(cost * 100) / 100;
        const estimatedMinutes = estimateTime(roundedDistance);

        return {
            available: true,
            distanceKm: roundedDistance,
            costUsd: roundedCost,
            estimatedMinutes,
            estimatedTimeLabel: estimatedMinutes < 60
                ? `${estimatedMinutes} min`
                : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}min`,
            origin: {
                lat: cfg.storeLat,
                lng: cfg.storeLng,
                address: cfg.storeAddress,
            },
            destination: {
                lat: destinationLat,
                lng: destinationLng,
            },
            breakdown: {
                baseRate: cfg.baseRateUsd,
                distanceCharge: Math.round((roundedDistance * cfg.perKmUsd) * 100) / 100,
                perKmRate: cfg.perKmUsd,
            }
        };
    },

    /**
     * Crea un nuevo delivery asociado a una venta
     */
    async createDelivery({
        saleId,
        customerName,
        customerPhone,
        destinationAddress,
        destinationLat,
        destinationLng,
        distanceKm,
        deliveryCostUsd,
        deliveryCostBs,
        estimatedMinutes,
        specialInstructions,
        config = {},
    }) {
        const cfg = { ...DEFAULT_CONFIG, ...config };

        const delivery = {
            id: generateId('DEL'),
            saleId,
            originName: 'UrbanStep Tienda',
            originLatitude: cfg.storeLat,
            originLongitude: cfg.storeLng,
            originAddress: cfg.storeAddress,
            destinationName: customerName,
            destinationLatitude: destinationLat,
            destinationLongitude: destinationLng,
            destinationAddress,
            distanceKm,
            estimatedTimeMin: estimatedMinutes,
            deliveryCostUsd,
            deliveryCostBs,
            status: 'pendiente',
            driverName: null,
            driverPhone: null,
            driverVehicle: null,
            customerName,
            customerPhone,
            specialInstructions: specialInstructions || '',
            deliveredAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const deliveries = getStoredDeliveries();
        deliveries.unshift(delivery);
        saveDeliveries(deliveries);

        return delivery;
    },

    /**
     * Obtiene todos los deliveries con filtros opcionales
     */
    async getAll({ status, from, to } = {}) {
        let deliveries = getStoredDeliveries();

        if (status) {
            deliveries = deliveries.filter(d => d.status === status);
        }
        if (from) {
            deliveries = deliveries.filter(d => new Date(d.createdAt) >= new Date(from));
        }
        if (to) {
            deliveries = deliveries.filter(d => new Date(d.createdAt) <= new Date(to));
        }

        return deliveries;
    },

    /**
     * Actualiza el estado de un delivery
     */
    async updateStatus(deliveryId, newStatus, additionalData = {}) {
        const deliveries = getStoredDeliveries();
        const index = deliveries.findIndex(d => d.id === deliveryId);
        if (index === -1) throw new Error('Delivery no encontrado');

        deliveries[index] = {
            ...deliveries[index],
            ...additionalData,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            ...(newStatus === 'entregado' ? { deliveredAt: new Date().toISOString() } : {}),
        };

        saveDeliveries(deliveries);
        return deliveries[index];
    },

    /**
     * Asigna un conductor al delivery
     */
    async assignDriver(deliveryId, { driverName, driverPhone, driverVehicle }) {
        return this.updateStatus(deliveryId, 'asignado', {
            driverName,
            driverPhone,
            driverVehicle,
        });
    },

    /**
     * Obtiene estadísticas de delivery
     */
    async getStats() {
        const deliveries = getStoredDeliveries();
        const today = new Date().toISOString().split('T')[0];
        const todayDeliveries = deliveries.filter(d => d.createdAt?.startsWith(today));

        return {
            total: deliveries.length,
            todayCount: todayDeliveries.length,
            pendientes: deliveries.filter(d => d.status === 'pendiente').length,
            enCamino: deliveries.filter(d => d.status === 'en_camino').length,
            entregados: deliveries.filter(d => d.status === 'entregado').length,
            cancelados: deliveries.filter(d => d.status === 'cancelado').length,
            totalRevenueUsd: deliveries
                .filter(d => d.status !== 'cancelado')
                .reduce((sum, d) => sum + (d.deliveryCostUsd || 0), 0),
            avgDistanceKm: deliveries.length > 0
                ? deliveries.reduce((sum, d) => sum + (d.distanceKm || 0), 0) / deliveries.length
                : 0,
        };
    },

    /**
     * Obtiene la configuración del delivery
     */
    getConfig() {
        return { ...DEFAULT_CONFIG };
    },

    /**
     * Reverse geocoding usando Nominatim (OpenStreetMap)
     */
    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`,
                { headers: { 'User-Agent': 'UrbanStepPOS/3.0' } }
            );
            const data = await response.json();
            return {
                address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                road: data.address?.road || '',
                city: data.address?.city || data.address?.town || '',
                state: data.address?.state || '',
                country: data.address?.country || 'Venezuela',
            };
        } catch {
            return {
                address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                road: '',
                city: '',
                state: '',
                country: 'Venezuela',
            };
        }
    },

    /**
     * Forward geocoding: buscar dirección y obtener coordenadas
     */
    async searchAddress(query) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Venezuela')}&limit=5&addressdetails=1&accept-language=es`,
                { headers: { 'User-Agent': 'UrbanStepPOS/3.0' } }
            );
            const data = await response.json();
            return data.map(item => ({
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                address: item.display_name,
                type: item.type,
            }));
        } catch {
            return [];
        }
    },
};

export default deliveryService;
