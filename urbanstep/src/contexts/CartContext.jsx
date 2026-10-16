import React, { createContext, useContext, useReducer } from 'react';
import { computeInvoiceTotals } from '../utils/money';
import { getAvailableStockForItem, getColorVariantImage } from '../utils/shoeSizes';

export const CartContext = createContext();

const initialState = {
    items: [],
    customer: null,
    discount: 0,
    taxRate: 0.16, // 16% IVA Venezuela
    igtfRate: 0.03, // 3% IGTF Divisas
    applyIgtf: false,
    shippingCost: 0,
    shippingCarrier: 'retiro_tienda',
    deliveryData: null,
};

function cartReducer(state, action) {
    switch (action.type) {
        case 'ADD_ITEM': {
            const { product, size, quantity = 1, color = null } = action.payload;
            if (!product) return state;

            const itemColor = color || product.color || (Array.isArray(product.colors) && product.colors[0]) || null;
            const itemKey = `${product.id}-${size}${itemColor ? `-${itemColor}` : ''}`;
            const maxStock = getAvailableStockForItem(product, size, itemColor);

            // Si no hay stock alguno disponible, rechazar adición
            if (maxStock <= 0) {
                return state;
            }

            const existingIndex = state.items.findIndex(i => 
                i.uniqueId === itemKey || 
                (i.productId === product.id && String(i.size) === String(size) && (itemColor ? i.color === itemColor : true))
            );
            
            if (existingIndex > -1) {
                const existing = state.items[existingIndex];
                const currentQty = existing.quantity || 0;
                // No permitir exceder el stock real disponible
                if (currentQty >= maxStock) {
                    return state;
                }
                const newQuantity = Math.min(maxStock, currentQty + Math.max(1, quantity));
                const updated = [...state.items];
                updated[existingIndex] = {
                    ...existing,
                    quantity: newQuantity,
                    maxStock: maxStock
                };
                return { ...state, items: updated };
            }

            const initialQuantity = Math.min(maxStock, Math.max(1, quantity));
            return {
                ...state,
                items: [
                    ...state.items,
                    {
                        uniqueId: itemKey,
                        productId: product.id,
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        brand: product.brand,
                        size: size,
                        color: itemColor,
                        quantity: initialQuantity,
                        maxStock: maxStock,
                        imageUrl: getColorVariantImage(product, itemColor) || product.imageUrl || product.imagen_url || product.image,
                        sku: product.sku
                    }
                ]
            };
        }

        case 'REMOVE_ITEM': {
            const payload = action.payload;
            return {
                ...state,
                items: state.items.filter(i => {
                    if (typeof payload === 'string' || typeof payload === 'number') {
                        const pStr = String(payload).trim().toLowerCase();
                        if ((i.uniqueId || '').toLowerCase() === pStr) return false;
                        if (String(i.id || '').toLowerCase() === pStr) return false;
                        if (String(i.productId || '').toLowerCase() === pStr) return false;
                        if (`${i.productId}-${i.size}`.toLowerCase() === pStr) return false;
                        if (`${i.productId}-${i.size}-${i.color}`.toLowerCase() === pStr) return false;
                        return true;
                    }
                    if (payload && typeof payload === 'object') {
                        const { uniqueId, productId, id, size, color } = payload;
                        if (uniqueId && i.uniqueId === uniqueId) return false;
                        const targetProdId = productId || id;
                        if (targetProdId && (i.productId === targetProdId || i.id === targetProdId)) {
                            const matchSize = !size || String(i.size) === String(size);
                            const matchColor = !color || !i.color || String(i.color).toLowerCase() === String(color).toLowerCase();
                            if (matchSize && matchColor) return false;
                        }
                    }
                    return true;
                })
            };
        }

        case 'UPDATE_QTY': {
            const { id, uniqueId, productId, size, color, qty } = action.payload;
            const targetId = uniqueId || id;
            return {
                ...state,
                items: state.items.map(i => {
                    const match = (targetId && (i.uniqueId === targetId || i.id === targetId || `${i.productId}-${i.size}` === targetId)) ||
                                  (productId && i.productId === productId && (!size || String(i.size) === String(size)) && (!color || String(i.color).toLowerCase() === String(color).toLowerCase()));
                    if (!match) return i;

                    const limit = i.maxStock !== undefined ? i.maxStock : 9999;
                    // Asegurar que la cantidad esté estrictamente entre 0 y el stock disponible
                    const safeQty = Math.max(0, Math.min(parseInt(qty) || 0, limit));
                    return { ...i, quantity: safeQty };
                }).filter(i => i.quantity > 0)
            };
        }

        case 'SET_CUSTOMER':
            return { ...state, customer: action.payload };
        case 'SET_DISCOUNT':
            return { ...state, discount: Math.max(0, Math.min(100, Number(action.payload) || 0)) };
        case 'SET_APPLY_IGTF':
            return { ...state, applyIgtf: Boolean(action.payload) };
        case 'SET_SHIPPING':
            return { 
                ...state, 
                shippingCost: action.payload.cost || 0,
                shippingCarrier: action.payload.carrier || 'retiro_tienda',
                deliveryData: action.payload.carrier === 'delivery_local' ? state.deliveryData : null
            };
        case 'SET_DELIVERY_DATA':
            return {
                ...state,
                deliveryData: action.payload,
                shippingCarrier: action.payload ? 'delivery_local' : 'retiro_tienda',
                shippingCost: action.payload ? (action.payload.costUsd || action.payload.deliveryCostUsd || 0) : 0
            };
        case 'CLEAR_CART':
            return initialState;
        default:
            return state;
    }
}

