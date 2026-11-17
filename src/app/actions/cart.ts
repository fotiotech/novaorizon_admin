"use server";


import { requireAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { apiData, apiFetch } from "@/lib/server-api";

/**
 * Carts live in the Express backend (`/api/cart`).
 *
 * The backend derives the cart owner from the forwarded `session` cookie
 * (signed-in user) or its own cart-session cookie, so the `identifier`
 * arguments are kept for API compatibility but no longer select the cart.
 */

// Types
export interface CartItemInput {
  productId: string;
  variant?: string;
  quantity: number;
}

// Retrieve current cart (by userId or sessionId)
export async function getCart(identifier: {
  userId?: string;
  sessionId?: string;
}) {
  await requireAdmin();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) return null;

  return await apiData<any>("/cart");
}

export async function mergeGuestSessionData({
  guestId,
  sessionId,
  userId,
}: {
  guestId?: string;
  sessionId?: string;
  userId: string;
}) {
  await requireAdmin();

  const identifiers = Array.from(
    new Set([guestId, sessionId].filter(Boolean) as string[]),
  );

  if (!identifiers.length) {
    return { success: true, merged: false };
  }

  const result = await apiFetch<{ success?: boolean; merged?: boolean }>(
    "/cart/merge",
    {
      method: "POST",
      body: { guestId, sessionId, userId },
    },
  );

  revalidatePath("/cart");
  return { success: true, merged: Boolean(result?.merged) };
}

// Add item to cart (upsert)
export async function addToCart(
  identifier: { userId?: string; sessionId?: string },
  input: CartItemInput,
) {
  await requireAdmin();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier provided");

  if (input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const cart = await apiData<any>("/cart/items", {
    method: "POST",
    body: {
      productId: input.productId,
      variant: input.variant,
      quantity: input.quantity,
    },
  });

  revalidatePath("/pos");
  return { success: true, cart };
}

// Update item quantity
export async function updateCartItem(
  identifier: { userId?: string; sessionId?: string },
  itemId: string,
  quantity: number,
) {
  await requireAdmin();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const cart = await apiData<any>(
    `/cart/items/${encodeURIComponent(itemId)}`,
    { method: "PATCH", body: { quantity } },
  );

  revalidatePath("/pos");
  return { success: true, cart };
}

// Remove item
export async function removeFromCart(
  identifier: { userId?: string; sessionId?: string },
  itemId: string,
) {
  await requireAdmin();
  return updateCartItem(identifier, itemId, 0);
}

// Clear cart
export async function clearCart(identifier: {
  userId?: string;
  sessionId?: string;
}) {
  await requireAdmin();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const cart = await apiData<any>("/cart", { method: "DELETE" });

  revalidatePath("/pos");
  return { success: true, cart };
}

// Apply discount/coupon
export async function applyDiscount(
  identifier: { userId?: string; sessionId?: string },
  discountValue: number,
  couponCode?: string,
) {
  await requireAdmin();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const cart = await apiData<any>("/cart/discount", {
    method: "POST",
    body: { discountValue, couponCode },
  });

  revalidatePath("/pos");
  return { success: true, cart };
}
