// lib/api/users.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";

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

/** POST /api/users — admin only */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<ApiUser> {
  const res = await api.post<{ data: ApiUser }>("/users", input);
  return res.data.data;
}

/** DELETE /api/users/:id — admin only */
export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${encodeURIComponent(id)}`);
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

/* ------------------ Server-action compatibility layer ---------------- */
/*
 * These helpers mirror the retired `@/app/actions/users` module so callers
 * (e.g. the Redux fetch thunks) keep their names and result shapes. They talk
 * to the Express API directly with the session cookie; the backend enforces
 * `requireAdmin` / `requireUser`.
 */

export interface ApiUserRecord extends Omit<ApiUser, "_id"> {
  _id?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserLookupMiss {
  _id: undefined;
  created_at: undefined;
  updated_at: undefined;
}

function toUserMessage(err: any): string {
  const payload = err?.response?.data;
  if (payload?.errors) {
    const flat = Object.entries(payload.errors as Record<string, unknown>)
      .flatMap(([field, msgs]) =>
        Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [],
      )
      .join("; ");
    if (flat) return flat;
  }
  return payload?.message || err?.message || "Update failed";
}

function normalizeUserRecord(user: any): ApiUserRecord {
  return {
    ...user,
    _id: user?._id ? String(user._id) : undefined,
    created_at: user?.created_at ?? user?.createdAt,
    updated_at: user?.updated_at ?? user?.updatedAt,
  };
}

/** GET /api/users — admin only. */
export function findUsers(): Promise<ApiUserRecord[]>;
/** GET /api/users/:id — admin only. Missing users resolve to an empty record. */
export function findUsers(_id: string): Promise<ApiUserRecord | UserLookupMiss>;
export async function findUsers(
  _id?: string,
): Promise<ApiUserRecord[] | ApiUserRecord | UserLookupMiss> {
  if (_id) {
    let data: any;
    try {
      const res = await api.get<{ data: any }>(
        `/users/${encodeURIComponent(_id)}`,
      );
      data = res.data?.data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return { _id: undefined, created_at: undefined, updated_at: undefined };
      }
      throw error;
    }
    return normalizeUserRecord(data);
  }

  const res = await api.get<{ data: any[] }>("/users");
  const users = Array.isArray(res.data?.data) ? res.data.data : [];
  return users.map(normalizeUserRecord);
}

/** GET /api/users/me — authenticated user. Returns null when missing. */
export async function getUserProfile(): Promise<any | null> {
  try {
    const res = await api.get<{ data: any }>("/users/me");
    const user = res.data?.data;
    if (!user) return null;
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export interface UpdateProfilePayload {
  name?: string;
  image?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
  phone?: {
    countryCode?: string | null;
    number?: string | null;
    e164?: string | null;
  };
  preferences?: {
    language?: string;
    currency?: string;
    theme?: "light" | "dark" | "system";
    timezone?: string;
    country?: string | null;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      whatsapp?: boolean;
    };
    marketing?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      whatsapp?: boolean;
      productRecommendations?: boolean;
    };
    orderUpdates?: boolean;
    priceDropAlerts?: boolean;
    backInStockAlerts?: boolean;
    newsletter?: boolean;
  };
}

/**
 * PATCH /api/users/me — authenticated user. The backend merges preferences and
 * recomputes `profileCompleted`; errors come back as `{ error }`.
 */
export async function updateUserProfile(
  payload: UpdateProfilePayload,
): Promise<{ user?: any; error?: string }> {
  try {
    const res = await api.patch<{ data: any }>("/users/me", payload);
    const updated = res.data?.data;

    if (!updated) return { error: "User not found" };

    return { user: JSON.parse(JSON.stringify(updated)) };
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) {
      return { error: "User not found" };
    }
    console.error("[updateUserProfile]", err);
    return { error: toUserMessage(err) };
  }
}

/**
 * PATCH /api/users/:id/role — admin only. Validation (allowed roles, trimmed
 * permission list, self-demotion guard) is enforced by the backend controller.
 */
export async function updateUserRoleAndPermissions(
  userId: string,
  role: string,
  permissions: string[],
): Promise<{ success: boolean; message: string }> {
  try {
    const ALLOWED_ROLES = ["customer", "seller", "admin", "support"];
    if (!ALLOWED_ROLES.includes(role)) {
      return { success: false, message: "Invalid role" };
    }

    const sanitizedPermissions = Array.isArray(permissions)
      ? Array.from(
          new Set(
            permissions
              .filter((p): p is string => typeof p === "string")
              .map((p) => p.trim())
              .filter(Boolean),
          ),
        )
      : [];

    const res = await api.patch<{ success?: boolean; message?: string }>(
      `/users/${encodeURIComponent(userId)}/role`,
      { role, permissions: sanitizedPermissions },
    );

    return {
      success: true,
      message: res.data?.message ?? "User updated successfully",
    };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return { success: false, message: "User not found" };
    }
    return { success: false, message: toUserMessage(error) };
  }
}