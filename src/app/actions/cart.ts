"use server";

import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import Product from "@/models/Product";
import Cart from "@/models/Cart";
import Order from "@/models/Order";

// Types
export interface CartItemInput {
  productId: string;
  variant?: string;
  quantity: number;
}

function getProductQuantity(product: any) {
  return Number(product?.quantity ?? 0);
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
  const tax = subtotal * 0;
  const discount = cart.discount || 0;
  const shippingCost = cart.shippingCost || 0;
  const total = subtotal + tax + shippingCost - discount;
  cart.subtotal = subtotal;
  cart.tax = tax;
  cart.total = total;
  return cart;
}

// Helper to populate product details and convert to plain object
async function populateAndLean(cart: any) {
  await cart.populate("items.productId", "name images slug price");
  return cart.toObject();
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
    .populate("items.productId", "name images slug price")
    .lean();

  if (!cart) {
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
      name: item.productId?.name || item.name || "",
      image: item.productId?.images?.[0] || item.image || null,
      price: item.productId?.price || item.price || 0,
      productId: item.productId?._id?.toString() || item.productId?.toString(),
    })),
  };
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
  await connection();

  const identifiers = Array.from(
    new Set([guestId, sessionId].filter(Boolean) as string[]),
  );

  if (!identifiers.length) {
    return { success: true, merged: false };
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  let targetCart = await Cart.findOne({ userId: userObjectId });
  const guestCarts = await Cart.find({
    sessionId: { $in: identifiers },
  }).exec();

  if (!targetCart && guestCarts.length > 0) {
    targetCart = guestCarts[0];
    targetCart.userId = userObjectId;
    targetCart.sessionId = undefined;
  }

  if (!targetCart) {
    targetCart = new Cart({
      userId: userObjectId,
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      shippingCost: 0,
      total: 0,
    });
  }

  for (const guestCart of guestCarts) {
    if (guestCart._id.toString() === targetCart._id?.toString()) continue;

    for (const item of guestCart.items) {
      const existingItem = targetCart.items.find(
        (cartItem: any) =>
          cartItem.productId.toString() === item.productId.toString() &&
          (cartItem.variant || null) === (item.variant || null),
      );

      if (existingItem) {
        existingItem.quantity += item.quantity;
        existingItem.price = item.price;
      } else {
        targetCart.items.push({
          productId: item.productId,
          variant: item.variant,
          quantity: item.quantity,
          name: item.name,
          image: item.image,
          price: item.price,
          taxRate: item.taxRate || 0,
          discount: item.discount || 0,
        });
      }
    }

    await Cart.deleteOne({ _id: guestCart._id });
  }

  targetCart.userId = userObjectId;
  targetCart.sessionId = undefined;
  await recalculateCart(targetCart);
  await targetCart.save();

  await Order.updateMany(
    {
      $or: [
        { guestId: { $in: identifiers } },
        { userId: null, guestId: { $ne: null } },
      ],
    },
    {
      $set: {
        userId: userObjectId,
        guestId: null,
      },
    },
  );

  revalidatePath("/cart");
  return { success: true, merged: true };
}

// Add item to cart (upsert)
export async function addToCart(
  identifier: { userId?: string; sessionId?: string },
  input: CartItemInput,
) {
  await connection();
  const { userId, sessionId } = identifier;
  if (!userId && !sessionId) throw new Error("No identifier provided");

  if (input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const product: any = await Product.findById(input.productId)
    .select("price name images quantity lowStockThreshold")
    .lean();
  if (!product) throw new Error("Product not found");

  const availableQty = product.quantity || 0;
  const price = product.price;

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

  const currentQtyInCart = cart.items.reduce((sum: number, item: any) => {
    if (item.productId.toString() !== input.productId) return sum;
    if ((item.variant || null) !== (input.variant || null)) return sum;
    return sum + Number(item.quantity || 0);
  }, 0);

  if (availableQty < currentQtyInCart + input.quantity) {
    const remaining = Math.max(0, availableQty - currentQtyInCart);
    throw new Error(
      remaining > 0
        ? `Only ${remaining} unit${remaining > 1 ? "s" : ""} available in stock.`
        : "Insufficient stock available.",
    );
  }

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
      image: product.images?.[0] || null,
      name: product.name,
      quantity: input.quantity,
      price: price,
      taxRate: 0,
      discount: 0,
    });
  }

  await recalculateCart(cart);
  await cart.save();

  const cartObject = await populateAndLean(cart);
  revalidatePath("/pos");
  return { success: true, cart: cartObject };
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
    cart.items.pull(itemId);
  } else {
    const product: any = await Product.findById(item.productId)
      .select("quantity lowStockThreshold")
      .lean();
    const availableQty = getProductQuantity(product || {});

    if (quantity > availableQty) {
      throw new Error(
        `Only ${availableQty} unit${availableQty > 1 ? "s" : ""} available in stock.`,
      );
    }

    item.quantity = quantity;
  }

  await recalculateCart(cart);
  await cart.save();

  const cartObject = await populateAndLean(cart);
  revalidatePath("/pos");
  return { success: true, cart: cartObject };
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

  const cartObject = await populateAndLean(cart);
  revalidatePath("/pos");
  return { success: true, cart: cartObject };
}

// Apply discount/coupon
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

  // Recompute subtotal first so we can clamp against it
  await recalculateCart(cart);

  // Clamp discount between 0 and current subtotal
  const clamped = Math.max(
    0,
    Math.min(Number(discountValue) || 0, cart.subtotal),
  );
  cart.discount = clamped;
  if (couponCode) cart.appliedCoupon = couponCode;

  await recalculateCart(cart);
  await cart.save();

  const cartObject = await populateAndLean(cart);
  revalidatePath("/pos");
  return { success: true, cart: cartObject };
}
