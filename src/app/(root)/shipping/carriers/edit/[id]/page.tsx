// app/sales/carriers/edit/[id]/page.tsx
//
// Server component: the carrier being edited is rendered on the server
// (BFF -> GET /api/carriers/:id) and handed to the client form.
import { notFound } from "next/navigation";
import { apiData, ApiError } from "@/lib/server-api";
import type { ApiCarrier } from "@/lib/api/carrier";
import EditCarrierClient from "./_component/EditCarrierClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCarrierPage({ params }: PageProps) {
  const { id } = await params;

  let carrier: ApiCarrier | null = null;

  try {
    carrier = await apiData<ApiCarrier>(
      "/carriers/" + encodeURIComponent(id),
      { cache: "no-store" },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    console.error("[carrier edit page] failed to load carrier:", error);
  }

  return <EditCarrierClient carrierId={id} initialCarrier={carrier} />;
}
