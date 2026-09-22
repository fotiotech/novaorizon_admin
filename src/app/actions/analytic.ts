// app/actions/analytic.ts
"use server";
import { connection } from "@/utils/connection";
import Order from "@/models/Order";
import User from "@/models/User";
import {
  UserAnalytics,
  UsersByStatus,
  UsersByRole,
} from "@/constant/types/user";
import Product from "@/models/Product";
import "@/models/Category";
import { ProductAnalytics } from "@/constant/types/product";

export async function getUserAnalytics(): Promise<UserAnalytics> {
  try {
    await connection();

    // ---------- Counts ----------
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });

    // ---------- By status ----------
    const usersByStatusResult = await User.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const usersByStatus: any = { active: 0, inactive: 0 };
    usersByStatusResult.forEach((item) => {
      usersByStatus[item._id] = item.count;
    });

    // ---------- By role ----------
    const usersByRoleResult = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    const usersByRole: UsersByRole = {};
    usersByRoleResult.forEach((item) => {
      usersByRole[item._id || "customer"] = item.count;
    });

    // ---------- Monthly signups (current year) ----------
    // FIX: `createdAt` (from timestamps), not `created_at`.
    const currentYear = new Date().getFullYear();
    const monthlySignups = Array(12).fill(0);

    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const signupsByMonth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    signupsByMonth.forEach((item) => {
      if (item._id >= 1 && item._id <= 12) {
        monthlySignups[item._id - 1] = item.count;
      }
    });

    // ---------- Recent users ----------
    // FIX: select `fullName` (schema field) instead of `name`,
    // and use `createdAt` / `updatedAt` / `lastLoginAt`.
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "fullName email image role status createdAt updatedAt lastLoginAt",
      )
      .lean<any[]>();

    // ---------- Growth rate vs. previous month ----------
    const currentMonth = new Date().getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentMonthSignups = monthlySignups[currentMonth];
    const previousMonthSignups = monthlySignups[previousMonth];

    const userGrowthRate =
      previousMonthSignups > 0
        ? ((currentMonthSignups - previousMonthSignups) /
            previousMonthSignups) *
          100
        : currentMonthSignups > 0
          ? 100
          : 0;

    // ---------- Serialize recent users ----------
    // Every date is optional — never call `.toISOString()` blindly.
    const safeDate = (value: any): string | null => {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString().split("T")[0];
    };

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth: currentMonthSignups,
      userGrowthRate,
      usersByStatus,
      usersByRole,
      monthlySignups,
      recentUsers: recentUsers.map((user) => ({
        _id: String(user._id ?? ""),
        // `name` is what the UI consumes — pull it from `fullName`.
        name: user.fullName ?? "",
        email: user.email ?? "",
        image: user.image ?? null,
        role: user.role ?? "customer",
        status: user.status ?? "active",
        joinDate: safeDate(user.createdAt) ?? "",
        lastActive:
          safeDate(user.lastLoginAt) ?? safeDate(user.updatedAt) ?? "Never",
      })) as any,
    };
  } catch (error) {
    console.error("Failed to fetch user analytics:", error);
    throw new Error("Failed to fetch user analytics");
  }
}

export async function getOrderAnalytics() {
  try {
    await connection();

    const totalOrders = await Order.countDocuments();

    const revenueData = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          orderStatus: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          averageOrderValue: { $avg: "$total" },
        },
      },
    ]);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "email")
      .lean();

    return {
      totalOrders,
      totalRevenue: revenueData[0]?.totalRevenue || 0,
      averageOrderValue: revenueData[0]?.averageOrderValue || 0,
      ordersByStatus: ordersByStatus.reduce(
        (acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      recentOrders: JSON.parse(JSON.stringify(recentOrders)),
    };
  } catch (error) {
    console.error("Order analytics error:", error);
    throw new Error("Failed to fetch order analytics");
  }
}

