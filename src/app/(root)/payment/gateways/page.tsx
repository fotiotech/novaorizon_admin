// app/(settings)/settings/payment/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Payments,
  CreditCard,
  AccountBalance,
  LocalAtm,
  Smartphone,
  Save,
  Refresh,
  Close,
  Check,
  Public,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import {
  getPaymentSettings,
  updatePaymentSettings,
  type PaymentSettingsData,
} from "@/app/actions/payment-settings";
import type { MobileMoneyProviderConfig } from "@/models/PaymentSettings";
import { toast } from "react-hot-toast";

// ------------------------------------------------------------------
// Mobile money providers
// ------------------------------------------------------------------
type ProviderKey = "mtm" | "orange" | "wave" | "moov";

const PROVIDERS: {
  key: ProviderKey;
  label: string;
  color: string;
  hint: string;
}[] = [
  {
    key: "mtm",
    label: "MTN Mobile Money",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hint: "Requires API user, API key, and subscription key from the MTN MoMo developer portal.",
  },
  {
    key: "orange",
    label: "Orange Money",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    hint: "Requires merchant code and client credentials from Orange Money Business.",
  },
  {
    key: "wave",
    label: "Wave",
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    hint: "Requires Wave Business API key.",
  },
  {
    key: "moov",
    label: "Moov Money",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    hint: "Requires merchant code and API credentials from Moov Africa.",
  },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

const TEXTAREA_CLASS = `${INPUT_CLASS} resize-y`;

// ------------------------------------------------------------------
// Fallback defaults
// ------------------------------------------------------------------
const emptyProvider = (): MobileMoneyProviderConfig => ({
  enabled: false,
  merchantName: "",
  merchantCode: "",
  clientId: "",
  clientSecret: "",
  subscriptionKey: "",
  ussdCode: "",
  environment: "sandbox",
  instructions: "",
});

const DEFAULTS: PaymentSettingsData = {
  cashOnDelivery: {
    enabled: true,
    minimumOrder: 0,
    fee: 0,
    instructions: "Pay with cash when your order is delivered.",
  },
  cardPayment: {
    enabled: false,
    provider: "none",
    publicKey: "",
    secretKey: "",
    environment: "sandbox",
  },
  bankTransfer: {
    enabled: false,
    bankName: "",
    accountName: "",
    accountNumber: "",
    swift: "",
    instructions: "",
  },
  mobileMoney: {
    enabled: false,
    mtm: emptyProvider(),
    orange: emptyProvider(),
    wave: emptyProvider(),
    moov: emptyProvider(),
  },
  currency: "XAF",
  currencySymbol: "CFA",
  defaultMethod: "cash_on_delivery",
  testMode: true,
};

/* ------------------------------------------------------------------ */
/*  Section shell                                                      */
/* ------------------------------------------------------------------ */
function Section({
  icon,
  title,
  description,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  right?: React.ReactNode;
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
        {right && <div className="shrink-0">{right}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Field                                                              */
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
/*  Toggle                                                             */
/* ------------------------------------------------------------------ */
function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Secret input with show/hide                                        */
/* ------------------------------------------------------------------ */
function SecretInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="new-password"
        className={`${INPUT_CLASS} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide" : "Show"}
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        {show ? (
          <VisibilityOff sx={{ fontSize: 15 }} />
        ) : (
          <Visibility sx={{ fontSize: 15 }} />
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider card                                                      */
/* ------------------------------------------------------------------ */
function ProviderCard({
  meta,
  value,
  onChange,
  disabled,
}: {
  meta: (typeof PROVIDERS)[number];
  value: MobileMoneyProviderConfig;
  onChange: (next: MobileMoneyProviderConfig) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof MobileMoneyProviderConfig>(
    key: K,
    v: MobileMoneyProviderConfig[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div
      className={`overflow-hidden rounded-lg border transition ${
        value.enabled
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background"
      }`}
    >
      {/* Provider header */}
      <div className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
        >
          <Smartphone sx={{ fontSize: 16 }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{meta.label}</p>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
            {meta.hint}
          </p>
        </div>
        <Toggle
          checked={value.enabled}
          onChange={(v) => set("enabled", v)}
          disabled={disabled}
          label={`Enable ${meta.label}`}
        />
      </div>

      {/* Provider body — collapsed when disabled */}
      {value.enabled && (
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Merchant name">
              <input
                type="text"
                value={value.merchantName}
                onChange={(e) => set("merchantName", e.target.value)}
                placeholder="My Store SARL"
                className={INPUT_CLASS}
                disabled={disabled}
              />
            </Field>
            <Field label="Merchant code / short code">
              <input
                type="text"
                value={value.merchantCode}
                onChange={(e) => set("merchantCode", e.target.value)}
                placeholder="e.g. 654321"
                className={INPUT_CLASS}
                disabled={disabled}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Client ID / API user">
              <input
                type="text"
                value={value.clientId}
                onChange={(e) => set("clientId", e.target.value)}
                placeholder="API user identifier"
                className={INPUT_CLASS}
                disabled={disabled}
              />
            </Field>
            <Field label="Client secret / API key">
              <SecretInput
                value={value.clientSecret}
                onChange={(v) => set("clientSecret", v)}
                placeholder="••••••••••••"
                disabled={disabled}
              />
            </Field>
          </div>

          {meta.key === "mtm" && (
            <Field label="Subscription key" hint="MTN MoMo only">
              <SecretInput
                value={value.subscriptionKey}
                onChange={(v) => set("subscriptionKey", v)}
                placeholder="••••••••••••"
                disabled={disabled}
              />
            </Field>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="USSD code" hint="optional">
              <input
                type="text"
                value={value.ussdCode}
                onChange={(e) => set("ussdCode", e.target.value)}
                placeholder="*126#"
                className={INPUT_CLASS}
                disabled={disabled}
              />
            </Field>

            <Field label="Environment">
              <select
                value={value.environment}
                onChange={(e) =>
                  set("environment", e.target.value as "sandbox" | "production")
                }
                disabled={disabled}
                className={INPUT_CLASS}
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </Field>
          </div>

          <Field label="Customer instructions" hint="optional">
            <textarea
              rows={2}
              value={value.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              placeholder={`You will receive a prompt on your ${meta.label} number to approve the payment.`}
              className={TEXTAREA_CLASS}
              disabled={disabled}
            />
          </Field>

          {value.environment === "sandbox" && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <Public sx={{ fontSize: 14 }} className="mt-0.5 shrink-0" />
              <span>
                Sandbox mode is active — no real transactions will be processed.
                Switch to <strong>Production</strong> when you&apos;re ready to
                go live.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */
function Skeleton() {
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
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function PaymentSettingsPage() {
  const [form, setForm] = useState<PaymentSettingsData>(DEFAULTS);
  const [initial, setInitial] = useState<PaymentSettingsData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPaymentSettings();
      setForm(data);
      setInitial(data);
    } catch (err: any) {
      console.error("Failed to load payment settings:", err);
      setError(err?.message || "Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // ---------- Change helpers ----------
  const setCOD = (
    key: keyof PaymentSettingsData["cashOnDelivery"],
    value: any,
  ) =>
    setForm((p) => ({
      ...p,
      cashOnDelivery: { ...p.cashOnDelivery, [key]: value },
    }));

  const setCard = (key: keyof PaymentSettingsData["cardPayment"], value: any) =>
    setForm((p) => ({
      ...p,
      cardPayment: { ...p.cardPayment, [key]: value },
    }));

  const setBank = (
    key: keyof PaymentSettingsData["bankTransfer"],
    value: any,
  ) =>
    setForm((p) => ({
      ...p,
      bankTransfer: { ...p.bankTransfer, [key]: value },
    }));

  const setMM = (key: keyof PaymentSettingsData["mobileMoney"], value: any) =>
    setForm((p) => ({
      ...p,
      mobileMoney: { ...p.mobileMoney, [key]: value },
    }));

  const setProvider = (key: ProviderKey, next: MobileMoneyProviderConfig) =>
    setForm((p) => ({
      ...p,
      mobileMoney: { ...p.mobileMoney, [key]: next },
    }));

  // ---------- Dirty tracking ----------
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  );

  // ---------- Save ----------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Saving payment settings…");
    try {
      const result = await updatePaymentSettings(form);
      if (result.success && result.data) {
        setForm(result.data);
        setInitial(result.data);
        toast.success("Payment settings saved", { id: toastId });
      } else {
        toast.error(result.error || "Failed to save", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save", { id: toastId });
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

  // How many mobile money providers are enabled?
  const enabledProviders = PROVIDERS.filter(
    (p) => form.mobileMoney[p.key].enabled,
  ).length;

  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-clip">
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        {/* ---------------- General ---------------- */}
        <Section
          icon={<Payments sx={{ fontSize: 18 }} />}
          title="General"
          description="Default currency and payment behaviour"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Currency">
              <input
                type="text"
                value={form.currency}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    currency: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="XAF"
                maxLength={5}
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Currency symbol">
              <input
                type="text"
                value={form.currencySymbol}
                onChange={(e) =>
                  setForm((p) => ({ ...p, currencySymbol: e.target.value }))
                }
                placeholder="CFA"
                maxLength={5}
                className={INPUT_CLASS}
                disabled={saving}
              />
            </Field>

            <Field label="Default payment method">
              <select
                value={form.defaultMethod}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    defaultMethod: e.target.value as any,
                  }))
                }
                disabled={saving}
                className={INPUT_CLASS}
              >
                <option value="cash_on_delivery">Cash on delivery</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="mobile_money">Mobile money</option>
              </select>
            </Field>

            <label className="flex items-center gap-2.5 self-end rounded-lg border border-border bg-background/50 p-3">
              <input
                type="checkbox"
                checked={form.testMode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, testMode: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border accent-primary"
                disabled={saving}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Test mode</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Prevent real charges on the storefront.
                </p>
              </div>
            </label>
          </div>
        </Section>

        {/* ---------------- Mobile money ---------------- */}
        <Section
          icon={<Smartphone sx={{ fontSize: 18 }} />}
          title="Mobile money"
          description={
            enabledProviders > 0
              ? `${enabledProviders} provider${enabledProviders === 1 ? "" : "s"} enabled`
              : "Enable the providers you want to accept at checkout"
          }
          right={
            <Toggle
              checked={form.mobileMoney.enabled}
              onChange={(v) => setMM("enabled", v)}
              disabled={saving}
              label="Enable mobile money"
            />
          }
        >
          {!form.mobileMoney.enabled ? (
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Mobile money is disabled. Turn it on to configure providers.
            </p>
          ) : (
            <div className="space-y-3">
              {PROVIDERS.map((meta) => (
                <ProviderCard
                  key={meta.key}
                  meta={meta}
                  value={form.mobileMoney[meta.key]}
                  onChange={(next) => setProvider(meta.key, next)}
                  disabled={saving}
                />
              ))}

              {enabledProviders === 0 && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-50/60 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                  No provider is enabled yet — customers won&apos;t be able to
                  pay with mobile money at checkout.
                </p>
              )}
            </div>
          )}
        </Section>

        {/* ---------------- Cash on delivery ---------------- */}
        <Section
          icon={<LocalAtm sx={{ fontSize: 18 }} />}
          title="Cash on delivery"
          description="Customers pay when the order arrives"
          right={
            <Toggle
              checked={form.cashOnDelivery.enabled}
              onChange={(v) => setCOD("enabled", v)}
              disabled={saving}
              label="Enable cash on delivery"
            />
          }
        >
          {form.cashOnDelivery.enabled && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Minimum order amount" hint={form.currencySymbol}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.cashOnDelivery.minimumOrder}
                  onChange={(e) =>
                    setCOD("minimumOrder", Number(e.target.value))
                  }
                  className={INPUT_CLASS}
                  disabled={saving}
                />
              </Field>

              <Field label="Additional fee" hint={form.currencySymbol}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.cashOnDelivery.fee}
                  onChange={(e) => setCOD("fee", Number(e.target.value))}
                  className={INPUT_CLASS}
                  disabled={saving}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Customer instructions" hint="optional">
                  <textarea
                    rows={2}
                    value={form.cashOnDelivery.instructions}
                    onChange={(e) => setCOD("instructions", e.target.value)}
                    className={TEXTAREA_CLASS}
                    disabled={saving}
                  />
                </Field>
              </div>
            </div>
          )}
        </Section>

        {/* ---------------- Card payment ---------------- */}
        <Section
          icon={<CreditCard sx={{ fontSize: 18 }} />}
          title="Card payment"
          description="Online card processing via a payment gateway"
          right={
            <Toggle
              checked={form.cardPayment.enabled}
              onChange={(v) => setCard("enabled", v)}
              disabled={saving}
              label="Enable card payment"
            />
          }
        >
          {form.cardPayment.enabled && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Provider">
                <select
                  value={form.cardPayment.provider}
                  onChange={(e) => setCard("provider", e.target.value)}
                  disabled={saving}
                  className={INPUT_CLASS}
                >
                  <option value="none">Select a provider…</option>
                  <option value="stripe">Stripe</option>
                  <option value="paystack">Paystack</option>
                  <option value="flutterwave">Flutterwave</option>
                </select>
              </Field>

              <Field label="Environment">
                <select
                  value={form.cardPayment.environment}
                  onChange={(e) => setCard("environment", e.target.value)}
                  disabled={saving}
                  className={INPUT_CLASS}
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </Field>

              <Field label="Public key">
                <input
                  type="text"
                  value={form.cardPayment.publicKey}
                  onChange={(e) => setCard("publicKey", e.target.value)}
                  placeholder="pk_test_…"
                  className={INPUT_CLASS}
                  disabled={saving}
                />
              </Field>

              <Field label="Secret key">
                <SecretInput
                  value={form.cardPayment.secretKey}
                  onChange={(v) => setCard("secretKey", v)}
                  placeholder="sk_test_…"
                  disabled={saving}
                />
              </Field>
            </div>
          )}
        </Section>

        {/* ---------------- Bank transfer ---------------- */}
        <Section
          icon={<AccountBalance sx={{ fontSize: 18 }} />}
          title="Bank transfer"
          description="Customers transfer funds to your account"
          right={
            <Toggle
              checked={form.bankTransfer.enabled}
              onChange={(v) => setBank("enabled", v)}
              disabled={saving}
              label="Enable bank transfer"
            />
          }
        >
          {form.bankTransfer.enabled && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Bank name">
                <input
                  type="text"
                  value={form.bankTransfer.bankName}
                  onChange={(e) => setBank("bankName", e.target.value)}
                  placeholder="Afriland First Bank"
                  className={INPUT_CLASS}
                  disabled={saving}
                />
              </Field>

              <Field label="Account name">
                <input
                  type="text"
                  value={form.bankTransfer.accountName}
                  onChange={(e) => setBank("accountName", e.target.value)}
                  placeholder="My Store SARL"
                  className={INPUT_CLASS}
                  disabled={saving}
                />
              </Field>

              <Field label="Account number / IBAN">
                <input
                  type="text"
                  value={form.bankTransfer.accountNumber}
                  onChange={(e) => setBank("accountNumber", e.target.value)}
                  placeholder="CM21 1000 2000 …"
                  className={INPUT_CLASS}
                  disabled={saving}
                />
              </Field>

              <Field label="SWIFT / BIC" hint="optional">
                <input
                  type="text"
                  value={form.bankTransfer.swift}
                  onChange={(e) => setBank("swift", e.target.value)}
                  placeholder="ABCDFRPP"
                  className={INPUT_CLASS}
                  disabled={saving}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Customer instructions" hint="optional">
                  <textarea
                    rows={2}
                    value={form.bankTransfer.instructions}
                    onChange={(e) => setBank("instructions", e.target.value)}
                    placeholder="Use your order number as the payment reference."
                    className={TEXTAREA_CLASS}
                    disabled={saving}
                  />
                </Field>
              </div>
            </div>
          )}
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
