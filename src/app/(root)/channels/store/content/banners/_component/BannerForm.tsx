// components/content/banners/BannerForm.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import { createBanner, updateBanner, getBanner } from "@/lib/api/banner";
import {
  BANNER_ALIGNS,
  BANNER_CARD_SIZES,
  BANNER_RATIOS,
  BANNER_OVERLAYS,
  BANNER_POSITIONS,
  BANNER_STATUSES,
  BANNER_THEMES,
  BANNER_TYPES,
  CTA_STYLES,
  type BannerType,
} from "@/lib/content/constants";

/* ------------------------------- style tokens ------------------------------ */

const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";
const fieldsetCls = "rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";

const LIST_PATH = "/channels/store/content/banners";

/* --------------------------------- types ---------------------------------- */

interface FormState {
  type: BannerType;
  name: string;
  status: "active" | "inactive";
  order: number;
  startAt: string;
  endAt: string;

  eyebrow: string;
  body: string;
  heading: { title: string; subtitle: string };

  image: string;
  imageAlt: string;
  videoUrl: string;
  html: string;

  link: string;
  openInNewTab: boolean;

  overlay: string;
  ratio: string;
  size: string;
  align: string;
  position: string;
  theme: string;

  cta: {
    text: string;
    link: string;
    style: (typeof CTA_STYLES)[number];
  };
}

const INITIAL: FormState = {
  type: "image",
  name: "",
  status: "active",
  order: 0,
  startAt: "",
  endAt: "",

  eyebrow: "",
  body: "",
  heading: { title: "", subtitle: "" },

  image: "",
  imageAlt: "",
  videoUrl: "",
  html: "",

  link: "",
  openInNewTab: false,

  overlay: "gradient",
  ratio: "1:1",
  size: "md",
  align: "left",
  position: "center",
  theme: "light",

  cta: { text: "", link: "", style: "none" },
};

const TYPE_META: Record<
  BannerType,
  { label: string; description: string }
> = {
  image: {
    label: "Image",
    description: "A background image with optional text and a call to action.",
  },
  video: {
    label: "Video",
    description: "A looping background video with the same text overlay.",
  },
  html: {
    label: "Custom HTML",
    description: "Full control: your own markup, embeds or third-party players.",
  },
  compact: {
    label: "Compact card",
    description:
      "A small tile with a logo and a title — ideal for category shortcuts.",
  },
};

