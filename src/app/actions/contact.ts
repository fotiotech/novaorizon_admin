"use server";


import { requireAdmin } from "@/lib/authz";
// app/actions/contact.ts (append)
import { revalidatePath } from "next/cache";
import { apiData, apiFetch } from "@/lib/server-api";

/**
 * Contact messages live in the Express backend (`/api/contact`). These actions
 * are thin, authenticated proxies so the existing UI keeps its call signatures.
 */

export async function getContactMessages(options?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  messages: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  counts: Record<string, number>;
}> {
  await requireAdmin();

  const { status, search, page = 1, limit = 10 } = options || {};

  return apiData("/contact", {
    query: { status, search, page, limit },
  });
}

export async function getContactMessageById(id: string) {
  await requireAdmin();

  try {
    return await apiData(`/contact/${encodeURIComponent(id)}`);
  } catch {
    // Invalid id or missing message — the callers treat both as "not found".
    return null;
  }
}

export async function updateContactStatus(
  id: string,
  status: "new" | "read" | "replied" | "archived",
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await apiFetch(`/contact/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status },
    });
    revalidatePath("/admin/messages");
    return { success: true };
  } catch (error: any) {
    console.error("[updateContactStatus] Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getNewContactCount(): Promise<number> {
  await requireAdmin();

  try {
    const data = await apiData<{ count: number }>("/contact/new-count");
    return data?.count ?? 0;
  } catch (error) {
    console.error("[getNewContactCount] Error:", error);
    return 0;
  }
}

export async function deleteContactMessage(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await apiFetch(`/contact/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    revalidatePath("/admin/messages");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteContactMessage] Error:", error);
    return { success: false, error: error.message };
  }
}
