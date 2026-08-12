"use server";

import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import mongoose from "mongoose";

// Types
export interface CartItemInput {
  productId: string;
  variant?: string;
  quantity: number;
}

// Helper to calculate totals
async function recalculateCart(cart: any) {
  const itemTotals = cart.items.map((item: any) => ({
    ...item,
    totalPrice: item.price * item.quantity - (item.discount || 0),
  }));
  const subtotal = itemTotals.reduce(
    (sum: number, item: any) => sum + item.totalPrice,
    0,
  );
  const tax = subtotal * 0.08; // example tax rate, could be per-item
  const discount = cart.discount || 0;
  const shippingCost = cart.shippingCost || 0;
  const total = subtotal + tax + shippingCost - discount;
  cart.subtotal = subtotal;
  cart.tax = tax;
  cart.total = total;
  return cart;
}

// Retrieve current cart (by userId or sessionId)
export async function getCart(identifier: {
  userId?: string;
  sessionId?: string;
}) {
  await connection();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) return null;

  const query: any = {};
  if (userId) query.userId = userId;
  else query.sessionId = sessionId;

  let cart: any = await Cart.findOne(query)
    .populate("items.productId", "title main_image slug list_price")
    .lean();

  if (!cart) {
    // Create a new empty cart
    cart = await Cart.create({
      userId: userId || undefined,
      sessionId: sessionId || undefined,
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      shippingCost: 0,
      total: 0,
    });
    cart = cart?.toObject();
  }

  return {
    ...cart,
    _id: cart?._id.toString(),
    userId: cart?.userId?.toString(),
    items: cart?.items.map((item: any) => ({
      ...item,
      _id: item._id.toString(),
      name: item.title || "",
      productId: item.productId?._id?.toString() || item.productId?.toString(),
    })),
  };
}

// Add item to cart (upsert)
export async function addToCart(
  identifier: { userId?: string; sessionId?: string },
  input: CartItemInput,
) {
  await connection();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier provided");

  // Validate product exists and get current price
  const product: any = await Product.findById(input.productId)
    .select("list_price title")
    .lean();
  if (!product) throw new Error("Product not found");

  const price = product.list_price; // you might also consider sale price or variant price

  // Find or create cart
  let cart: any = await Cart.findOne({
    ...(userId ? { userId } : { sessionId }),
  });

  if (!cart) {
    cart = new Cart({
      userId: userId || undefined,
      sessionId: sessionId || undefined,
      items: [],
    });
  }

  // Check if item already exists (by productId and variant)
  const existingItemIndex = cart.items.findIndex(
    (item: any) =>
      item.productId.toString() === input.productId &&
      (item.variant || null) === (input.variant || null),
  );

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += input.quantity;
  } else {
    cart.items.push({
      productId: new mongoose.Types.ObjectId(input.productId),
      variant: input.variant || undefined,
      quantity: input.quantity,
      price: price,
      taxRate: 0, // can be per-product
      discount: 0,
    });
  }

  // Recalculate totals
  await recalculateCart(cart);
  await cart.save();

  revalidatePath("/pos");
  return { success: true, cart: cart.toObject() };
}

// Update item quantity
export async function updateCartItem(
  identifier: { userId?: string; sessionId?: string },
  itemId: string,
  quantity: number,
) {
  await connection();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const cart = await Cart.findOne({
    ...(userId ? { userId } : { sessionId }),
  });
  if (!cart) throw new Error("Cart not found");

  const item = cart.items.id(itemId);
  if (!item) throw new Error("Item not found");
  if (quantity <= 0) {
    // Remove item
    cart.items.pull(itemId);
  } else {
    item.quantity = quantity;
  }

  await recalculateCart(cart);
  await cart.save();

  revalidatePath("/pos");
  return { success: true, cart: cart.toObject() };
}

// Remove item
export async function removeFromCart(
  identifier: { userId?: string; sessionId?: string },
  itemId: string,
) {
  return updateCartItem(identifier, itemId, 0);
}

// Clear cart
export async function clearCart(identifier: {
  userId?: string;
  sessionId?: string;
}) {
  await connection();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const cart = await Cart.findOne({
    ...(userId ? { userId } : { sessionId }),
  });
  if (!cart) throw new Error("Cart not found");

  cart.items = [];
  await recalculateCart(cart);
  await cart.save();

  revalidatePath("/pos");
  return { success: true };
}

// Apply discount/coupon (optional)
export async function applyDiscount(
  identifier: { userId?: string; sessionId?: string },
  discountValue: number,
  couponCode?: string,
) {
  await connection();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier");

  const cart = await Cart.findOne({
    ...(userId ? { userId } : { sessionId }),
  });
  if (!cart) throw new Error("Cart not found");

  cart.discount = discountValue;
  if (couponCode) cart.appliedCoupon = couponCode;
  await recalculateCart(cart);
  await cart.save();

  revalidatePath("/pos");
  return { success: true, cart: cart.toObject() };
}
