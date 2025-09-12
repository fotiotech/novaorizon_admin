"use client"

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  getDashboardStats,
  getMonthlySales,
  getTopProducts,
  getOrdersByStatus,
  getRevenueByPaymentMethod,
} from "@/app/actions/dashboard";

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [revenueByMethod, setRevenueByMethod] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const s = await getDashboardStats();
      const ms = await getMonthlySales();
      const tp = await getTopProducts();
      const os = await getOrdersByStatus();
      const rm = await getRevenueByPaymentMethod();

      setStats(s);
      setMonthlySales(ms);
      setTopProducts(tp);
      setOrdersByStatus(os as any);
      setRevenueByMethod(rm);
    };
    fetchData();
  }, []);

  if (!stats) return <div className="p-6">Loading...</div>;

  return (
    <div className="lg:p-6 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {/* Stats Cards */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold">Total Orders</h2>
          <p className="text-2xl font-bold">{stats.totalOrders}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold">Total Users</h2>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold">Total Revenue</h2>
          <p className="text-2xl font-bold">${stats.totalRevenue}</p>
        </CardContent>
      </Card>

      {/* Monthly Sales Chart */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-3">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">Monthly Sales</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlySales}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-3">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">Top Products</h2>
          <ul className="space-y-2">
            {topProducts.map((p, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{p.name}</span>
                <span>
                  {p.quantity} sold (${p.revenue})
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Orders by Status */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">Orders by Status</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ordersByStatus}>
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by Payment Method */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">
            Revenue by Payment Method
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByMethod}>
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
