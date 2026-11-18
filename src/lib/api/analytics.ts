// lib/api/analytics.ts
import api from "@/lib/api";

/* ----------------------------- types ----------------------------- */

export interface RecentUser {
  _id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  status: string;
  joinDate: string; // "YYYY-MM-DD" or ""
  lastActive: string; // "YYYY-MM-DD" or "Never"
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  usersByStatus: Record<string, number>;
  usersByRole: Record<string, number>;
  monthlySignups: number[];
  recentUsers: RecentUser[];
}

/* ---------------------------- fetchers --------------------------- */

/** GET /api/analytics/users — admin only */
export async function fetchUserAnalytics(): Promise<UserAnalytics> {
  const res = await api.get<{ data: UserAnalytics }>("/analytics/users");
  return res.data.data;
}

/* ------------------------- order analytics ----------------------- */

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  recentOrders: any[];
}

/** GET /api/analytics/orders — admin only */
export async function fetchOrderAnalytics(): Promise<OrderAnalytics> {
  const res = await api.get<{ data: OrderAnalytics }>("/analytics/orders");
  return res.data.data;
}

/* ------------------------ product analytics ---------------------- */

export interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  lowStock: number;
  productsByStatus: Record<string, number>;
  productsByCategory: Record<string, number>;
  monthlyAdditions: number[];
  recentProducts: any[];
}

/** GET /api/analytics/products — admin only */
export async function fetchProductAnalytics(): Promise<ProductAnalytics> {
  const res = await api.get<{ data: ProductAnalytics }>("/analytics/products");
  return res.data.data;
}

/* --------------------- facebook ads analytics -------------------- */

export interface FacebookAdsAnalytics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCPC: number;
  totalConversions: number;
  roi: number;
  campaignCount: number;
  isConfigured: boolean;
  error?: string;
}

/**
 * GET /api/analytics/facebook-ads — admin only.
 * The backend already degrades to a zeroed payload when Meta is not
 * configured, so a failed request keeps the old "all zeros" fallback.
 */
export async function fetchFacebookAdsAnalytics(): Promise<FacebookAdsAnalytics> {
  try {
    const res = await api.get<{ data: FacebookAdsAnalytics }>(
      "/analytics/facebook-ads",
    );
    return res.data.data;
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

/* --------------------------- overview ---------------------------- */

export interface OverviewAnalytics {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growthRate: number;
  };
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
  };
  orders: {
    total: number;
    completed: number;
    revenue: number;
    averageOrderValue: number;
  };
  recentActivity: Array<{
    type: string;
    title: string;
    description: string;
    time: string;
  }>;
}

/** GET /api/analytics/overview — admin only */
export async function fetchOverviewData(): Promise<OverviewAnalytics> {
  const res = await api.get<{ data: OverviewAnalytics }>("/analytics/overview");
  return res.data.data;
}
