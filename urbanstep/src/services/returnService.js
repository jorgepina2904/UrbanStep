/**
 * returnService.js — Sistema de Gestión Fiscal y Financiera SGF
 * Devoluciones, Garantías y Emisión de Notas de Crédito Fiscales
 * UrbanStep Venezuela C.A. • RIF: J-50123456-7 • Barquisimeto, Estado Lara
 * Cumplimiento: Providencia SENIAT SNAT/2011/0071 (Libro de Ventas) y VEN-NIIF
 */

import { generateId } from '../utils/generateId';
import { bcvService } from './bcvService';
import { auditService } from './auditService';
import { stockMovementService } from './stockMovementService';
import { productService } from './productService';
import { db } from './api';

const STORAGE_KEY = 'urbanstep_credit_notes';

// Motivos válidos de Devolución bajo normativa SGF
export const RETURN_REASONS = {
    mal_facturado: {
        id: 'mal_facturado',
        label: 'Producto Mal Facturado / Error de Facturación',
        description: 'Error en precio, talla, modelo o digitación. El calzado reingresa al inventario vendible.',
        restoresStock: true,
        accountingType: 'reversion_venta'
    },
    producto_danado: {
        id: 'producto_danado',
        label: 'Producto Dañado / Falla de Fábrica / Garantía',
        description: 'Calzado defectuoso o con daños. NO reingresa a stock vendible; se asienta en Merma contable.',
        restoresStock: false,
        accountingType: 'merma_dano'
    },
    factura_fallida: {
        id: 'factura_fallida',
        label: 'Factura Fallida / Anulación de Transacción',
        description: 'Transacción no concretada, pasarela fallida o anulación total. Reingresa stock y anula factura.',
        restoresStock: true,
        accountingType: 'anulacion_total'
    }
};

const INITIAL_CREDIT_NOTES = [
    {
        id: 'nc-001',
        creditNoteNumber: 'NC-2026-0001',
        fiscalControlNumber: '00-000412',
        saleId: 'sale-demo-01',
        affectedInvoiceNumber: 'TKT-2026-0980',
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        customer: 'Carlos Ramírez',
        customerDoc: 'V-19876543',
        customerPhone: '+58 412-9876543',
        bcvRate: 876.80,
        reason: 'mal_facturado',
        reasonLabel: 'Producto Mal Facturado / Error de Facturación',
        notes: 'Cliente solicitó talla 42 pero en caja se digitó talla 40. Se emite NC y reingresa calzado.',
        refundMethod: 'efectivo_usd',
        refundMethodLabel: 'Efectivo Divisas ($)',
        authorizedBy: 'Supervisor de Caja',
        cashier: 'Carlos Gómez (Caja 1)',
        items: [
            {
                productId: 'prod-001',
                name: 'Nike Air Force 1 07',
                size: '40',
                color: 'Blanco',
                quantity: 1,
                price: 110.00,
                total: 110.00
            }
        ],
        subtotalUsd: 110.00,
        taxUsd: 17.60,
        totalUsd: 127.60,
        subtotalBs: 96448.00,
        taxBs: 15431.68,
        totalBs: 111879.68,
        status: 'procesada',
        restoredToStock: true
    }
];

function getStoredNotes() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.warn('Error leyendo credit notes de storage:', e);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CREDIT_NOTES));
    return [...INITIAL_CREDIT_NOTES];
}

function saveStoredNotes(notes) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
        console.warn('Error guardando credit notes en storage:', e);
    }
    window.dispatchEvent(new CustomEvent('credit_notes_updated', { detail: notes }));
}

