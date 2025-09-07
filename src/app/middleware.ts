// middleware.ts
export { auth as middleware } from "@/app/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/ (authentication pages)
     * - public/ (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/|public/).*)",
  ],
};
