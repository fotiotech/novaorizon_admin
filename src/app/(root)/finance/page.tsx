"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  Download,
  Filter,
  Search,
  BarChart3,
} from "lucide-react";
import {
  exportFinancialData,
  getChartData,
  getFinancialStats,
  getTransactions,
  updateTransactionStatus,
} from "@/app/actions/finance";
import {
  FinancialStats,
  Transaction,
  RevenueData,
  ExpenseData,
  TransactionFilters,
} from "@/constant/types/finance";

const Finance = () => {
  const [timeRange, setTimeRange] = useState<string>("month");
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    refunds: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<TransactionFilters>({
    status: "all",
    search: "",
  });
  const [chartType, setChartType] = useState<string>("bar"); // 'bar' or 'line'

  // Fetch financial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch financial stats
        const statsData = await getFinancialStats(timeRange);
        if (statsData.success && statsData.data) {
          setStats(statsData.data);
        }

        // Fetch transactions
        const transactionsResponse = await getTransactions(filters, timeRange);
        if (transactionsResponse.success && transactionsResponse.data) {
          setTransactions(transactionsResponse.data);
        }

        // Fetch chart data
        const chartsResponse = await getChartData(timeRange);
        if (chartsResponse.success && chartsResponse.data) {
          setRevenueData(chartsResponse.data.revenue || []);
          setExpenseData(chartsResponse.data.expenses || []);
        }
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, filters]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  const handleExport = async (format: string) => {
    try {
      const response = await exportFinancialData(format, timeRange, filters);

      if (typeof response === "string") {
        // Handle CSV response
        const blob = new Blob([response], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `financial-report-${
          new Date().toISOString().split("T")[0]
        }.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else if (response.success && response.data) {
        // Handle JSON response
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `financial-report-${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const updateTransStatus = async (transactionId: string, status: string) => {
    try {
      const response = await updateTransactionStatus(transactionId, status);

      if (response.success) {
        // Update local state
        setTransactions(
          transactions.map((t: any) =>
            t._id === transactionId ? { ...t, status } : t
          )
        );

        // Refresh stats to reflect changes
        const statsResponse = await getFinancialStats(timeRange);
        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        }
      }
    } catch (error) {
      console.error("Error updating transaction status:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Finance Dashboard</h1>
        <div className="flex space-x-4">
          <select
            title="time range"
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <div className="relative">
            <select
              title="status"
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none pr-8"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <Filter
              size={16}
              className="absolute right-2 top-3 text-gray-500 pointer-events-none"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search transactions..."
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none pl-10"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
            <Search
              size={18}
              className="absolute left-3 top-2.5 text-gray-500"
            />
          </div>
          <div className="flex space-x-2">
            <button
              className={`p-2 rounded-md ${
                chartType === "bar"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => setChartType("bar")}
              title="Bar Chart"
            >
              <BarChart3 size={18} />
            </button>
            <button
              className={`p-2 rounded-md ${
                chartType === "line"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => setChartType("line")}
              title="Line Chart"
            >
              <TrendingUp size={18} />
            </button>
            <button
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => handleExport("csv")}
            >
              <Download size={18} className="mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <DollarSign className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <h3 className="text-2xl font-bold">
                cfa {stats.totalRevenue.toLocaleString()}
              </h3>
              <p className="text-green-500 text-sm flex items-center">
                <TrendingUp size={16} className="mr-1" />
                12.5% from last {timeRange}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <ShoppingCart className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Orders</p>
              <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
              <p className="text-green-500 text-sm flex items-center">
                <TrendingUp size={16} className="mr-1" />
                8.2% from last {timeRange}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <Users className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Avg. Order Value</p>
              <h3 className="text-2xl font-bold">
                cfa {stats.avgOrderValue.toFixed(2)}
              </h3>
              <p className="text-green-500 text-sm flex items-center">
                <TrendingUp size={16} className="mr-1" />
                3.1% from last {timeRange}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 mr-4">
              <DollarSign className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Refunds</p>
              <h3 className="text-2xl font-bold">
                cfa {stats.refunds.toLocaleString()}
              </h3>
              <p className="text-red-500 text-sm flex items-center">
                <TrendingUp size={16} className="mr-1" />
                2.3% from last {timeRange}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Revenue vs Expenses</h2>
            <div className="flex space-x-2">
              <button
                className={`p-1 rounded ${
                  chartType === "bar"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-500"
                }`}
                onClick={() => setChartType("bar")}
                title="Bar Chart"
              >
                <BarChart3 size={16} />
              </button>
              <button
                className={`p-1 rounded ${
                  chartType === "line"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-500"
                }`}
                onClick={() => setChartType("line")}
                title="Line Chart"
              >
                <TrendingUp size={16} />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === "bar" ? (
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#4f46e5" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            ) : (
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4f46e5"
                  name="Revenue"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  name="Expenses"
                  strokeWidth={2}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Expense Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                }
              >
                {expenseData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <span className="text-sm text-gray-500">
            {transactions.length} transactions found
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Order ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Payment Method
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{transaction.orderId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.userId?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${transaction.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {transaction.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : transaction.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : transaction.status === "refunded"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {transaction.status === "pending" && (
                      <button
                        onClick={() =>
                          updateTransStatus(transaction._id, "completed")
                        }
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Approve
                      </button>
                    )}
                    {transaction.status !== "refunded" &&
                      transaction.status !== "failed" && (
                        <button
                          onClick={() =>
                            updateTransStatus(transaction._id, "refunded")
                          }
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Refund
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Finance;
