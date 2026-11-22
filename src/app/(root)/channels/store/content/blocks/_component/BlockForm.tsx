// components/content/blocks/BlockForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import { BottomSheet } from "./BottomSheet";
import { RefPicker } from "./RefPicker";
import { ManualPicker, type ManualItem } from "./ManualPicker";
import {
  createBlock,
  updateBlock,
  getBlockById,
  getSourcePreview,
  type SourcePreviewData,
} from "@/lib/api/blocks";
import {
  BLOCK_LOCATIONS,
  BLOCK_DISPLAYS,
  BLOCK_THEMES,
  BLOCK_ALIGNMENTS,
  BLOCK_ANIMATIONS,
  BLOCK_SOURCE_TYPES,
  PROMOTION_MODES,
  CTA_STYLES,
  CARD_SHAPES,
  BLOCK_CARD_RATIOS,
  CARD_SIZES,
  TITLE_POSITIONS,
  IMAGE_POSITIONS,
  BLOCK_COLUMN_COUNTS,
  PROMOTION_BADGE_STYLES,
  COLLECTION_COUNT_POSITIONS,
  CARD_VARIANTS,
  MAX_BLOCK_LIMIT,
  type BlockLocation,
  type BlockSourceType,
  type PromotionMode,
} from "@/lib/content/constants";
import type { RegistryKey } from "@/lib/content/entityMetadata";
import { displayFieldsFor } from "@/lib/content/block-fields";

/* -------------------------------------------------------------------------- */
/*                                    Style                                   */
/* -------------------------------------------------------------------------- */

const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";
const fieldsetCls = "rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";

const LIST_PATH = "/channels/store/content/blocks";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const SOURCE_LABEL: Record<BlockSourceType, string> = {
  collection: "Collection",
  category: "Category",
  promotion: "Promotion",
  manual: "Manual items",
};

const SOURCE_HELP: Record<BlockSourceType, string> = {
  collection:
    "Pulls items from the selected collection — respects its own type (rule, manual, recommendation).",
  category: "Shows products that belong to the selected category.",
  promotion:
    "Renders items from the promotion's scope, or the promotion tile itself.",
  manual:
    "Hand-pick any combination of products, categories, collections, brands, promotions, or pages.",
};

const SOURCE_REF_TYPE: Record<
  Exclude<BlockSourceType, "manual">,
  RegistryKey
> = {
  collection: "Collection",
  category: "Category",
  promotion: "Promotion",
};

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface DisplayConfigState {
  theme: string;
  columns: number;
  gap: number;
  borderless: boolean;
  rounded: boolean;
  shadow: boolean;
  alignment: string;
  animation: string;
  cardShape: string;
  cardRatio: string;
  cardSize: string;
  titlePosition: string;
  imagePosition: string;
  backgroundColor: string;
  textColor: string;
}

interface SourceStylesState {
  promotionBadgeStyle: string;
  promotionShowCode: boolean;
  collectionShowItemCount: boolean;
  collectionCountPosition: string;
  manualCardSize: string;
  manualCardVariant: string;
  manualShowDescription: boolean;
}

interface FormState {
  name: string;
  status: "active" | "inactive";
  location: BlockLocation;
  display: string;
  order: number;
  limit: number;
  heading: { title: string; subtitle: string; showHeading: boolean };
  source: {
    type: BlockSourceType;
    collectionId: string;
    categoryId: string;
    promotionId: string;
    promotionMode: PromotionMode;
    items: ManualItem[];
  };
  displayConfig: DisplayConfigState;
  sourceStyles: SourceStylesState;
  cta: { text: string; link: string; style: string };
}

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: SourcePreviewData }
  | { status: "missing" }
  | { status: "error" };

