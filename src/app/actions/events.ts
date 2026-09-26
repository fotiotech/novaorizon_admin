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

// admin/app/actions/events.ts
export async function getRecentEvents(
  limit = 50,
  sinceMs = 24 * 60 * 60 * 1000,
) {
  await connection();
  const since = new Date(Date.now() - sinceMs);

  return Event.aggregate([
    { $match: { isBot: { $ne: true }, timestamp: { $gte: since } } },
    { $sort: { timestamp: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "itemId",
        foreignField: "_id",
        as: "productArr",
      },
    },
    {
      $addFields: {
        product: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$productArr", []] } }, 0] },
            { $arrayElemAt: ["$productArr", 0] },
            null,
          ],
        },
      },
    },
    { $unset: "productArr" },
    {
      $project: {
        userId: 1,
        itemId: 1,
        eventType: 1,
        score: 1,
        metadata: 1,
        timestamp: 1,
        product: {
          $cond: [
            { $eq: ["$product", null] },
            null,
            {
              _id: "$product._id",
              title: "$product.name",
              image: {
                $arrayElemAt: [{ $ifNull: ["$product.images", []] }, 0],
              },
              price: "$product.price",
              slug: "$product.slug",
            },
          ],
        },
      },
    },
  ]);
}

export async function getEventsSince(since: number, limit = 50) {
  await connection();
  return Event.aggregate([
    {
      $match: {
        isBot: { $ne: true },
        timestamp: { $gt: new Date(since) },
      },
    },
    { $sort: { timestamp: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "itemId",
        foreignField: "_id",
        as: "productArr",
      },
    },
    {
      $addFields: {
        product: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$productArr", []] } }, 0] },
            { $arrayElemAt: ["$productArr", 0] },
            null,
          ],
        },
      },
    },
    { $unset: "productArr" },
    {
      $project: {
        userId: 1,
        itemId: 1,
        eventType: 1,
        score: 1,
        metadata: 1,
        timestamp: 1,
        product: {
          $cond: [
            { $eq: ["$product", null] },
            null,
            {
              _id: "$product._id",
              title: "$product.name",
              image: {
                $arrayElemAt: [{ $ifNull: ["$product.images", []] }, 0],
              },
              price: "$product.price",
              slug: "$product.slug",
            },
          ],
        },
      },
    },
  ]);
}

export interface HotItem {
  _id: string;
  title?: string;
  image?: string;
  price?: number;
  score: number;
  prevScore: number;
  delta: number; // score - prevScore
  counts: {
    view: number;
    cart_add: number;
    purchase: number;
    like: number;
  };
}

export async function getHotRightNow(
  windowMs = 15 * 60 * 1000,
  limit = 8,
): Promise<HotItem[]> {
  await connection();

  const now = Date.now();
  const currentStart = new Date(now - windowMs);
  const prevStart = new Date(now - windowMs * 2);

  const weightedScore = {
    $sum: {
      $switch: {
        branches: [
          { case: { $eq: ["$eventType", "purchase"] }, then: 5 },
          { case: { $eq: ["$eventType", "cart_add"] }, then: 3 },
          { case: { $eq: ["$eventType", "like"] }, then: 2 },
          { case: { $eq: ["$eventType", "view"] }, then: 1 },
        ],
        default: 0,
      },
    },
  };

  const rows = await Event.aggregate([
    {
      $match: {
        isBot: { $ne: true },
        itemId: { $ne: null },
        timestamp: { $gte: prevStart },
        eventType: { $in: ["view", "cart_add", "purchase", "like"] },
      },
    },
    {
      $group: {
        _id: {
          itemId: "$itemId",
          bucket: {
            $cond: [{ $gte: ["$timestamp", currentStart] }, "cur", "prev"],
          },
        },
        score: weightedScore,
        view: { $sum: { $cond: [{ $eq: ["$eventType", "view"] }, 1, 0] } },
        cart_add: {
          $sum: { $cond: [{ $eq: ["$eventType", "cart_add"] }, 1, 0] },
        },
        purchase: {
          $sum: { $cond: [{ $eq: ["$eventType", "purchase"] }, 1, 0] },
        },
        like: { $sum: { $cond: [{ $eq: ["$eventType", "like"] }, 1, 0] } },
      },
    },
    {
      $group: {
        _id: "$_id.itemId",
        score: {
          $sum: { $cond: [{ $eq: ["$_id.bucket", "cur"] }, "$score", 0] },
        },
        prevScore: {
          $sum: { $cond: [{ $eq: ["$_id.bucket", "prev"] }, "$score", 0] },
        },
        view: {
          $sum: { $cond: [{ $eq: ["$_id.bucket", "cur"] }, "$view", 0] },
        },
        cart_add: {
          $sum: { $cond: [{ $eq: ["$_id.bucket", "cur"] }, "$cart_add", 0] },
        },
        purchase: {
          $sum: { $cond: [{ $eq: ["$_id.bucket", "cur"] }, "$purchase", 0] },
        },
        like: {
          $sum: { $cond: [{ $eq: ["$_id.bucket", "cur"] }, "$like", 0] },
        },
      },
    },
    { $match: { score: { $gt: 0 } } },
    { $sort: { score: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productArr",
      },
    },
    {
      $addFields: {
        product: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$productArr", []] } }, 0] },
            { $arrayElemAt: ["$productArr", 0] },
            null,
          ],
        },
      },
    },
    { $unset: "productArr" },
    { $match: { product: { $ne: null }, "product.status": "active" } },
    {
      $project: {
        _id: 1,
        score: 1,
        prevScore: 1,
        delta: { $subtract: ["$score", "$prevScore"] },
        counts: {
          view: "$view",
          cart_add: "$cart_add",
          purchase: "$purchase",
          like: "$like",
        },
        product: {
          _id: "$product._id",
          title: "$product.name",
          image: { $arrayElemAt: [{ $ifNull: ["$product.images", []] }, 0] },
          price: "$product.price",
          slug: "$product.slug",
        },
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$$ROOT",
            {
              _id: { $toString: "$product._id" },
              title: "$product.title",
              image: "$product.image",
              price: "$product.price",
              slug: "$product.slug",
            },
          ],
        },
      },
    },
  ]);

  return rows as HotItem[];
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

  const product: any = await Product.findById(productId)
    .select("relatedProducts categoryId brand")
    .lean();
  if (!product) return [];

  let relatedIds = product.relatedProducts || [];

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
    if (product.categoryId) {
      fallbackQuery.categoryId = product.categoryId;
    } else if (product.brand) {
      fallbackQuery.brand = product.brand;
    }
    products = await Product.find(fallbackQuery).limit(limit).lean();
  }

  return products;
}
