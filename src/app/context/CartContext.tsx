"use client";

import React, { createContext, useContext, useReducer, useEffect } from "react";
import { cartReducer, CartItem, CartAction } from "../reducer/cartReducer";

interface CartContextType {
  cart: CartItem[];
  dispatch: React.Dispatch<CartAction>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Custom hook for consuming the context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

const CART_STORAGE_KEY = "cart";

const initialState = (): CartItem[] => {
  if (typeof window !== "undefined") {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  }
  return [];
};

// CartProvider component
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, dispatch] = useReducer(cartReducer, { items: initialState() });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.items));
  }, [cart.items]);

  return (
    <CartContext.Provider value={{ cart: cart.items, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};
