"use client";

import { useEffect, useState } from "react";
import {
  createFacebookAd,
  createFacebookAdSet,
  createFacebookCampaign,
  createFacebookAdCreative,
  syncFacebookCampaigns,
  syncFacebookAdSets,
  syncFacebookCatalogProducts,
  getCampaignInsights,
} from "@/app/actions/facebookAds";

type CampaignRow = {
  id?: string;
  name?: string;
  status?: string;
  objective?: string;
  configured_status?: string;
  created_time?: string;
};

type CampaignInsight = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
};

const initialForm = {
  name: "",
  objective: "sales",
  status: "PAUSED",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [adSets, setAdSets] = useState<
    Array<{ id?: string; name?: string; campaign_id?: string; status?: string }>
  >([]);
  const [campaignInsights, setCampaignInsights] = useState<
    Record<string, CampaignInsight>
  >({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingAdSet, setCreatingAdSet] = useState(false);
  const [creatingAd, setCreatingAd] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(initialForm);
  const [adSetForm, setAdSetForm] = useState({
    name: "",
    campaignId: "",
    objective: "LINK_CLICKS",
    status: "PAUSED",
    dailyBudget: "10",
    ageMin: "18",
    ageMax: "65",
    gender: "ALL",
    countries: "US",
  });
  const [adForm, setAdForm] = useState({
    name: "",
    adSetId: "",
    creativeName: "",
    headline: "",
    body: "",
    linkUrl: "https://example.com/product",
    status: "PAUSED",
  });

  const loadAdSets = async () => {
    const result = await syncFacebookAdSets();
    setAdSets(result.adSets ?? []);
    return result;
  };

  const loadCampaigns = async () => {
    setLoading(true);
    setMessage("");

    const result = await syncFacebookCampaigns();

    setCampaigns(result.campaigns ?? []);
    setMessage(result.message || "");

    const adSetsResult = await loadAdSets();
    if (adSetsResult.message) {
      setMessage((current) => current || adSetsResult.message);
    }

    if (result.campaigns && result.campaigns.length > 0) {
      const insights: Record<string, CampaignInsight> = {};
      for (const campaign of result.campaigns) {
        if (campaign.id) {
          const insightResult = await getCampaignInsights(campaign.id);
          if (insightResult.ok && insightResult.insights) {
            insights[campaign.id] = insightResult.insights;
          }
        }
      }
      setCampaignInsights(insights);
    }

    setLoading(false);
  };

  const handleCreateCampaign = async () => {
    setCreating(true);
    setMessage("");

    const result = await createFacebookCampaign({
      name: form.name,
      objective: form.objective as any,
      status: form.status as "ACTIVE" | "PAUSED",
    });

    setCreating(false);
    setMessage(result.message || "");

    if (result.ok) {
      setForm(initialForm);
      await loadCampaigns();
    }
  };

  const handleSyncCatalog = async () => {
    setSyncingCatalog(true);
    setMessage("");

    const result = await syncFacebookCatalogProducts(25);

    setSyncingCatalog(false);
    setMessage(result.message || "");

    if (result.ok) {
      await loadCampaigns();
    }
  };

  const handleCreateAdSet = async () => {
    setCreatingAdSet(true);
    setMessage("");

    const countries = adSetForm.countries
      .split(",")
      .map((country) => country.trim().toUpperCase())
      .filter(Boolean);

    const result = await createFacebookAdSet({
      name: adSetForm.name,
      campaignId: adSetForm.campaignId,
      optimizationGoal: adSetForm.objective as
        | "LINK_CLICKS"
        | "OFFSITE_CONVERSIONS"
        | "REACH"
        | "POST_ENGAGEMENT"
        | "CONVERSIONS"
        | "THR",
      status: adSetForm.status as "ACTIVE" | "PAUSED",
      dailyBudget: Number(adSetForm.dailyBudget || 10),
      targeting: {
        age_min: Number(adSetForm.ageMin || 18),
        age_max: Number(adSetForm.ageMax || 65),
        genders:
          adSetForm.gender === "ALL"
            ? undefined
            : adSetForm.gender === "MALE"
              ? [1]
              : [2],
        geo_locations:
          countries.length > 0
            ? {
                countries,
              }
            : undefined,
      },
    });

    setCreatingAdSet(false);
    setMessage(result.message || "");

    if (result.ok) {
      setAdSetForm((current) => ({
        ...current,
        name: "",
        campaignId: current.campaignId,
      }));

      await loadCampaigns();
    }
  };

  const handleCreateAd = async () => {
    setCreatingAd(true);
    setMessage("");

    const creativeResult = await createFacebookAdCreative({
      name: adForm.creativeName || adForm.name,
      headline: adForm.headline,
      body: adForm.body,
      linkUrl: adForm.linkUrl,
    });

    if (!creativeResult.ok || !creativeResult.creative?.id) {
      setCreatingAd(false);
      setMessage(creativeResult.message || "Ad creative creation failed.");
      return;
    }

    const result = await createFacebookAd({
      name: adForm.name,
      adSetId: adForm.adSetId,
      creativeId: creativeResult.creative.id,
      status: adForm.status as "ACTIVE" | "PAUSED",
    });

    setCreatingAd(false);
    setMessage(result.message || "");

    if (result.ok) {
      setAdForm({
        name: "",
        adSetId: "",
        creativeName: "",
        headline: "",
        body: "",
        linkUrl: "https://example.com/product",
        status: "PAUSED",
      });
    }
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  return (
    <main className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {(() => {
          const totalSpend = Object.values(campaignInsights).reduce(
            (sum, i) => sum + (i.spend || 0),
            0,
          );
          const totalImpressions = Object.values(campaignInsights).reduce(
            (sum, i) => sum + (i.impressions || 0),
            0,
          );
          const totalClicks = Object.values(campaignInsights).reduce(
            (sum, i) => sum + (i.clicks || 0),
            0,
          );
          const totalConversions = Object.values(campaignInsights).reduce(
            (sum, i) => sum + (i.conversions || 0),
            0,
          );

          return [
            {
              label: "Active campaigns",
              value: String(
                campaigns.filter((c) => c.status === "ACTIVE").length,
              ),
              detail: "Current Meta state",
            },
            {
              label: "Total spend",
              value: `$${totalSpend.toFixed(2)}`,
              detail: "All campaigns",
            },
            {
              label: "Total impressions",
              value: totalImpressions.toLocaleString(),
              detail: "Reach metrics",
            },
            {
              label: "Total clicks",
              value: totalClicks.toLocaleString(),
              detail: "Click through",
            },
            {
              label: "Conversions",
              value: totalConversions.toLocaleString(),
              detail: "Sales tracked",
            },
          ];
        })().map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-3 text-2xl font-bold">{card.value}</p>
            <p className="mt-2 text-xs text-emerald-600">{card.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Facebook Ads overview</h2>
            <p className="text-sm text-muted-foreground">
              Connected campaigns and catalog sync from your Meta account.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleSyncCatalog()}
              disabled={syncingCatalog}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncingCatalog ? "Syncing catalog..." : "Sync product catalog"}
            </button>
            <button
              onClick={() => void loadCampaigns()}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Syncing..." : "Refresh metrics"}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Campaign name"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />

          <select
            value={form.objective}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                objective: event.target.value,
              }))
            }
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          >
            <option value="sales">Sales</option>
            <option value="leads">Leads</option>
            <option value="traffic">Traffic</option>
            <option value="awareness">Awareness</option>
            <option value="engagement">Engagement</option>
            <option value="catalog_sales">Catalog Sales</option>
          </select>

          <select
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({ ...current, status: event.target.value }))
            }
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          >
            <option value="PAUSED">Paused</option>
            <option value="ACTIVE">Active</option>
          </select>

          <button
            onClick={() => void handleCreateCampaign()}
            disabled={creating || !form.name.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create campaign"}
          </button>
        </div>

        <div className="mb-6 grid gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Create ad set</h3>
            <input
              value={adSetForm.name}
              onChange={(event) =>
                setAdSetForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ad set name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <select
              value={adSetForm.campaignId}
              onChange={(event) =>
                setAdSetForm((current) => ({
                  ...current,
                  campaignId: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="">Select campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={adSetForm.objective}
                onChange={(event) =>
                  setAdSetForm((current) => ({
                    ...current,
                    objective: event.target.value,
                  }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              >
                <option value="LINK_CLICKS">Link clicks</option>
                <option value="OFFSITE_CONVERSIONS">Offsite conversions</option>
                <option value="REACH">Reach</option>
                <option value="POST_ENGAGEMENT">Post engagement</option>
              </select>
              <input
                value={adSetForm.dailyBudget}
                onChange={(event) =>
                  setAdSetForm((current) => ({
                    ...current,
                    dailyBudget: event.target.value,
                  }))
                }
                placeholder="Daily budget"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={adSetForm.ageMin}
                onChange={(event) =>
                  setAdSetForm((current) => ({
                    ...current,
                    ageMin: event.target.value,
                  }))
                }
                placeholder="Min age"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
              <input
                value={adSetForm.ageMax}
                onChange={(event) =>
                  setAdSetForm((current) => ({
                    ...current,
                    ageMax: event.target.value,
                  }))
                }
                placeholder="Max age"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={adSetForm.gender}
                onChange={(event) =>
                  setAdSetForm((current) => ({
                    ...current,
                    gender: event.target.value,
                  }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              >
                <option value="ALL">All genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
              <input
                value={adSetForm.countries}
                onChange={(event) =>
                  setAdSetForm((current) => ({
                    ...current,
                    countries: event.target.value,
                  }))
                }
                placeholder="Countries (US,FR,CA)"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={adSetForm.status}
                onChange={(event) =>
                  setAdSetForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              >
                <option value="PAUSED">Paused</option>
                <option value="ACTIVE">Active</option>
              </select>
              <button
                onClick={() => void handleCreateAdSet()}
                disabled={
                  creatingAdSet ||
                  !adSetForm.name.trim() ||
                  !adSetForm.campaignId
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingAdSet ? "Creating..." : "Create ad set"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold">Create ad</h3>
            <input
              value={adForm.name}
              onChange={(event) =>
                setAdForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ad name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <select
              value={adForm.adSetId}
              onChange={(event) =>
                setAdForm((current) => ({
                  ...current,
                  adSetId: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="">Select ad set</option>
              {adSets.map((adSet) => (
                <option key={adSet.id} value={adSet.id}>
                  {adSet.name || "Untitled ad set"}
                </option>
              ))}
            </select>
            <input
              value={adForm.creativeName}
              onChange={(event) =>
                setAdForm((current) => ({
                  ...current,
                  creativeName: event.target.value,
                }))
              }
              placeholder="Creative name"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <input
              value={adForm.headline}
              onChange={(event) =>
                setAdForm((current) => ({
                  ...current,
                  headline: event.target.value,
                }))
              }
              placeholder="Headline"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <textarea
              value={adForm.body}
              onChange={(event) =>
                setAdForm((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              placeholder="Ad copy"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <input
              value={adForm.linkUrl}
              onChange={(event) =>
                setAdForm((current) => ({
                  ...current,
                  linkUrl: event.target.value,
                }))
              }
              placeholder="Destination URL"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <div className="flex items-center gap-3">
              <select
                value={adForm.status}
                onChange={(event) =>
                  setAdForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              >
                <option value="PAUSED">Paused</option>
                <option value="ACTIVE">Active</option>
              </select>
              <button
                onClick={() => void handleCreateAd()}
                disabled={
                  creatingAd ||
                  !adForm.name.trim() ||
                  !adForm.adSetId.trim() ||
                  !adForm.linkUrl.trim()
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingAd ? "Creating..." : "Create ad"}
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            {message}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Campaign</th>
                <th className="py-3 pr-4 font-medium">Objective</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Spend</th>
                <th className="py-3 pr-4 font-medium">Impressions</th>
                <th className="py-3 pr-4 font-medium">Clicks</th>
                <th className="py-3 pr-4 font-medium">Conversions</th>
                <th className="py-3 pr-4 font-medium">CPC</th>
                <th className="py-3 pr-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No campaigns available yet. Save your Facebook Ads
                    credentials and click sync.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => {
                  const insights = campaign.id
                    ? campaignInsights[campaign.id]
                    : null;
                  return (
                    <tr
                      key={campaign.id || campaign.name}
                      className="border-b border-border/80"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {campaign.name || "Untitled campaign"}
                      </td>
                      <td className="py-3 pr-4">{campaign.objective || "—"}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            campaign.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : campaign.status === "PAUSED"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {campaign.status ||
                            campaign.configured_status ||
                            "Unknown"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        ${insights?.spend?.toFixed(2) || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {insights?.impressions?.toLocaleString() || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {insights?.clicks?.toLocaleString() || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {insights?.conversions || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        ${insights?.cpc?.toFixed(2) || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {campaign.created_time
                          ? new Date(campaign.created_time).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
