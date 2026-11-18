// lib/api/cart.ts
import api from "@/lib/api";

/**
 * Carts live in the Express backend (`/api/cart`).
 *
 * The backend derives the cart owner from the `session` cookie (signed-in
 * user) or its own cart-session cookie, so the `identifier` arguments are kept
 * for API compatibility but do not select the cart client-side.
 */

/* ------------------------------ types ------------------------------ */

export interface CartIdentifier {
  userId?: string;
  sessionId?: string;
}

export interface CartItemInput {
  productId: string;
  variant?: string;
  quantity: number;
}

export interface ApiCartItem {
  _id: string;
  productId: string;
  name?: string;
  image?: string | null;
  variant?: string;
  quantity: number;
  price: number;
  taxRate?: number;
  discount?: number;
  totalPrice?: number;
  [k: string]: any;
}

/** Serialized cart returned by every `/api/cart` mutation. */
export interface ApiCart {
  _id: string;
  userId?: string | null;
  sessionId?: string | null;
  items: ApiCartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shippingCost: number;
  total: number;
  currency?: string;
  appliedCoupon?: string;
  [k: string]: any;
}

export interface CartMutationResult {
  success: boolean;
  cart?: ApiCart;
  message?: string;
}

/* ---------------------------- reads -------------------------------- */

/** GET /api/cart — the cart for the current session/user (creates one if absent). */
export async function getCart(
  identifier: CartIdentifier,
): Promise<ApiCart | null> {
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) return null;

  const res = await api.get<{ data: ApiCart }>("/cart");
  return res.data?.data ?? null;
}

/* --------------------------- mutations ----------------------------- */

/** POST /api/cart/merge — folds the guest cart into the signed-in user's cart. */
export async function mergeGuestSessionData({
  guestId,
  sessionId,
  userId,
}: {
  guestId?: string;
  sessionId?: string;
  userId: string;
}): Promise<{ success: boolean; merged: boolean }> {
  const identifiers = Array.from(
    new Set([guestId, sessionId].filter(Boolean) as string[]),
  );

  if (!identifiers.length) {
    return { success: true, merged: false };
  }

  const res = await api.post<{ success?: boolean; merged?: boolean }>(
    "/cart/merge",
    { guestId, sessionId, userId },
  );

  return { success: true, merged: Boolean(res.data?.merged) };
}

/** POST /api/cart/items — upserts the line (matching product + variant). */
export async function addToCart(
  identifier: CartIdentifier,
  input: CartItemInput,
): Promise<CartMutationResult> {
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier provided");

  if (input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const res = await api.post<{ success: boolean; data: ApiCart }>(
    "/cart/items",
    {
      productId: input.productId,
      variant: input.variant,
      quantity: input.quantity,
    },
  );

  return { success: true, cart: res.data.data };
}

/** PATCH /api/cart/items/:itemId — a quantity of 0 removes the line. */
export async function updateCartItem(
  identifier: CartIdentifier,
  itemId: string,
  quantity: number,
): Promise<CartMutationResult> {
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const res = await api.patch<{ success: boolean; data: ApiCart }>(
    `/cart/items/${encodeURIComponent(itemId)}`,
    { quantity },
  );

  return { success: true, cart: res.data.data };
}

/** DELETE /api/cart/items/:itemId — removes the line. */
export async function removeFromCart(
  identifier: CartIdentifier,
  itemId: string,
): Promise<CartMutationResult> {
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const res = await api.delete<{ success: boolean; data: ApiCart }>(
    `/cart/items/${encodeURIComponent(itemId)}`,
  );

  return { success: true, cart: res.data.data };
}

/** DELETE /api/cart — empties the cart. */
export async function clearCart(
  identifier: CartIdentifier,
): Promise<CartMutationResult> {
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const res = await api.delete<{ success: boolean; data: ApiCart }>("/cart");

  return { success: true, cart: res.data.data };
}

/** POST /api/cart/discount — applies a coupon/discount value. */
export async function applyDiscount(
  identifier: CartIdentifier,
  discountValue: number,
  couponCode?: string,
): Promise<CartMutationResult> {
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const res = await api.post<{ success: boolean; data: ApiCart }>(
    "/cart/discount",
    { discountValue, couponCode },
  );

  return { success: true, cart: res.data.data };
}
