// app/actions/campaigns.ts
"use server";
import { requireAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { apiData, apiFetch } from "@/lib/server-api";

/**
 * Message templates, campaigns and the batched send engine all live in the
 * Express backend (`/api/campaigns`). These actions are thin, authenticated
 * proxies so the existing UI keeps its call signatures.
 */

// ─────────────────────────────────────────────────────────────────────
// Templates — CRUD
// ─────────────────────────────────────────────────────────────────────

export async function listTemplates(
  filter: {
    channel?: "email" | "sms";
    isActive?: boolean;
  } = {},
) {
  await requireAdmin();

  const data = await apiData<any[]>("/campaigns/templates", {
    query: { channel: filter.channel, isActive: filter.isActive },
  });
  return { data: data ?? [] };
}

export async function getTemplate(id: string) {
  await requireAdmin();
  return apiData(`/campaigns/templates/${encodeURIComponent(id)}`);
}

export async function createTemplate(input: {
  name: string;
  channel: "email" | "sms";
  subject?: string;
  previewText?: string;
  body: string;
}) {
  await requireAdmin();
  const doc = await apiData("/campaigns/templates", {
    method: "POST",
    body: input,
  });
  revalidatePath("/marketing/email_marketing/templates");
  return doc;
}

export async function updateTemplate(
  id: string,
  input: Partial<{
    name: string;
    subject: string;
    previewText: string;
    body: string;
    isActive: boolean;
  }>,
) {
  await requireAdmin();
  const updated = await apiData(
    `/campaigns/templates/${encodeURIComponent(id)}`,
    { method: "PATCH", body: input },
  );
  revalidatePath("/marketing/email_marketing/templates");
  return updated;
}

export async function deleteTemplate(id: string) {
  await requireAdmin();
  await apiFetch(`/campaigns/templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  revalidatePath("/marketing/email_marketing/templates");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────
// Campaigns — CRUD
// ─────────────────────────────────────────────────────────────────────

export async function listCampaigns(
  filter: { status?: string; channel?: "email" | "sms" } = {},
  options: { limit?: number; skip?: number } = {},
) {
  await requireAdmin();
  const { limit = 20, skip = 0 } = options;

  return apiData("/campaigns", {
    query: { status: filter.status, channel: filter.channel, limit, skip },
  });
}

export async function getCampaign(id: string) {
  await requireAdmin();
  return apiData(`/campaigns/${encodeURIComponent(id)}`);
}

export async function createCampaign(input: {
  name: string;
  channel: "email" | "sms";
  subject?: string;
  previewText?: string;
  body: string;
  audience?: any;
  templateId?: string | null;
}) {
  await requireAdmin();
  const doc = await apiData("/campaigns", {
    method: "POST",
    body: input,
  });
  revalidatePath("/marketing/email_marketing");
  return doc;
}

export async function updateCampaign(
  id: string,
  input: Partial<{
    name: string;
    subject: string;
    previewText: string;
    body: string;
    audience: any;
    scheduledFor: Date | string | null;
  }>,
) {
  await requireAdmin();

  const updated = await apiData(`/campaigns/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
  revalidatePath("/marketing/email_marketing");
  revalidatePath(`/marketing/email_marketing/${id}`);
  return updated;
}

export async function deleteCampaign(id: string) {
  await requireAdmin();

  await apiFetch(`/campaigns/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  // Leave logs alone for auditing; they cascade-delete later if you want.
  revalidatePath("/marketing/email_marketing");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────
// Audience resolution
// ─────────────────────────────────────────────────────────────────────

export async function previewAudience(campaignId: string) {
  await requireAdmin();
  return apiData(`/campaigns/${encodeURIComponent(campaignId)}/audience`);
}

// ─────────────────────────────────────────────────────────────────────
// Send engine
// ─────────────────────────────────────────────────────────────────────

/**
 * Sends one batch of a campaign. Call repeatedly until `done: true`.
 * The campaign's `progress.lastSubscriberId` cursor and the batched send
 * engine now live in the backend; the endpoint is safe to retry.
 */
export async function sendCampaignBatch(campaignId: string): Promise<{
  done: boolean;
  processed: number;
  sent: number;
  failed: number;
  remaining: number;
}> {
  await requireAdmin();

  const result = await apiData<{
    done: boolean;
    processed: number;
    sent: number;
    failed: number;
    remaining: number;
  }>(`/campaigns/${encodeURIComponent(campaignId)}/send/batch`, {
    method: "POST",
  });

  revalidatePath(`/marketing/email_marketing/${campaignId}`);

  return result;
}

/** Fire the first batch — the UI calls this, then polls with `sendCampaignBatch`. */
export async function startCampaignSend(campaignId: string) {
  await requireAdmin();

  const result = await apiData(`/campaigns/${encodeURIComponent(campaignId)}/send/start`, {
    method: "POST",
  });

  revalidatePath(`/marketing/email_marketing/${campaignId}`);
  return result;
}

export async function pauseCampaign(campaignId: string) {
  await requireAdmin();
  await apiFetch(`/campaigns/${encodeURIComponent(campaignId)}/send/pause`, {
    method: "POST",
  });
  revalidatePath(`/marketing/email_marketing/${campaignId}`);
  return { success: true };
}

/** Returns recent per-recipient logs for a campaign — used by the detail page. */
export async function listCampaignLogs(
  campaignId: string,
  options: { limit?: number; skip?: number; status?: string } = {},
) {
  await requireAdmin();
  const { limit = 50, skip = 0, status } = options;

  return apiData(`/campaigns/${encodeURIComponent(campaignId)}/logs`, {
    query: { limit, skip, status },
  });
}
