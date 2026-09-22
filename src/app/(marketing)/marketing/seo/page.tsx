"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSeoSetting, saveSeoSetting } from "@/app/actions/seo";

import {
  DEFAULT_SEO,
  type SeoForm as SeoFormType,
} from "@/app/lib/seo-defaults";

type SaveStatus = "idle" | "saving" | "saved" | "error";

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
        // Auto-clear the "saved" indicator after a few seconds.
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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-indigo-600">
            Content management
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            SEO settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage the metadata search engines and social platforms use to
            describe your site.
          </p>
        </header>

        {loadError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>
              <strong className="font-medium">Error:</strong> {loadError}
            </span>
            <button
              type="button"
              onClick={() => setLoadError(null)}
              className="rounded p-0.5 transition hover:bg-red-100"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1fr_360px]"
        >
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Search metadata</h2>
            <div className="mt-6 space-y-5">
              <label className="block text-sm font-medium">
                Site name
                <input
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                  value={form.siteName}
                  onChange={(e) => updateField("siteName", e.target.value)}
                  disabled={isLoading || isSaving}
                />
              </label>
              <label className="block text-sm font-medium">
                Page title{" "}
                <span className="font-normal text-slate-500">
                  ({form.title.length}/60)
                </span>
                <input
                  maxLength={60}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  disabled={isLoading || isSaving}
                />
              </label>
              <label className="block text-sm font-medium">
                Meta description{" "}
                <span className="font-normal text-slate-500">
                  ({form.description.length}/160)
                </span>
                <textarea
                  maxLength={160}
                  rows={4}
                  className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  disabled={isLoading || isSaving}
                />
              </label>
              <label className="block text-sm font-medium">
                Keywords{" "}
                <span className="font-normal text-slate-500">
                  (comma separated)
                </span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                  value={form.keywords}
                  onChange={(e) => updateField("keywords", e.target.value)}
                  disabled={isLoading || isSaving}
                />
              </label>
              <label className="block text-sm font-medium">
                Canonical URL
                <input
                  type="url"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                  value={form.canonicalUrl}
                  onChange={(e) => updateField("canonicalUrl", e.target.value)}
                  disabled={isLoading || isSaving}
                />
              </label>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Social sharing</h2>
              <label className="mt-5 block text-sm font-medium">
                Open Graph image URL
                <input
                  type="url"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                  value={form.ogImage}
                  onChange={(e) => updateField("ogImage", e.target.value)}
                  disabled={isLoading || isSaving}
                />
              </label>
              <label className="mt-5 block text-sm font-medium">
                Search engine visibility
                <select
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                  value={form.robots}
                  onChange={(e) =>
                    updateField(
                      "robots",
                      e.target.value as SeoFormType["robots"],
                    )
                  }
                  disabled={isLoading || isSaving}
                >
                  <option value="index,follow">Allow indexing</option>
                  <option value="noindex,nofollow">
                    Hide from search engines
                  </option>
                </select>
              </label>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Search preview</h2>
              <div className="mt-4 rounded-lg border border-slate-200 p-4">
                <p className="truncate text-lg text-blue-700">
                  {form.title || "Page title"}
                </p>
                <p className="mt-1 truncate text-xs text-green-700">
                  {form.canonicalUrl || "https://example.com"}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {form.description || "Add a description for this page."}
                </p>
              </div>
            </section>
          </aside>

          <div className="flex flex-col items-stretch justify-end gap-3 lg:col-span-2 lg:flex-row lg:items-center">
            {saveError && (
              <span className="text-sm text-red-600">{saveError}</span>
            )}
            {status === "saved" && !saveError && (
              <span className="text-sm text-emerald-600">
                SEO settings saved.
              </span>
            )}

            <button
              type="submit"
              disabled={isLoading || isSaving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
