"use client";

import { FormEvent, useState } from "react";

type SeoForm = {
  siteName: string;
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
  robots: "index,follow" | "noindex,nofollow";
};

const initialForm: SeoForm = {
  siteName: "Nova Horizon",
  title: "Nova Horizon | Discover what’s next",
  description:
    "Explore Nova Horizon for fresh ideas, helpful resources, and inspiring stories.",
  keywords: "nova horizon, resources, stories, ideas",
  canonicalUrl: "https://www.example.com",
  ogImage: "https://www.example.com/og-image.jpg",
  robots: "index,follow",
};

export default function SeoPage() {
  const [form, setForm] = useState<SeoForm>(initialForm);
  const [saved, setSaved] = useState(false);

  const updateField = <K extends keyof SeoForm>(
    field: K,
    value: SeoForm[K],
  ) => {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
  };

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
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={form.siteName}
                  onChange={(e) => updateField("siteName", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Page title{" "}
                <span className="font-normal text-slate-500">
                  ({form.title.length}/60)
                </span>
                <input
                  maxLength={60}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
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
                  className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Keywords{" "}
                <span className="font-normal text-slate-500">
                  (comma separated)
                </span>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={form.keywords}
                  onChange={(e) => updateField("keywords", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Canonical URL
                <input
                  type="url"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={form.canonicalUrl}
                  onChange={(e) => updateField("canonicalUrl", e.target.value)}
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
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={form.ogImage}
                  onChange={(e) => updateField("ogImage", e.target.value)}
                />
              </label>
              <label className="mt-5 block text-sm font-medium">
                Search engine visibility
                <select
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={form.robots}
                  onChange={(e) =>
                    updateField("robots", e.target.value as SeoForm["robots"])
                  }
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

          <div className="flex items-center justify-end gap-4 lg:col-span-2">
            {saved && (
              <span className="text-sm text-emerald-600">
                SEO settings saved.
              </span>
            )}
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
