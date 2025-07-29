'use client';

import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen_url: string;
  stripe_product_id?: string;
  stripe_price_id?: string;
}

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

interface CarritoState {
  items: ItemCarrito[];
  isOpen: boolean;
}

type CarritoAction =
  | { type: 'ADD_ITEM'; payload: Producto }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { productoId: number; cantidad: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'LOAD_CART'; payload: ItemCarrito[] };

const carritoReducer = (state: CarritoState, action: CarritoAction): CarritoState => {
  let newState: CarritoState;

  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.producto.id === action.payload.id);
      
      if (existingItem) {
        newState = {
          ...state,
          items: state.items.map(item =>
            item.producto.id === action.payload.id
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          )
        };
      } else {
        newState = {
          ...state,
          items: [...state.items, { producto: action.payload, cantidad: 1 }]
        };
      }
      break;
    }

    case 'REMOVE_ITEM': {
      newState = {
        ...state,
        items: state.items.filter(item => item.producto.id !== action.payload)
      };
      break;
    }

    case 'UPDATE_QUANTITY': {
      const { productoId, cantidad } = action.payload;
      
      if (cantidad <= 0) {
        newState = {
          ...state,
          items: state.items.filter(item => item.producto.id !== productoId)
        };
      } else {
        newState = {
          ...state,
          items: state.items.map(item =>
            item.producto.id === productoId
              ? { ...item, cantidad }
              : item
          )
        };
      }
      break;
    }

    case 'CLEAR_CART': {
      newState = {
        ...state,
        items: []
      };
      break;
    }

    case 'TOGGLE_CART': {
      newState = {
        ...state,
        isOpen: !state.isOpen
      };
      break;
    }

    case 'CLOSE_CART': {
      newState = {
        ...state,
        isOpen: false
      };
      break;
    }

    case 'LOAD_CART': {
      newState = {
        ...state,
        items: action.payload
      };
      break;
    }

    default:
      return state;
  }

  // Guardar en localStorage después de cada cambio
  if (typeof window !== 'undefined') {
    localStorage.setItem('carrito', JSON.stringify(newState.items));
  }

  return newState;
};

interface CarritoContextType {
  state: CarritoState;
  addItem: (producto: Producto) => void;
  removeItem: (productoId: number) => void;
  updateQuantity: (productoId: number, cantidad: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  closeCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(carritoReducer, {
    items: [],
    isOpen: false
  });

  // Cargar carrito desde localStorage al inicializar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('carrito');
      if (savedCart) {
        try {
          const items = JSON.parse(savedCart);
          dispatch({ type: 'LOAD_CART', payload: items });
        } catch (error) {
          console.error('Error loading cart from localStorage:', error);
        }
      }
    }
  }, []);

  const addItem = (producto: Producto) => {
    dispatch({ type: 'ADD_ITEM', payload: producto });
  };

  const removeItem = (productoId: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productoId });
  };

  const updateQuantity = (productoId: number, cantidad: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productoId, cantidad } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  const closeCart = () => {
    dispatch({ type: 'CLOSE_CART' });
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.cantidad, 0);
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => total + (item.producto.precio * item.cantidad), 0);
  };

  return (
    <CarritoContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        toggleCart,
        closeCart,
        getTotalItems,
        getTotalPrice
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  const context = useContext(CarritoContext);
  if (context === undefined) {
    throw new Error('useCarrito debe ser usado dentro de un CarritoProvider');
  }
  return context;
} 