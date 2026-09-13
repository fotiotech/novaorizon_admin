// context/CartContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import {
  cartReducer,
  CartState,
  initialCartState,
} from "../reducer/cartReducer";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyDiscount,
  mergeGuestSessionData,
} from "@/app/actions/cart";
import { useUserData } from "./UserDataContext";
import { v4 as uuidv4 } from "uuid";

interface CartContextType extends CartState {
  addItem: (
    productId: string,
    variant?: string,
    quantity?: number,
  ) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyDiscount: (discountValue: number, couponCode?: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearError: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

const getOrCreateId = (key: string): string => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(key, id);
  }
  return id;
};

const getSessionId = (): string => getOrCreateId("sessionId");
const getGuestId = (): string => getOrCreateId("guestId");

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUserData();
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  const getIdentifier = useCallback(() => {
    const userId = user?.id;
    if (userId) return { userId, sessionId: undefined };
    // Ensure both guest identifiers exist in localStorage
    const sessionId = getSessionId();
    getGuestId();
    return { userId: undefined, sessionId };
  }, [user]);

  const refreshCart = useCallback(async () => {
    const identifier = getIdentifier();
    if (!identifier.userId && !identifier.sessionId) return;
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const cart = await getCart(identifier);
      dispatch({ type: "SET_CART", payload: cart });
    } catch (error: any) {
      dispatch({ type: "SET_ERROR", payload: error.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [getIdentifier]);

  // Merge guest cart into user cart on login, then refresh
  useEffect(() => {
    if (!user?.id) {
      refreshCart();
      return;
    }

    if (typeof window === "undefined") return;

    const guestId = localStorage.getItem("guestId") || undefined;
    const sessionId = localStorage.getItem("sessionId") || undefined;

    (async () => {
      try {
        if (guestId || sessionId) {
          await mergeGuestSessionData({
            guestId,
            sessionId,
            userId: user.id,
          });
          localStorage.removeItem("guestId");
          localStorage.removeItem("sessionId");
        }
      } catch {
        // swallow — refreshCart still runs below
      } finally {
        refreshCart();
      }
    })();
  }, [user?.id, refreshCart]);

  const addItem = useCallback(
    async (productId: string, variant?: string, quantity: number = 1) => {
      const identifier = getIdentifier();
      if (!identifier.userId && !identifier.sessionId)
        throw new Error("No identifier");
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const result = await addToCart(identifier, {
          productId,
          variant,
          quantity,
        });
        if (result.success && result.cart) {
          dispatch({ type: "SET_CART", payload: result.cart });
        }
      } catch (error: any) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [getIdentifier],
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      const identifier = getIdentifier();
      if (!identifier.userId && !identifier.sessionId)
        throw new Error("No identifier");
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const result = await updateCartItem(identifier, itemId, quantity);
        if (result.success && result.cart) {
          dispatch({ type: "SET_CART", payload: result.cart });
        }
      } catch (error: any) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [getIdentifier],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const identifier = getIdentifier();
      if (!identifier.userId && !identifier.sessionId)
        throw new Error("No identifier");
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const result = await removeFromCart(identifier, itemId);
        if (result.success && result.cart) {
          dispatch({ type: "SET_CART", payload: result.cart });
        }
      } catch (error: any) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [getIdentifier],
  );

  const clearCartAction = useCallback(async () => {
    const identifier = getIdentifier();
    if (!identifier.userId && !identifier.sessionId)
      throw new Error("No identifier");
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const result = await clearCart(identifier);
      if (result.success) {
        dispatch({
          type: "SET_CART",
          payload: {
            items: [],
            subtotal: 0,
            tax: 0,
            discount: 0,
            shippingCost: 0,
            total: 0,
          },
        });
      }
    } catch (error: any) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [getIdentifier]);

  const applyDiscountAction = useCallback(
    async (discountValue: number, couponCode?: string) => {
      const identifier = getIdentifier();
      if (!identifier.userId && !identifier.sessionId)
        throw new Error("No identifier");
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const result = await applyDiscount(
          identifier,
          discountValue,
          couponCode,
        );
        if (result.success && result.cart) {
          dispatch({ type: "SET_CART", payload: result.cart });
        }
      } catch (error: any) {
        dispatch({ type: "SET_ERROR", payload: error.message });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [getIdentifier],
  );

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const value: CartContextType = {
    ...state,
    addItem,
    updateItem,
    removeItem,
    clearCart: clearCartAction,
    applyDiscount: applyDiscountAction,
    refreshCart,
    clearError,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
