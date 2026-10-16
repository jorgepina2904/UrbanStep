/**
 * shiftService.js — Gestión de Turnos y Arqueo de Caja (Apertura y Cierre)
 * Conectado 100% a la tabla 'turnos_caja' en Supabase como Fuente Única de la Verdad.
 */
import { generateId } from '../utils/generateId';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { auditService } from './auditService';
import { round2 } from '../utils/money';

// La bóveda (conteo por denominación y métodos no efectivo) viaja dentro de observaciones_cierre
// para no requerir cambios de esquema: "<notas> + salto de línea + [BOVEDA]{json}"
const VAULT_TAG = '[BOVEDA]';

const splitClosingNotes = (raw) => {
    const text = raw || '';
    const idx = text.indexOf(VAULT_TAG);
    if (idx === -1) return { notes: text, vault: null };
    let vault = null;
    try { vault = JSON.parse(text.slice(idx + VAULT_TAG.length)); } catch { vault = null; }
    return { notes: text.slice(0, idx).trim(), vault };
};

const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const mapShiftFromDb = (s) => {
    const { notes: closingNotes, vault } = splitClosingNotes(s.observaciones_cierre);
    return {
    id: s.id,
    cashierId: s.cajero_id,
    cashierName: s.nombre_cajero || 'Cajero',
    cajaId: s.caja_id || 'caja-1',
    cajaName: s.nombre_caja || 'Caja 1',
    cajaLocation: 'Sede Principal',
    status: s.estado === 'abierto' ? 'open' : 'closed',
    openedAt: s.apertura_el || s.creado_el,
    closedAt: s.cierre_el,
    initialCashUsd: Number(s.efectivo_inicial_usd) || 0,
    initialCashBs: Number(s.efectivo_inicial_bs) || 0,
    salesCount: Number(s.cantidad_ventas) || 0,
    totalSalesUsd: Number(s.total_ventas_usd) || 0,
    totalSalesBs: Number(s.total_ventas_bs) || 0,
    countedCashUsd: Number(s.efectivo_declarado_usd) || 0,
    countedCashBs: Number(s.efectivo_declarado_bs) || 0,
    differenceUsd: Number(s.diferencia_usd) || 0,
    differenceBs: Number(s.diferencia_bs) || 0,
    notes: s.observaciones_apertura || '',
    closingNotes,
    vault,
    // Esperado derivado: contado - diferencia (el esquema solo guarda declarado y diferencia)
    expectedCashUsd: round2((Number(s.efectivo_declarado_usd) || 0) - (Number(s.diferencia_usd) || 0)),
    expectedCashBs: round2((Number(s.efectivo_declarado_bs) || 0) - (Number(s.diferencia_bs) || 0))
    };
};

// Referencias en memoria para respuesta síncrona inmediata en render
let _cachedActiveShift = null;
let _cachedLastSale = null;

// Carga inicial reactiva desde Supabase
const initActiveShiftFromCloud = async () => {
    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('turnos_caja')
                .select('*')
                .eq('estado', 'abierto')
                .order('apertura_el', { ascending: false })
                .limit(1);

            if (!error && Array.isArray(data) && data.length > 0) {
                _cachedActiveShift = mapShiftFromDb(data[0]);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('shift_status_changed', { detail: _cachedActiveShift }));
                }
            } else if (!error && data?.length === 0) {
                _cachedActiveShift = null;
            }
        } catch (e) {
            console.warn('Aviso sincronizando turno activo desde Supabase:', e);
        }
    }
};

if (typeof window !== 'undefined') {
    setTimeout(initActiveShiftFromCloud, 10);
}

