import "server-only";
import { NextResponse } from "next/server";
import { getAuthUser, type AuthUser } from "@/lib/authz";

type ApiAuthResult =
  | { user: AuthUser; response?: never }
  | { user?: never; response: NextResponse };

/**
 * Guard for admin route handlers. Every /api route in this app must call
 * this (or a stricter variant) before touching data.
 */
export async function requireAdminApi(): Promise<ApiAuthResult> {
  const user = await getAuthUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (user.role !== "admin") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user };
}
