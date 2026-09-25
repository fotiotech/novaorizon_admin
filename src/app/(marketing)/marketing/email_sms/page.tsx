// app/marketing/email_marketing/page.tsx
import { listTemplates, listCampaigns } from "@/app/actions/campaigns";
import { getNewsletterSubscribers } from "@/app/actions/newsletter";
import { EmailMarketingClient } from "../../components/EmailMarketingClient";

export const dynamic = "force-dynamic";

export default async function EmailMarketingPage() {
  const [templatesRes, campaignsRes, subscribersRes] = await Promise.all([
    listTemplates().catch(() => ({ data: [] })),
    listCampaigns({}, { limit: 5 }).catch(() => ({
      data: [],
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <EmailMarketingClient
        templates={templatesRes.data as any[]}
        campaigns={campaignsRes.data as any[]}
        campaignsTotal={campaignsRes.total}
        counts={subscribersRes.counts}
      />
    </div>
  );
}
