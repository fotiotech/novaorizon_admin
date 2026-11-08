// proxy.ts
import { auth } from "@/app/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/auth/login", "/auth/error", "/auth/unauthorized"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default auth((request) => {
  // Server actions POST to page URLs. Letting them through untouched means
  // any rewrite we do here cannot turn the action's JSON response into the
  // HTML of /auth/unauthorized (which the client sees as
  // "An unexpected response was received from the server").
  // Authorization is enforced inside the action itself via requireAdmin().
  if (request.headers.get("next-action")) {
    return NextResponse.next();
  }

  const { nextUrl } = request;
  const user = request.auth?.user;
  const pathname = nextUrl.pathname;

  if (isPublic(pathname)) return NextResponse.next();

  if (!user?.id) {
    const loginUrl = new URL("/auth/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (user.role !== "admin") {
    return NextResponse.rewrite(new URL("/auth/unauthorized", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
