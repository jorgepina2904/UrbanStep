/**
 * deliveryService.js — Gestión de Delivery con Geolocalización
 * Conectado 100% a la tabla 'envios' en Supabase como Fuente Única de la Verdad.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Flota oficial de motorizados UrbanStep (Barquisimeto / Cabudare)
export const FLEET_DRIVERS = [
    {
        id: 'mot-1',
        name: 'Carlos Mendoza',
        phone: '0412-5551234',
        vehicle: 'Bera SBR 150 Azul',
        plate: 'AB1C23D',
        rating: 4.9,
        deliveriesCount: 142,
        active: true
    },
    {
        id: 'mot-2',
        name: 'Pedro Yépez',
        phone: '0414-9876543',
        vehicle: 'Keeway Horse 150 Rojo',
        plate: 'XY9Z87W',
        rating: 4.8,
        deliveriesCount: 98,
        active: true
    },
    {
        id: 'mot-3',
        name: 'Roberto Gómez',
        phone: '0416-5554321',
        vehicle: 'Suzuki AX4 115 Negro',
        plate: 'JK4M56N',
        rating: 5.0,
        deliveriesCount: 215,
        active: true
    },
    {
        id: 'mot-4',
        name: 'Juan Alvarado',
        phone: '0424-7778899',
        vehicle: 'Bera Merú 150 Blanco',
        plate: 'CD5E67F',
        rating: 4.9,
        deliveriesCount: 76,
        active: true
    }
];

// Configuración por defecto (se puede sobreescribir desde store_settings)
const DEFAULT_CONFIG = {
    baseRateUsd: 2.00,      // Tarifa base en USD
    perKmUsd: 0.40,          // Costo por km en Lara
    maxDistanceKm: 99999,    // Deslimitado: cubre todo el Estado Lara y Venezuela
    storeLat: 10.068330144675503,  // Latitud Exacta Tienda UrbanStep (C.C. Las Trinitarias)
    storeLng: -69.28499381534304, // Longitud Exacta Tienda UrbanStep
    storeAddress: 'UrbanStep Store, C.C. Las Trinitarias, Barquisimeto, Edo. Lara, Venezuela',
};

/**
 * Mapea una fila de Supabase 'envios' a objeto compatible de la interfaz
 */
const mapEnvioFromDb = (e) => ({
    id: e.id,
    saleId: e.venta_id,
    originName: e.nombre_origen || 'UrbanStep Tienda',
    originLatitude: Number(e.latitud_origen) || 0,
    originLongitude: Number(e.longitud_origen) || 0,
    originAddress: e.direccion_origen || '',
    destinationName: e.nombre_destino || '',
    destinationLatitude: Number(e.latitud_destino) || 0,
    destinationLongitude: Number(e.longitud_destino) || 0,
    destinationAddress: e.direccion_destino || '',
    distanceKm: Number(e.distancia_km) || 0,
    estimatedTimeMin: Number(e.tiempo_estimado_min) || 30,
    deliveryCostUsd: Number(e.costo_usd) || 0,
    deliveryCostBs: Number(e.costo_bs) || 0,
    status: e.estado || 'pendiente',
    driverName: e.nombre_repartidor || null,
    driverPhone: e.telefono_repartidor || null,
    driverVehicle: e.vehiculo_repartidor || null,
    customerName: e.nombre_cliente || '',
    customerPhone: e.telefono_cliente || '',
    specialInstructions: e.instrucciones_entrega || '',
    deliveredAt: e.entregado_el,
    createdAt: e.creado_el,
    updatedAt: e.actualizado_el
});

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
    const baseMinutes = 15; // Preparación y empaque
    const travelMinutes = (distanceKm / 30) * 60;
    return Math.ceil(baseMinutes + travelMinutes);
}

