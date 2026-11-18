import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/server-api";

/** Roles accepted by the shared User schema. */
export type AppRole = "customer" | "seller" | "admin" | "support";

export interface AuthUser {
  id: string;
  role: AppRole;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

function readUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== "object") return null;
  const user = raw as {
    id?: unknown;
    _id?: unknown;
    role?: unknown;
    email?: unknown;
    name?: unknown;
    image?: unknown;
  };
  const id = user.id ?? user._id;
  if (typeof id !== "string" || id.length === 0) return null;
  const role =
    typeof user.role === "string" && user.role.length > 0
      ? (user.role as AppRole)
      : "customer";
  return {
    id,
    role,
    email: typeof user.email === "string" ? user.email : null,
    name: typeof user.name === "string" ? user.name : null,
    image: typeof user.image === "string" ? user.image : null,
  };
}

/**
 * Resolves the signed-in user from the backend session cookie (`session`),
 * verified through `GET /api/auth/me`. The Express server owns auth.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  let token: string | undefined;
  try {
    const store = await cookies();
    token = store.get("session")?.value;
  } catch {
    token = undefined;
  }

  if (token) {
    try {
      const res = await apiFetch<{ data?: unknown }>("/auth/me", {
        token,
        cache: "no-store",
      });
      const user = readUser(res?.data);
      if (user) return user;
    } catch {
      // Invalid/expired backend session — fall through to NextAuth.
    }
  }

  return null;
});

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}

export function isSameUser(user: AuthUser | null, userId?: string | null) {
  return Boolean(user && userId && user.id === userId);
}