/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.pusher.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  [
    "connect-src 'self'",
    // S3 presigned PUT uploads (and presigned GETs if you ever use them)
    "https://*.amazonaws.com",
    // Google Analytics 4 (gtag.js loads from googletagmanager.com;
    // beacons go to *.google-analytics.com and *.analytics.google.com;
    // www.google.com is the regional fallback endpoint)
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
    "https://www.google.com",
    // Pusher
    "https://*.pusher.com",
    "wss://*.pusher.com",
    // MongoDB Atlas Data API (kept from your original config; if you
    // only talk to Mongo from the server, this can be removed)
    "https://*.mongodb.net",
    // Firebase (chat)
    "https://*.googleapis.com", // Firestore, Auth token endpoints, Functions
    "https://identitytoolkit.googleapis.com", // Firebase Auth (sign-in / sign-up)
    "https://securetoken.googleapis.com", // Firebase Auth token refresh
    "https://firestore.googleapis.com", // Firestore (redundant with *.googleapis.com)
    "https://firebasestorage.googleapis.com", // Firebase Storage (chat attachments)
    "https://*.firebaseio.com", // Realtime DB (presence / typing)
    "wss://*.firebaseio.com", // Realtime DB websocket
    "https://*.cloudfunctions.net", // Cloud Functions (if chat calls any)
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
    remotePatterns: [
      // Google account avatars (Google Sign-In via NextAuth)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      // Firebase Storage — chat image attachments rendered via next/image
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      // S3 — product/editorial images
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
