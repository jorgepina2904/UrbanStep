import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Check, X, UserPlus, Phone, Mail, IdCard } from 'lucide-react';
import { customerService } from '../services/customerService';
import { formatCurrency } from '../utils/formatCurrency';
import { useCart } from '../contexts/CartContext';

export default function CustomerSelector({ 
    selectedCustomer: propSelectedCustomer, 
    onSelect: propOnSelect,
    onQuickCreate,
    placeholder = "Buscar cliente por nombre, cédula/RIF, teléfono...",
    className = ""
}) {
    const cart = useCart();
    const [customers, setCustomers] = useState([]);
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const wrapperRef = useRef(null);

    // Si no se proveen props explícitas, se enlaza automáticamente a CartContext
    const activeCustomer = propSelectedCustomer !== undefined ? propSelectedCustomer : (cart?.customer || cart?.state?.customer);
    const handleCustomerSelection = (customer) => {
        if (typeof propOnSelect === 'function') {
            propOnSelect(customer);
        } else if (cart?.setCustomer) {
            cart.setCustomer(customer);
        }
        setQuery('');
        setIsOpen(false);
    };

    const handleClearSelection = (e) => {
        e.stopPropagation();
        if (typeof propOnSelect === 'function') {
            propOnSelect(null);
        } else if (cart?.setCustomer) {
            cart.setCustomer(null);
        }
    };

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const data = await customerService.getAll();
            setCustomers(data || []);
        } catch (err) {
            console.error('Error cargando clientes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
        const handleUpdate = () => loadCustomers();
        window.addEventListener('customers_updated', handleUpdate);
        return () => window.removeEventListener('customers_updated', handleUpdate);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const cleanQuery = (query || '').trim().toLowerCase();
    const filtered = customers.filter(c => {
        if (!cleanQuery) return true;
        const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
        const docNum = (c.docNumber || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const city = (c.city || '').toLowerCase();
        return (
            fullName.includes(cleanQuery) ||
            docNum.includes(cleanQuery) ||
            phone.includes(cleanQuery) ||
            email.includes(cleanQuery) ||
            city.includes(cleanQuery)
        );
    });

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            {activeCustomer ? (
                <div
                    className="flex items-center justify-between w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 transition-all cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-sm"
                    onClick={() => setIsOpen(true)}
                >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-sm">
                            <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {activeCustomer.id === 'publico' ? '🛒 Venta al Público General' : `${activeCustomer.firstName} ${activeCustomer.lastName}`}
                                </span>
                                {activeCustomer.docNumber && activeCustomer.id !== 'publico' && (
                                    <span className="text-[10px] font-mono bg-blue-200/70 dark:bg-blue-800/60 px-1 py-0.5 rounded text-blue-800 dark:text-blue-200 font-bold shrink-0">
                                        {activeCustomer.docNumber}
                                    </span>
                                )}
                                {activeCustomer.disabled && (
                                    <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-1 rounded font-bold">
                                        Inactivo
                                    </span>
                                )}
                            </div>
                            {activeCustomer.id !== 'publico' && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 truncate flex items-center gap-2">
                                    <span>Tlf: {activeCustomer.phone || '—'}</span>
                                    <span>•</span>
                                    <span>Compras: {formatCurrency(activeCustomer.totalSpent || 0)}</span>
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClearSelection}
                        className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors text-blue-500 hover:text-blue-700"
                        title="Cambiar o remover cliente"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-all shadow-sm"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            Cargando clientes...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center space-y-2">
                            <p className="text-xs text-gray-500">No se encontraron clientes para "{query}"</p>
                            {onQuickCreate && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onQuickCreate(query);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 transition-colors"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Registrar "{query}"
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="p-1 space-y-0.5">
                            {filtered.map(c => {
                                const isSelected = activeCustomer?.id === c.id;
                                const isPublic = c.id === 'publico';
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => handleCustomerSelection(c)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                                            isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-bold'
                                                : c.disabled
                                                    ? 'opacity-60 bg-gray-50/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                    >
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {isPublic ? '🛒 Venta al Público General' : `${c.firstName} ${c.lastName}`}
                                                </span>
                                                {c.docNumber && !isPublic && (
                                                    <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 py-0.2 rounded">
                                                        {c.docNumber}
                                                    </span>
                                                )}
                                                {c.disabled && (
                                                    <span className="text-[9px] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-1 rounded font-bold">
                                                        Deshabilitado
                                                    </span>
                                                )}
                                            </div>
                                            {!isPublic && (
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                    {c.phone && c.phone !== '-' ? c.phone : ''} 
                                                    {c.city ? ` • ${c.city}` : ''}
                                                    {c.totalSpent > 0 ? ` • ${formatCurrency(c.totalSpent)}` : ''}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
