// components/content/editorials/EditorialForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import {
  createEditorial,
  updateEditorial,
  getEditorial,
} from "@/app/actions/editorial-content";
import { CTA_STYLES } from "@/lib/content/constants";

const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";
const fieldsetCls = "rounded-xl border border-border bg-card p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";

const LIST_PATH = "/channels/store/content/editorials";

interface FormState {
  name: string;
  eyebrow: string;
  body: string;
  heading: { title: string; subtitle: string };
  image: string;
  secondaryImage: string;
  images: string[];
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
  secondaryImage: "",
  images: [],
  cta: { text: "", link: "", style: "none" },
};

export default function EditorialForm({ id }: { id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL);

  // ---------------------------------------------------------------------
  // Stable initial-value arrays
  // ---------------------------------------------------------------------
  // The hook syncs `initialFiles` into its own state. Even with the
  // signature-based dependency (which fixes the loop), passing a fresh
  // array every render still triggers a JSON.stringify + effect call per
  // parent render — cheap but pointless. Memoizing on the actual value
  // keeps the reference stable when nothing has changed.
  const initialPrimary = useMemo(
    () => (formData.image ? [formData.image] : []),
    [formData.image],
  );
  const initialSecondary = useMemo(
    () => (formData.secondaryImage ? [formData.secondaryImage] : []),
    [formData.secondaryImage],
  );
  // formData.images already comes from the sync effect below, which only
  // updates it when content differs — so this reference is stable unless
  // the gallery actually changed.
  const initialCollection = formData.images;

  // ---------------------------------------------------------------------
  // Uploaders
  // ---------------------------------------------------------------------
  const {
    files: primaryFiles,
    inFlightUploads: primaryInFlight,
    loading: primaryLoading,
    addFiles: addPrimary,
    removeFile: removePrimary,
    progressByName: primaryProgress,
  } = useFileUploader(
    id ? `editorial-${id}-primary` : undefined,
    initialPrimary,
    "editorial/primary",
  );

  const {
    files: secondaryFiles,
    inFlightUploads: secondaryInFlight,
    loading: secondaryLoading,
    addFiles: addSecondary,
    removeFile: removeSecondary,
    progressByName: secondaryProgress,
  } = useFileUploader(
    id ? `editorial-${id}-secondary` : undefined,
    initialSecondary,
    "editorial/secondary",
  );

  const {
    files: collectionFiles,
    loading: collectionLoading,
    addFiles: addCollection,
    removeFile: removeCollection,
    progressByName: collectionProgress,
  } = useFileUploader(
    id ? `editorial-${id}-collection` : undefined,
    initialCollection,
    "editorial/collection",
  );

  // ---------------------------------------------------------------------
  // Load existing editorial
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await getEditorial(id);
        if (!res.success || !res.data) {
          setError(res.error || "Failed to load editorial");
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
          secondaryImage: d.secondaryImage || "",
          images: Array.isArray(d.images)
            ? d.images.filter((x: any) => typeof x === "string")
            : [],
          cta: {
            text: d.cta?.text ?? "",
            link: d.cta?.link ?? "",
            style: d.cta?.style ?? "none",
          },
        });
      } catch (err) {
        console.error("[EditorialForm] load", err);
        setError("Failed to load editorial");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ---------------------------------------------------------------------
  // Sync uploader files → formData (single source of truth)
  // ---------------------------------------------------------------------
  useEffect(() => {
    const url = primaryFiles[0] || "";
    if (url !== formData.image) {
      setFormData((p) => ({ ...p, image: url }));
    }
  }, [primaryFiles, formData.image]);

  useEffect(() => {
    const url = secondaryFiles[0] || "";
    if (url !== formData.secondaryImage) {
      setFormData((p) => ({ ...p, secondaryImage: url }));
    }
  }, [secondaryFiles, formData.secondaryImage]);

  useEffect(() => {
    if (
      collectionFiles.length !== formData.images.length ||
      collectionFiles.some((u, i) => u !== formData.images[i])
    ) {
      setFormData((p) => ({ ...p, images: collectionFiles }));
    }
  }, [collectionFiles, formData.images]);

  // ---------------------------------------------------------------------
  // Field helpers
  // ---------------------------------------------------------------------
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const setHeading = (patch: Partial<FormState["heading"]>) =>
    setFormData((p) => ({ ...p, heading: { ...p.heading, ...patch } }));

  const setCta = (patch: Partial<FormState["cta"]>) =>
    setFormData((p) => ({ ...p, cta: { ...p.cta, ...patch } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (!formData.name.trim()) return setError("Name is required");

      const hasAnyContent =
        Boolean(formData.heading.title.trim()) ||
        Boolean(formData.body.trim()) ||
        Boolean(formData.image.trim()) ||
        formData.images.length > 0;

      if (!hasAnyContent) {
        return setError(
          "Add at least a headline, body, primary image, or gallery image.",
        );
      }

      if (
        formData.cta.style !== "none" &&
        (!formData.cta.text.trim() || !formData.cta.link.trim())
      ) {
        return setError("CTA requires both text and link");
      }

      const fd = new FormData();
      fd.append("name", formData.name.trim());
      fd.append("eyebrow", formData.eyebrow);
      fd.append("body", formData.body);
      fd.append("heading.title", formData.heading.title);
      fd.append("heading.subtitle", formData.heading.subtitle);
      fd.append("image", formData.image);
      fd.append("secondaryImage", formData.secondaryImage);
      fd.append("images", JSON.stringify(formData.images));
      fd.append("cta.text", formData.cta.text.trim());
      fd.append("cta.link", formData.cta.link.trim());
      fd.append("cta.style", formData.cta.style);

      const res = id
        ? await updateEditorial(id, fd)
        : await createEditorial(fd);

      if (res.success) {
        setSuccess(id ? "Editorial updated" : "Editorial created");
        setTimeout(() => {
          router.push(LIST_PATH);
          router.refresh();
        }, 900);
      } else {
        setError(res.message || "Failed to save editorial");
      }
    } catch (err) {
      console.error("[EditorialForm] submit", err);
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
            {id ? "Edit editorial" : "New editorial"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable content — reference it from any number of blocks.
          </p>
        </header>

        <div className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
          Editorial content is display-agnostic. Blocks decide how to present it
          — as a grid, carousel, list, hero, banner, or feature. Fill whichever
          image slots your blocks will use; empty slots are ignored.
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
                placeholder="e.g. Winter Story 2025"
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
              hint="Story copy for feature displays. Optional intro for card displays. Blank line splits paragraphs."
            >
              <textarea
                className={`${inputCls} min-h-[120px] resize-y`}
                value={formData.body}
                onChange={(e) => setField("body", e.target.value)}
                disabled={isSubmitting}
                placeholder="Write the story…"
              />
            </Field>
          </fieldset>

          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Images</legend>

            <p className={helperCls}>
              Fill whichever slots your blocks will use:
            </p>

            <div>
              <label className={labelCls}>
                Primary image
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  — used by feature and banner displays
                </span>
              </label>
              <FilesUploader
                files={primaryFiles}
                inFlightUploads={primaryInFlight}
                addFiles={addPrimary}
                onRemove={removePrimary}
                loading={primaryLoading}
                progressByName={primaryProgress}
              />
            </div>

            <div>
              <label className={labelCls}>
                Secondary image
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  — used by the duo display
                </span>
              </label>
              <FilesUploader
                files={secondaryFiles}
                inFlightUploads={secondaryInFlight}
                addFiles={addSecondary}
                onRemove={removeSecondary}
                loading={secondaryLoading}
                progressByName={secondaryProgress}
              />
            </div>

            <div>
              <label className={labelCls}>
                Gallery
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  ({collectionFiles.length}) — used by grid, carousel, list, and
                  hero displays
                </span>
              </label>
              <FilesUploader
                files={collectionFiles}
                loading={collectionLoading}
                addFiles={addCollection}
                onRemove={removeCollection}
                progressByName={collectionProgress}
              />
              <p className={helperCls}>
                Upload multiple images at once. The block chooses ratio, size,
                spacing, and display.
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
              <Field label="Text">
                <input
                  type="text"
                  className={inputCls}
                  value={formData.cta.text}
                  onChange={(e) => setCta({ text: e.target.value })}
                  disabled={isSubmitting || formData.cta.style === "none"}
                  placeholder="e.g. Explore"
                />
              </Field>
              <Field label="Link">
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
                "Update editorial"
              ) : (
                "Create editorial"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