export const shiftService = {
    /**
     * Obtiene el turno activo sincrónicamente desde la memoria activa
     */
    getCurrentShift: () => {
        return _cachedActiveShift;
    },

    /**
     * Consulta el turno activo directamente desde Supabase Cloud
     */
    fetchCurrentShift: async () => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('turnos_caja')
                    .select('*')
                    .eq('estado', 'abierto')
                    .order('apertura_el', { ascending: false })
                    .limit(1);

                if (!error && Array.isArray(data) && data.length > 0) {
                    _cachedActiveShift = mapShiftFromDb(data[0]);
                    return _cachedActiveShift;
                } else if (!error) {
                    _cachedActiveShift = null;
                    return null;
                }
            } catch (err) {
                console.error('Error consultando turno en Supabase:', err);
            }
        }
        return _cachedActiveShift;
    },

    /**
     * Abre un nuevo turno de caja e inserta el registro en Supabase Cloud
     */
    openShift: async ({ cashierId, cashierName, cajaId, cajaName, cajaLocation, initialCashUsd = 0, initialCashBs = 0, notes = '' }) => {
        const shiftId = generateId('TURNO');
        const nowIso = new Date().toISOString();

        const dbRow = {
            id: shiftId,
            caja_id: cajaId || 'caja-1',
            nombre_caja: cajaName || 'Caja 1',
            cajero_id: isValidUUID(cashierId) ? cashierId : null,
            nombre_cajero: cashierName || 'Cajero',
            estado: 'abierto',
            apertura_el: nowIso,
            efectivo_inicial_usd: Number(initialCashUsd) || 0,
            efectivo_inicial_bs: Number(initialCashBs) || 0,
            observaciones_apertura: notes || '',
            creado_el: nowIso
        };

        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase.from('turnos_caja').insert(dbRow);
            if (error) {
                console.error('Error abriendo turno en Supabase:', error);
                throw new Error(`Error en base de datos abriendo turno: ${error.message}`);
            }
        }

        const newShift = mapShiftFromDb(dbRow);
        _cachedActiveShift = newShift;

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('shift_status_changed', { detail: newShift }));
        }

        return newShift;
    },

    /**
     * Calcula las ventas y totales del turno actual consultando ventas reales de Supabase
     */
    getShiftSummary: async (shiftId) => {
        const shift = _cachedActiveShift || (await shiftService.fetchCurrentShift());
        if (!shift) return null;

        const shiftStartTime = shift.openedAt;

        let shiftSales = [];

        if (isSupabaseConfigured() && supabase) {
            try {
                // Consultar ventas reales de Supabase asociadas a este turno o periodo
                let query = supabase
                    .from('ventas')
                    .select('*')
                    .gte('creado_el', shiftStartTime);

                if (shift.cajaId) {
                    query = query.eq('caja_id', shift.cajaId);
                }

                const { data, error } = await query;
                if (!error && Array.isArray(data)) {
                    shiftSales = data.map(v => ({
                        id: v.id,
                        receiptNumber: v.numero_recibo,
                        total: Number(v.total_usd) || 0,
                        totalBs: Number(v.total_bs) || 0,
                        paymentMethod: v.metodo_pago_principal,
                        cajaId: v.caja_id,
                        date: v.creado_el
                    }));
                }
            } catch (err) {
                console.warn('Error obteniendo ventas del turno desde Supabase:', err);
            }
        }

        // Totales desglosados por forma de pago
        let salesCashUsd = 0;
        let salesCashBs = 0;
        let salesPagomovilBs = 0;
        let salesPuntoBs = 0;
        let salesZelleUsd = 0;
        let totalSalesUsd = 0;
        let totalSalesBs = 0;

        for (const s of shiftSales) {
            totalSalesUsd += Number(s.total) || 0;
            totalSalesBs += Number(s.totalBs) || 0;

            if (s.paymentMethod === 'efectivo_usd') {
                salesCashUsd += Number(s.total) || 0;
            } else if (s.paymentMethod === 'efectivo_bs') {
                salesCashBs += Number(s.totalBs) || 0;
            } else if (s.paymentMethod === 'pagomovil') {
                salesPagomovilBs += Number(s.totalBs) || 0;
            } else if (s.paymentMethod === 'punto_venta' || s.paymentMethod === 'card') {
                salesPuntoBs += Number(s.totalBs) || 0;
            } else if (s.paymentMethod === 'zelle') {
                salesZelleUsd += Number(s.total) || 0;
            } else {
                salesPagomovilBs += Number(s.totalBs) || 0;
            }
        }

        // Efectivo esperado en gaveta (Fondo base + Ventas en efectivo)
        const expectedCashUsd = Number(shift.initialCashUsd || 0) + salesCashUsd;
        const expectedCashBs = Number(shift.initialCashBs || 0) + salesCashBs;

        return {
            shift,
            salesCount: shiftSales.length,
            sales: shiftSales,
            salesCashUsd,
            salesCashBs,
            salesPagomovilBs,
            salesPuntoBs,
            salesZelleUsd,
            totalSalesUsd,
            totalSalesBs,
            expectedCashUsd,
            expectedCashBs,
        };
    },

    /**
     * Cierra el turno de caja (Arqueo / Corte Z) actualizando 'turnos_caja' en Supabase
     */
    closeShift: async ({ countedCashUsd, countedCashBs, notes = '', vault = null }) => {
        const shift = _cachedActiveShift || (await shiftService.fetchCurrentShift());
        if (!shift) throw new Error('No hay un turno de caja abierto actualmente');

        const summary = await shiftService.getShiftSummary(shift.id);

        const countedUsd = Number(countedCashUsd) || 0;
        const countedBs = Number(countedCashBs) || 0;

        const diffUsd = round2(countedUsd - (summary?.expectedCashUsd || 0));
        const diffBs = round2(countedBs - (summary?.expectedCashBs || 0));
        const nowIso = new Date().toISOString();

        // Bóveda: métodos no efectivo declarados (cierre ciego) vs lo vendido en el turno
        let closingVault = null;
        if (vault) {
            const declared = vault.declared || {};
            const dPunto = declared.puntoBs === '' || declared.puntoBs == null ? null : Number(declared.puntoBs) || 0;
            const dPm = declared.pagomovilBs === '' || declared.pagomovilBs == null ? null : Number(declared.pagomovilBs) || 0;
            const dZelle = declared.zelleUsd === '' || declared.zelleUsd == null ? null : Number(declared.zelleUsd) || 0;
            closingVault = {
                usdBills: vault.usdBills || {},
                bsBills: vault.bsBills || {},
                bsOther: Number(vault.bsOther) || 0,
                nonCash: {
                    puntoBs: { expected: round2(summary?.salesPuntoBs || 0), declared: dPunto, diff: dPunto == null ? null : round2(dPunto - (summary?.salesPuntoBs || 0)) },
                    pagomovilBs: { expected: round2(summary?.salesPagomovilBs || 0), declared: dPm, diff: dPm == null ? null : round2(dPm - (summary?.salesPagomovilBs || 0)) },
                    zelleUsd: { expected: round2(summary?.salesZelleUsd || 0), declared: dZelle, diff: dZelle == null ? null : round2(dZelle - (summary?.salesZelleUsd || 0)) }
                }
            };
        }
        const storedNotes = closingVault ? `${notes || ''}\n${VAULT_TAG}${JSON.stringify(closingVault)}`.trim() : (notes || '');

        if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase
                .from('turnos_caja')
                .update({
                    estado: 'cerrado',
                    cierre_el: nowIso,
                    cantidad_ventas: summary?.salesCount || 0,
                    total_ventas_usd: summary?.totalSalesUsd || 0,
                    total_ventas_bs: summary?.totalSalesBs || 0,
                    efectivo_declarado_usd: countedUsd,
                    efectivo_declarado_bs: countedBs,
                    diferencia_usd: diffUsd,
                    diferencia_bs: diffBs,
                    observaciones_cierre: storedNotes
                })
                .eq('id', shift.id);

            if (error) {
                console.error('Error cerrando turno en Supabase:', error);
                throw new Error(`Error en base de datos cerrando turno: ${error.message}`);
            }
        }

        const closedShift = {
            ...shift,
            status: 'closed',
            closedAt: nowIso,
            salesCount: summary?.salesCount || 0,
            totalSalesUsd: summary?.totalSalesUsd || 0,
            totalSalesBs: summary?.totalSalesBs || 0,
            salesCashUsd: summary?.salesCashUsd || 0,
            salesCashBs: summary?.salesCashBs || 0,
            salesPagomovilBs: summary?.salesPagomovilBs || 0,
            salesPuntoBs: summary?.salesPuntoBs || 0,
            salesZelleUsd: summary?.salesZelleUsd || 0,
            expectedCashUsd: summary?.expectedCashUsd || 0,
            expectedCashBs: summary?.expectedCashBs || 0,
            countedCashUsd: countedUsd,
            countedCashBs: countedBs,
            differenceUsd: diffUsd,
            differenceBs: diffBs,
            closingNotes: notes,
            vault: closingVault,
        };

        const nonCashDiffs = closingVault ? Object.values(closingVault.nonCash).map(m => m.diff).filter(d => d != null && d !== 0) : [];
        if (diffUsd !== 0 || diffBs !== 0 || nonCashDiffs.length > 0) {
            try {
                auditService.log({
                    userId: shift.cashierId,
                    userName: shift.cashierName,
                    action: 'cierre_turno',
                    actionLabel: `ALERTA descuadre de caja (${diffUsd < 0 || diffBs < 0 ? 'faltante' : 'sobrante'}) - turno ${shift.id}`,
                    module: 'cashier',
                    entityType: 'shift',
                    entityId: shift.id,
                    details: { diffUsd, diffBs, nonCash: closingVault?.nonCash || null }
                });
            } catch (e) {
                console.warn('No se pudo registrar la alerta de descuadre:', e);
            }
        }

        _cachedActiveShift = null;

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('shift_status_changed', { detail: null }));
        }

        return closedShift;
    },

    /**
     * Guarda la última venta para reimpresión rápida
     */
    saveLastSale: (sale) => {
        _cachedLastSale = sale;
    },

    /**
     * Obtiene la última venta realizada
     */
    getLastSale: () => {
        return _cachedLastSale;
    },

    /**
     * Obtiene el historial de turnos cerrados desde Supabase
     */
    getHistory: async (limit = 50) => {
        if (isSupabaseConfigured() && supabase) {
            try {
                const { data, error } = await supabase
                    .from('turnos_caja')
                    .select('*')
                    .order('cierre_el', { ascending: false })
                    .limit(limit);

                if (!error && Array.isArray(data)) {
                    return data.map(mapShiftFromDb);
                }
            } catch (err) {
                console.error('Error obteniendo historial de turnos en Supabase:', err);
            }
        }
        return [];
    }
};

export default shiftService;
