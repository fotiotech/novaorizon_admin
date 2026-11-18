// lib/api/campaign.ts
import api from "@/lib/api";

/**
 * Message templates, campaigns and the batched send engine all live in the
 * Express backend (`/api/campaigns`). These helpers are the client-side
 * replacement for the old `app/actions/campaigns.ts` server actions.
 */

export type CampaignChannel = "email" | "sms";

export interface ApiMessageTemplate {
  _id: string;
  name: string;
  channel: CampaignChannel;
  subject?: string;
  previewText?: string;
  body: string;
  isActive: boolean;
  variables?: string[];
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface ApiCampaign {
  _id: string;
  name: string;
  channel: CampaignChannel;
  status: string;
  subject?: string;
  previewText?: string;
  body?: string;
  scheduledFor?: string | null;
  stats?: {
    total?: number;
    queued?: number;
    sent?: number;
    failed?: number;
    opened?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface CampaignListResult {
  data: ApiCampaign[];
  total: number;
  limit: number;
  skip: number;
}

export interface ApiCampaignLog {
  _id: string;
  campaignId: string;
  channel: CampaignChannel;
  recipient: string;
  status: string;
  error?: string;
  sentAt?: string;
  failedAt?: string;
  createdAt?: string;
  [k: string]: any;
}

export interface CampaignLogListResult {
  data: ApiCampaignLog[];
  total: number;
  limit: number;
  skip: number;
}

export interface CampaignBatchResult {
  done: boolean;
  processed: number;
  sent: number;
  failed: number;
  remaining: number;
}

/* ------------------------------ templates ------------------------------ */

/** GET /api/campaigns/templates — admin only. */
export async function listTemplates(
  filter: { channel?: CampaignChannel; isActive?: boolean } = {},
): Promise<ApiMessageTemplate[]> {
  const res = await api.get<{ data: ApiMessageTemplate[] }>(
    "/campaigns/templates",
    {
      params: {
        channel: filter.channel || undefined,
        isActive: filter.isActive,
      },
    },
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/campaigns/templates/:id — admin only. */
export async function getTemplate(id: string): Promise<ApiMessageTemplate> {
  const res = await api.get<{ data: ApiMessageTemplate }>(
    `/campaigns/templates/${encodeURIComponent(id)}`,
  );
  return res.data.data;
}

/** POST /api/campaigns/templates — admin only. */
export async function createTemplate(input: {
  name: string;
  channel: CampaignChannel;
  subject?: string;
  previewText?: string;
  body: string;
}): Promise<ApiMessageTemplate> {
  const res = await api.post<{ data: ApiMessageTemplate }>(
    "/campaigns/templates",
    input,
  );
  return res.data.data;
}

/** PATCH /api/campaigns/templates/:id — admin only. */
export async function updateTemplate(
  id: string,
  input: Partial<{
    name: string;
    subject: string;
    previewText: string;
    body: string;
    isActive: boolean;
  }>,
): Promise<ApiMessageTemplate> {
  const res = await api.patch<{ data: ApiMessageTemplate }>(
    `/campaigns/templates/${encodeURIComponent(id)}`,
    input,
  );
  return res.data.data;
}

/** DELETE /api/campaigns/templates/:id — admin only. */
export async function deleteTemplate(
  id: string,
): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean }>(
    `/campaigns/templates/${encodeURIComponent(id)}`,
  );
  return res.data ?? { success: true };
}

/* ------------------------------ campaigns ------------------------------ */

/** GET /api/campaigns — admin only, paginated. */
export async function listCampaigns(
  filter: { status?: string; channel?: CampaignChannel } = {},
  options: { limit?: number; skip?: number } = {},
): Promise<CampaignListResult> {
  const { limit = 20, skip = 0 } = options;
  const res = await api.get<{ data: CampaignListResult }>("/campaigns", {
    params: {
      status: filter.status || undefined,
      channel: filter.channel || undefined,
      limit,
      skip,
    },
  });
  const d = res.data?.data;
  return {
    data: Array.isArray(d?.data) ? d.data : [],
    total: d?.total ?? 0,
    limit: d?.limit ?? limit,
    skip: d?.skip ?? skip,
  };
}

/** GET /api/campaigns/:id — admin only. */
export async function getCampaign(id: string): Promise<ApiCampaign> {
  const res = await api.get<{ data: ApiCampaign }>(
    `/campaigns/${encodeURIComponent(id)}`,
  );
  return res.data.data;
}

/** POST /api/campaigns — admin only. */
export async function createCampaign(input: {
  name: string;
  channel: CampaignChannel;
  subject?: string;
  previewText?: string;
  body: string;
  audience?: any;
  templateId?: string | null;
}): Promise<ApiCampaign> {
  const res = await api.post<{ data: ApiCampaign }>("/campaigns", input);
  return res.data.data;
}

/** PATCH /api/campaigns/:id — admin only. */
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
): Promise<ApiCampaign> {
  const res = await api.patch<{ data: ApiCampaign }>(
    `/campaigns/${encodeURIComponent(id)}`,
    input,
  );
  return res.data.data;
}

/** DELETE /api/campaigns/:id — admin only. */
export async function deleteCampaign(
  id: string,
): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean }>(
    `/campaigns/${encodeURIComponent(id)}`,
  );
  return res.data ?? { success: true };
}

/* -------------------------- audience resolution ------------------------ */

/** GET /api/campaigns/:id/audience — admin only. */
export async function previewAudience(
  campaignId: string,
): Promise<{ count: number }> {
  const res = await api.get<{ data: { count: number } }>(
    `/campaigns/${encodeURIComponent(campaignId)}/audience`,
  );
  return res.data.data;
}

/* ------------------------------ send engine ---------------------------- */

/**
 * POST /api/campaigns/:id/send/batch — admin only.
 * Sends one batch; call repeatedly until `done: true`. Safe to retry.
 */
export async function sendCampaignBatch(
  campaignId: string,
): Promise<CampaignBatchResult> {
  const res = await api.post<{ data: CampaignBatchResult }>(
    `/campaigns/${encodeURIComponent(campaignId)}/send/batch`,
  );
  return res.data.data;
}

/** POST /api/campaigns/:id/send/start — admin only. */
export async function startCampaignSend(
  campaignId: string,
): Promise<{ total: number }> {
  const res = await api.post<{ data: { total: number } }>(
    `/campaigns/${encodeURIComponent(campaignId)}/send/start`,
  );
  return res.data.data;
}

/** POST /api/campaigns/:id/send/pause — admin only. */
export async function pauseCampaign(
  campaignId: string,
): Promise<{ success: boolean }> {
  const res = await api.post<{ success: boolean }>(
    `/campaigns/${encodeURIComponent(campaignId)}/send/pause`,
  );
  return res.data ?? { success: true };
}

/** GET /api/campaigns/:id/logs — admin only, paginated. */
export async function listCampaignLogs(
  campaignId: string,
  options: { limit?: number; skip?: number; status?: string } = {},
): Promise<CampaignLogListResult> {
  const { limit = 50, skip = 0, status } = options;
  const res = await api.get<{ data: CampaignLogListResult }>(
    `/campaigns/${encodeURIComponent(campaignId)}/logs`,
    { params: { limit, skip, status: status || undefined } },
  );
  const d = res.data?.data;
  return {
    data: Array.isArray(d?.data) ? d.data : [],
    total: d?.total ?? 0,
    limit: d?.limit ?? limit,
    skip: d?.skip ?? skip,
  };
}
