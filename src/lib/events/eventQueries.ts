import { connection } from "@/utils/connection";
import { Event } from "@/models/Event";
import { EventRollup } from "@/models/EventRollup";

export interface HotItem {
  _id: string;
  title?: string;
  image?: string;
  price?: number;
  score: number;
  prevScore: number;
  delta: number;
  counts: {
    view: number;
    cart_add: number;
    purchase: number;
    like: number;
  };
}

// ─── Live stream reads ────────────────────────────────────

export async function getEventsSince(since: number, limit = 50) {
  await connection();
  return Event.aggregate([
    {
      $match: {
        isBot: { $ne: true }, // ← NOT `isBot: false`
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

export async function getRecentEvents(limit = 50) {
  await connection();
  return Event.find({ isBot: false })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
}

// ─── Hot right now (weighted, with trend) ─────────────────
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
        isBot: false,
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
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        $or: [{ product: { $exists: false } }, { "product.status": "active" }],
      },
    },
    {
      $project: {
        _id: { $toString: "$_id" },
        title: "$product.title",
        image: "$product.image",
        price: "$product.price",
        score: 1,
        prevScore: 1,
        delta: { $subtract: ["$score", "$prevScore"] },
        counts: {
          view: "$view",
          cart_add: "$cart_add",
          purchase: "$purchase",
          like: "$like",
        },
      },
    },
  ]);

  return rows as HotItem[];
}

// ─── Cart funnel ──────────────────────────────────────────
export async function getCartFunnel(sinceMs = 24 * 60 * 60 * 1000) {
  await connection();
  const since = new Date(Date.now() - sinceMs);

  const [row] = await Event.aggregate([
    { $match: { isBot: false, timestamp: { $gte: since } } },
    {
      $group: {
        _id: null,
        views: { $sum: { $cond: [{ $eq: ["$eventType", "view"] }, 1, 0] } },
        cartAdds: {
          $sum: { $cond: [{ $eq: ["$eventType", "cart_add"] }, 1, 0] },
        },
        purchases: {
          $sum: { $cond: [{ $eq: ["$eventType", "purchase"] }, 1, 0] },
        },
        likes: { $sum: { $cond: [{ $eq: ["$eventType", "like"] }, 1, 0] } },
        pageViews: {
          $sum: { $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0] },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);

  return (
    row ?? {
      views: 0,
      cartAdds: 0,
      purchases: 0,
      likes: 0,
      pageViews: 0,
    }
  );
}

// ─── Abandoned carts ──────────────────────────────────────
export async function getAbandonedCarts(
  sinceMs = 24 * 60 * 60 * 1000,
  limit = 50,
) {
  await connection();
  const since = new Date(Date.now() - sinceMs);

  return Event.aggregate([
    {
      $match: {
        isBot: false,
        timestamp: { $gte: since },
        eventType: { $in: ["cart_add", "purchase"] },
      },
    },
    {
      $group: {
        _id: { userId: "$userId", itemId: "$itemId" },
        hasPurchase: {
          $max: { $cond: [{ $eq: ["$eventType", "purchase"] }, 1, 0] },
        },
        lastCartAdd: {
          $max: {
            $cond: [{ $eq: ["$eventType", "cart_add"] }, "$timestamp", null],
          },
        },
      },
    },
    { $match: { hasPurchase: 0, lastCartAdd: { $ne: null } } },
    { $sort: { lastCartAdd: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        userId: "$_id.userId",
        itemId: "$_id.itemId",
        lastCartAdd: 1,
      },
    },
  ]);
}

// ─── Per-item cart conversion ─────────────────────────────
export async function getCartConversion(
  limit = 10,
  sinceMs = 7 * 24 * 60 * 60 * 1000,
) {
  await connection();
  const since = new Date(Date.now() - sinceMs);

  return Event.aggregate([
    {
      $match: {
        isBot: false,
        timestamp: { $gte: since },
        itemId: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$itemId",
        views: { $sum: { $cond: [{ $eq: ["$eventType", "view"] }, 1, 0] } },
        cartAdds: {
          $sum: { $cond: [{ $eq: ["$eventType", "cart_add"] }, 1, 0] },
        },
        purchases: {
          $sum: { $cond: [{ $eq: ["$eventType", "purchase"] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        cartRate: {
          $cond: [
            { $gt: ["$views", 0] },
            { $divide: ["$cartAdds", "$views"] },
            0,
          ],
        },
        purchaseRate: {
          $cond: [
            { $gt: ["$cartAdds", 0] },
            { $divide: ["$purchases", "$cartAdds"] },
            0,
          ],
        },
      },
    },
    { $match: { cartAdds: { $gte: 3 } } },
    { $sort: { cartRate: -1 } },
    { $limit: limit },
  ]);
}

// ─── Hourly sparkline (24h) ───────────────────────────────
export async function getHourlyEvents(hours = 24) {
  await connection();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return Event.aggregate([
    { $match: { isBot: false, timestamp: { $gte: since } } },
    {
      $group: {
        _id: {
          hour: {
            $dateToString: {
              format: "%Y-%m-%dT%H:00",
              date: "$timestamp",
            },
          },
          eventType: "$eventType",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.hour": 1 } },
  ]);
}

// ─── Rollup-backed trending (older than 1h) ───────────────
export async function getTrendingFromRollups(days = 7, limit = 10) {
  await connection();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return EventRollup.aggregate([
    { $match: { bucket: { $gte: since }, itemId: { $ne: null } } },
    { $group: { _id: "$itemId", score: { $sum: "$totalScore" } } },
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
    { $match: { "product.status": "active" } },
    { $replaceRoot: { newRoot: "$product" } },
  ]);
}
