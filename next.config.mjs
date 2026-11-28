/** @type {import('next').NextConfig} */
const apiOrigin = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.pusher.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  [
    "connect-src 'self'",
    // ── Your API ────────────────────────────────────────────────────
    // Dev: http://localhost:3000 — prod: whatever NEXT_PUBLIC_API_URL
    // resolves to. Without this, the browser silently blocks every
    // axios/fetch call to the backend with a CSP violation that never
    // appears in the Network tab.
    apiOrigin,
    // S3 presigned PUT uploads (and presigned GETs if you ever use them)
    "https://*.amazonaws.com",
    // Google Analytics 4
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
    "https://www.google.com",
    // Pusher
    "https://*.pusher.com",
    "wss://*.pusher.com",
    // MongoDB Atlas Data API (only needed if browser talks to Mongo directly)
    "https://*.mongodb.net",
    // Firebase (chat)
    "https://*.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com",
    "https://firebasestorage.googleapis.com",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    "https://*.cloudfunctions.net",
  ].join(" "),
  "frame-src 'self' https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    // Vercel's image optimizer returns 402 once the plan's transformation
    // quota is exhausted. Set NEXT_PUBLIC_IMAGE_UNOPTIMIZED=1 to serve the
    // original S3 URLs instead (no resizing, but images keep working).
    unoptimized: process.env.NEXT_PUBLIC_IMAGE_UNOPTIMIZED === "1",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: `${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com`,
        pathname: "/**",
      },
    ],
  },
  compress: false,
  reactCompiler: true,
  reactStrictMode: true,
};

export default nextConfig;