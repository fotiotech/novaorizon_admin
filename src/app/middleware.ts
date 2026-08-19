// middleware.ts
import { auth } from "@/app/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: any) => {
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "admin";

  // Allow public routes: auth pages, static assets, public folder
  const isPublicRoute =
    req.nextUrl.pathname.startsWith("/auth") ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/favicon.ico") ||
    req.nextUrl.pathname.startsWith("/public");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Not logged in → redirect to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Logged in but not admin → redirect to unauthorized
  if (!isAdmin) {
    return NextResponse.redirect(new URL("/auth/unauthorized", req.url));
  }

  // Admin → allow access
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Protect everything except static, images, favicon, auth pages, public
    "/((?!_next/static|_next/image|favicon.ico|auth/|public/).*)",
  ],
};