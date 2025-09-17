"use server";

// @/app/actions/finance.ts
import Order from "@/models/Order";
import Transaction from "@/models/Transaction";
import Expense from "@/models/Expense";
import "@/models/User";
import { connection } from "@/utils/connection";
import {
  FinancialStats,
  ChartData,
  TransactionFilters,
  ApiResponse,
  Transaction as TransactionType,
} from "@/constant/types/finance";

// Server action to get financial stats
export async function getFinancialStats(
  timeRange = "month"
): Promise<ApiResponse<FinancialStats>> {
  await connection();

  try {
    // Calculate date range based on timeRange parameter
    const startDate = new Date();
    if (timeRange === "week") startDate.setDate(startDate.getDate() - 7);
    else if (timeRange === "month")
      startDate.setMonth(startDate.getMonth() - 1);
    else if (timeRange === "quarter")
      startDate.setMonth(startDate.getMonth() - 3);
    else if (timeRange === "year")
      startDate.setFullYear(startDate.getFullYear() - 1);

    // Get total revenue (sum of all completed transactions)
    const totalRevenue = await Transaction.aggregate([
      {
        $match: {
          status: "completed",
          type: "income",
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Get total orders count
    const totalOrders = await Order.countDocuments({
      paymentStatus: "paid",
      createdAt: { $gte: startDate },
    });

    // Get average order value
    const avgOrderValue = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          avg: { $avg: "$totalAmount" },
        },
      },
    ]);

    // Get total refunds
    const refunds = await Transaction.aggregate([
      {
        $match: {
          type: "refund",
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    return {
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders,
        avgOrderValue: avgOrderValue[0]?.avg || 0,
        refunds: refunds[0]?.total || 0,
      },
    };
  } catch (error) {
    console.error("Error getting financial stats:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Server action to get transactions with filters
export async function getTransactions(
  filters: TransactionFilters = {},
  timeRange = "month"
): Promise<ApiResponse<TransactionType[]>> {
  await connection();

  try {
    // Calculate date range
    const startDate = new Date();
    if (timeRange === "week") startDate.setDate(startDate.getDate() - 7);
    else if (timeRange === "month")
      startDate.setMonth(startDate.getMonth() - 1);
    else if (timeRange === "quarter")
      startDate.setMonth(startDate.getMonth() - 3);
    else if (timeRange === "year")
      startDate.setFullYear(startDate.getFullYear() - 1);

    // Build query
    const query: any = { date: { $gte: startDate } };

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { orderId: { $regex: filters.search, $options: "i" } },
        { "userId.name": { $regex: filters.search, $options: "i" } },
      ];
    }

    const transactions = await Transaction.find(query)
      .populate("userId", "name email")
      .sort({ date: -1 })
      .limit(50);

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Error getting transactions:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Server action to update transaction status
export async function updateTransactionStatus(
  transactionId: string,
  status: string
): Promise<ApiResponse<TransactionType>> {
  await connection();

  try {
    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { status },
      { new: true }
    );

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }

    // If refunding, also update the related order
    if (status === "refunded") {
      await Order.findOneAndUpdate(
        { orderNumber: transaction.orderId },
        { paymentStatus: "refunded" }
      );
    }

    return { success: true, data: transaction };
  } catch (error) {
    console.error("Error updating transaction status:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Server action to get chart data
export async function getChartData(
  timeRange = "month"
): Promise<ApiResponse<ChartData>> {
  await connection();

  try {
    // Calculate date range based on timeRange parameter
    const startDate = new Date();
    if (timeRange === "week") startDate.setDate(startDate.getDate() - 7);
    else if (timeRange === "month")
      startDate.setMonth(startDate.getMonth() - 1);
    else if (timeRange === "quarter")
      startDate.setMonth(startDate.getMonth() - 3);
    else if (timeRange === "year")
      startDate.setFullYear(startDate.getFullYear() - 1);

    // Get revenue data by period
    const revenueByPeriod = await Transaction.aggregate([
      {
        $match: {
          status: "completed",
          type: "income",
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            week: { $week: "$date" },
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1 },
      },
    ]);

    // Format revenue data for charts
    const revenueData = revenueByPeriod.map((item) => {
      let name;
      if (timeRange === "week") {
        name = `Week ${item._id.week}`;
      } else if (timeRange === "month") {
        name = new Date(item._id.year, item._id.month - 1).toLocaleString(
          "default",
          { month: "short" }
        );
      } else if (timeRange === "quarter") {
        const quarter = Math.ceil(item._id.month / 3);
        name = `Q${quarter} ${item._id.year}`;
      } else {
        name = item._id.year.toString();
      }

      return {
        name,
        revenue: item.revenue,
        count: item.count,
      };
    });

    // Get expense data by category
    const expensesByCategory = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate },
          status: "approved",
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Format expense data for pie chart
    const expenseData = expensesByCategory.map((item) => ({
      name: item._id,
      value: item.total,
    }));

    return {
      success: true,
      data: {
        revenue: revenueData,
        expenses: expenseData,
      },
    };
  } catch (error) {
    console.error("Error getting chart data:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Server action to export financial data
export async function exportFinancialData(
  format: string,
  timeRange: string,
  filters: TransactionFilters = {}
): Promise<ApiResponse<any> | string> {
  await connection();

  try {
    // Calculate date range based on timeRange parameter
    const startDate = new Date();
    if (timeRange === "week") startDate.setDate(startDate.getDate() - 7);
    else if (timeRange === "month")
      startDate.setMonth(startDate.getMonth() - 1);
    else if (timeRange === "quarter")
      startDate.setMonth(startDate.getMonth() - 3);
    else if (timeRange === "year")
      startDate.setFullYear(startDate.getFullYear() - 1);

    // Build query for transactions
    const query: any = { date: { $gte: startDate } };

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { orderId: { $regex: filters.search, $options: "i" } },
        { "customer.name": { $regex: filters.search, $options: "i" } },
      ];
    }

    // Get transactions data
    const transactions = await Transaction.find(query)
      .populate("customer", "name email")
      .sort({ date: -1 });

    // Get expenses data
    const expenses = await Expense.find({
      date: { $gte: startDate },
      status: "approved",
    }).sort({ date: -1 });

    // Format data based on requested format
    if (format === "csv") {
      // Create CSV content
      let csvContent = "Type,Date,Description,Amount,Status\n";

      // Add transactions to CSV
      transactions.forEach((transaction) => {
        csvContent += `Transaction,${
          transaction.date.toISOString().split("T")[0]
        },"Order #${transaction.orderId}",${transaction.amount},${
          transaction.status
        }\n`;
      });

      // Add expenses to CSV
      expenses.forEach((expense) => {
        csvContent += `Expense,${expense.date.toISOString().split("T")[0]},"${
          expense.description
        }",${expense.amount},${expense.status}\n`;
      });

      return csvContent;
    } else if (format === "json") {
      // Return JSON data
      return {
        success: true,
        data: {
          transactions: transactions.map((t) => ({
            type: "transaction",
            date: t.date,
            orderId: t.orderId,
            amount: t.amount,
            status: t.status,
            paymentMethod: t.paymentMethod,
          })),
          expenses: expenses.map((e) => ({
            type: "expense",
            date: e.date,
            category: e.category,
            description: e.description,
            amount: e.amount,
            status: e.status,
          })),
        },
      };
    }

    return { success: true, data: { transactions, expenses } };
  } catch (error) {
    console.error("Error exporting financial data:", error);
    return { success: false, error: (error as Error).message };
  }
}
