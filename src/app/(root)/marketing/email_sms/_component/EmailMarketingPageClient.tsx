// app/marketing/email_sms/_component/EmailMarketingPageClient.tsx
"use client";

import { useCallback, useState } from "react";
import { listTemplates, listCampaigns } from "@/lib/api/campaign";
import type { ApiCampaign, ApiMessageTemplate } from "@/lib/api/campaign";
import { getNewsletterSubscribers } from "@/lib/api/newsletter";
import type { NewsletterCounts } from "@/lib/api/newsletter";
import { EmailMarketingClient } from "../../components/EmailMarketingClient";

export interface EmailMarketingInitialData {
  templates: ApiMessageTemplate[];
  campaigns: ApiCampaign[];
  campaignsTotal: number;
  counts: NewsletterCounts;
}

export default function EmailMarketingPageClient({
  initialData,
}: {
  initialData: EmailMarketingInitialData;
}) {
  const [data, setData] = useState<EmailMarketingInitialData>(initialData);

  const load = useCallback(async () => {
    const [templates, campaigns, subscribers] = await Promise.all([
      listTemplates().catch(() => [] as ApiMessageTemplate[]),
      listCampaigns({}, { limit: 5 }).catch(() => ({
        data: [] as ApiCampaign[],
        total: 0,
        limit: 5,
        skip: 0,
      })),
      getNewsletterSubscribers({ page: 1, limit: 1 }).catch(() => ({
        subscribers: [],
        total: 0,
        totalPages: 1,
        currentPage: 1,
        counts: { all: 0, subscribed: 0, unsubscribed: 0, bounced: 0 },
      })),
    ]);

    setData({
      templates,
      campaigns: campaigns.data,
      campaignsTotal: campaigns.total,
      counts: subscribers.counts,
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      {data ? (
        <EmailMarketingClient
          templates={data.templates}
          campaigns={data.campaigns}
          campaignsTotal={data.campaignsTotal}
          counts={data.counts}
          onChanged={load}
        />
      ) : (
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}
