// app/(settings)/settings/general/page.tsx
"use client";

import { useEffect, useMemo, useState, memo } from "react";
import {
  Store,
  ContactMail,
  LocationOn,
  Public,
  Tune,
  Image as ImageIcon,
  Share,
  AccessTime,
  Save,
  Refresh,
  Close,
} from "@mui/icons-material";
import {
  getGeneralSettings,
  updateGeneralSettings,
  type GeneralSettings,
} from "@/app/actions/setting";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Fallback defaults (used while loading / on error)
// ------------------------------------------------------------------
const DEFAULTS: GeneralSettings = {
  storeName: "",
  storeTagline: "",
  storeDescription: "",
  contactEmail: "",
  contactPhone: "",
  supportEmail: "",
  address: { street: "", city: "", region: "", postalCode: "", country: "" },
  currency: "XAF",
  currencySymbol: "CFA",
  timezone: "Africa/Douala",
  language: "en",
  orderPrefix: "ORD",
  lowStockThreshold: 5,
  maintenanceMode: false,
  logoUrl: "",
  faviconUrl: "",
  socialLinks: {
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    youtube: "",
  },
  businessHours: "",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

const TEXTAREA_CLASS = `${INPUT_CLASS} resize-y`;

const CURRENCIES = [
  { value: "XAF", label: "XAF — Central African CFA franc", symbol: "CFA" },
  { value: "XOF", label: "XOF — West African CFA franc", symbol: "CFA" },
  { value: "USD", label: "USD — US Dollar", symbol: "$" },
  { value: "EUR", label: "EUR — Euro", symbol: "€" },
  { value: "GBP", label: "GBP — British Pound", symbol: "£" },
  { value: "NGN", label: "NGN — Nigerian Naira", symbol: "₦" },
  { value: "GHS", label: "GHS — Ghanaian Cedi", symbol: "₵" },
];

const TIMEZONES = [
  "Africa/Douala",
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
  "UTC",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
];

/* ------------------------------------------------------------------ */
/*  Section shell                                                      */
/* ------------------------------------------------------------------ */
function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                      */
/* ------------------------------------------------------------------ */
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
        {hint && (
          <span className="font-normal text-muted-foreground/70">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */
const Skeleton = memo(function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-clip">
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="border-b border-border px-4 py-3">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function GeneralSettingsPage() {
  const [form, setForm] = useState<GeneralSettings>(DEFAULTS);
  const [initial, setInitial] = useState<GeneralSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGeneralSettings();
      setForm(data);
      setInitial(data);
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      setError(err?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // ---------- Change helpers ----------
  const set = <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setAddress = (key: keyof GeneralSettings["address"], value: string) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [key]: value },
    }));
  };

  const setSocial = (
    key: keyof GeneralSettings["socialLinks"],
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));
  };

  const handleCurrencyChange = (value: string) => {
    const found = CURRENCIES.find((c) => c.value === value);
    setForm((prev) => ({
      ...prev,
      currency: value,
      currencySymbol: found?.symbol ?? prev.currencySymbol,
    }));
  };

  // ---------- Dirty tracking ----------
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  );

  // ---------- Save ----------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.storeName.trim()) {
      toast.error("Store name is required");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Saving settings…");
    try {
      const result = await updateGeneralSettings(form);
      if (result.success && result.data) {
        setForm(result.data);
        setInitial(result.data);
        toast.success("Settings saved", { id: toastId });
      } else {
        toast.error(result.error || "Failed to save settings", {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(initial);
    toast.success("Changes discarded");
  };

  // ---------- Early states ----------
  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-4 py-1.5 text-sm font-medium transition hover:bg-destructive/10"
          >
            <Refresh sx={{ fontSize: 16 }} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-clip">
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        {/* ---------------- Store identity ---------------- */}
        <Section
          icon={<Store sx={{ fontSize: 18 }} />}
          title="Store identity"
          description="How your store is displayed to customers"
        >
          <div className="space-y-3">
            <Field label="Store name" required>
              <input
                type="text"
                required
                value={form.storeName}
                onChange={(e) => set("storeName", e.target.value)}
                placeholder="Novaorizon"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Tagline" hint="optional">
              <input
                type="text"
                value={form.storeTagline}
                onChange={(e) => set("storeTagline", e.target.value)}
                placeholder="Everything you need, in one place"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field
              label="Description"
              hint={`${form.storeDescription.length}/250`}
            >
              <textarea
                value={form.storeDescription}
                onChange={(e) =>
                  set("storeDescription", e.target.value.slice(0, 250))
                }
                rows={3}
                placeholder="A short description of your business…"
                className={TEXTAREA_CLASS}
                disabled={saving}
              />
            </Field>
          </div>
        </Section>

        {/* ---------------- Contact ---------------- */}
        <Section
          icon={<ContactMail sx={{ fontSize: 18 }} />}
          title="Contact"
          description="Where customers and partners can reach you"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Contact email" required>
              <input
                type="email"
                required
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder="hello@yourstore.com"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Contact phone" hint="optional">
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                placeholder="+237 6XX XXX XXX"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Support email" hint="optional">
              <input
                type="email"
                value={form.supportEmail}
                onChange={(e) => set("supportEmail", e.target.value)}
                placeholder="support@yourstore.com"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Business hours" hint="optional">
              <input
                type="text"
                value={form.businessHours}
                onChange={(e) => set("businessHours", e.target.value)}
                placeholder="Mon–Fri, 9:00–18:00"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>
          </div>
        </Section>

        {/* ---------------- Address ---------------- */}
        <Section
          icon={<LocationOn sx={{ fontSize: 18 }} />}
          title="Business address"
          description="Used on invoices, receipts, and shipping labels"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Street">
                <input
                  type="text"
                  value={form.address.street}
                  onChange={(e) => setAddress("street", e.target.value)}
                  placeholder="123 Main Street"
                  className={INPUT_CLASS}
                  disabled={saving}
                />
              </Field>
            </div>

            <Field label="City">
              <input
                type="text"
                value={form.address.city}
                onChange={(e) => setAddress("city", e.target.value)}
                placeholder="Douala"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Region / State">
              <input
                type="text"
                value={form.address.region}
                onChange={(e) => setAddress("region", e.target.value)}
                placeholder="Littoral"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Postal code">
              <input
                type="text"
                value={form.address.postalCode}
                onChange={(e) => setAddress("postalCode", e.target.value)}
                placeholder="00000"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Country">
              <input
                type="text"
                value={form.address.country}
                onChange={(e) => setAddress("country", e.target.value)}
                placeholder="Cameroon"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>
          </div>
        </Section>

        {/* ---------------- Locale ---------------- */}
        <Section
          icon={<Public sx={{ fontSize: 18 }} />}
          title="Locale"
          description="Currency, language, and timezone used across the store"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Currency">
              <select
                value={form.currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className={INPUT_CLASS}
                disabled={saving}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Currency symbol" hint="auto-filled">
              <input
                type="text"
                value={form.currencySymbol}
                onChange={(e) => set("currencySymbol", e.target.value)}
                placeholder="CFA"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Timezone">
              <select
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
                className={INPUT_CLASS}
                disabled={saving}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Language">
              <select
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
                className={INPUT_CLASS}
                disabled={saving}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* ---------------- Operations ---------------- */}
        <Section
          icon={<Tune sx={{ fontSize: 18 }} />}
          title="Operations"
          description="How orders and inventory are handled"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Order prefix" hint="e.g. ORD-123">
              <input
                type="text"
                value={form.orderPrefix}
                onChange={(e) =>
                  set(
                    "orderPrefix",
                    e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
                  )
                }
                maxLength={8}
                placeholder="ORD"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Low-stock threshold">
              <input
                type="number"
                min={0}
                step={1}
                value={form.lowStockThreshold}
                onChange={(e) =>
                  set("lowStockThreshold", Number(e.target.value))
                }
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-2.5 rounded-lg border border-border bg-background/50 p-3">
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => set("maintenanceMode", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
              disabled={saving}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                Maintenance mode
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                When enabled, the storefront shows a maintenance notice and
                customers can&apos;t place new orders.
              </p>
            </div>
            {form.maintenanceMode && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                On
              </span>
            )}
          </label>
        </Section>

        {/* ---------------- Branding ---------------- */}
        <Section
          icon={<ImageIcon sx={{ fontSize: 18 }} />}
          title="Branding"
          description="Logo and favicon URLs — upload from your media library"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Logo URL" hint="optional">
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => set("logoUrl", e.target.value)}
                placeholder="https://…/logo.png"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Favicon URL" hint="optional">
              <input
                type="url"
                value={form.faviconUrl}
                onChange={(e) => set("faviconUrl", e.target.value)}
                placeholder="https://…/favicon.ico"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>
          </div>

          {form.logoUrl && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logoUrl}
                  alt="Store logo preview"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">
                  Logo preview
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {form.logoUrl}
                </p>
              </div>
            </div>
          )}
        </Section>

        {/* ---------------- Social ---------------- */}
        <Section
          icon={<Share sx={{ fontSize: 18 }} />}
          title="Social links"
          description="Shown in the store footer"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Facebook">
              <input
                type="url"
                value={form.socialLinks.facebook}
                onChange={(e) => setSocial("facebook", e.target.value)}
                placeholder="https://facebook.com/…"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Instagram">
              <input
                type="url"
                value={form.socialLinks.instagram}
                onChange={(e) => setSocial("instagram", e.target.value)}
                placeholder="https://instagram.com/…"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Twitter / X">
              <input
                type="url"
                value={form.socialLinks.twitter}
                onChange={(e) => setSocial("twitter", e.target.value)}
                placeholder="https://x.com/…"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="TikTok">
              <input
                type="url"
                value={form.socialLinks.tiktok}
                onChange={(e) => setSocial("tiktok", e.target.value)}
                placeholder="https://tiktok.com/@…"
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="YouTube">
                <input
                  type="url"
                  value={form.socialLinks.youtube}
                  onChange={(e) => setSocial("youtube", e.target.value)}
                  placeholder="https://youtube.com/@…"
                  className={INPUT_CLASS}
                  disabled={saving}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* ---------------- Sticky action bar ---------------- */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <div className="min-w-0 flex-1 text-xs">
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                You have unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All changes saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Close sx={{ fontSize: 14 }} />
                Discard
              </button>
            )}

            <button
              type="submit"
              disabled={saving || !isDirty}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <Save sx={{ fontSize: 16 }} />
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
