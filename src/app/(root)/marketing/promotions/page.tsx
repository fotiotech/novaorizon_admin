// app/marketing/promotions/page.tsx
//
// Server component: the first page of promotions is rendered on the server
// (BFF → GET /api/promotions) and handed to the client list for interaction.
import { apiData } from "@/lib/server-api";
import PromotionsClient from "./_component/PromotionsClient";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  let promotions: any[] = [];
  let total = 0;

  try {
    const result = await apiData<{ data: any[]; total: number }>(
      "/promotions",
      { query: { limit: 100 }, cache: "no-store" },
    );
    promotions = Array.isArray(result?.data) ? result.data : [];
    total = Number(result?.total) || promotions.length;
  } catch (error) {
    console.error("[promotions page] failed to load promotions:", error);
  }

  return <PromotionsClient initialPromotions={promotions} initialTotal={total} />;
}
