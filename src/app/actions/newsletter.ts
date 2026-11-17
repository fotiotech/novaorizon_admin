// app/actions/newsletter.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { ApiError, apiData, apiFetch, apiRequest } from "@/lib/server-api";

/**
 * Newsletter subscribers live in the Express backend (`/api/newsletter`).
 * These actions are thin, authenticated proxies so the existing UI keeps its
 * call signatures.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const field = error.fieldErrors
      ? Object.values(error.fieldErrors).flat()[0]
      : undefined;
    return field || error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/* -------------------- Public: Subscribe -------------------- */

export async function subscribeToNewsletter(payload: {
  email: string;
  source?: string;
  userId?: string | null;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const email = payload.email?.trim().toLowerCase();

  if (!email) {
    return { success: false, error: "Please enter your email address." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    const result = await apiFetch<{ success?: boolean; message?: string }>(
      "/newsletter/subscribe",
      {
        method: "POST",
        body: {
          email,
          source: payload.source,
          userId: payload.userId ?? null,
        },
      },
    );

    return {
      success: true,
      message:
        result?.message ?? "Thanks for subscribing! Check your inbox for updates.",
    };
  } catch (error) {
    console.error("[subscribeToNewsletter] Error:", error);
    return {
      success: false,
      error: errorMessage(error, "Unable to subscribe. Please try again."),
    };
  }
}

/* -------------------- Public: Unsubscribe -------------------- */

export async function unsubscribeFromNewsletter(
  token: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    if (!token) {
      return { success: false, error: "Missing unsubscribe token." };
    }

    const result = await apiFetch<{ success?: boolean; message?: string }>(
      `/newsletter/unsubscribe/${encodeURIComponent(token)}`,
    );

    return {
      success: true,
      message: result?.message ?? "You've been unsubscribed.",
    };
  } catch (error) {
    console.error("[unsubscribeFromNewsletter] Error:", error);
    return {
      success: false,
      error: errorMessage(error, "Unable to unsubscribe."),
    };
  }
}

/* -------------------- Admin: List -------------------- */

export async function getNewsletterSubscribers(options?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  subscribers: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  counts: {
    all: number;
    subscribed: number;
    unsubscribed: number;
    bounced: number;
  };
}> {
  await requireAdmin();

  const { status, search, page = 1, limit = 20 } = options || {};

  return apiData("/newsletter", {
    query: { status, search, page, limit },
  });
}

/* -------------------- Admin: Delete -------------------- */

export async function deleteNewsletterSubscriber(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await apiFetch(`/newsletter/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    revalidatePath("/admin/newsletter");
    return { success: true };
  } catch (error) {
    console.error("[deleteNewsletterSubscriber] Error:", error);
    return {
      success: false,
      error: errorMessage(error, "Unable to delete subscriber."),
    };
  }
}

/* -------------------- Admin: Export CSV -------------------- */

export async function exportNewsletterCsv(): Promise<{
  success: boolean;
  csv?: string;
  error?: string;
}> {
  await requireAdmin();

  try {
    const response = await apiRequest("/newsletter/export");
    const csv = await response.text();
    return { success: true, csv };
  } catch (error) {
    console.error("[exportNewsletterCsv] Error:", error);
    return {
      success: false,
      error: errorMessage(error, "Unable to export subscribers."),
    };
  }
}
