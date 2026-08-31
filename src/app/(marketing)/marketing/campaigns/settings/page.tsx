"use client";

import { useEffect, useState } from "react";
import {
  FacebookAdsConnectionInput,
  saveFacebookAdsSettings,
  validateFacebookAdsConnection,
} from "@/app/actions/facebookAds";

const STORAGE_KEY = "novaorizon-facebook-ads-settings";

type FacebookAdsForm = {
  accountName: string;
  appId: string;
  appSecret: string;
  accessToken: string;
  adAccountId: string;
  pageId: string;
  pixelId: string;
  businessManagerId: string;
  catalogId: string;
  catalogName: string;
  catalogType: FacebookAdsConnectionInput["catalogType"];
  catalogEnabled: boolean;
  defaultObjective: FacebookAdsConnectionInput["defaultObjective"];
  apiVersion: string;
};

const defaultForm: FacebookAdsForm = {
  accountName: "Nova Horizon Store",
  appId: "",
  appSecret: "",
  accessToken: "",
  adAccountId: "",
  pageId: "",
  pixelId: "",
  businessManagerId: "",
  catalogId: "",
  catalogName: "",
  catalogType: "Ecommerce",
  catalogEnabled: false,
  defaultObjective: "sales",
  apiVersion: "v20.0",
};

export default function CampaignSettingsPage() {
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      setForm({ ...defaultForm, ...parsed });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const updateField = (
    field: keyof FacebookAdsForm,
    value: string | boolean | FacebookAdsConnectionInput["defaultObjective"],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      catalogType:
        form.catalogType as FacebookAdsConnectionInput["catalogType"],
      defaultObjective:
        form.defaultObjective as FacebookAdsConnectionInput["defaultObjective"],
    };

    const validation = await validateFacebookAdsConnection(payload);

    if (!validation.ok) {
      setStatus({
        type: "error",
        message: Object.values(validation.errors || {})
          .flat()
          .join(" "),
      });
      return;
    }

    setSaving(true);
    const result = await saveFacebookAdsSettings(payload);
    setSaving(false);

    if (!result.ok) {
      setStatus({
        type: "error",
        message: result.message || "Unable to save connection settings.",
      });
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setStatus({
      type: "success",
      message: result.message || validation.message,
    });
  };

  const envExample = `FACEBOOK_APP_ID=${form.appId || "<APP_ID>"}
FACEBOOK_APP_SECRET=${form.appSecret || "<APP_SECRET>"}
FACEBOOK_ACCESS_TOKEN=${form.accessToken || "<ACCESS_TOKEN>"}
FACEBOOK_AD_ACCOUNT_ID=${form.adAccountId || "<AD_ACCOUNT_ID>"}
FACEBOOK_PAGE_ID=${form.pageId || "<PAGE_ID>"}
FACEBOOK_PIXEL_ID=${form.pixelId || "<PIXEL_ID>"}
FACEBOOK_BUSINESS_MANAGER_ID=${form.businessManagerId || "<BUSINESS_MANAGER_ID>"}
FACEBOOK_CATALOG_ID=${form.catalogId || "<CATALOG_ID>"}
FACEBOOK_CATALOG_NAME=${form.catalogName || "<CATALOG_NAME>"}
FACEBOOK_CATALOG_TYPE=${form.catalogType || "Ecommerce"}
FACEBOOK_ADS_API_VERSION=${form.apiVersion || "v20.0"}`;

  return (
    <main className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-primary">Meta integration</p>
          <h2 className="mt-2 text-2xl font-bold">Facebook Ads connection</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Provide the credentials needed to sync campaigns, audiences, and ad
            performance from your Meta Business account.
          </p>
        </div>

        <div className="space-y-5">
          <label className="block text-sm font-medium">
            Account name
            <input
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none ring-0 transition focus:border-ring"
              value={form.accountName}
              onChange={(event) =>
                updateField("accountName", event.target.value)
              }
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Meta app ID
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.appId}
                onChange={(event) => updateField("appId", event.target.value)}
                placeholder="123456789012345"
              />
            </label>

            <label className="block text-sm font-medium">
              Meta app secret
              <input
                type="password"
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.appSecret}
                onChange={(event) =>
                  updateField("appSecret", event.target.value)
                }
                placeholder="••••••••"
              />
            </label>
          </div>

          <label className="block text-sm font-medium">
            Access token
            <textarea
              rows={3}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
              value={form.accessToken}
              onChange={(event) =>
                updateField("accessToken", event.target.value)
              }
              placeholder="EAA..."
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Ad account ID
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.adAccountId}
                onChange={(event) =>
                  updateField("adAccountId", event.target.value)
                }
                placeholder="act_1234567890"
              />
            </label>

            <label className="block text-sm font-medium">
              Page ID
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.pageId}
                onChange={(event) => updateField("pageId", event.target.value)}
                placeholder="123456789012345"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Pixel ID
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.pixelId}
                onChange={(event) => updateField("pixelId", event.target.value)}
                placeholder="123456789012345"
              />
            </label>

            <label className="block text-sm font-medium">
              Business Manager ID
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.businessManagerId}
                onChange={(event) =>
                  updateField("businessManagerId", event.target.value)
                }
                placeholder="123456789012345"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Catalog ID
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.catalogId}
                onChange={(event) =>
                  updateField("catalogId", event.target.value)
                }
                placeholder="catalog_1234567890"
              />
            </label>

            <label className="block text-sm font-medium">
              Catalog name
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.catalogName}
                onChange={(event) =>
                  updateField("catalogName", event.target.value)
                }
                placeholder="Nova Horizon Catalog"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Catalog type
              <select
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.catalogType}
                onChange={(event) =>
                  updateField(
                    "catalogType",
                    event.target
                      .value as FacebookAdsConnectionInput["catalogType"],
                  )
                }
              >
                <option value="Ecommerce">Ecommerce</option>
                <option value="Travel">Travel</option>
                <option value="RealEstate">Real Estate</option>
                <option value="Auto">Auto</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Catalog enabled
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-input bg-background px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.catalogEnabled}
                  onChange={(event) =>
                    updateField("catalogEnabled", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm text-muted-foreground">
                  Enable product sync
                </span>
              </div>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Default objective
              <select
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.defaultObjective}
                onChange={(event) =>
                  updateField("defaultObjective", event.target.value)
                }
              >
                <option value="sales">Sales</option>
                <option value="leads">Leads</option>
                <option value="traffic">Traffic</option>
                <option value="awareness">Awareness</option>
                <option value="engagement">Engagement</option>
                <option value="catalog_sales">Catalog Sales</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              API version
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none transition focus:border-ring"
                value={form.apiVersion}
                onChange={(event) =>
                  updateField("apiVersion", event.target.value)
                }
                placeholder="v20.0"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save connection"}
            </button>
            <button
              type="button"
              onClick={() =>
                setStatus({
                  type: "info",
                  message:
                    "Use the validation to confirm all required values are present before syncing advertisers.",
                })
              }
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium"
            >
              Validate fields
            </button>
          </div>

          {status && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                status.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : status.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-sky-200 bg-sky-50 text-sky-700"
              }`}
            >
              {status.message}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Environment config</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Copy this into your .env.local file or your deployment secrets.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
            {envExample}
          </pre>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Requirements</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Valid Meta Business account</li>
            <li>• Ad account with manage_campaigns permission</li>
            <li>• Long-lived access token or system user token</li>
            <li>• Pixel and page IDs if tracking conversions</li>
          </ul>
        </div>
      </aside>
    </main>
  );
}
