// lib/api/newsletter.ts
import api from "@/lib/api";

/**
 * Newsletter subscribers live in the Express backend (`/api/newsletter`).
 * Client-side replacement for the old `app/actions/newsletter.ts`.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NewsletterSubscriber {
  _id: string;
  email: string;
  status: "subscribed" | "unsubscribed" | "bounced" | string;
  source?: string;
  subscribedAt?: string;
  unsubscribedAt?: string | null;
  createdAt?: string;
  [k: string]: any;
}

export interface NewsletterCounts {
  all: number;
  subscribed: number;
  unsubscribed: number;
  bounced: number;
  /** Lets the counts map be indexed by tab key in the subscribers table. */
  [key: string]: number;
}

export interface NewsletterSubscribersResult {
  subscribers: NewsletterSubscriber[];
  total: number;
  totalPages: number;
  currentPage: number;
  counts: NewsletterCounts;
}

/** Pulls the first validation message out of the backend error envelope. */
function errorMessage(error: any, fallback: string): string {
  const payload = error?.response?.data;
  if (payload?.errors && typeof payload.errors === "object") {
    const first = Object.values(payload.errors as Record<string, unknown>)
      .flat()
      .find((v) => typeof v === "string" && v.length > 0);
    if (typeof first === "string") return first;
  }
  if (payload?.message) return String(payload.message);
  if (error?.message) return String(error.message);
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
    const res = await api.post<{ success?: boolean; message?: string }>(
      "/newsletter/subscribe",
      {
        email,
        source: payload.source,
        userId: payload.userId ?? null,
      },
    );

    return {
      success: true,
      message:
        res.data?.message ??
        "Thanks for subscribing! Check your inbox for updates.",
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

    const res = await api.get<{ success?: boolean; message?: string }>(
      `/newsletter/unsubscribe/${encodeURIComponent(token)}`,
    );

    return {
      success: true,
      message: res.data?.message ?? "You've been unsubscribed.",
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

/** GET /api/newsletter — admin only, paginated. */
export async function getNewsletterSubscribers(options?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<NewsletterSubscribersResult> {
  const { status, search, page = 1, limit = 20 } = options || {};

  const res = await api.get<{ data: NewsletterSubscribersResult }>(
    "/newsletter",
    {
      params: {
        status: status || undefined,
        search: search || undefined,
        page,
        limit,
      },
    },
  );

  const d = res.data?.data;
  return {
    subscribers: Array.isArray(d?.subscribers) ? d.subscribers : [],
    total: d?.total ?? 0,
    totalPages: d?.totalPages ?? 1,
    currentPage: d?.currentPage ?? page,
    counts: d?.counts ?? { all: 0, subscribed: 0, unsubscribed: 0, bounced: 0 },
  };
}

/* -------------------- Admin: Delete -------------------- */

/** DELETE /api/newsletter/:id — admin only. */
export async function deleteNewsletterSubscriber(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete(`/newsletter/${encodeURIComponent(id)}`);
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

/** GET /api/newsletter/export — admin only, returns the raw CSV text. */
export async function exportNewsletterCsv(): Promise<{
  success: boolean;
  csv?: string;
  error?: string;
}> {
  try {
    const res = await api.get("/newsletter/export", {
      responseType: "text",
      transformResponse: [(data) => data],
    });
    const csv = typeof res.data === "string" ? res.data : String(res.data ?? "");
    return { success: true, csv };
  } catch (error) {
    console.error("[exportNewsletterCsv] Error:", error);
    return {
      success: false,
      error: errorMessage(error, "Unable to export subscribers."),
    };
  }
}
