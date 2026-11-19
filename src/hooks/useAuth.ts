"use client";

import api from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AppRole = "customer" | "seller" | "admin" | "support";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: AppRole;
  image: string | null;
}

/**
 * Return shape from `/auth/signup` when the caller is an admin creating
 * a staff account. Deliberately excludes `token` — the new staff member
 * signs in separately.
 */
export interface CreatedStaffUser {
  id: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  /**
   * Public customer registration. Calls `/auth/signup` WITHOUT a `role`;
   * backend defaults to `"customer"` and auto-logs-in (sets session
   * cookie + returns token in body).
   */
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<AuthUser>;
  /**
   * Admin-only. Creates a staff account (seller / support / admin) via
   * the same `/auth/signup` endpoint with an explicit `role`.
   *
   * Requires the caller to be an authenticated admin — the backend
   * rejects with 403 if `req.user.role !== "admin"`. The admin's
   * session cookie is sent automatically (`withCredentials: true`
   * on the `api` client).
   *
   * Does NOT change the current session — the created staff member
   * signs in separately.
   */
  adminSignup: (
    name: string,
    email: string,
    password: string,
    role: "seller" | "support" | "admin",
  ) => Promise<CreatedStaffUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ data: any }>("/auth/me");
      setUser({
        id: res.data.data._id,
        name: res.data.data.name ?? null,
        email: res.data.data.email,
        role: res.data.data.role,
        image: res.data.data.image ?? null,
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ data: { user: AuthUser } }>("/auth/login", {
      email,
      password,
      audience: "admin",
    });
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      // Unified endpoint — no `role` in the body.
      // Backend defaults to "customer" and auto-logs in.
      const res = await api.post<{ data: { user: AuthUser } }>("/auth/signup", {
        name,
        email,
        password,
      });
      setUser(res.data.data.user);
      return res.data.data.user;
    },
    [],
  );

  const adminSignup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: "seller" | "support" | "admin",
    ) => {
      // Same endpoint, explicit `role`. Backend requires admin auth
      // (throws 403 otherwise). Does NOT return a token or set a cookie
      // for the new user — they sign in separately.
      const res = await api.post<{ data: CreatedStaffUser }>("/auth/signup", {
        name,
        email,
        password,
        role,
      });
      return res.data.data;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        loading,
        login,
        register,
        adminSignup,
        logout,
        refresh,
      },
    },
    children,
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Route guards — drop into any page as a hook.
 *   useRequireRole("admin");         // admin only
 *   useRequireRole(["customer"]);    // customers only
 *   useRequireUser();                // any logged-in user
 */
export function useRequireRole(roles: AppRole | AppRole[]) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = Array.isArray(roles) ? roles : [roles];

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(
        `/auth/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    if (!allowed.includes(user.role)) {
      router.replace("/auth/error?error=forbidden");
    }
  }, [user, loading, allowed, router]);

  return { user, loading };
}

export function useRequireUser() {
  return useRequireRole(["customer", "seller", "admin", "support"]);
}