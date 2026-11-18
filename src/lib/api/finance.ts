import api from "@/lib/api";
import type {
  ChartData,
  FinancialStats,
  Transaction as TransactionType,
  TransactionFilters,
} from "@/constant/types/finance";

/**
 * Admin finance dashboard — /api/finance.
 *
 * Mirrors the retired `app/actions/finance.ts` return shapes
 * (`{ success, data } | { success: false, error }`).
 */

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function failure(error: any, fallback: string): { success: false; error: string } {
  return {
    success: false,
    error: error?.response?.data?.error ?? error?.message ?? fallback,
  };
}

export async function getFinancialStats(
  timeRange = "month",
): Promise<ApiResponse<FinancialStats>> {
  try {
    const res = await api.get<{ data: FinancialStats }>("/finance/stats", {
      params: { timeRange },
    });
    return { success: true, data: res.data.data };
  } catch (error) {
    console.error("Error getting financial stats:", error);
    return failure(error, "Failed to load financial stats");
  }
}

export async function getTransactions(
  filters: TransactionFilters = {},
  timeRange = "month",
): Promise<ApiResponse<TransactionType[]>> {
  try {
    const res = await api.get<{ data: TransactionType[] }>("/finance/transactions", {
      params: {
        timeRange,
        status: filters.status && filters.status !== "all" ? filters.status : undefined,
        search: filters.search || undefined,
      },
    });
    return { success: true, data: res.data.data };
  } catch (error) {
    console.error("Error getting transactions:", error);
    return failure(error, "Failed to load transactions");
  }
}

export async function updateTransactionStatus(
  transactionId: string,
  status: string,
): Promise<ApiResponse<TransactionType>> {
  try {
    const res = await api.patch<{ data: TransactionType }>(
      `/finance/transactions/${encodeURIComponent(transactionId)}/status`,
      { status },
    );
    return { success: true, data: res.data.data };
  } catch (error) {
    console.error("Error updating transaction status:", error);
    return failure(error, "Failed to update transaction");
  }
}

export async function getChartData(
  timeRange = "month",
): Promise<ApiResponse<ChartData>> {
  try {
    const res = await api.get<{ data: ChartData }>("/finance/charts", {
      params: { timeRange },
    });
    return { success: true, data: res.data.data };
  } catch (error) {
    console.error("Error getting chart data:", error);
    return failure(error, "Failed to load chart data");
  }
}

/**
 * Returns raw CSV text (format "csv") or the JSON payload (format "json").
 */
export async function exportFinancialData(
  format: string,
  timeRange: string,
  filters: TransactionFilters = {},
): Promise<ApiResponse<any> | string> {
  try {
    if (format === "json") {
      const res = await api.get<{ data: any }>("/finance/export", {
        params: { format, timeRange, status: filters.status, search: filters.search },
      });
      return { success: true, data: res.data.data };
    }

    const res = await api.get("/finance/export", {
      params: { format, timeRange, status: filters.status, search: filters.search },
      responseType: "text",
      transformResponse: [(data) => data],
    });

    return typeof res.data === "string" ? res.data : String(res.data ?? "");
  } catch (error) {
    console.error("Error exporting financial data:", error);
    return failure(error, "Failed to export financial data");
  }
}
