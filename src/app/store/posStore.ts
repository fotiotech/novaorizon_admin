"use client";

import { useEffect, useState } from "react";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateCartItem,
  type ApiCart,
  type CartIdentifier,
} from "@/lib/api/cart";

/**
 * Minimal POS cart store. Replaces the removed Redux slice: a module-level
 * state object with subscriptions, so the POS page keeps its original API.
 */
interface POSState {
  cart: ApiCart | null;
  isLoading: boolean;
  error: string | null;
}

let state: POSState = { cart: null, isLoading: false, error: null };
let identifier: CartIdentifier = {};
const listeners = new Set<() => void>();

function setState(patch: Partial<POSState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function applyCart(cart: ApiCart | null | undefined) {
  setState({ cart: cart ?? null, error: null });
}

export function usePOSStore() {
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const loadCart = async (nextIdentifier: CartIdentifier) => {
    identifier = nextIdentifier;
    setState({ isLoading: true, error: null });
    try {
      applyCart(await getCart(nextIdentifier));
    } catch (err: any) {
      setState({ error: err?.message ?? "Failed to load cart" });
    } finally {
      setState({ isLoading: false });
    }
  };

  const addItem = async (
    productId: string,
    variant?: string,
    quantity = 1,
  ) => {
    setState({ isLoading: true, error: null });
    try {
      const result = await addToCart(identifier, {
        productId,
        variant,
        quantity,
      });
      applyCart(result.cart);
    } catch (err: any) {
      setState({ error: err?.message ?? "Failed to add item" });
      throw err;
    } finally {
      setState({ isLoading: false });
    }
  };

  const updateItem = async (itemId: string, quantity: number) => {
    setState({ isLoading: true, error: null });
    try {
      const result = await updateCartItem(identifier, itemId, quantity);
      applyCart(result.cart);
    } catch (err: any) {
      setState({ error: err?.message ?? "Failed to update item" });
      throw err;
    } finally {
      setState({ isLoading: false });
    }
  };

  const removeItem = async (itemId: string) => {
    setState({ isLoading: true, error: null });
    try {
      const result = await removeFromCart(identifier, itemId);
      applyCart(result.cart);
    } catch (err: any) {
      setState({ error: err?.message ?? "Failed to remove item" });
      throw err;
    } finally {
      setState({ isLoading: false });
    }
  };

  const clear = async () => {
    setState({ isLoading: true, error: null });
    try {
      const result = await clearCart(identifier);
      applyCart(result.cart);
    } catch (err: any) {
      setState({ error: err?.message ?? "Failed to clear cart" });
      throw err;
    } finally {
      setState({ isLoading: false });
    }
  };

  const cart = state.cart;

  return {
    items: cart?.items ?? [],
    subtotal: cart?.subtotal ?? 0,
    tax: cart?.tax ?? 0,
    discount: cart?.discount ?? 0,
    total: cart?.total ?? 0,
    isLoading: state.isLoading,
    error: state.error,
    loadCart,
    addItem,
    updateItem,
    removeItem,
    clear,
  };
}