const INITIAL: FormState = {
  name: "",
  status: "active",
  location: "Home",
  display: "grid",
  order: 0,
  limit: 12,
  heading: { title: "", subtitle: "", showHeading: true },
  source: {
    type: "collection",
    collectionId: "",
    categoryId: "",
    promotionId: "",
    promotionMode: "products",
    items: [],
  },
  displayConfig: {
    theme: "inherit",
    columns: 4,
    gap: 16,
    borderless: false,
    rounded: true,
    shadow: false,
    alignment: "start",
    animation: "fade",
    cardShape: "default",
    cardRatio: "1:1",
    cardSize: "md",
    titlePosition: "below",
    imagePosition: "center",
    backgroundColor: "",
    textColor: "",
  },
  sourceStyles: {
    promotionBadgeStyle: "default",
    promotionShowCode: true,
    collectionShowItemCount: false,
    collectionCountPosition: "subline",
    manualCardSize: "md",
    manualCardVariant: "card",
    manualShowDescription: true,
  },
  cta: { text: "", link: "", style: "none" },
};

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function BlockForm({ id }: { id?: string }) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(Boolean(id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [presentationOpen, setPresentationOpen] = useState(false);

  const sourceType = formData.source.type;

  /* ------------------------------- load ---------------------------------- */

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      const res = await getBlockById(id);
      if (cancelled) return;

      if (!res.success) {
        setError(res.error || "Failed to load block");
        setLoading(false);
        return;
      }

      const d = res.data ?? {};
      setFormData({
        name: d.name ?? "",
        status: d.status === "inactive" ? "inactive" : "active",
        location: (d.location ?? "Home") as BlockLocation,
        display: d.display ?? "grid",
        order: Number(d.order) || 0,
        limit: Number(d.limit) || 12,
        heading: { ...INITIAL.heading, ...(d.heading ?? {}) },
        source: {
          ...INITIAL.source,
          ...(d.source ?? {}),
          collectionId: d.source?.collectionId ?? "",
          categoryId: d.source?.categoryId ?? "",
          promotionId: d.source?.promotionId ?? "",
          items: Array.isArray(d.source?.items) ? d.source.items : [],
        },
        displayConfig: { ...INITIAL.displayConfig, ...(d.displayConfig ?? {}) },
        sourceStyles: { ...INITIAL.sourceStyles, ...(d.sourceStyles ?? {}) },
        cta: { ...INITIAL.cta, ...(d.cta ?? {}) },
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---------------------------- source preview --------------------------- */

  const currentSourceId =
    sourceType === "collection"
      ? formData.source.collectionId
      : sourceType === "category"
        ? formData.source.categoryId
        : sourceType === "promotion"
          ? formData.source.promotionId
          : "";

  useEffect(() => {
    if (!currentSourceId) {
      setPreview({ status: "idle" });
      return;
    }

    let cancelled = false;
    setPreview({ status: "loading" });

    (async () => {
      const res = await getSourcePreview(
        SOURCE_REF_TYPE[sourceType as Exclude<BlockSourceType, "manual">],
        currentSourceId,
      );
      if (cancelled) return;
      if (res.success) setPreview({ status: "ok", data: res.data });
      else setPreview(res.missing ? { status: "missing" } : { status: "error" });
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceType, currentSourceId]);

  useEffect(() => {
    setEditingSource(false);
  }, [
    sourceType,
    formData.source.collectionId,
    formData.source.categoryId,
    formData.source.promotionId,
  ]);

  /* ------------------------------ setters -------------------------------- */

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const setSource = (patch: Partial<FormState["source"]>) =>
    setFormData((p) => ({ ...p, source: { ...p.source, ...patch } }));

  const setDisplayConfig = (patch: Partial<DisplayConfigState>) =>
    setFormData((p) => ({
      ...p,
      displayConfig: { ...p.displayConfig, ...patch },
    }));

  const setSourceStyles = (patch: Partial<SourceStylesState>) =>
    setFormData((p) => ({
      ...p,
      sourceStyles: { ...p.sourceStyles, ...patch },
    }));

  const setCta = (patch: Partial<FormState["cta"]>) =>
    setFormData((p) => ({ ...p, cta: { ...p.cta, ...patch } }));

  const setHeading = (patch: Partial<FormState["heading"]>) =>
    setFormData((p) => ({ ...p, heading: { ...p.heading, ...patch } }));

  const handleSourceTypeChange = (nextType: BlockSourceType) => {
    setSource({ type: nextType });
    setEditingSource(false);
  };

  const handleSourceClear = () => {
    if (sourceType === "collection") setSource({ collectionId: "" });
    else if (sourceType === "category") setSource({ categoryId: "" });
    else if (sourceType === "promotion") setSource({ promotionId: "" });
    setEditingSource(false);
  };

  /* ------------------------------- submit -------------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        setError("Name is required");
        return;
      }

      if (!currentSourceId && sourceType !== "manual") {
        setError("Select a " + SOURCE_LABEL[sourceType].toLowerCase());
        return;
      }
      if (sourceType === "manual" && formData.source.items.length === 0) {
        setError("Add at least one item");
        return;
      }
      if (formData.cta.style !== "none" && !formData.cta.link.trim()) {
        setError("CTA requires a link");
        return;
      }

      const fd = new FormData();
      fd.append("name", formData.name.trim());
      fd.append("location", formData.location);
      fd.append("display", formData.display);
      fd.append("status", formData.status);
      fd.append("order", String(formData.order));
      fd.append("limit", String(formData.limit));
      fd.append("source.type", sourceType);

      if (sourceType === "collection") {
        fd.append("source.collectionId", formData.source.collectionId);
      } else if (sourceType === "category") {
        fd.append("source.categoryId", formData.source.categoryId);
      } else if (sourceType === "promotion") {
        fd.append("source.promotionId", formData.source.promotionId);
        fd.append("source.promotionMode", formData.source.promotionMode);
      } else if (sourceType === "manual") {
        fd.append("source.items", JSON.stringify(formData.source.items));
      }

      fd.append("heading.title", formData.heading.title);
      fd.append("heading.subtitle", formData.heading.subtitle);
      fd.append(
        "heading.showHeading",
        formData.heading.showHeading ? "true" : "false",
      );
      fd.append("cta.text", formData.cta.text.trim());
      fd.append("cta.link", formData.cta.link.trim());
      fd.append("cta.style", formData.cta.style);

      // Presentation is sent flat; the API normalises it into the
      // per-display/per-source shape and drops fields this block can't use.
      (Object.keys(formData.displayConfig) as Array<keyof DisplayConfigState>).forEach(
        (k) => fd.append("displayConfig." + k, String(formData.displayConfig[k])),
      );
      (Object.keys(formData.sourceStyles) as Array<keyof SourceStylesState>).forEach(
        (k) => fd.append("sourceStyles." + k, String(formData.sourceStyles[k])),
      );

      const res = id ? await updateBlock(id, fd) : await createBlock(fd);

      if (res.success) {
        setSuccess(id ? "Block updated" : "Block created");
        setTimeout(() => {
          router.push(LIST_PATH);
          router.refresh();
        }, 900);
      } else {
        setError(res.message || "Failed to save block");
      }
    } catch (err) {
      console.error("[BlockForm] submit", err);
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

  const dc = formData.displayConfig;
  const displayFields = displayFieldsFor(formData.display);
  const hasDisplayFields = displayFields.size > 0;
  const hasSurfaceFields = ["borderless", "rounded", "shadow"].some((k) =>
    displayFields.has(k),
  );
  const presentationSummary = [
    formData.display,
    displayFields.has("columns") ? dc.columns + " cols" : null,
    displayFields.has("cardSize") ? dc.cardSize + " cards" : null,
    dc.gap + "px gap",
    dc.theme + " theme",
    dc.backgroundColor ? "custom bg" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl lg:px-8">
        {error && (
          <Notification type="error" message={error} onClose={() => setError(null)} />
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
            {id ? "Edit block" : "New block"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Place a collection, category, promotion or manual list on a page.
            Only the presentation fields this display and source use are saved.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 pb-24">
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>General</legend>

            <Field label="Name" required>
              <input
                type="text"
                className={inputCls}
                value={formData.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Home — Winter campaign"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>

              <Field label="Location" required>
                <select
                  className={inputCls}
                  value={formData.location}
                  onChange={(e) =>
                    setField("location", e.target.value as BlockLocation)
                  }
                  disabled={isSubmitting}
                >
                  {BLOCK_LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Field label="Display">
                <select
                  className={inputCls}
                  value={formData.display}
                  onChange={(e) => setField("display", e.target.value)}
                  disabled={isSubmitting}
                >
                  {BLOCK_DISPLAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Order">
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

            {(
              <Field label="Item limit" hint={"Maximum " + MAX_BLOCK_LIMIT + " items."}>
                <input
                  type="number"
                  min={1}
                  max={MAX_BLOCK_LIMIT}
                  className={inputCls}
                  value={formData.limit}
                  onChange={(e) =>
                    setField(
                      "limit",
                      Math.min(
                        MAX_BLOCK_LIMIT,
                        Math.max(1, Number(e.target.value) || 12),
                      ),
                    )
                  }
                  disabled={isSubmitting}
                />
              </Field>
            )}
          </fieldset>

          {(
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Heading</legend>

              <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
                <input
                  type="checkbox"
                  checked={formData.heading.showHeading}
                  onChange={(e) => setHeading({ showHeading: e.target.checked })}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                />
                Show heading
              </label>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <Field label="Title">
                  <input
                    type="text"
                    className={inputCls}
                    value={formData.heading.title}
                    onChange={(e) => setHeading({ title: e.target.value })}
                    disabled={isSubmitting || !formData.heading.showHeading}
                    placeholder="e.g. Trending now"
                  />
                </Field>
                <Field label="Subtitle">
                  <input
                    type="text"
                    className={inputCls}
                    value={formData.heading.subtitle}
                    onChange={(e) => setHeading({ subtitle: e.target.value })}
                    disabled={isSubmitting || !formData.heading.showHeading}
                    placeholder="Optional short line"
                  />
                </Field>
              </div>
            </fieldset>
          )}

          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Source</legend>

            <Field label="Type" required hint={SOURCE_HELP[sourceType]}>
              <select
                className={inputCls}
                value={sourceType}
                onChange={(e) =>
                  handleSourceTypeChange(e.target.value as BlockSourceType)
                }
                disabled={isSubmitting}
              >
                {BLOCK_SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            {sourceType === "manual" ? (
              <Field label="Items">
                <ManualPicker
                  value={formData.source.items}
                  onChange={(items) => setSource({ items })}
                  disabled={isSubmitting}
                />
              </Field>
            ) : (
              <Field
                label={SOURCE_LABEL[sourceType]}
                required
              >
                {!currentSourceId || editingSource ? (
                  <RefPicker
                    label=""
                    refType={
                      SOURCE_REF_TYPE[
                        sourceType as "collection" | "category" | "promotion"
                      ]
                    }
                    value={currentSourceId}
                    onChange={(v) => {
                      if (sourceType === "collection") setSource({ collectionId: v });
                      else if (sourceType === "category") setSource({ categoryId: v });
                      else if (sourceType === "promotion") setSource({ promotionId: v });
                    }}
                    disabled={isSubmitting}
                    required
                  />
                ) : (
                  <SourcePreviewCard
                    state={preview}
                    sourceType={sourceType}
                    onEdit={() => setEditingSource(true)}
                    onRemove={handleSourceClear}
                  />
                )}
              </Field>
            )}

            {sourceType === "promotion" && (
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 border-t border-border pt-4">
                <Field label="Promotion mode">
                  <select
                    className={inputCls}
                    value={formData.source.promotionMode}
                    onChange={(e) =>
                      setSource({ promotionMode: e.target.value as PromotionMode })
                    }
                    disabled={isSubmitting}
                  >
                    {PROMOTION_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m === "products"
                          ? "Products in scope"
                          : "The promotion itself (tile)"}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Badge style">
                  <select
                    className={inputCls}
                    value={formData.sourceStyles.promotionBadgeStyle}
                    onChange={(e) =>
                      setSourceStyles({ promotionBadgeStyle: e.target.value })
                    }
                    disabled={isSubmitting}
                  >
                    {PROMOTION_BADGE_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>

                <label className="flex items-center gap-2.5 text-[14px] text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.sourceStyles.promotionShowCode}
                    onChange={(e) =>
                      setSourceStyles({ promotionShowCode: e.target.checked })
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  Show promotion code
                </label>
              </div>
            )}

            {sourceType === "collection" && (
              <div className="space-y-3 border-t border-border pt-4">
                <label className="flex items-center gap-2.5 text-[14px] text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.sourceStyles.collectionShowItemCount}
                    onChange={(e) =>
                      setSourceStyles({ collectionShowItemCount: e.target.checked })
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  Show item count
                </label>

                <Field label="Count position">
                  <select
                    className={inputCls}
                    value={formData.sourceStyles.collectionCountPosition}
                    onChange={(e) =>
                      setSourceStyles({ collectionCountPosition: e.target.value })
                    }
                    disabled={
                      isSubmitting || !formData.sourceStyles.collectionShowItemCount
                    }
                  >
                    {COLLECTION_COUNT_POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {sourceType === "manual" && (
              <div className="space-y-3 border-t border-border pt-4">
                <Field label="Card variant">
                  <select
                    className={inputCls}
                    value={formData.sourceStyles.manualCardVariant}
                    onChange={(e) =>
                      setSourceStyles({ manualCardVariant: e.target.value })
                    }
                    disabled={isSubmitting}
                  >
                    {CARD_VARIANTS.map((variant) => (
                      <option key={variant} value={variant}>
                        {variant}
                      </option>
                    ))}
                  </select>
                </Field>

                <label className="flex items-center gap-2.5 text-[14px] text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.sourceStyles.manualShowDescription}
                    onChange={(e) =>
                      setSourceStyles({ manualShowDescription: e.target.checked })
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  Show item description
                </label>
              </div>
            )}
          </fieldset>

          {(
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Call to action</legend>

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <Field label="Style">
                  <select
                    className={inputCls}
                    value={formData.cta.style}
                    onChange={(e) => setCta({ style: e.target.value })}
                    disabled={isSubmitting}
                  >
                    {CTA_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s === "none" ? "None" : s === "link" ? "Link" : "Button"}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Text" hint="Optional. Falls back to a default label.">
                  <input
                    type="text"
                    className={inputCls}
                    value={formData.cta.text}
                    onChange={(e) => setCta({ text: e.target.value })}
                    disabled={isSubmitting || formData.cta.style === "none"}
                    placeholder="e.g. See all"
                  />
                </Field>
              </div>

              <Field label="Link" hint="Required when a CTA style is selected.">
                <input
                  type="text"
                  className={inputCls}
                  value={formData.cta.link}
                  onChange={(e) => setCta({ link: e.target.value })}
                  disabled={isSubmitting || formData.cta.style === "none"}
                  placeholder="/collections/summer"
                />
              </Field>
            </fieldset>
          )}

          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Presentation</legend>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground">
                  Layout, cards & colors
                </p>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {presentationSummary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPresentationOpen(true)}
                disabled={isSubmitting}
                className="shrink-0 rounded-lg border border-border bg-background px-3.5 py-2 text-[13px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Edit
              </button>
            </div>
            <p className={helperCls}>
              Only options that this display and source can use are shown and
              saved.
            </p>
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
                "Update block"
              ) : (
                "Create block"
              )}
            </button>
          </div>
        </form>
      </div>

      <BottomSheet
        open={presentationOpen}
        onClose={() => setPresentationOpen(false)}
        title="Presentation"
      >
        <div className="space-y-5 sm:space-y-6">
          <section>
            <SheetLabel>Common</SheetLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Theme">
                <select
                  className={inputCls}
                  value={dc.theme}
                  onChange={(e) => setDisplayConfig({ theme: e.target.value })}
                >
                  {BLOCK_THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Spacing (px)">
                <input
                  type="number"
                  min={0}
                  max={64}
                  className={inputCls}
                  value={dc.gap}
                  onChange={(e) =>
                    setDisplayConfig({
                      gap: Math.min(64, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
              </Field>

              <Field label="Animation">
                <select
                  className={inputCls}
                  value={dc.animation}
                  onChange={(e) => setDisplayConfig({ animation: e.target.value })}
                >
                  {BLOCK_ANIMATIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-3 space-y-3">
              <ColorField
                label="Background"
                value={dc.backgroundColor}
                onChange={(v) => setDisplayConfig({ backgroundColor: v })}
              />
              <ColorField
                label="Text"
                value={dc.textColor}
                onChange={(v) => setDisplayConfig({ textColor: v })}
              />
              <p className={helperCls}>Leave empty to inherit the theme.</p>
            </div>
          </section>

          {hasDisplayFields && (
            <section>
              <SheetLabel>{"Layout · " + formData.display}</SheetLabel>
              <div className="grid grid-cols-2 gap-3">
                {displayFields.has("columns") && (
                  <Field label="Columns">
                    <select
                      className={inputCls}
                      value={dc.columns}
                      onChange={(e) =>
                        setDisplayConfig({ columns: Number(e.target.value) })
                      }
                    >
                      {BLOCK_COLUMN_COUNTS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {displayFields.has("alignment") && (
                  <Field label="Alignment">
                    <select
                      className={inputCls}
                      value={dc.alignment}
                      onChange={(e) =>
                        setDisplayConfig({ alignment: e.target.value })
                      }
                    >
                      {BLOCK_ALIGNMENTS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {displayFields.has("cardShape") && (
                  <Field label="Card shape">
                    <select
                      className={inputCls}
                      value={dc.cardShape}
                      onChange={(e) =>
                        setDisplayConfig({ cardShape: e.target.value })
                      }
                    >
                      {CARD_SHAPES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {displayFields.has("cardSize") && (
                  <Field label="Card size">
                    <select
                      className={inputCls}
                      value={dc.cardSize}
                      onChange={(e) =>
                        setDisplayConfig({ cardSize: e.target.value })
                      }
                    >
                      {CARD_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {displayFields.has("cardRatio") && (
                  <Field label="Aspect ratio">
                    <select
                      className={inputCls}
                      value={dc.cardRatio}
                      onChange={(e) =>
                        setDisplayConfig({ cardRatio: e.target.value })
                      }
                    >
                      {BLOCK_CARD_RATIOS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {displayFields.has("imagePosition") && (
                  <Field label="Image position">
                    <select
                      className={inputCls}
                      value={dc.imagePosition}
                      onChange={(e) =>
                        setDisplayConfig({ imagePosition: e.target.value })
                      }
                    >
                      {IMAGE_POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>


              {displayFields.has("titlePosition") && (
                <div className="mt-3">
                  <Field label="Title position">
                    <select
                      className={inputCls}
                      value={dc.titlePosition}
                      onChange={(e) =>
                        setDisplayConfig({ titlePosition: e.target.value })
                      }
                    >
                      {TITLE_POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos === "below"
                            ? "Below image"
                            : pos === "overlay-top"
                              ? "Overlay top"
                              : pos === "overlay-bottom"
                                ? "Overlay bottom"
                                : "Hidden"}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </section>
          )}

          {hasSurfaceFields && (
            <section>
              <SheetLabel>Surface</SheetLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {displayFields.has("borderless") && (
                  <ToggleCard
                    label="Borderless"
                    checked={dc.borderless}
                    onChange={(v) => setDisplayConfig({ borderless: v })}
                  />
                )}
                {displayFields.has("rounded") && (
                  <ToggleCard
                    label="Rounded"
                    checked={dc.rounded}
                    onChange={(v) => setDisplayConfig({ rounded: v })}
                  />
                )}
                {displayFields.has("shadow") && (
                  <ToggleCard
                    label="Shadow"
                    checked={dc.shadow}
                    onChange={(v) => setDisplayConfig({ shadow: v })}
                  />
                )}
              </div>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 -mx-3 mt-6 border-t border-border bg-background/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
          <button
            type="button"
            onClick={() => setPresentationOpen(false)}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
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

function SheetLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function ToggleCard({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-[14px] transition " +
        (checked
          ? "border-primary/50 bg-primary/5 text-foreground"
          : "border-border bg-background text-foreground/80 hover:bg-muted/40")
      }
    >
      <span>{label}</span>
      {checked && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-background"
          aria-label={"Pick " + label.toLowerCase() + " color"}
        />
        <input
          type="text"
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB or transparent"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded-lg border border-border bg-background px-2.5 py-2 text-[12px] text-foreground/70 hover:bg-muted"
            aria-label={"Clear " + label.toLowerCase() + " color"}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SourcePreviewCard({
  state,
  sourceType,
  onEdit,
  onRemove,
}: {
  state: PreviewState;
  sourceType: BlockSourceType;
  onEdit: () => void;
  onRemove: () => void;
}) {
  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted/70" />
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
        <p className="text-sm font-medium text-destructive">
          This {sourceType} no longer exists
        </p>
        <p className="mt-0.5 text-[12px] text-destructive/80">
          Pick a different one before saving.
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="mt-2 rounded-lg border border-destructive/30 bg-background px-2.5 py-1 text-[12px] font-medium text-destructive hover:bg-destructive/10"
        >
          Change
        </button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-sm text-foreground/80">
          Could not load preview for this selection.
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="mt-2 rounded-lg border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-muted"
        >
          Change
        </button>
      </div>
    );
  }

  const d = state.data;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-start gap-3 p-3">
        {d.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={d.imageUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg border border-border bg-muted/40 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 px-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
            {sourceType}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-foreground">
            {d.name}
          </p>
          {d.meta?.type && (
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {d.meta.type}
              {d.meta.targetType ? " · " + d.meta.targetType : ""}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Change
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-[12px] text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}