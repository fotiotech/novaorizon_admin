"use server";

import { connection } from "@/utils/connection";
import mongoose from "mongoose";
import Order, { OrderDocument } from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";

// 1. Get total revenue, order count, and user count
export async function getDashboardStats() {
  await connection();

  const [orderCount, userCount, revenueAgg] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments(),
    Order.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
    ]),
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

  return {
    orders: orderCount,
    users: userCount,
    revenue: totalRevenue,
  };
}

// 2. Sales by month (last 12 months)
export async function getMonthlySales() {
  await connection();

  const sales = await Order.aggregate([
    {
      $group: {
        _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
        totalSales: { $sum: "$total" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 12 },
  ]);

  return sales.map((s) => ({
    month: `${s._id.month}/${s._id.year}`,
    totalSales: s.totalSales,
    count: s.count,
  }));
}

// 3. Top selling products
export async function getTopProducts(limit = 5) {
  await connection();

  const products = await Order.aggregate([
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products.productId",
        name: { $first: "$products.name" },
        totalSold: { $sum: "$products.quantity" },
        revenue: {
          $sum: { $multiply: ["$products.quantity", "$products.price"] },
        },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: limit },
  ]);

  return products;
}

// 4. Orders grouped by status
export async function getOrdersByStatus() {
  await connection();

  const statusCounts = await Order.aggregate([
    {
      $group: {
        _id: "$orderStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const result: Record<string, number> = {};
  statusCounts.forEach((s) => {
    result[s._id] = s.count;
  });

  return result;
}

// 5. Revenue by payment method
export async function getRevenueByPaymentMethod() {
  await connection();

  const revenue = await Order.aggregate([
    {
      $group: {
        _id: "$paymentMethod",
        total: { $sum: "$total" },
        count: { $sum: 1 },
      },
    },
  ]);

  return revenue.map((r) => ({
    paymentMethod: r._id,
    total: r.total,
    count: r.count,
  }));
}
