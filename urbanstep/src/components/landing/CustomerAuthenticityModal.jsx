import React from 'react';
import { ShieldCheck, RefreshCw, Award, CheckCircle2, Box, Sparkles, X } from 'lucide-react';

export default function CustomerAuthenticityModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const guarantees = [
        {
            icon: ShieldCheck,
            title: '100% Autenticidad Garantizada',
            desc: 'Todos nuestros calzados provienen de distribuidores autorizados internacionales. Cada par incluye etiquetas de fábrica, caja original y precinto de verificación UrbanStep.'
        },
        {
            icon: RefreshCw,
            title: 'Cambio Express por Talla en 48 Horas',
            desc: 'Si la talla no te quedó perfecta, te cambiamos el par en menos de 48 horas en Barquisimeto y Cabudare sin costo adicional, siempre que el calzado esté sin uso y en su caja original.'
        },
        {
            icon: Box,
            title: 'Empaque Premium con Doble Caja',
            desc: 'Para envíos locales y nacionales (MRW, Zoom, Tealca), embalamos con doble caja reforzada para proteger la caja de colección del sneaker.'
        },
        {
            icon: Award,
            title: 'Garantía por Defecto de Fábrica (7 Días)',
            desc: 'Cubrimos costuras, desprendimiento de suela o anomalías de manufactura durante los primeros 7 días posteriores a la recepción.'
        }
    ];

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                Garantía & Autenticidad UrbanStep
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Tu compra está 100% respaldada por nuestra tienda física y digital
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Cerrar modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                    {guarantees.map((g, idx) => {
                        const Icon = g.icon;
                        return (
                            <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                                        {g.title}
                                    </h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        {g.desc}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" /> ¿Dudas con tu pedido?
                        </p>
                        <p className="text-[11px] opacity-90">
                            Nuestro equipo de atención al cliente está disponible vía WhatsApp y en tienda de 9:00 AM a 7:00 PM.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
