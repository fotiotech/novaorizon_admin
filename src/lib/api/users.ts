// lib/api/users.ts
import api from "@/lib/api";

export type UserRole = "customer" | "seller" | "admin" | "support";
export type UserStatus = "active" | "inactive" | "suspended" | "pending";

/** Shape returned by GET /api/users, GET /api/users/:id */
export interface ApiUser {
  _id: string;
  name?: string;
  email?: string;
  image?: string | null;
  role?: UserRole;
  status?: UserStatus;
  permissions?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  lastActive?: string | null;
  [key: string]: unknown;
}

export interface UpdateRoleResult {
  success: boolean;
  message?: string;
  data: ApiUser;
}

/** GET /api/users — admin only */
export async function fetchUsers(): Promise<ApiUser[]> {
  const res = await api.get<{ data: ApiUser[] }>("/users");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/users/:id — admin only */
export async function fetchUserById(id: string): Promise<ApiUser> {
  const res = await api.get<{ data: ApiUser }>(`/users/${id}`);
  return res.data.data;
}

/** PATCH /api/users/:id/role — admin only */
export async function updateUserRole(
  id: string,
  role: string,
  permissions: string[],
): Promise<UpdateRoleResult> {
  const res = await api.patch<UpdateRoleResult>(`/users/${id}/role`, {
    role,
    permissions,
  });
  return res.data;
}
