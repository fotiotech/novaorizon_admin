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

    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get active users count
    const activeUsers = await User.countDocuments({ status: "active" });

    // Get users by status
    const usersByStatusResult = await User.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format users by status
    const usersByStatus: any = { active: 0, inactive: 0 };
    usersByStatusResult.forEach((item) => {
      usersByStatus[item._id] = item.count;
    });

    // Get users by role
    const usersByRoleResult = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format users by role
    const usersByRole: UsersByRole = {};
    usersByRoleResult.forEach((item) => {
      usersByRole[item._id || "user"] = item.count;
    });

    // Get monthly signups for the current year
    const currentYear = new Date().getFullYear();
    const monthlySignups = Array(12).fill(0);

    const signupsByMonth = await User.aggregate([
      {
        $match: {
          created_at: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$created_at" },
          count: { $sum: 1 },
        },
      },
    ]);

    signupsByMonth.forEach((item) => {
      monthlySignups[item._id - 1] = item.count;
    });

    // Get recent users
    const recentUsers = await User.find()
      .sort({ created_at: -1 })
      .limit(5)
      .select("name email role status created_at updated_at")
      .lean();

    // Calculate user growth rate (compared to previous month)
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

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth: currentMonthSignups,
      userGrowthRate,
      usersByStatus,
      usersByRole,
      monthlySignups,
      recentUsers: recentUsers.map(
        (user) =>
          ({
            ...user,
            _id: user._id?.toString(),
            joinDate: user.created_at.toISOString().split("T")[0],
            lastActive: user.updated_at
              ? user.updated_at.toISOString().split("T")[0]
              : "Never",
          } as any)
      ),
    };
  } catch (error) {
    console.error("Failed to fetch user analytics:", error);
    throw new Error("Failed to fetch user analytics");
  }
}

export async function getOrderAnalytics() {
  try {
    await connection();

    // Get total orders count
    const totalOrders = await Order.countDocuments();

    // Get revenue analytics
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

    // Get orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "email")
      .lean();

    return {
      totalOrders,
      totalRevenue: revenueData[0]?.totalRevenue || 0,
      averageOrderValue: revenueData[0]?.averageOrderValue || 0,
      ordersByStatus: ordersByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
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

    // Get total products count
    const totalProducts = await Product.countDocuments();

    // Get active products count
    const activeProducts = await Product.countDocuments({ status: "active" });

    // Get out of stock products count
    const outOfStock = await Product.countDocuments({
      stock_status: { $in: ["Out of Stock", "out of stock"] },
    });

    // Get low stock products count
    const lowStock = await Product.countDocuments({
      stock_status: { $in: ["Low Stock", "low stock"] },
    });

    // Get products by status
    const productsByStatusResult = await Product.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format products by status
    const productsByStatus: Record<string, number> = {
      active: 0,
      inactive: 0,
      draft: 0,
    };
    productsByStatusResult.forEach((item) => {
      productsByStatus[item._id] = item.count;
    });

    // Get products by category
    const productsByCategoryResult = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$category.name",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format products by category
    const productsByCategory: Record<string, number> = {};
    productsByCategoryResult.forEach((item) => {
      productsByCategory[item._id] = item.count;
    });

    // Get monthly additions for the current year
    const currentYear = new Date().getFullYear();
    const monthlyAdditions = Array(12).fill(0);

    const additionsByMonth = await Product.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`),
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

    // Get recent products
    const recentProducts = await Product.find()
      .populate({
        path: "category_id",
        select: "name",
        options: { strictPopulate: false },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "title model sku sale_price list_price stock_status main_image status category_id"
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
            category: product.category_id?.name || "Uncategorized",
            createdAt: product.createdAt?.toISOString().split("T")[0],
          } as any)
      ),
    };
  } catch (error) {
    console.error("Failed to fetch product analytics:", error);
    throw new Error("Failed to fetch product analytics");
  }
}

export async function getOverviewData() {
  try {
    await connection();

    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const newUsersThisMonth = await User.countDocuments({
      created_at: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    });

    // Get product statistics
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: "active" });
    const outOfStock = await Product.countDocuments({
      stock_status: { $in: ["Out of Stock", "out of stock"] },
    });
    const lowStock = await Product.countDocuments({
      stock_status: { $in: ["Low Stock", "low stock"] },
    });

    // Get order statistics
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

    // Get recent activity
    const recentUsers = await User.find()
      .sort({ created_at: -1 })
      .limit(3)
      .select("name email created_at")
      .lean();

    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("title model createdAt")
      .lean();

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("orderNumber total createdAt")
      .lean();

    // Format recent activity
    const recentActivity = [
      ...recentUsers.map((user) => ({
        type: "user",
        title: "New User Registered",
        description: `${user.name} (${user.email}) joined`,
        time: new Date(user.created_at).toLocaleDateString(),
      })),
      ...recentProducts.map((product) => ({
        type: "product",
        title: "New Product Added",
        description: `${product.title} (${product.model}) was added`,
        time: new Date(product.createdAt).toLocaleDateString(),
      })),
      ...recentOrders.map((order) => ({
        type: "order",
        title: "New Order Placed",
        description: `Order #${order.orderNumber} for $${order.total}`,
        time: new Date(order.createdAt as any).toLocaleDateString(),
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
