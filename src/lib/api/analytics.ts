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
