import React, { createContext, useContext, useReducer } from 'react';

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
            const { product, size, quantity = 1 } = action.payload;
            const itemKey = `${product.id}-${size}`;
            const existingIndex = state.items.findIndex(i => `${i.productId}-${i.size}` === itemKey || (i.id === product.id && i.size === size));
            
            if (existingIndex > -1) {
                const updated = [...state.items];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + quantity
                };
                return { ...state, items: updated };
            }
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
                        quantity: quantity
                    }
                ]
            };
        }
        case 'REMOVE_ITEM':
            return {
                ...state,
                items: state.items.filter(i => 
                    i.uniqueId !== action.payload && 
                    !(`${i.productId}-${i.size}` === action.payload) &&
                    !(i.productId === action.payload.productId && i.size === action.payload.size)
                )
            };
        case 'UPDATE_QTY':
            return {
                ...state,
                items: state.items.map(i => {
                    const match = i.uniqueId === action.payload.id || 
                                  `${i.productId}-${i.size}` === action.payload.id ||
                                  (i.productId === action.payload.productId && i.size === action.payload.size);
                    return match ? { ...i, quantity: action.payload.qty } : i;
                }).filter(i => i.quantity > 0)
            };
        case 'SET_CUSTOMER':
            return { ...state, customer: action.payload };
        case 'SET_DISCOUNT':
            return { ...state, discount: action.payload };
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
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discountAmount = subtotal * (state.discount / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    
    // IVA 16%
    const tax = subtotalAfterDiscount * state.taxRate;
    
    // IGTF 3% sobre base gravable en divisas si aplica
    const igtf = state.applyIgtf ? (subtotalAfterDiscount + tax) * state.igtfRate : 0;
    
    const shipping = Number(state.shippingCost) || 0;
    const total = subtotalAfterDiscount + tax + igtf + shipping;

    const addItem = (product, size = 'N/A', quantity = 1) => {
        dispatch({ type: 'ADD_ITEM', payload: { product, size, quantity } });
    };

    const removeItem = (productId, size) => {
        dispatch({ type: 'REMOVE_ITEM', payload: { productId, size } });
    };

    const updateQuantity = (productId, size, qty) => {
        dispatch({ type: 'UPDATE_QTY', payload: { productId, size, qty } });
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
            setCustomer,
            addItem,
            removeItem,
            updateQuantity,
            setApplyIgtf,
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