export async function getProductAnalytics(): Promise<ProductAnalytics> {
  try {
    await connection();

    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: "active" });
    const outOfStock = await Product.countDocuments({ quantity: { $lte: 0 } });
    const lowStock = await Product.countDocuments({ quantity: { $lte: 1 } });

    const productsByStatusResult = await Product.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const productsByStatus: Record<string, number> = {
      active: 0,
      inactive: 0,
      draft: 0,
    };
    productsByStatusResult.forEach((item) => {
      productsByStatus[item._id] = item.count;
    });

    const productsByCategoryResult = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$category.name", count: { $sum: 1 } } },
    ]);

    const productsByCategory: Record<string, number> = {};
    productsByCategoryResult.forEach((item) => {
      productsByCategory[item._id] = item.count;
    });

    const currentYear = new Date().getFullYear();
    const monthlyAdditions = Array(12).fill(0);

    const additionsByMonth = await Product.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31T23:59:59`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    additionsByMonth.forEach((item) => {
      monthlyAdditions[item._id - 1] = item.count;
    });

    const recentProducts = await Product.find()
      .populate({
        path: "categoryId",
        select: "name",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "name sku price listPrice quantity lowStockThreshold mainImage status categoryId",
      )
      .lean();

    return {
      totalProducts,
      activeProducts,
      outOfStock,
      lowStock,
      productsByStatus,
      productsByCategory,
      monthlyAdditions,
      recentProducts: recentProducts.map(
        (product) =>
          ({
            ...product,
            _id: product._id?.toString(),
            category: (product as any).categoryId?.name || "Uncategorized",
            createdAt: product.createdAt?.toISOString().split("T")[0],
          }) as any,
      ),
    };
  } catch (error) {
    console.error("Failed to fetch product analytics:", error);
    throw new Error("Failed to fetch product analytics");
  }
}

export async function getFacebookAdsAnalytics() {
  try {
    await connection();
    const FacebookAdsSettings = require("@/models/FacebookAdsSettings").default;

    const settings = await FacebookAdsSettings.findOne().lean();
    if (!settings || !settings.accessToken) {
      return {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgCPC: 0,
        totalConversions: 0,
        roi: 0,
        campaignCount: 0,
        isConfigured: false,
      };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/${settings.apiVersion || "v20.0"}/${settings.adAccountId}/insights?fields=spend,impressions,clicks,actions&access_token=${encodeURIComponent(settings.accessToken)}`,
        { method: "GET" },
      );

      if (!response.ok) {
        return {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          avgCPC: 0,
          totalConversions: 0,
          roi: 0,
          campaignCount: 0,
          isConfigured: true,
          error: "Unable to fetch Meta insights",
        };
      }

      const payload = await response.json();
      const data = Array.isArray(payload.data) ? payload.data[0] : null;

      if (!data) {
        return {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          avgCPC: 0,
          totalConversions: 0,
          roi: 0,
          campaignCount: 0,
          isConfigured: true,
        };
      }

      const spend = parseFloat(data.spend || "0");
      const impressions = parseInt(data.impressions || "0");
      const clicks = parseInt(data.clicks || "0");
      const conversions =
        data.actions?.find((a: any) => a.action_type === "omni_purchase")
          ?.value || 0;

      return {
        totalSpend: spend,
        totalImpressions: impressions,
        totalClicks: clicks,
        avgCPC: clicks > 0 ? spend / clicks : 0,
        totalConversions: conversions,
        roi: spend > 0 ? ((conversions * 50 - spend) / spend) * 100 : 0,
        campaignCount: 0,
        isConfigured: true,
      };
    } catch (error) {
      console.error("Meta API error:", error);
      return {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgCPC: 0,
        totalConversions: 0,
        roi: 0,
        campaignCount: 0,
        isConfigured: true,
        error: "Meta API connection failed",
      };
    }
  } catch (error) {
    console.error("Facebook Ads analytics error:", error);
    return {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgCPC: 0,
      totalConversions: 0,
      roi: 0,
      campaignCount: 0,
      isConfigured: false,
    };
  }
}

export async function getOverviewData() {
  try {
    await connection();

    // ---------- Users ----------
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });

    // FIX: `createdAt`, not `created_at`.
    const newUsersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    });

    // ---------- Products ----------
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: "active" });
    const outOfStock = await Product.countDocuments({ quantity: { $lte: 0 } });
    const lowStock = await Product.countDocuments({ quantity: { $lte: 1 } });

    // ---------- Orders ----------
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({
      orderStatus: "completed",
    });

    const revenueResult = await Order.aggregate([
      { $match: { orderStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    const averageOrderValue =
      completedOrders > 0 ? totalRevenue / completedOrders : 0;

    // ---------- Recent activity ----------
    // FIX: use `fullName` / `createdAt` — schema fields.
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("fullName email createdAt")
      .lean<any[]>();

    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("name sku createdAt")
      .lean();

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("orderNumber total createdAt")
      .lean();

    const safeIso = (value: any): string | null => {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    };

    const recentActivity = [
      ...recentUsers.map((user) => ({
        type: "user",
        title: "New user registered",
        description: `${user.fullName || "Someone"} (${user.email ?? "—"}) joined`,
        time: safeIso(user.createdAt) ?? new Date().toISOString(),
      })),
      ...recentProducts.map((product) => ({
        type: "product",
        title: "New product added",
        description: `${product.name || product.sku || "Product"} was added`,
        time: safeIso(product.createdAt) ?? new Date().toISOString(),
      })),
      ...recentOrders.map((order) => ({
        type: "order",
        title: "New order placed",
        description: `Order #${order.orderNumber} for $${order.total}`,
        time: safeIso(order.createdAt) ?? new Date().toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
        growthRate: totalUsers > 0 ? (newUsersThisMonth / totalUsers) * 100 : 0,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        outOfStock,
        lowStock,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        revenue: totalRevenue,
        averageOrderValue,
      },
      recentActivity,
    };
  } catch (error) {
    console.error("Failed to fetch overview data:", error);
    throw new Error("Failed to fetch overview data");
  }
}
