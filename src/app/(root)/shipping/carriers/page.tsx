// app/sales/carriers/page.tsx
//
// Server component: the initial carrier list is rendered on the server (BFF →
// GET /api/carriers) and handed to the client component for interaction.
import { apiData } from "@/lib/server-api";
import CarriersClient, { type Carrier } from "./_component/CarriersClient";

export const dynamic = "force-dynamic";

export default async function CarriersPage() {
  let carriers: Carrier[] = [];

  try {
    const data = await apiData<Carrier[]>("/carriers", { cache: "no-store" });
    carriers = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[carriers page] failed to load carriers:", error);
  }

  return <CarriersClient initialCarriers={carriers} />;
}
