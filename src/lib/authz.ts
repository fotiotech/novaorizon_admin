import "server-only";
import { auth } from "@/app/auth";

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
    role?: unknown;
    email?: unknown;
    name?: unknown;
    image?: unknown;
  };
  if (typeof user.id !== "string" || user.id.length === 0) return null;
  const role =
    typeof user.role === "string" && user.role.length > 0
      ? (user.role as AppRole)
      : "customer";
  return {
    id: user.id,
    role,
    email: typeof user.email === "string" ? user.email : null,
    name: typeof user.name === "string" ? user.name : null,
    image: typeof user.image === "string" ? user.image : null,
  };
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth();
  return readUser(session?.user);
}

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