export const CartProvider = ({ children }) => {
    const [state, dispatch] = useReducer(cartReducer, initialState);

    const items = state.items;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    // Totales con redondeo fiscal por renglón (utils/money.js): subtotal, descuento, IVA, IGTF y total
    const totals = computeInvoiceTotals({
        items,
        discountPct: state.discount,
        taxRate: state.taxRate,
        igtfRate: state.igtfRate,
        applyIgtf: state.applyIgtf,
        shipping: state.shippingCost
    });
    const { subtotal, tax, igtf, total } = totals;
    const discountAmount = totals.discount;
    const shipping = totals.shipping;

    const addItem = (product, size = 'N/A', quantity = 1, color = null) => {
        dispatch({ type: 'ADD_ITEM', payload: { product, size, quantity, color } });
    };

    const removeItem = (target, size = null, color = null) => {
        if (!target) return;
        if (typeof target === 'object') {
            dispatch({ type: 'REMOVE_ITEM', payload: target });
        } else if (size !== null) {
            dispatch({ type: 'REMOVE_ITEM', payload: { productId: target, size, color } });
        } else {
            dispatch({ type: 'REMOVE_ITEM', payload: target });
        }
    };

    /**
     * Permite actualizar cantidad con firma flexible:
     * updateQuantity(uniqueId, newQty) O updateQuantity(productId, size, newQty, color)
     */
    const updateQuantity = (p1, p2, p3 = null, p4 = null) => {
        if (p3 === null && p4 === null) {
            // Firma: updateQuantity(uniqueId, qty)
            dispatch({ type: 'UPDATE_QTY', payload: { uniqueId: p1, qty: p2 } });
        } else {
            // Firma: updateQuantity(productId, size, qty, color)
            dispatch({ type: 'UPDATE_QTY', payload: { productId: p1, size: p2, qty: p3, color: p4 } });
        }
    };

    const setApplyIgtf = (apply) => {
        dispatch({ type: 'SET_APPLY_IGTF', payload: apply });
    };

    const setShipping = (carrier, cost) => {
        dispatch({ type: 'SET_SHIPPING', payload: { carrier, cost } });
    };

    const setDeliveryData = (data) => {
        dispatch({ type: 'SET_DELIVERY_DATA', payload: data });
    };

    const setCustomer = (customer) => {
        dispatch({ type: 'SET_CUSTOMER', payload: customer });
    };

    const clearCart = () => {
        dispatch({ type: 'CLEAR_CART' });
    };

    return (
        <CartContext.Provider value={{
            state,
            dispatch,
            items,
            itemCount,
            subtotal,
            discountAmount,
            tax,
            igtf,
            total,
            shippingCost: shipping,
            shippingCarrier: state.shippingCarrier,
            deliveryData: state.deliveryData,
            customer: state.customer,
            setCustomer,
            addItem,
            removeItem,
            updateQuantity,
            setApplyIgtf,
            taxRate: state.taxRate,
            igtfRate: state.igtfRate,
            applyIgtf: state.applyIgtf,
            setShipping,
            setDeliveryData,
            clearCart,
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        return {
            items: [],
            itemCount: 0,
            subtotal: 0,
            discountAmount: 0,
            tax: 0,
            igtf: 0,
            shippingCost: 0,
            shippingCarrier: 'retiro_tienda',
            deliveryData: null,
            total: 0,
            addItem: () => {},
            removeItem: () => {},
            updateQuantity: () => {},
            setApplyIgtf: () => {},
            setShipping: () => {},
            setDeliveryData: () => {},
            clearCart: () => {}
        };
    }
    return context;
};

export default CartContext;