// Caché en memoria para fluidez de UI
let _cachedDeliveries = [];

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
     * Crea un nuevo delivery asociado a una venta en Supabase Cloud
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
        const newUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined;

        const row = {
            venta_id: saleId || null,
            nombre_origen: 'UrbanStep Tienda',
            latitud_origen: cfg.storeLat,
            longitud_origen: cfg.storeLng,
            direccion_origen: cfg.storeAddress,
            nombre_destino: customerName || 'Cliente',
            latitud_destino: Number(destinationLat) || cfg.storeLat,
            longitud_destino: Number(destinationLng) || cfg.storeLng,
            direccion_destino: destinationAddress || 'Dirección de Entrega',
            distancia_km: Number(distanceKm) || 0,
            tiempo_estimado_min: Number(estimatedMinutes) || 30,
            costo_usd: Number(deliveryCostUsd) || 0,
            costo_bs: Number(deliveryCostBs) || 0,
            estado: 'pendiente',
            nombre_cliente: customerName || 'Cliente',
            telefono_cliente: customerPhone || '',
            instrucciones_entrega: specialInstructions || '',
            creado_el: new Date().toISOString()
        };

        if (newUuid) {
            row.id = newUuid;
        }

        let createdItem = null;

        if (isSupabaseConfigured() && supabase) {
            const { data, error } = await supabase.from('envios').insert(row).select().single();
            if (!error && data) {
                createdItem = mapEnvioFromDb(data);
            } else if (error) {
                console.error('Error insertando delivery en Supabase:', error);
                throw new Error(`Error registrando delivery en base de datos: ${error.message}`);
            }
        }

        if (!createdItem) {
            createdItem = mapEnvioFromDb({ ...row, id: newUuid || `del-${Date.now()}` });
        }

        _cachedDeliveries.unshift(createdItem);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('deliveries_updated', { detail: _cachedDeliveries }));
        }

        return createdItem;
    },

    /**
     * Obtiene todos los deliveries directamente desde Supabase Cloud
     */
    async getAll({ status, from, to } = {}) {
        if (isSupabaseConfigured() && supabase) {
            try {
                let query = supabase
                    .from('envios')
                    .select('*')
                    .order('creado_el', { ascending: false });

                if (status && status !== 'all') {
                    query = query.eq('estado', status);
                }
                if (from) {
                    query = query.gte('creado_el', from);
                }
                if (to) {
                    query = query.lte('creado_el', to);
                }

                const { data, error } = await query;
                if (!error && Array.isArray(data)) {
                    _cachedDeliveries = data.map(mapEnvioFromDb);
                    return [..._cachedDeliveries];
                }
            } catch (err) {
                console.error('Error consultando envios en Supabase:', err);
            }
        }
        return [..._cachedDeliveries];
    },

    /**
     * Actualiza el estado de un delivery en Supabase Cloud
     */
    async updateStatus(deliveryId, newStatus, additionalData = {}) {
        const nowIso = new Date().toISOString();
        const updates = {
            estado: newStatus,
            actualizado_el: nowIso
        };

        if (newStatus === 'entregado') {
            updates.entregado_el = nowIso;
        }
        if (additionalData.driverName !== undefined) {
            updates.nombre_repartidor = additionalData.driverName;
        }
        if (additionalData.driverPhone !== undefined) {
            updates.telefono_repartidor = additionalData.driverPhone;
        }
        if (additionalData.driverVehicle !== undefined) {
            updates.vehiculo_repartidor = additionalData.driverVehicle;
        }

        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase
                .from('envios')
                .update(updates)
                .eq('id', deliveryId);

            if (error) {
                console.error('Error actualizando delivery en Supabase:', error);
                throw new Error(`Error actualizando delivery en base de datos: ${error.message}`);
            }
        }

        const index = _cachedDeliveries.findIndex(d => d.id === deliveryId);
        if (index !== -1) {
            _cachedDeliveries[index] = {
                ..._cachedDeliveries[index],
                ...additionalData,
                status: newStatus,
                updatedAt: nowIso,
                ...(newStatus === 'entregado' ? { deliveredAt: nowIso } : {})
            };
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('deliveries_updated', { detail: _cachedDeliveries }));
        }

        return _cachedDeliveries[index] || null;
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
     * Obtiene estadísticas de delivery calculadas desde Supabase Cloud
     */
    async getStats() {
        const deliveries = await this.getAll();
        const today = new Date().toISOString().split('T')[0];
        const todayDeliveries = deliveries.filter(d => d.createdAt?.startsWith(today));

        return {
            total: deliveries.length,
            todayCount: todayDeliveries.length,
            pendientes: deliveries.filter(d => d.status === 'pendiente').length,
            asignados: deliveries.filter(d => d.status === 'asignado').length,
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
     * Obtiene los productos (calzados) asociados a la venta del delivery desde Supabase Cloud
     */
    async getDeliveryOrderItems(saleId) {
        if (!saleId) return [];
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('detalles_venta')
                    .select('*')
                    .eq('venta_id', saleId);

                if (!error && Array.isArray(data) && data.length > 0) {
                    return data.map(i => ({
                        productId: i.producto_id,
                        name: i.nombre_producto,
                        brand: i.marca || 'UrbanStep',
                        size: i.talla,
                        color: i.color,
                        quantity: Number(i.cantidad) || 1,
                        price: Number(i.precio_unitario_usd) || 0,
                        subtotal: Number(i.subtotal_usd) || 0
                    }));
                }
            } catch (err) {
                console.warn('Aviso buscando detalles_venta en Supabase:', err);
            }
        }
        return [];
    },

    /**
     * Elimina un registro de delivery de Supabase Cloud
     */
    async deleteDelivery(deliveryId) {
        // Trazabilidad fiscal: un envío ligado a una venta se archiva (cancelado), no se elimina.
        const linked = _cachedDeliveries.find(d => d.id === deliveryId);
        if (linked && linked.saleId) {
            await deliveryService.updateStatus(deliveryId, 'cancelado');
            return true;
        }
        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase.from('envios').delete().eq('id', deliveryId);
            if (error) {
                console.error('Error eliminando envio en Supabase:', error);
                throw new Error(`Error en base de datos al eliminar entrega: ${error.message}`);
            }
        }
        _cachedDeliveries = _cachedDeliveries.filter(d => d.id !== deliveryId);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('deliveries_updated', { detail: _cachedDeliveries }));
        }
        return true;
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
