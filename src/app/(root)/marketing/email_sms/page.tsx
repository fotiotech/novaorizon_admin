// app/marketing/email_sms/page.tsx
//
// Server component: templates, recent campaigns and subscriber counts are
// rendered on the server (BFF -> GET /api/campaigns/templates,
// /api/campaigns, /api/newsletter) and handed to the client page, which keeps
// the create/delete + refetch interactions browser-side.
import { apiData } from "@/lib/server-api";
import type { ApiCampaign, ApiMessageTemplate } from "@/lib/api/campaign";
import type { NewsletterCounts } from "@/lib/api/newsletter";
import EmailMarketingPageClient, {
  type EmailMarketingInitialData,
} from "./_component/EmailMarketingPageClient";

export const dynamic = "force-dynamic";

const EMPTY_COUNTS: NewsletterCounts = {
  all: 0,
  subscribed: 0,
  unsubscribed: 0,
  bounced: 0,
};

interface CampaignListEnvelope {
  data: ApiCampaign[];
  total: number;
  limit?: number;
  skip?: number;
}

interface NewsletterEnvelope {
  counts?: NewsletterCounts;
}

async function loadInitialData(): Promise<EmailMarketingInitialData> {
  const [templates, campaigns, subscribers] = await Promise.all([
    apiData<ApiMessageTemplate[]>("/campaigns/templates", {
      cache: "no-store",
    }).catch((error) => {
      console.error("[email_sms page] failed to load templates:", error);
      return [] as ApiMessageTemplate[];
    }),
    apiData<CampaignListEnvelope>("/campaigns", {
      query: { limit: 5, skip: 0 },
      cache: "no-store",
    }).catch((error) => {
      console.error("[email_sms page] failed to load campaigns:", error);
      return { data: [] as ApiCampaign[], total: 0 };
    }),
    apiData<NewsletterEnvelope>("/newsletter", {
      query: { page: 1, limit: 1 },
      cache: "no-store",
    }).catch((error) => {
      console.error("[email_sms page] failed to load subscribers:", error);
      return { counts: EMPTY_COUNTS };
    }),
  ]);

  return {
    templates: Array.isArray(templates) ? templates : [],
    campaigns: Array.isArray(campaigns?.data) ? campaigns.data : [],
    campaignsTotal: Number(campaigns?.total) || 0,
    counts: subscribers?.counts ?? EMPTY_COUNTS,
  };
}

export default async function EmailMarketingPage() {
  let data: EmailMarketingInitialData = {
    templates: [],
    campaigns: [],
    campaignsTotal: 0,
    counts: EMPTY_COUNTS,
  };

  try {
    data = await loadInitialData();
  } catch (error) {
    console.error("[email_sms page] failed to load initial data:", error);
  }

  return <EmailMarketingPageClient initialData={data} />;
}