/** ISO string -> value for <input type="datetime-local">. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

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
    id ? "banner-" + id + "-primary" : undefined,
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
          type: (d.type ?? "image") as BannerType,
          name: d.name || "",
          status: d.status === "inactive" ? "inactive" : "active",
          order: Number(d.order) || 0,
          startAt: toLocalInput(d.startAt),
          endAt: toLocalInput(d.endAt),

          eyebrow: d.eyebrow || "",
          body: d.body || "",
          heading: {
            title: d.heading?.title ?? "",
            subtitle: d.heading?.subtitle ?? "",
          },

          image: d.image || "",
          imageAlt: d.imageAlt || "",
          videoUrl: d.videoUrl || "",
          html: d.html || "",

          link: d.link || "",
          openInNewTab: Boolean(d.openInNewTab),

          overlay: d.overlay || "gradient",
          ratio: d.ratio || "1:1",
          size: d.size || "md",
          align: d.align || "left",
          position: d.position || "center",
          theme: d.theme || "light",

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

  /* -------------------- sync uploader -> formData.image ------------------- */
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
      if (!formData.name.trim()) {
        setError("Name is required");
        return;
      }

      if (formData.type === "image" && !formData.image) {
        setError("Image banners need a background image.");
        return;
      }
      if (formData.type === "video" && !formData.videoUrl.trim()) {
        setError("Video banners need a video URL.");
        return;
      }
      if (formData.type === "html" && !formData.html.trim()) {
        setError("HTML banners need their markup.");
        return;
      }
      if (formData.type === "compact" && !formData.image) {
        setError("Compact banners need a logo.");
        return;
      }
      if (formData.type === "compact" && !formData.heading.title.trim()) {
        setError("Compact banners need a title.");
        return;
      }

      if (formData.cta.style !== "none" && !formData.cta.link.trim()) {
        setError("CTA requires a link");
        return;
      }

      if (
        formData.startAt &&
        formData.endAt &&
        new Date(formData.endAt) <= new Date(formData.startAt)
      ) {
        setError("The schedule ends before it starts.");
        return;
      }

      const fd = new FormData();
      fd.append("type", formData.type);
      fd.append("name", formData.name.trim());
      fd.append("status", formData.status);
      fd.append("order", String(formData.order));
      if (formData.startAt) fd.append("startAt", formData.startAt);
      if (formData.endAt) fd.append("endAt", formData.endAt);

      fd.append("eyebrow", formData.eyebrow);
      fd.append("body", formData.body);
      fd.append("heading.title", formData.heading.title);
      fd.append("heading.subtitle", formData.heading.subtitle);

      fd.append("image", formData.image);
      fd.append("imageAlt", formData.imageAlt);
      fd.append("videoUrl", formData.videoUrl);
      fd.append("html", formData.html);

      fd.append("link", formData.link.trim());
      fd.append("openInNewTab", formData.openInNewTab ? "true" : "false");

      fd.append("overlay", formData.overlay);
      fd.append("ratio", formData.ratio);
      fd.append("size", formData.size);
      fd.append("align", formData.align);
      fd.append("position", formData.position);
      fd.append("theme", formData.theme);

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

  const isCompact = formData.type === "compact";
  const showsText = formData.type === "image" || formData.type === "video";
  const showsMedia = showsText || isCompact;

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl lg:px-8">
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
          <h1 className="text-lg font-semibold sm:text-xl text-foreground">
            {id ? "Edit banner" : "New banner"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose what kind of banner this is, then fill in only the settings
            that type uses.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 pb-28">
          {/* ------------------------------ type ------------------------------ */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Banner type</legend>

            <div className="grid gap-3 sm:grid-cols-3">
              {BANNER_TYPES.map((t) => {
                const selected = formData.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setField("type", t)}
                    disabled={isSubmitting}
                    aria-pressed={selected}
                    className={
                      "rounded-lg border px-3 py-3 sm:px-4 text-left transition " +
                      (selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted/40")
                    }
                  >
                    <span className="block text-[14px] font-semibold text-foreground">
                      {TYPE_META[t].label}
                    </span>
                    <span className="mt-1 block text-[12px] leading-snug text-muted-foreground">
                      {TYPE_META[t].description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ---------------------------- general ----------------------------- */}
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

            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <Field label="Status">
                <select
                  className={inputCls}
                  value={formData.status}
                  onChange={(e) =>
                    setField(
                      "status",
                      e.target.value === "inactive" ? "inactive" : "active",
                    )
                  }
                  disabled={isSubmitting}
                >
                  {BANNER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Order" hint="Lower first in pickers.">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={formData.order}
                  onChange={(e) =>
                    setField("order", Math.max(0, Number(e.target.value) || 0))
                  }
                  disabled={isSubmitting}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Field label="Starts" hint="Leave empty to start immediately.">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={formData.startAt}
                  onChange={(e) => setField("startAt", e.target.value)}
                  disabled={isSubmitting}
                />
              </Field>
              <Field label="Ends" hint="Leave empty to never expire.">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={formData.endAt}
                  onChange={(e) => setField("endAt", e.target.value)}
                  disabled={isSubmitting}
                />
              </Field>
            </div>
          </fieldset>

          {/* ----------------------------- media ------------------------------ */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>
              {isCompact
                ? "Logo"
                : formData.type === "image"
                  ? "Image"
                  : formData.type === "video"
                    ? "Video"
                    : "HTML"}
            </legend>

            {(formData.type === "image" || isCompact) && (
              <>
                <div>
                  <label className={labelCls}>
                    {isCompact ? "Logo image" : "Background image"}
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
                    One wide image per banner (16:9 or 21:9 works best).
                  </p>
                </div>

                <Field label="Alt text" hint="For screen readers and SEO.">
                  <input
                    type="text"
                    className={inputCls}
                    value={formData.imageAlt}
                    onChange={(e) => setField("imageAlt", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. Model wearing the winter coat"
                  />
                </Field>
              </>
            )}

            {formData.type === "video" && (
              <>
                <Field
                  label="Video URL"
                  required
                  hint="MP4 or WebM. It loops silently in the background."
                >
                  <input
                    type="url"
                    className={inputCls}
                    value={formData.videoUrl}
                    onChange={(e) => setField("videoUrl", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="https://cdn.example.com/banner.mp4"
                  />
                </Field>

                <div>
                  <label className={labelCls}>Poster image (optional)</label>
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
                    Shown while the video loads and on slow connections.
                  </p>
                </div>
              </>
            )}

            {formData.type === "html" && (
              <Field
                label="HTML"
                required
                hint="Rendered as-is inside the banner. You can use images, iframes or embeds."
              >
                <textarea
                  className={inputCls + " min-h-[220px] font-mono text-[13px]"}
                  value={formData.html}
                  onChange={(e) => setField("html", e.target.value)}
                  disabled={isSubmitting}
                  placeholder="<iframe src=… />"
                />
              </Field>
            )}
          </fieldset>

          {/* ----------------------------- content ---------------------------- */}
          {isCompact && (
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Card content</legend>

              <Field label="Title" required>
                <input
                  type="text"
                  className={inputCls}
                  value={formData.heading.title}
                  onChange={(e) => setHeading({ title: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="e.g. Electronics"
                />
              </Field>

              <Field label="Subtitle" hint="Optional second line.">
                <input
                  type="text"
                  className={inputCls}
                  value={formData.heading.subtitle}
                  onChange={(e) => setHeading({ subtitle: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="e.g. 120 products"
                />
              </Field>
            </fieldset>
          )}

          {showsText && (
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Content</legend>

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

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
                hint="Up to two short paragraphs, separated by a blank line."
              >
                <textarea
                  className={inputCls + " min-h-[110px] resize-y"}
                  value={formData.body}
                  onChange={(e) => setField("body", e.target.value)}
                  disabled={isSubmitting}
                  placeholder="A short story…"
                />
              </Field>
            </fieldset>
          )}

          {/* ------------------------------ layout ---------------------------- */}
          {isCompact && (
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Layout</legend>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <Field label="Card theme">
                  <select
                    className={inputCls}
                    value={formData.theme}
                    onChange={(e) => setField("theme", e.target.value)}
                    disabled={isSubmitting}
                  >
                    {BANNER_THEMES.map((t) => (
                      <option key={t} value={t}>
                        {t === "light" ? "Light card" : "Dark card"}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Card ratio">
                  <select
                    className={inputCls}
                    value={formData.ratio}
                    onChange={(e) => setField("ratio", e.target.value)}
                    disabled={isSubmitting}
                  >
                    {BANNER_RATIOS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Card size">
                  <select
                    className={inputCls}
                    value={formData.size}
                    onChange={(e) => setField("size", e.target.value)}
                    disabled={isSubmitting}
                  >
                    {BANNER_CARD_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Logo & title arrangement">
                  <select
                    className={inputCls}
                    value={formData.align}
                    onChange={(e) => setField("align", e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="center">Centered (logo above title)</option>
                    <option value="left">Logo left, title right</option>
                    <option value="right">Title left, logo right</option>
                  </select>
                </Field>
              </div>
            </fieldset>
          )}

          {showsText && (
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Layout</legend>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <Field label="Overlay">
                  <select
                    className={inputCls}
                    value={formData.overlay}
                    onChange={(e) => setField("overlay", e.target.value)}
                    disabled={isSubmitting}
                  >
                    {BANNER_OVERLAYS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Text theme">
                  <select
                    className={inputCls}
                    value={formData.theme}
                    onChange={(e) => setField("theme", e.target.value)}
                    disabled={isSubmitting}
                  >
                    {BANNER_THEMES.map((t) => (
                      <option key={t} value={t}>
                        {t === "light" ? "Light text" : "Dark text"}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Horizontal alignment">
                  <select
                    className={inputCls}
                    value={formData.align}
                    onChange={(e) => setField("align", e.target.value)}
                    disabled={isSubmitting}
                  >
                    {BANNER_ALIGNS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Vertical position">
                  <select
                    className={inputCls}
                    value={formData.position}
                    onChange={(e) => setField("position", e.target.value)}
                    disabled={isSubmitting}
                  >
                    {BANNER_POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </fieldset>
          )}

          {/* ------------------------------- link ----------------------------- */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Link & call to action</legend>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Field
                label="Whole-banner link"
                hint="Optional. Ignored when a CTA button is shown."
              >
                <input
                  type="text"
                  className={inputCls}
                  value={formData.link}
                  onChange={(e) => setField("link", e.target.value)}
                  disabled={isSubmitting}
                  placeholder="/collections/winter"
                />
              </Field>

              <label className="flex items-end gap-2.5 pb-2.5 text-[14px] text-foreground">
                <input
                  type="checkbox"
                  checked={formData.openInNewTab}
                  onChange={(e) => setField("openInNewTab", e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                Open links in a new tab
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Field label="CTA style">
                <select
                  className={inputCls}
                  value={formData.cta.style}
                  onChange={(e) =>
                    setCta({ style: e.target.value as FormState["cta"]["style"] })
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

              <Field label="CTA label" hint="Optional. Defaults to Learn more.">
                <input
                  type="text"
                  className={inputCls}
                  value={formData.cta.text}
                  onChange={(e) => setCta({ text: e.target.value })}
                  disabled={isSubmitting || formData.cta.style === "none"}
                  placeholder="e.g. Explore"
                />
              </Field>
            </div>

            <Field label="CTA link">
              <input
                type="text"
                className={inputCls}
                value={formData.cta.link}
                onChange={(e) => setCta({ link: e.target.value })}
                disabled={isSubmitting || formData.cta.style === "none"}
                placeholder="/collections/winter"
              />
            </Field>
          </fieldset>

          {/* ----------------------------- preview ---------------------------- */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Preview</legend>
            <BannerPreviewCard banner={formData} />
          </fieldset>

          <div className="sticky bottom-0 -mx-3 flex flex-col-reverse gap-3 sm:-mx-6 sm:flex-row sm:items-center sm:justify-end border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:px-6 lg:-mx-8 lg:px-8">
            <button
              type="button"
              onClick={() => router.push(LIST_PATH)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-[14px] font-medium text-foreground transition hover:bg-muted sm:w-auto"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
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
/*                                  Preview                                   */
/* -------------------------------------------------------------------------- */

function BannerPreviewCard({ banner }: { banner: FormState }) {
  const overlayCls: Record<string, string> = {
    none: "",
    light: "bg-white/30",
    dark: "bg-black/55",
    gradient:
      "bg-gradient-to-r from-black/75 via-black/45 to-transparent",
  };
  const alignCls: Record<string, string> = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
  };
  const posCls: Record<string, string> = {
    top: "justify-start",
    center: "justify-center",
    bottom: "justify-end",
  };
  const lightText = banner.theme !== "dark";
  const textCls = lightText ? "text-white" : "text-neutral-900";

  if (banner.type === "compact") {
    const isCenter = banner.align === "center";
    const dark = banner.theme === "dark";
    const ratioClsMap: Record<string, string> = {
      "1:1": "aspect-square",
      "4:3": "aspect-[4/3]",
      "3:2": "aspect-[3/2]",
      "16:9": "aspect-[16/9]",
    };
    const sizeMap: Record<string, { pad: string; logo: string }> = {
      xs: { pad: "gap-1.5 px-2 py-2", logo: "h-6 w-6" },
      sm: { pad: "gap-2 px-3 py-3", logo: "h-8 w-8" },
      md: { pad: "gap-2.5 px-4 py-4", logo: "h-11 w-11" },
      lg: { pad: "gap-3 px-5 py-5", logo: "h-14 w-14" },
    };
    const s = sizeMap[banner.size] ?? sizeMap.md;
    return (
      <div className="flex max-w-[240px] items-stretch">
        <div
          className={
            "flex w-full " +
            s.pad +
            " " +
            (isCenter
              ? "flex-col items-center justify-center text-center " +
                (ratioClsMap[banner.ratio] ?? "aspect-square")
              : banner.align === "right"
                ? "flex-row-reverse items-center text-right " +
                  (ratioClsMap[banner.ratio] ?? "")
                : "flex-row items-center text-left " +
                  (ratioClsMap[banner.ratio] ?? "")) +
            " rounded-xl border border-border " +
            (dark ? "bg-neutral-900 text-white" : "bg-white text-neutral-900")
          }
        >
          {banner.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner.image}
              alt=""
              className={"shrink-0 object-contain " + s.logo}
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-muted/40" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">
              {banner.heading.title || "Card title"}
            </span>
            {banner.heading.subtitle && (
              <span className="mt-0.5 block truncate text-[11px] opacity-70">
                {banner.heading.subtitle}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  if (banner.type === "html") {
    return (
      <div
        className="aspect-[21/9] w-full overflow-hidden rounded-xl border border-border bg-neutral-950 [&_iframe]:h-full [&_iframe]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
        dangerouslySetInnerHTML={{ __html: banner.html }}
      />
    );
  }

  return (
    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border bg-neutral-900">
      {banner.type === "video" && banner.videoUrl ? (
        <video
          className="h-full w-full object-cover"
          src={banner.videoUrl}
          poster={banner.image || undefined}
          muted
          loop
          autoPlay
          playsInline
        />
      ) : banner.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={banner.image}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[12px] text-white/50">
          Add an image to see the preview
        </div>
      )}

      <div className={"absolute inset-0 " + (overlayCls[banner.overlay] ?? "")} />

      <div
        className={
          "absolute inset-0 flex flex-col p-4 sm:p-5 " +
          (posCls[banner.position] ?? "justify-center")
        }
      >
        <div
          className={
            "max-w-[70%] " + (alignCls[banner.align] ?? "items-start text-left")
          }
        >
          <div className={textCls}>
            {banner.eyebrow && (
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] opacity-70">
                {banner.eyebrow}
              </p>
            )}
            {banner.heading.title && (
              <p className="text-lg font-bold leading-tight">
                {banner.heading.title}
              </p>
            )}
            {banner.heading.subtitle && (
              <p className="mt-1 text-[11px] opacity-80">
                {banner.heading.subtitle}
              </p>
            )}
            {banner.body && (
              <p className="mt-1 line-clamp-2 text-[10px] opacity-70">
                {banner.body}
              </p>
            )}
            {banner.cta.style !== "none" && banner.cta.link && (
              <span
                className={
                  "mt-2 inline-block rounded-md px-2 py-1 text-[10px] font-semibold " +
                  (banner.cta.style === "button"
                    ? "bg-primary text-primary-foreground"
                    : "underline")
                }
              >
                {banner.cta.text || "Learn more"}
              </span>
            )}
          </div>
        </div>
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