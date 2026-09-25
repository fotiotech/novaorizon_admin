// app/actions/campaigns.ts
"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connection } from "@/utils/connection";
import NewsletterSubscriber from "@/models/NewsletterSubscriber";
import MessageCampaign from "@/models/MessageCampaign";
import MessageTemplate from "@/models/MessageTemplate";
import MessageLog from "@/models/MessageLog";
import { sendEmail, sendSms, ProviderError } from "@/lib/messaging/providers";
import {
  renderTemplate,
  extractVariables,
  wrapHtml,
  appendUnsubscribe,
  appendSmsOptOut,
  type RenderContext,
} from "@/lib/messaging/render";

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

// ─────────────────────────────────────────────────────────────────────
// Templates — CRUD
// ─────────────────────────────────────────────────────────────────────

export async function listTemplates(
  filter: {
    channel?: "email" | "sms";
    isActive?: boolean;
  } = {},
) {
  await connection();
  const query: any = {};
  if (filter.channel) query.channel = filter.channel;
  if (filter.isActive !== undefined) query.isActive = filter.isActive;

  const data = await MessageTemplate.find(query).sort({ createdAt: -1 }).lean();
  return { data };
}

export async function getTemplate(id: string) {
  await connection();
  if (!isValidObjectId(id)) throw new Error("Invalid template id");
  return MessageTemplate.findById(id).lean();
}

export async function createTemplate(input: {
  name: string;
  channel: "email" | "sms";
  subject?: string;
  previewText?: string;
  body: string;
}) {
  await connection();
  const variables = extractVariables(
    [input.subject, input.body].filter(Boolean).join("\n"),
  );
  const doc = await MessageTemplate.create({ ...input, variables });
  revalidatePath("/marketing/email_marketing/templates");
  return doc.toObject();
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
  await connection();
  if (!isValidObjectId(id)) throw new Error("Invalid template id");

  const patch: any = { ...input };
  if (input.body !== undefined || input.subject !== undefined) {
    // Merge with existing to compute the full variable set.
    const existing: any = await MessageTemplate.findById(id).lean();
    if (!existing) throw new Error("Template not found");
    patch.variables = extractVariables(
      [input.subject ?? existing.subject, input.body ?? existing.body]
        .filter(Boolean)
        .join("\n"),
    );
  }
  const updated = await MessageTemplate.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true, runValidators: true },
  ).lean();
  revalidatePath("/marketing/email_marketing/templates");
  return updated;
}

export async function deleteTemplate(id: string) {
  await connection();
  if (!isValidObjectId(id)) throw new Error("Invalid template id");
  await MessageTemplate.findByIdAndDelete(id);
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
  await connection();
  const { limit = 20, skip = 0 } = options;
  const query: any = {};
  if (filter.status) query.status = filter.status;
  if (filter.channel) query.channel = filter.channel;

  const [data, total] = await Promise.all([
    MessageCampaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MessageCampaign.countDocuments(query),
  ]);
  return { data, total, limit, skip };
}

export async function getCampaign(id: string) {
  await connection();
  if (!isValidObjectId(id)) throw new Error("Invalid campaign id");
  return MessageCampaign.findById(id).lean();
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
  await connection();
  const doc = await MessageCampaign.create({
    ...input,
    templateId: input.templateId || null,
    status: "draft",
  });
  revalidatePath("/marketing/email_marketing");
  return doc.toObject();
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
  await connection();
  if (!isValidObjectId(id)) throw new Error("Invalid campaign id");

  const existing = await MessageCampaign.findById(id);
  if (!existing) throw new Error("Campaign not found");
  if (existing.status === "sending" || existing.status === "sent") {
    throw new Error("Cannot edit a campaign that is already sending or sent");
  }

  const patch: any = { ...input };
  if (input.scheduledFor !== undefined) {
    if (input.scheduledFor) {
      patch.scheduledFor = new Date(input.scheduledFor);
      patch.status = "scheduled";
    } else {
      patch.scheduledFor = null;
      patch.status = "draft";
    }
  }

  const updated = await MessageCampaign.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true, runValidators: true },
  ).lean();
  revalidatePath("/marketing/email_marketing");
  revalidatePath(`/marketing/email_marketing/${id}`);
  return updated;
}

