import React, { useState } from 'react';
import { Ruler, Check, Info, Sparkles, X, ChevronRight } from 'lucide-react';

export default function CustomerFitGuideModal({ isOpen, onClose }) {
    const [selectedGender, setSelectedGender] = useState('hombre'); // 'hombre' | 'mujer'
    const [selectedBrand, setSelectedBrand] = useState('nike'); // 'nike' | 'adidas' | 'jordan' | 'new_balance'

    if (!isOpen) return null;

    const brandFitTips = {
        nike: {
            title: 'Nike & Jordan Fit',
            advice: 'Fiel a la talla (True to size). Para siluetas como Dunk Low o Air Jordan 1 recomendamos tu talla exacta. En siluetas estilizadas de running o Air Max 97 considera subir media talla si tienes empeine ancho.'
        },
        adidas: {
            title: 'Adidas & Originals Fit',
            advice: 'Samba OG y Handball Spezial tienen puntera angosta clásica de fútbol sala. Si tienes pie ancho, recomendamos pedir media talla más (ej: de 41 a 41.5 o 42) para mayor comodidad.'
        },
        jordan: {
            title: 'Air Jordan Retro Fit',
            advice: 'Ajuste estándar premium. Plantilla con soporte acolchado. Tu talla habitual de calzado deportivo es la indicada.'
        },
        new_balance: {
            title: 'New Balance 550 / 9060 / 2002R',
            advice: 'Caja para dedos generosa y confort ortopédico superior. Talla exacta para confort de todo el día.'
        }
    };

    const sizeEquivalencies = [
        { cm: '24.5 cm', eu: '39', usMen: '6.5', usWomen: '8.0' },
        { cm: '25.0 cm', eu: '40', usMen: '7.0', usWomen: '8.5' },
        { cm: '25.5 cm', eu: '40.5', usMen: '7.5', usWomen: '9.0' },
        { cm: '26.0 cm', eu: '41', usMen: '8.0', usWomen: '9.5' },
        { cm: '26.5 cm', eu: '42', usMen: '8.5', usWomen: '10.0' },
        { cm: '27.0 cm', eu: '42.5', usMen: '9.0', usWomen: '10.5' },
        { cm: '27.5 cm', eu: '43', usMen: '9.5', usWomen: '11.0' },
        { cm: '28.0 cm', eu: '44', usMen: '10.0', usWomen: '11.5' },
        { cm: '28.5 cm', eu: '44.5', usMen: '10.5', usWomen: '12.0' },
        { cm: '29.0 cm', eu: '45', usMen: '11.0', usWomen: '12.5' },
        { cm: '30.0 cm', eu: '46', usMen: '12.0', usWomen: '13.5' },
    ];

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                            <Ruler className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                Guía de Tallas & Ajuste Perfecto
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider">
                                    Smart Fit
                                </span>
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Encuentra tu talla exacta en centímetros o equivalencia internacional
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

                <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                    {/* Brand Selector */}
                    <div>
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                            Consejo de Horma por Marca
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { id: 'nike', name: 'Nike' },
                                { id: 'adidas', name: 'Adidas' },
                                { id: 'jordan', name: 'Jordan' },
                                { id: 'new_balance', name: 'New Balance' },
                            ].map(b => (
                                <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => setSelectedBrand(b.id)}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                                        selectedBrand === b.id
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                            : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    {b.name}
                                </button>
                            ))}
                        </div>

                        {/* Fit Tip Box */}
                        <div className="mt-3 p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
                            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">{brandFitTips[selectedBrand]?.title}</p>
                                <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-300">
                                    {brandFitTips[selectedBrand]?.advice}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Size Table */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Tabla de Equivalencias (Venezuela / EUR / US / CM)
                            </span>
                        </div>

                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                                        <th className="py-2.5 px-3 text-left">Largo Pie (CM)</th>
                                        <th className="py-2.5 px-3 text-center bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">Talla EUR (VE)</th>
                                        <th className="py-2.5 px-3 text-center">US Hombre</th>
                                        <th className="py-2.5 px-3 text-center">US Mujer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                                    {sizeEquivalencies.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="py-2 px-3 font-semibold text-gray-600 dark:text-gray-300">{row.cm}</td>
                                            <td className="py-2 px-3 text-center font-bold text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20">{row.eu}</td>
                                            <td className="py-2 px-3 text-center text-gray-700 dark:text-gray-300">{row.usMen}</td>
                                            <td className="py-2 px-3 text-center text-gray-700 dark:text-gray-300">{row.usWomen}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* How to measure feet */}
                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-blue-500" /> ¿Cómo medir tu pie en casa?
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            1. Coloca una hoja de papel en el suelo pegada a la pared.
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            2. Pon tu pie descalzo sobre la hoja con el talón pegado a la pared.
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            3. Marca con un lápiz el dedo más largo y mide los centímetros con una regla. ¡Compara con la columna CM y listo!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
