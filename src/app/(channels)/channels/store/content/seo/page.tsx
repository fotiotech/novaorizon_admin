// app/marketing/content/seo/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { Close } from "@mui/icons-material";
import { getSeoSetting, saveSeoSetting } from "@/app/actions/seo";

import {
  DEFAULT_SEO,
  type SeoForm as SeoFormType,
} from "@/app/lib/seo-defaults";

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ------------------------------------------------------------------
// Shared input style (matches the rest of the app)
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

const TEXTAREA_CLASS = `${INPUT_CLASS} resize-y`;

export default function SeoPage() {
  const [form, setForm] = useState<SeoFormType>(DEFAULT_SEO);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---------- Load on mount ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getSeoSetting();
        if (!cancelled) {
          setForm(data);
          setLoadError(null);
        }
      } catch (err) {
        console.error("Failed to load SEO settings:", err);
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load SEO settings.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = <K extends keyof SeoFormType>(
    field: K,
    value: SeoFormType[K],
  ) => {
    setStatus("idle");
    setSaveError(null);
    setForm((current: any) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setSaveError(null);

    try {
      const result = await saveSeoSetting(form);
      if (result.success) {
        setStatus("saved");
        setTimeout(() => {
          setStatus((s) => (s === "saved" ? "idle" : s));
        }, 3000);
      } else {
        setStatus("error");
        setSaveError(result.error || "Failed to save SEO settings.");
      }
    } catch (err) {
      console.error("Failed to save SEO settings:", err);
      setStatus("error");
      setSaveError(
        err instanceof Error ? err.message : "Failed to save SEO settings.",
      );
    }
  };

  const isSaving = status === "saving";
  const isDisabled = isLoading || isSaving;

  // ---------------- Loading skeleton ----------------
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl overflow-x-clip">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="border-b border-border px-4 py-3">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      {/* Load error */}
      {loadError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>
            <strong className="font-medium">Error:</strong> {loadError}
          </span>
          <button
            type="button"
            onClick={() => setLoadError(null)}
            className="rounded p-0.5 transition hover:bg-destructive/10"
            aria-label="Dismiss error"
          >
            <Close fontSize="small" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* ---------------- Left: Search metadata ---------------- */}
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                Search metadata
              </h2>
            </div>

            <div className="space-y-4 p-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Site name
                </span>
                <input
                  className={INPUT_CLASS}
                  value={form.siteName}
                  onChange={(e) => updateField("siteName", e.target.value)}
                  disabled={isDisabled}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Page title</span>
                  <span className="tabular-nums">{form.title.length}/60</span>
                </span>
                <input
                  maxLength={60}
                  className={INPUT_CLASS}
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  disabled={isDisabled}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Meta description</span>
                  <span className="tabular-nums">
                    {form.description.length}/160
                  </span>
                </span>
                <textarea
                  maxLength={160}
                  rows={4}
                  className={TEXTAREA_CLASS}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  disabled={isDisabled}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Keywords{" "}
                  <span className="font-normal text-muted-foreground/70">
                    (comma separated)
                  </span>
                </span>
                <input
                  className={INPUT_CLASS}
                  value={form.keywords}
                  onChange={(e) => updateField("keywords", e.target.value)}
                  disabled={isDisabled}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Canonical URL
                </span>
                <input
                  type="url"
                  className={INPUT_CLASS}
                  value={form.canonicalUrl}
                  onChange={(e) => updateField("canonicalUrl", e.target.value)}
                  disabled={isDisabled}
                />
              </label>
            </div>
          </section>

          {/* ---------------- Right: Social + Preview ---------------- */}
          <aside className="space-y-4">
            <section className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Social sharing
                </h2>
              </div>
              <div className="space-y-4 p-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Open Graph image URL
                  </span>
                  <input
                    type="url"
                    className={INPUT_CLASS}
                    value={form.ogImage}
                    onChange={(e) => updateField("ogImage", e.target.value)}
                    disabled={isDisabled}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Search engine visibility
                  </span>
                  <select
                    className={INPUT_CLASS}
                    value={form.robots}
                    onChange={(e) =>
                      updateField(
                        "robots",
                        e.target.value as SeoFormType["robots"],
                      )
                    }
                    disabled={isDisabled}
                  >
                    <option value="index,follow">Allow indexing</option>
                    <option value="noindex,nofollow">
                      Hide from search engines
                    </option>
                  </select>
                </label>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Search preview
                </h2>
              </div>
              <div className="p-4">
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <p className="truncate text-base text-primary">
                    {form.title || "Page title"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-emerald-600 dark:text-emerald-400">
                    {form.canonicalUrl || "https://example.com"}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {form.description || "Add a description for this page."}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* ---------------- Action bar ---------------- */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            {saveError && <span className="text-destructive">{saveError}</span>}
            {status === "saved" && !saveError && (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                SEO settings saved.
              </span>
            )}
            {status === "idle" && !saveError && (
              <span className="text-muted-foreground">
                Changes are applied on save.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isDisabled}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            )}
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
