import api from "@/lib/api";

/** Admin customer directory — /api/customers. */

export interface CustomerListResult {
  success: boolean;
  customers: any[];
  total: number;
  pages: number;
  currentPage?: number;
  error?: string;
}

export async function getAllCustomers(options?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<CustomerListResult> {
  try {
    const res = await api.get<{
      data: { customers: any[]; total: number; pages: number; currentPage: number };
    }>("/customers", {
      params: {
        page: options?.page ?? 1,
        limit: options?.limit ?? 10,
        search: options?.search || undefined,
      },
    });

    const d = res.data?.data;
    return {
      success: true,
      customers: d?.customers ?? [],
      total: d?.total ?? 0,
      pages: d?.pages ?? 0,
      currentPage: d?.currentPage ?? options?.page ?? 1,
    };
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return {
      success: false,
      error: error?.response?.data?.error ?? error?.message,
      customers: [],
      total: 0,
      pages: 0,
    };
  }
}

export async function deleteCustomer(
  customerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete(`/customers/${encodeURIComponent(customerId)}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return {
      success: false,
      error: error?.response?.data?.error ?? error?.message,
    };
  }
}

/** Admin review moderation — /api/reviews. */

export interface ReviewListResult {
  success: boolean;
  reviews: any[];
  total: number;
  pages: number;
  currentPage?: number;
  error?: string;
}

export async function getReviews(options?: {
  page?: number;
  limit?: number;
  rating?: number;
  status?: string;
}): Promise<ReviewListResult> {
  try {
    const res = await api.get<{
      data: { reviews: any[]; total: number; pages: number; currentPage: number };
    }>("/reviews", {
      params: {
        page: options?.page ?? 1,
        limit: options?.limit ?? 10,
        rating: options?.rating || undefined,
        status: options?.status || undefined,
      },
    });

    const d = res.data?.data;
    return {
      success: true,
      reviews: d?.reviews ?? [],
      total: d?.total ?? 0,
      pages: d?.pages ?? 0,
      currentPage: d?.currentPage ?? options?.page ?? 1,
    };
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    return {
      success: false,
      error: error?.response?.data?.error ?? error?.message,
      reviews: [],
      total: 0,
      pages: 0,
    };
  }
}

export async function deleteReview(
  reviewId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete(`/reviews/${encodeURIComponent(reviewId)}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting review:", error);
    return {
      success: false,
      error: error?.response?.data?.error ?? error?.message,
    };
  }
}
