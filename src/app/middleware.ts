// middleware.ts
import { auth } from "@/app/auth";
import { signIn } from "next-auth/react";

export default auth((req) => {
  console.log(req);
  if (!req.auth && req.nextUrl.pathname !== "/auth/login") signIn();
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    "/products/:path*",
  ],
};
