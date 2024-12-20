import { NextResponse } from "next/server";

export async function GET() {
  const robots = `
User-agent: *
Disallow: /admin
Allow: /

Sitemap: https://dyfk-com.vercel.app/api/sitemap
`;

  return new NextResponse(robots, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400", // Optional: Cache for 1 day
    },
  });
}