export async function deleteCampaign(id: string) {
  await connection();
  if (!isValidObjectId(id)) throw new Error("Invalid campaign id");
  const existing = await MessageCampaign.findById(id).lean();
  if (!existing) throw new Error("Campaign not found");
  if (existing.status === "sending") {
    throw new Error("Cannot delete a campaign that is currently sending");
  }
  await MessageCampaign.findByIdAndDelete(id);
  // Leave logs alone for auditing; they cascade-delete later if you want.
  revalidatePath("/marketing/email_marketing");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────
// Audience resolution
// ─────────────────────────────────────────────────────────────────────

function buildAudienceQuery(audience: any, channel: "email" | "sms") {
  const query: any = {};

  // Email vs SMS eligibility is enforced here — never at send time.
  if (channel === "sms") {
    query.smsConsent = true;
    query.phone = { $ne: null };
  } else {
    query.email = { $ne: null };
  }

  if (audience?.status && audience.status !== "all") {
    query.status = audience.status;
  } else if (!audience?.status) {
    query.status = "subscribed";
  }

  if (Array.isArray(audience?.sources) && audience.sources.length > 0) {
    query.source = { $in: audience.sources };
  }

  if (audience?.joinedAfter || audience?.joinedBefore) {
    query.subscribedAt = {};
    if (audience.joinedAfter)
      query.subscribedAt.$gte = new Date(audience.joinedAfter);
    if (audience.joinedBefore)
      query.subscribedAt.$lte = new Date(audience.joinedBefore);
    if (Object.keys(query.subscribedAt).length === 0) delete query.subscribedAt;
  }

  if (
    Array.isArray(audience?.includeEmails) &&
    audience.includeEmails.length > 0
  ) {
    query.email = {
      $in: audience.includeEmails.map((e: string) => e.toLowerCase()),
    };
  }
  if (
    Array.isArray(audience?.excludeEmails) &&
    audience.excludeEmails.length > 0
  ) {
    query.email = {
      ...(query.email || {}),
      $nin: audience.excludeEmails.map((e: string) => e.toLowerCase()),
    };
  }

  return query;
}

export async function previewAudience(campaignId: string) {
  await connection();
  if (!isValidObjectId(campaignId)) throw new Error("Invalid campaign id");
  const campaign: any = await MessageCampaign.findById(campaignId).lean();
  if (!campaign) throw new Error("Campaign not found");

  const query = buildAudienceQuery(campaign.audience, campaign.channel);
  const count = await NewsletterSubscriber.countDocuments(query);
  return { count };
}

// ─────────────────────────────────────────────────────────────────────
// Send engine
// ─────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 40;

/**
 * Sends one batch of a campaign. Call repeatedly until `done: true`.
 * The campaign's `progress.lastSubscriberId` is the cursor — each batch
 * picks up strictly after the last processed subscriber, so this is
 * safe to retry.
 *
 * The reason this is batched rather than a single loop: server actions
 * have short timeouts, and a 10,000-recipient send would time out
 * mid-flight. Batching turns that into ~250 short calls that survive
 * retries.
 */
export async function sendCampaignBatch(campaignId: string): Promise<{
  done: boolean;
  processed: number;
  sent: number;
  failed: number;
  remaining: number;
}> {
  await connection();
  if (!isValidObjectId(campaignId)) throw new Error("Invalid campaign id");

  const campaign: any = await MessageCampaign.findById(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  if (["sent", "cancelled", "failed"].includes(campaign.status)) {
    return { done: true, processed: 0, sent: 0, failed: 0, remaining: 0 };
  }

  // Lock the campaign into "sending" on first batch.
  if (campaign.status !== "sending") {
    campaign.status = "sending";
    await campaign.save();
  }

  const query: any = buildAudienceQuery(campaign.audience, campaign.channel);
  // Cursor: only fetch subscribers after the last one we processed.
  if (
    campaign.progress?.lastSubscriberId &&
    isValidObjectId(campaign.progress.lastSubscriberId)
  ) {
    query._id = {
      $gt: new mongoose.Types.ObjectId(campaign.progress.lastSubscriberId),
    };
  }

  const subscribers = await NewsletterSubscriber.find(query)
    .sort({ _id: 1 })
    .limit(BATCH_SIZE)
    .lean();

  if (subscribers.length === 0) {
    campaign.status = "sent";
    campaign.sentAt = new Date();
    campaign.progress.lastRunAt = new Date();
    await campaign.save();
    return { done: true, processed: 0, sent: 0, failed: 0, remaining: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers as any[]) {
    const recipient = campaign.channel === "sms" ? sub.phone : sub.email;

    if (!recipient) {
      // No address for this channel — skip silently. Shouldn't happen
      // given the audience query, but defensive.
      continue;
    }

    // Skip if we've already logged a send for this recipient.
    const existing = await MessageLog.findOne({
      campaignId: campaign._id,
      recipient,
    }).lean();
    if (existing) continue;

    // Build the render context.
    const unsubscribeUrl = `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(sub.unsubscribeToken || "")}`;
    const ctx: RenderContext = {
      email: sub.email,
      phone: sub.phone,
      firstName: sub.firstName,
      lastName: sub.lastName,
      source: sub.source,
      unsubscribeUrl,
    };

    // Insert a queued log row first, so a mid-flight crash leaves a
    // record of the intent. The unique index on (campaign, recipient)
    // prevents double-sends on retry.
    let log: any;
    try {
      log = await MessageLog.create({
        campaignId: campaign._id,
        channel: campaign.channel,
        recipient,
        subscriberId: sub._id,
        status: "queued",
      });
    } catch (err: any) {
      // Duplicate — already sent in a prior run. Skip.
      if (err?.code === 11000) continue;
      failed += 1;
      continue;
    }

    try {
      if (campaign.channel === "email") {
        const subject = renderTemplate(campaign.subject || "", ctx);
        const html = appendUnsubscribe(
          wrapHtml(renderTemplate(campaign.body, ctx)),
          unsubscribeUrl,
        );
        const result = await sendEmail({
          to: recipient,
          subject,
          html,
          headers: {
            // Gmail/Outlook honor this and show a native unsubscribe button.
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        log.status = "sent";
        log.sentAt = new Date();
        log.providerMessageId = result.providerMessageId;
        log.providerName = result.providerName;
        await log.save();
        sent += 1;
      } else {
        const body = appendSmsOptOut(renderTemplate(campaign.body, ctx));
        const result = await sendSms({ to: recipient, body });
        log.status = "sent";
        log.sentAt = new Date();
        log.providerMessageId = result.providerMessageId;
        log.providerName = result.providerName;
        await log.save();
        sent += 1;
      }
    } catch (err: any) {
      const isProvider = err instanceof ProviderError;
      log.status = "failed";
      log.failedAt = new Date();
      log.error = err?.message || "Unknown send error";
      if (isProvider) log.providerName = err.providerName;
      await log.save();
      failed += 1;
    }
  }

  // Advance the cursor and stats.
  const lastSub = subscribers[subscribers.length - 1] as any;
  campaign.progress.lastSubscriberId = lastSub._id.toString();
  campaign.progress.processed += subscribers.length;
  campaign.progress.lastRunAt = new Date();
  campaign.stats.sent += sent;
  campaign.stats.failed += failed;
  campaign.stats.queued = Math.max(0, campaign.stats.queued - (sent + failed));

  const remainingQuery: any = buildAudienceQuery(
    campaign.audience,
    campaign.channel,
  );
  remainingQuery._id = {
    $gt: new mongoose.Types.ObjectId(campaign.progress.lastSubscriberId),
  };
  const remaining = await NewsletterSubscriber.countDocuments(remainingQuery);

  if (remaining === 0) {
    campaign.status = "sent";
    campaign.sentAt = new Date();
  }

  await campaign.save();

  revalidatePath(`/marketing/email_marketing/${campaignId}`);

  return {
    done: remaining === 0,
    processed: subscribers.length,
    sent,
    failed,
    remaining,
  };
}

/** Fire the first batch — the UI calls this, then polls with `sendCampaignBatch`. */
export async function startCampaignSend(campaignId: string) {
  await connection();
  if (!isValidObjectId(campaignId)) throw new Error("Invalid campaign id");

  const campaign: any = await MessageCampaign.findById(campaignId).lean();
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === "sent" || campaign.status === "sending") {
    throw new Error("Campaign has already been sent or is currently sending");
  }
  if (!campaign.body?.trim()) {
    throw new Error("Campaign has no body content");
  }
  if (campaign.channel === "email" && !campaign.subject?.trim()) {
    throw new Error("Email campaigns require a subject");
  }

  // Snapshot the audience total so the UI can show progress.
  const audienceQuery = buildAudienceQuery(campaign.audience, campaign.channel);
  const total = await NewsletterSubscriber.countDocuments(audienceQuery);

  await MessageCampaign.findByIdAndUpdate(campaignId, {
    $set: {
      status: "sending",
      "progress.lastSubscriberId": null,
      "progress.processed": 0,
      "stats.total": total,
      "stats.queued": total,
      "stats.sent": 0,
      "stats.failed": 0,
    },
  });

  revalidatePath(`/marketing/email_marketing/${campaignId}`);
  return { total };
}

export async function pauseCampaign(campaignId: string) {
  await connection();
  if (!isValidObjectId(campaignId)) throw new Error("Invalid campaign id");
  await MessageCampaign.findByIdAndUpdate(campaignId, {
    $set: { status: "paused" },
  });
  revalidatePath(`/marketing/email_marketing/${campaignId}`);
  return { success: true };
}

/** Returns recent per-recipient logs for a campaign — used by the detail page. */
export async function listCampaignLogs(
  campaignId: string,
  options: { limit?: number; skip?: number; status?: string } = {},
) {
  await connection();
  if (!isValidObjectId(campaignId)) throw new Error("Invalid campaign id");
  const { limit = 50, skip = 0, status } = options;
  const query: any = { campaignId };
  if (status) query.status = status;

  const [data, total] = await Promise.all([
    MessageLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MessageLog.countDocuments(query),
  ]);

  return {
    data: data.map((l: any) => ({
      ...l,
      _id: l._id.toString(),
      campaignId: l.campaignId.toString(),
      subscriberId: l.subscriberId ? l.subscriberId.toString() : null,
    })),
    total,
    limit,
    skip,
  };
}
