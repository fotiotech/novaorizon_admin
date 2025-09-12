"use server";
import { connection } from "@/utils/connection";
import Order from "@/models/Order";
import User from "@/models/User";
import { UserAnalytics, UsersByStatus, UsersByRole } from "@/constant/types/user";

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
      recentUsers: recentUsers.map((user) => ({
        ...user,
        _id: user._id?.toString(),
        joinDate: user.created_at.toISOString().split("T")[0],
        lastActive: user.updated_at
          ? user.updated_at.toISOString().split("T")[0]
          : "Never",
      } as any)),
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
