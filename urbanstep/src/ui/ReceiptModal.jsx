import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { formatCurrency } from '../utils/formatCurrency';
import { Printer, CheckCircle, Store, Truck } from 'lucide-react';

export default function ReceiptModal({ isOpen, onClose, sale, settings, onNewSale }) {
    if (!sale) return null;

    const handlePrint = () => {
        window.print();
    };

    const bcvRate = sale.bcvRate || 42.50;
    const toBs = (usd) => (Number(usd) || 0) * bcvRate;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🧾 Comprobante de Venta" size="md">
            <div className="space-y-4">
                {/* Print area */}
                <div id="printable-receipt" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-gray-800 dark:text-gray-200 font-mono text-xs shadow-inner">
                    {/* Header */}
                    <div className="text-center border-b border-dashed border-gray-300 dark:border-gray-700 pb-4 mb-4">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                {settings?.storeName || 'UrbanStep Venezuela'}
                            </h2>
                        </div>
                        <p className="font-semibold text-gray-600 dark:text-gray-400">{settings?.legalName || 'UrbanStep C.A.'}</p>
                        <p className="font-bold text-blue-600 dark:text-blue-400">RIF: {settings?.rif || 'J-50123456-7'}</p>
                        <p className="text-[11px] text-gray-500 max-w-xs mx-auto mt-1">{settings?.fiscalAddress || 'Chacao, Caracas, Venezuela'}</p>
                        <p className="text-[11px] text-gray-500">Telf: {settings?.phone || '+58 212-951-4000'}</p>
                    </div>

                    {/* Metadata */}
                    <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-3 mb-3 text-[11px] space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">COMPROBANTE:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{sale.receiptNumber || sale.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">FECHA:</span>
                            <span>{new Date(sale.date || Date.now()).toLocaleString('es-VE')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">CAJERO:</span>
                            <span>{sale.cashier || 'Caja 1'}</span>
                        </div>
                        <div className="flex justify-between bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded text-blue-700 dark:text-blue-300 font-sans font-medium">
                            <span>TASA BCV DEL DÍA:</span>
                            <span className="font-bold">{formatCurrency(bcvRate, 'VES')} / USD</span>
                        </div>
                    </div>

                    {/* Customer */}
                    <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-3 mb-3 text-[11px] space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">CLIENTE:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{sale.customer || 'Cliente General'}</span>
                        </div>
                        {sale.customerDoc && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">CÉDULA / RIF:</span>
                                <span className="font-semibold">{sale.customerDoc}</span>
                            </div>
                        )}
                        {sale.customerPhone && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">TELÉFONO:</span>
                                <span>{sale.customerPhone}</span>
                            </div>
                        )}
                    </div>

                    {/* Items table */}
                    <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-3 mb-3">
                        <div className="flex justify-between font-bold text-gray-900 dark:text-white mb-2 text-[11px]">
                            <span className="w-1/2">DESCRIPCIÓN / TALLA</span>
                            <span className="w-1/4 text-center">CANT x P.U</span>
                            <span className="w-1/4 text-right">TOTAL</span>
                        </div>
                        <div className="space-y-2">
                            {sale.items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-[11px] items-start">
                                    <div className="w-1/2">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                                        <p className="text-[10px] text-gray-400">Talla: {item.size} • {item.brand || 'Urban'}</p>
                                    </div>
                                    <div className="w-1/4 text-center text-gray-500">
                                        {item.quantity} x {formatCurrency(item.price)}
                                    </div>
                                    <div className="w-1/4 text-right font-medium text-gray-900 dark:text-white">
                                        <p>{formatCurrency(item.price * item.quantity)}</p>
                                        <p className="text-[10px] text-gray-400">{formatCurrency(toBs(item.price * item.quantity), 'VES')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals Breakdown */}
                    <div className="space-y-1.5 text-xs pb-3 border-b border-dashed border-gray-300 dark:border-gray-700">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>SUBTOTAL:</span>
                            <div className="text-right">
                                <span>{formatCurrency(sale.subtotal)}</span>
                                <span className="block text-[10px] text-gray-400">{formatCurrency(toBs(sale.subtotal), 'VES')}</span>
                            </div>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>IVA (16% SENIAT):</span>
                            <div className="text-right">
                                <span>{formatCurrency(sale.tax)}</span>
                                <span className="block text-[10px] text-gray-400">{formatCurrency(toBs(sale.tax), 'VES')}</span>
                            </div>
                        </div>
                        {sale.igtf > 0 && (
                            <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                <span>IGTF (3% Divisas):</span>
                                <div className="text-right">
                                    <span>{formatCurrency(sale.igtf)}</span>
                                    <span className="block text-[10px] text-gray-400">{formatCurrency(toBs(sale.igtf), 'VES')}</span>
                                </div>
                            </div>
                        )}
                        {sale.shippingCost > 0 && (
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>ENVÍO / DELIVERY:</span>
                                <span>{formatCurrency(sale.shippingCost)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-800">
                            <span>TOTAL USD:</span>
                            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(sale.total)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            <span>TOTAL BOLÍVARES (Bs.):</span>
                            <span>{formatCurrency(toBs(sale.total), 'VES')}</span>
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="py-3 border-b border-dashed border-gray-300 dark:border-gray-700 text-[11px] space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">FORMA DE PAGO:</span>
                            <span className="font-bold text-gray-900 dark:text-white uppercase">{sale.paymentMethodLabel || sale.paymentMethod}</span>
                        </div>
                        {sale.paymentReference && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">REFERENCIA:</span>
                                <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{sale.paymentReference}</span>
                            </div>
                        )}
                        {sale.paymentBank && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">BANCO:</span>
                                <span>{sale.paymentBank}</span>
                            </div>
                        )}
                        {sale.cashReceived && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">RECIBIDO:</span>
                                <span>{sale.cashCurrency === 'VES' ? formatCurrency(sale.cashReceived, 'VES') : formatCurrency(sale.cashReceived)}</span>
                            </div>
                        )}
                        {sale.cashChange > 0 && (
                            <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                                <span>CAMBIO / VUELTO:</span>
                                <span>{sale.cashCurrency === 'VES' ? formatCurrency(sale.cashChange, 'VES') : `${formatCurrency(sale.cashChange)} (${formatCurrency(toBs(sale.cashChange), 'VES')})`}</span>
                            </div>
                        )}
                        {/* Delivery Service Section */}
                        {sale.deliveryDetails ? (
                            <div className="mt-2 p-2 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg border border-blue-200/80 dark:border-blue-800/80 space-y-1 text-[10px]">
                                <div className="flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300">
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>SERVICIO DE DELIVERY EXPRESS</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Destino:</span>
                                    <span className="font-semibold text-right max-w-[190px] truncate" title={sale.deliveryDetails.address}>
                                        {sale.deliveryDetails.address}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Distancia / Tiempo:</span>
                                    <span className="font-medium">{sale.deliveryDetails.distanceKm} km • ~{sale.deliveryDetails.estimatedMinutes} min</span>
                                </div>
                                {sale.deliveryDetails.notes && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Instrucciones:</span>
                                        <span className="italic text-gray-700 dark:text-gray-300 truncate max-w-[180px]">{sale.deliveryDetails.notes}</span>
                                    </div>
                                )}
                            </div>
                        ) : sale.shippingCarrier && sale.shippingCarrier !== 'retiro_tienda' && (
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                <Truck className="w-4 h-4" />
                                <span>Despacho: {sale.shippingCarrierName || sale.shippingCarrier}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-3 text-[10px] text-gray-500 space-y-1">
                        <p>{settings?.ticketFooter || '¡Gracias por su compra en UrbanStep! Comprobante de entrega comercial.'}</p>
                        <p className="font-bold text-gray-400">UrbanStep POS • Venezuela</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button variant="secondary" className="flex-1 flex items-center justify-center gap-2" onClick={handlePrint}>
                        <Printer className="w-4 h-4" />
                        Imprimir Ticket
                    </Button>
                    <Button variant="primary" className="flex-1 flex items-center justify-center gap-2" onClick={onNewSale}>
                        <CheckCircle className="w-4 h-4" />
                        Nueva Venta
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
