"use server";

import { connection } from "@/utils/connection";
import { Event, IEvent } from "@/models/Event";
import { revalidatePath } from "next/cache";
import mongoose, { Types } from "mongoose";
import Product from "@/models/Product";

type EventType = IEvent["eventType"];

interface TrackEventParams {
  itemId: string;
  eventType: EventType;
  sessionId?: string;
  metadata?: Record<string, any>;
}

// ─── 1. Track any event (userId resolved server-side) ──

export async function trackEvent(params: TrackEventParams) {
  await connection();
  const { itemId, eventType, sessionId, metadata } = params;

  console.log(await Event.find().sort({ timestamp: -1 }).limit(10));

  const scoreMap: Record<EventType, number> = {
    view: 1,
    cart_add: 3,
    purchase: 5,
    like: 2,
    page_view: 1,
  };

  const event = new Event({
    userId: "",
    itemId: new Types.ObjectId(itemId),
    eventType,
    score: scoreMap[eventType] || 1,
    sessionId,
    metadata,
    timestamp: new Date(),
  });

  await event.save();
  revalidatePath("/");
}

// ─── 2. Get personalized recommendations ──────────────

export async function getRecommendations(limit: number = 10) {
  await connection();

  // 1. Count user interactions
  const userInteractions = await Event.find({ userId: "" })
    .select("itemId")
    .lean();
  const interactedIds = userInteractions.map((i) => i.itemId);
  console.log(
    `[getRecommendations] User has ${interactedIds.length} interactions`,
  );

  if (interactedIds.length === 0) {
    console.log("[getRecommendations] No interactions, returning trending");
    return getTrendingItems(limit);
  }

  // 2. Collaborative filtering pipeline
  const recommendations = await Event.aggregate([
    { $match: { itemId: { $in: interactedIds }, userId: { $ne: "" } } },
    {
      $group: {
        _id: "$userId",
        items: { $addToSet: "$itemId" },
        totalScore: { $sum: "$score" },
      },
    },
    { $sort: { totalScore: -1 } },
    { $limit: 20 },
    { $unwind: "$items" },
    { $match: { items: { $nin: interactedIds } } },
    {
      $group: {
        _id: "$items",
        recommendationScore: { $sum: "$totalScore" },
      },
    },
    { $sort: { recommendationScore: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $match: { product: { $ne: null } } }, // Only keep products that exist
    { $replaceRoot: { newRoot: "$product" } },
  ]);

  console.log(
    `[getRecommendations] Found ${recommendations.length} recommendations`,
  );
  return recommendations;
}

// ─── 3. Trending (fallback) ────────────────────────────

// app/actions/events.ts – updated getTrendingItems

export async function getTrendingItems(limit: number = 10) {
  await connection();

  const trending = await Event.aggregate([
    {
      $match: {
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    },
    {
      $group: {
        _id: "$itemId",
        viewCount: { $sum: { $cond: [{ $eq: ["$eventType", "view"] }, 1, 0] } },
        purchaseCount: {
          $sum: { $cond: [{ $eq: ["$eventType", "purchase"] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        score: { $add: ["$viewCount", { $multiply: ["$purchaseCount", 3] }] },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $replaceRoot: { newRoot: "$product" } },
  ]);

  // 🔥 If no trending products, fallback to recently added products
  if (trending.length === 0) {
    console.log(
      "[getTrendingItems] No trending events, returning recent products",
    );
    return Product.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  return trending;
}

// ─── 4. Recently viewed ─────────────────────────────────

export async function getRecentlyViewed(limit: number = 5) {
  await connection();

  return Event.aggregate([
    { $match: { userId: "", eventType: "view" } },
    { $sort: { timestamp: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "itemId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    { $replaceRoot: { newRoot: "$product" } },
  ]);
}

export async function mergeGuestEvents(guestId: string, newUserId: string) {
  await connection();
  await Event.updateMany({ userId: guestId }, { $set: { userId: newUserId } });
  // Optionally, you can also delete the guest events or leave them – your call.
}

export async function getRelatedProducts(
  productId: string,
  limit: number = 10,
) {
  await connection();
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return [];
  }

  // Fetch the product's related_products and fallback data
  const product: any = await Product.findById(productId)
    .select("related_products category_id brand")
    .lean();
  if (!product) return [];

  let relatedIds = product.related_products || [];

  // Handle both formats: array of IDs or array of { id, relationship_type }
  if (Array.isArray(relatedIds) && relatedIds.length > 0) {
    if (typeof relatedIds[0] === "object" && relatedIds[0].id) {
      relatedIds = relatedIds.map((r: any) => r.id);
    }
  }

  let products: any[] = [];

  // If manual relations exist, use them
  if (relatedIds.length > 0) {
    products = await Product.find({ _id: { $in: relatedIds } })
      .limit(limit)
      .lean();
  }

  // Fallback: if no related products, use same category or brand
  if (products.length === 0) {
    const fallbackQuery: any = {
      _id: { $ne: new mongoose.Types.ObjectId(productId) },
    };
    if (product.category_id) {
      fallbackQuery.category_id = product.category_id;
    } else if (product.brand) {
      fallbackQuery.brand = product.brand;
    }
    products = await Product.find(fallbackQuery).limit(limit).lean();
  }

  return products;
}