export const returnService = {
    /**
     * Retorna todas las devoluciones / Notas de Crédito registradas
     */
    getAll: async () => {
        return getStoredNotes();
    },

    /**
     * Busca por ID de Nota de Crédito
     */
    getById: async (id) => {
        const notes = getStoredNotes();
        return notes.find(n => n.id === id || n.creditNoteNumber === id) || null;
    },

    /**
     * Retorna las notas de crédito vinculadas a una venta/factura
     */
    getBySaleId: async (saleId) => {
        const notes = getStoredNotes();
        return notes.filter(n => n.saleId === saleId || n.affectedInvoiceNumber === saleId);
    },

    /**
     * Procesa una devolución formal emitiendo Nota de Crédito Fiscal SENIAT
     */
    createReturn: async ({
        saleId,
        affectedInvoiceNumber,
        customer,
        customerDoc,
        customerPhone,
        items = [],
        reason = 'mal_facturado',
        notes = '',
        refundMethod = 'efectivo_usd',
        refundMethodLabel = 'Efectivo ($)',
        authorizedBy = 'Administrador General',
        cashier = 'Cajero de Turno'
    }) => {
        if (!items || items.length === 0) {
            throw new Error('Debe seleccionar al menos un producto para la devolución.');
        }

        const reasonDef = RETURN_REASONS[reason] || RETURN_REASONS.mal_facturado;
        const notesList = getStoredNotes();
        const nextSeq = 1000 + notesList.length + 1;
        const ncNumber = `NC-${new Date().getFullYear()}-${String(nextSeq).padStart(4, '0')}`;
        const fiscalControlNumber = `00-${String(Math.floor(100000 + Math.random() * 900000))}`;

        const currentRate = bcvService.getRate()?.rate || 876.80;

        // Cálculos monetarios del calzado devuelto
        let subtotalUsd = 0;
        items.forEach(item => {
            const qty = Math.max(1, parseInt(item.quantity) || 1);
            const price = Number(item.price) || 0;
            subtotalUsd += price * qty;
        });

        const taxUsd = Math.round(subtotalUsd * 0.16 * 100) / 100;
        const totalUsd = Math.round((subtotalUsd + taxUsd) * 100) / 100;

        const subtotalBs = Math.round(subtotalUsd * currentRate * 100) / 100;
        const taxBs = Math.round(taxUsd * currentRate * 100) / 100;
        const totalBs = Math.round(totalUsd * currentRate * 100) / 100;

        // 1. Manejo de Inventario y Kardex según el Motivo SGF
        let restoredToStock = false;
        if (reasonDef.restoresStock) {
            // A. Reingreso al stock vendible (Producto Mal Facturado o Factura Fallida)
            try {
                for (const item of items) {
                    const prodId = item.productId || item.id;
                    const qty = Math.max(1, parseInt(item.quantity) || 1);
                    await productService.restoreStock(prodId, {
                        size: item.size || item.talla,
                        color: item.color,
                        quantity: qty,
                        reason: `Reingreso por ${reasonDef.label} - ${ncNumber}`
                    });

                    // Registrar movimiento en Kardex de entrada
                    await stockMovementService.record({
                        productId: prodId,
                        productName: item.name || 'Calzado Deportivo',
                        sku: item.sku || 'SKU-RET',
                        delta: qty,
                        type: 'entrada_devolucion',
                        reason: `Devolución formal ${ncNumber} (Factura ${affectedInvoiceNumber}) - Motivo: ${reasonDef.label}`,
                        size: item.size || null,
                        color: item.color || null,
                        userName: cashier,
                        referenceId: ncNumber
                    });
                }
                restoredToStock = true;
            } catch (err) {
                console.warn('Error restaurando inventario en devolución:', err);
            }
        } else {
            // B. Producto Dañado / Garantía / Falla de Fábrica:
            // El calzado NO reingresa a venta. Se asienta en Kardex como Merma / Defecto
            try {
                for (const item of items) {
                    const prodId = item.productId || item.id;
                    const qty = Math.max(1, parseInt(item.quantity) || 1);
                    await stockMovementService.record({
                        productId: prodId,
                        productName: item.name || 'Calzado Deportivo',
                        sku: item.sku || 'SKU-DEFECT',
                        delta: 0, // No altera stock vendible
                        type: 'baja_merma_dano',
                        reason: `Baja a Merma/Defecto de Fábrica ${ncNumber} - No reingresa a venta`,
                        size: item.size || null,
                        color: item.color || null,
                        userName: cashier,
                        referenceId: ncNumber
                    });
                }
            } catch (err) {
                console.warn('Error registrando merma en Kardex:', err);
            }
        }

        // 2. Si fue Factura Fallida, marcar venta original como anulada
        if (reason === 'factura_fallida' && db.sales) {
            const sale = db.sales.find(s => s.id === saleId || s.receiptNumber === affectedInvoiceNumber);
            if (sale) {
                sale.status = 'anulada_por_nc';
                sale.anuladaPorNC = ncNumber;
            }
        }

        // 3. Crear el Objeto Formal de Nota de Crédito
        const newCreditNote = {
            id: generateId('NCR'),
            creditNoteNumber: ncNumber,
            fiscalControlNumber,
            saleId: saleId || 'N/A',
            affectedInvoiceNumber: affectedInvoiceNumber || 'TKT-PENDIENTE',
            date: new Date().toISOString(),
            customer: customer || 'Cliente General',
            customerDoc: customerDoc || 'V-00000000',
            customerPhone: customerPhone || '',
            bcvRate: currentRate,
            reason,
            reasonLabel: reasonDef.label,
            notes: notes.trim(),
            refundMethod,
            refundMethodLabel,
            authorizedBy,
            cashier,
            items,
            subtotalUsd,
            taxUsd,
            totalUsd,
            subtotalBs,
            taxBs,
            totalBs,
            status: 'procesada',
            restoredToStock
        };

        notesList.unshift(newCreditNote);
        saveStoredNotes(notesList);

        // 4. Registro de Auditoría Inmutable
        try {
            await auditService.log({
                action: 'DEVOLUCION_FISCAL_PROCESADA',
                module: 'ventas',
                details: `Nota de Crédito ${ncNumber} emitida por ${reasonDef.label}. Factura afectada: ${affectedInvoiceNumber}. Total devuelto: $${totalUsd.toFixed(2)} (Bs. ${totalBs.toLocaleString('es-VE')}).`,
                user: authorizedBy || cashier,
                metadata: {
                    creditNoteNumber: ncNumber,
                    affectedInvoiceNumber,
                    reason,
                    totalUsd,
                    totalBs,
                    itemsCount: items.length
                }
            });
        } catch (auditErr) {
            console.warn('Error registrando auditoría de devolución:', auditErr);
        }

        // Disparar evento para actualizar vistas de ventas y libros
        window.dispatchEvent(new CustomEvent('sales_updated'));

        return newCreditNote;
    },

    /**
     * Resumen de Métricas de Devolución para Reportes SGF
     */
    getSummary: async () => {
        const notes = getStoredNotes();
        const totalCount = notes.length;
        const totalUsd = notes.reduce((sum, n) => sum + (n.totalUsd || 0), 0);
        const totalBs = notes.reduce((sum, n) => sum + (n.totalBs || 0), 0);

        const byReason = {
            mal_facturado: notes.filter(n => n.reason === 'mal_facturado').length,
            producto_danado: notes.filter(n => n.reason === 'producto_danado').length,
            factura_fallida: notes.filter(n => n.reason === 'factura_fallida').length
        };

        return {
            totalCount,
            totalUsd: Math.round(totalUsd * 100) / 100,
            totalBs: Math.round(totalBs * 100) / 100,
            byReason,
            notes
        };
    }
};
