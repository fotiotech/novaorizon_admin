import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

const SESSION_COOKIE = "session_admin";

/**
 * Paths that render without any authentication check.
 * `/auth/sign_up` is deliberately not here — it creates staff accounts
 * and must be admin-gated (bootstrap via curl/mongosh on first run).
 */
const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/error",
  "/auth/unauthorized",
  "/auth/verify",
  "/auth/reset-password",
];

type AppRole = "customer" | "seller" | "admin" | "support";

interface SessionClaims extends JWTPayload {
  sub: string;
  role: AppRole;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set in the admin app's environment. " +
        "It must match server/.env's JWT_SECRET.",
    );
  }
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*         Next.js 15.5+: export `proxy`, not `middleware`             */
/* ------------------------------------------------------------------ */

export default async function proxy(request: NextRequest) {
  // Server actions POST to page URLs. Preserve the original guard so
  // rewrites below can't turn the action's JSON response into the HTML
  // of `/auth/unauthorized`.
  if (request.headers.get("next-action")) {
    return NextResponse.next();
  }

  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  // Placements were renamed from "blocks"; keep old links working.
  if (pathname.startsWith("/channels/store/content/blocks")) {
    const url = nextUrl.clone();
    url.pathname = pathname.replace(
      "/channels/store/content/blocks",
      "/channels/store/content/placements",
    );
    return NextResponse.redirect(url);
  }
  const cookie = request.cookies.get(SESSION_COOKIE);

  console.log(
    "[proxy]",
    request.method,
    pathname,
    "| cookie:",
    cookie ? "present (" + cookie.value.slice(0, 20) + "…)" : "absent",
  );

  if (request.headers.get("next-action")) {
    console.log("[proxy] next-action → bypass");
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    console.log("[proxy] public path → allow");
    return NextResponse.next();
  }

  if (cookie) {
    try {
      const { payload } = await jwtVerify(cookie.value, getSecret(), {
        algorithms: ["HS256"],
      });
      console.log("[proxy] verified OK:", {
        sub: payload.sub,
        role: payload.role,
      });
    } catch (err: any) {
      console.log("[proxy] verify FAILED:", err?.message ?? err);
    }
  } else {
    console.log("[proxy] no cookie → will redirect to /auth/login");
  }

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifyToken(token) : null;

  if (!claims) {
    const loginUrl = new URL("/auth/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (claims.role !== "admin") {
    return NextResponse.rewrite(new URL("/auth/unauthorized", nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};