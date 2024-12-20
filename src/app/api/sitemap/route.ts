import { NextResponse } from "next/server";
import { findProducts } from "@/app/actions/products";
import { Category, Product } from "@/constant/types";
import { getCategory } from "@/app/actions/category";

// Mock data sources (replace with actual database queries)
async function getStaticPages() {
  return [
    { loc: "/", lastmod: "2024-12-01" },
    { loc: "/about", lastmod: "2024-12-01" },
    { loc: "/contact", lastmod: "2024-12-01" },
  ];
}

export async function GET() {
  const baseUrl = "https://dyfk-com.vercel.app";

  // Fetch data from the database or other sources
  const staticPages = await getStaticPages();
  const products: Product[] = await findProducts();
  const categories: Category[] = await getCategory();

  const categoryUrls = categories.map(({ url_slug, _id, updated_at }) => ({
    loc: `/category/${url_slug}/${_id}`,
    lastmod: updated_at,
  }));

  const productUrls = products.map(({ url_slug, dsin, updated_at }) => ({
    loc: `/${url_slug}/details/${dsin}`,
    lastmod: updated_at,
  }));

  // Combine all pages into a single array
  const urls = [...staticPages, ...productUrls, ...categoryUrls];

  // Generate XML content
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, lastmod }) => `
  <url>
    <loc>${baseUrl}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("")}
</urlset>`;

  // Return XML response
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
