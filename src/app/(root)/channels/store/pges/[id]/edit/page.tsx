// app/channels/store/pges/[id]/edit/page.tsx
//
// Server component: the page being edited is rendered on the server
// (BFF -> GET /api/pages/:id) and handed to the existing client form.
import { notFound } from "next/navigation";
import { apiData, ApiError } from "@/lib/server-api";
import PageForm from "../../components/PageForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPagePage({ params }: PageProps) {
  const { id } = await params;

  let page: any | null = null;

  try {
    page = await apiData<any>("/pages/" + encodeURIComponent(id), {
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    console.error("[pges edit page] failed to load page:", error);
  }

  if (!page) {
    return <div className="p-6 text-red-500">Page not found</div>;
  }

  return <PageForm initialData={page} />;
}
