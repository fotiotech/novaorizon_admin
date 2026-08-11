import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyDiscount,
} from "@/app/actions/cart";

interface CartItem {
  _id: string;
  productId: string;
  name?: string;
  image?: string;
  variant?: string;
  quantity: number;
  price: number;
  taxRate: number;
  discount: number;
  totalPrice: number;
}

interface POSState {
  cartId?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shippingCost: number;
  total: number;
  currency: string;
  appliedCoupon?: string;
  userId?: string;
  sessionId?: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCart: (identifier: {
    userId?: string;
    sessionId?: string;
  }) => Promise<void>;
  addItem: (productId: string, variant?: string, qty?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  applyDiscount: (value: number, coupon?: string) => Promise<void>;
  reset: () => void;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      cartId: undefined,
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      shippingCost: 0,
      total: 0,
      currency: "USD",
      appliedCoupon: undefined,
      userId: undefined,
      sessionId: undefined,
      isLoading: false,
      error: null,

      loadCart: async (identifier) => {
        set({ isLoading: true, error: null });
        try {
          const cart: any = await getCart(identifier);
          if (cart) {
            set({
              cartId: cart._id,
              items: cart.items.map((item: any) => ({
                ...item,
                totalPrice: item.price * item.quantity,
              })),
              subtotal: cart.subtotal,
              tax: cart.tax,
              discount: cart.discount || 0,
              shippingCost: cart.shippingCost || 0,
              total: cart.total,
              currency: cart.currency,
              appliedCoupon: cart.appliedCoupon,
              userId: cart.userId,
              sessionId: cart.sessionId,
            });
          }
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (productId, variant, qty = 1) => {
        const { userId, sessionId } = get();
        if (!userId && !sessionId) return; // should have been set

        set({ isLoading: true, error: null });
        try {
          const result = await addToCart(
            { userId, sessionId },
            { productId, variant, quantity: qty },
          );
          if (result.success && result.cart) {
            // Re-fetch updated cart from server to keep in sync
            await get().loadCart({ userId, sessionId });
          }
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      updateItem: async (itemId, quantity) => {
        const { userId, sessionId } = get();
        if (!userId && !sessionId) return;
        set({ isLoading: true, error: null });
        try {
          const result = await updateCartItem(
            { userId, sessionId },
            itemId,
            quantity,
          );
          if (result.success && result.cart) {
            await get().loadCart({ userId, sessionId });
          }
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (itemId) => {
        const { userId, sessionId } = get();
        if (!userId && !sessionId) return;
        set({ isLoading: true, error: null });
        try {
          const result = await removeFromCart({ userId, sessionId }, itemId);
          if (result.success && result.cart) {
            await get().loadCart({ userId, sessionId });
          }
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      clear: async () => {
        const { userId, sessionId } = get();
        if (!userId && !sessionId) return;
        set({ isLoading: true, error: null });
        try {
          await clearCart({ userId, sessionId });
          await get().loadCart({ userId, sessionId });
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      applyDiscount: async (value, coupon) => {
        const { userId, sessionId } = get();
        if (!userId && !sessionId) return;
        set({ isLoading: true, error: null });
        try {
          const result = await applyDiscount(
            { userId, sessionId },
            value,
            coupon,
          );
          if (result.success && result.cart) {
            await get().loadCart({ userId, sessionId });
          }
        } catch (error: any) {
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      reset: () => {
        set({
          cartId: undefined,
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          shippingCost: 0,
          total: 0,
          appliedCoupon: undefined,
          error: null,
        });
      },
    }),
    {
      name: "pos-cart", // local storage key for offline resilience
      partialize: (state) => ({
        // only persist items and totals as a cache; we'll reload from DB on hydration
        items: state.items,
        subtotal: state.subtotal,
        tax: state.tax,
        discount: state.discount,
        total: state.total,
        appliedCoupon: state.appliedCoupon,
        cartId: state.cartId,
      }),
    },
  ),
);
