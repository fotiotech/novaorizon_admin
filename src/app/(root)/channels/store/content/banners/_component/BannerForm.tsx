// components/content/banners/BannerForm.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import {
  createBanner,
  updateBanner,
  getBanner,
} from "@/app/actions/banner-content";
import { CTA_STYLES } from "@/lib/content/constants";

/* ------------------------------- style tokens ------------------------------ */

const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";
const fieldsetCls = "rounded-xl border border-border bg-card p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";

const LIST_PATH = "/channels/store/content/banners";

/* --------------------------------- types ---------------------------------- */

interface FormState {
  name: string;
  eyebrow: string;
  body: string;
  heading: { title: string; subtitle: string };
  image: string;
  cta: {
    text: string;
    link: string;
    style: (typeof CTA_STYLES)[number];
  };
}

const INITIAL: FormState = {
  name: "",
  eyebrow: "",
  body: "",
  heading: { title: "", subtitle: "" },
  image: "",
  cta: { text: "", link: "", style: "none" },
};

/* ---------------------------------- form ---------------------------------- */

export default function BannerForm({ id }: { id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL);

  const {
    files: primaryFiles,
    inFlightUploads: primaryInFlight,
    loading: primaryLoading,
    addFiles: addPrimary,
    setFiles: setPrimaryFiles,
    progressByName: primaryProgress,
  } = useFileUploader(
    id ? `banner-${id}-primary` : undefined,
    formData.image ? [formData.image] : [],
    "banners/primary",
  );

  /* ------------------------------- load ---------------------------------- */
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await getBanner(id);
        if (!res.success || !res.data) {
          setError(res.error || "Failed to load banner");
          return;
        }
        const d: any = res.data;
        setFormData({
          name: d.name || "",
          eyebrow: d.eyebrow || "",
          body: d.body || "",
          heading: {
            title: d.heading?.title ?? "",
            subtitle: d.heading?.subtitle ?? "",
          },
          image: d.image || "",
          cta: {
            text: d.cta?.text ?? "",
            link: d.cta?.link ?? "",
            style: d.cta?.style ?? "none",
          },
        });
      } catch (err) {
        console.error("[BannerForm] load", err);
        setError("Failed to load banner");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ---------------------------------------------------------------------- */
  /* Sync uploader → formData, guarded against the initial-load race.       */
  /* ---------------------------------------------------------------------- */
  const lastSyncedImageRef = useRef<string | null>(null);
  useEffect(() => {
    const url = primaryFiles[0] || "";
    if (lastSyncedImageRef.current === url) return;
    lastSyncedImageRef.current = url;
    setFormData((p) => (p.image === url ? p : { ...p, image: url }));
  }, [primaryFiles]);

  /* ----------------------------- handlers -------------------------------- */
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const setHeading = (patch: Partial<FormState["heading"]>) =>
    setFormData((p) => ({ ...p, heading: { ...p.heading, ...patch } }));

  const setCta = (patch: Partial<FormState["cta"]>) =>
    setFormData((p) => ({ ...p, cta: { ...p.cta, ...patch } }));

  /* ------------------------------ submit --------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (!formData.name.trim()) return setError("Name is required");

      const hasAnyContent =
        Boolean(formData.heading.title.trim()) ||
        Boolean(formData.body.trim()) ||
        Boolean(formData.image.trim());

      if (!hasAnyContent) {
        return setError("Add at least a headline, body, or image.");
      }

      // CTA: link is required when a style is chosen; text is optional.
      if (formData.cta.style !== "none" && !formData.cta.link.trim()) {
        return setError("CTA requires a link");
      }

      const fd = new FormData();
      fd.append("name", formData.name.trim());
      fd.append("eyebrow", formData.eyebrow);
      fd.append("body", formData.body);
      fd.append("heading.title", formData.heading.title);
      fd.append("heading.subtitle", formData.heading.subtitle);
      fd.append("image", formData.image);
      fd.append("cta.text", formData.cta.text.trim());
      fd.append("cta.link", formData.cta.link.trim());
      fd.append("cta.style", formData.cta.style);

      const res = id ? await updateBanner(id, fd) : await createBanner(fd);

      if (res.success) {
        setSuccess(id ? "Banner updated" : "Banner created");
        setTimeout(() => {
          router.push(LIST_PATH);
          router.refresh();
        }, 900);
      } else {
        setError(res.message || "Failed to save banner");
      }
    } catch (err) {
      console.error("[BannerForm] submit", err);
      setError("Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl lg:px-8">
        {error && (
          <Notification
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}
        {success && (
          <Notification
            type="success"
            message={success}
            onClose={() => setSuccess(null)}
          />
        )}

        <header className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">
            {id ? "Edit banner" : "New banner"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A single hero unit — image, headline, body, and CTA. Blocks select
            one or more banners and choose how to lay them out.
          </p>
        </header>

        <div className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
          Banners are reusable across blocks. The <strong>banner</strong>{" "}
          display renders each banner as a full-width hero carousel; card
          displays (<strong>grid</strong>, <strong>carousel</strong>,{" "}
          <strong>list</strong>, <strong>hero</strong>) render each banner as a
          card.
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-24">
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>General</legend>

            <Field
              label="Name"
              required
              hint="Internal label. Not shown on the storefront."
            >
              <input
                type="text"
                className={inputCls}
                value={formData.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Winter Campaign 2025"
              />
            </Field>
          </fieldset>

          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Headline</legend>

            <Field label="Eyebrow" hint="Small overline above the headline.">
              <input
                type="text"
                className={inputCls}
                value={formData.eyebrow}
                onChange={(e) => setField("eyebrow", e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. NEW SEASON"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Headline">
                <input
                  type="text"
                  className={inputCls}
                  value={formData.heading.title}
                  onChange={(e) => setHeading({ title: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="e.g. The Winter Edit"
                />
              </Field>
              <Field label="Subheadline">
                <input
                  type="text"
                  className={inputCls}
                  value={formData.heading.subtitle}
                  onChange={(e) => setHeading({ subtitle: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="One-line summary"
                />
              </Field>
            </div>

            <Field
              label="Body"
              hint="Shown in the banner display. Up to 2 short paragraphs."
            >
              <textarea
                className={`${inputCls} min-h-[120px] resize-y`}
                value={formData.body}
                onChange={(e) => setField("body", e.target.value)}
                disabled={isSubmitting}
                placeholder="A short story…"
              />
            </Field>
          </fieldset>

          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Image</legend>

            <div>
              <label className={labelCls}>
                Primary image
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  — used as the banner background
                </span>
              </label>
              <FilesUploader
                files={primaryFiles}
                inFlightUploads={primaryInFlight}
                addFiles={addPrimary}
                onRemove={async (i) =>
                  setPrimaryFiles((prev) => prev.filter((_, k) => k !== i))
                }
                loading={primaryLoading}
                progressByName={primaryProgress}
                maxFiles={1}
              />
              <p className={helperCls}>
                One image per banner. Wide aspect (21:9 or 16:9) works best in
                the banner display.
              </p>
            </div>
          </fieldset>

          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Call to action</legend>

            <Field label="Style">
              <select
                className={inputCls}
                value={formData.cta.style}
                onChange={(e) =>
                  setCta({
                    style: e.target.value as FormState["cta"]["style"],
                  })
                }
                disabled={isSubmitting}
              >
                {CTA_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s === "none" ? "None" : s === "link" ? "Link" : "Button"}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Text"
                hint="Optional. Falls back to a default label."
              >
                <input
                  type="text"
                  className={inputCls}
                  value={formData.cta.text}
                  onChange={(e) => setCta({ text: e.target.value })}
                  disabled={isSubmitting || formData.cta.style === "none"}
                  placeholder="e.g. Explore"
                />
              </Field>
              <Field label="Link" required>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.cta.link}
                  onChange={(e) => setCta({ link: e.target.value })}
                  disabled={isSubmitting || formData.cta.style === "none"}
                  placeholder="/collections/winter"
                />
              </Field>
            </div>

            {formData.cta.style !== "none" && !formData.cta.link.trim() && (
              <p className="text-[12px] text-amber-700">
                A CTA needs a link to render. Add one or set style to None.
              </p>
            )}
          </fieldset>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push(LIST_PATH)}
              className="rounded-lg border border-border bg-background px-4 py-2.5 text-[14px] font-medium text-foreground transition hover:bg-muted"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  <span>Saving…</span>
                </>
              ) : id ? (
                "Update banner"
              ) : (
                "Create banner"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Primitives                                  */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className={helperCls}>{hint}</p>}
    </div>
  );
}
