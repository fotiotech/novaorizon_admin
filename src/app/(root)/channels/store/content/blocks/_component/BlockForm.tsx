// components/content/blocks/BlockForm.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import { RefPicker } from "./RefPicker";
import { ManualPicker, type ManualItem } from "./ManualPicker";
import {
  createBlock,
  updateBlock,
  getBlockById,
  getSourcePreview,
  type SourcePreviewData,
} from "@/app/actions/blocks";
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
  BLOCK_COLUMN_COUNTS,
  PROMOTION_BADGE_STYLES,
  COLLECTION_COUNT_POSITIONS,
  CARD_SIZES,
  CARD_VARIANTS,
  MAX_BLOCK_LIMIT,
  type BlockLocation,
  type BlockSourceType,
  type PromotionMode,
} from "@/lib/content/constants";
import type { RegistryKey } from "@/lib/content/entityMetadata";

/* ------------------------------- style tokens ------------------------------ */

const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";
const fieldsetCls = "rounded-xl border border-border bg-card p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";

const LIST_PATH = "/channels/store/content/blocks";

/* ----------------------------- source labels ------------------------------- */

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
    "Renders items from the promotion's scope, or the promotion tile itself (for banners).",
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

/* --------------------------------- types ---------------------------------- */

interface FormState {
  name: string;
  location: BlockLocation;
  display: string;
  status: "active" | "inactive";
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
  displayConfig: {
    theme: string;
    columns: number;
    gap: number;
    borderless: boolean;
    rounded: boolean;
    shadow: boolean;
    alignment: string;
    animation: string;
    cardShape: string;
  };
  sourceStyles: {
    promotionBadgeStyle: string;
    promotionShowCode: boolean;
    collectionShowItemCount: boolean;
    collectionCountPosition: string;
    manualCardSize: string;
    manualCardVariant: string;
    manualShowDescription: boolean;
  };
  cta: {
    text: string;
    link: string;
    style: (typeof CTA_STYLES)[number];
  };
}

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: SourcePreviewData }
  | { status: "missing" }
  | { status: "error" };

const INITIAL: FormState = {
  name: "",
  location: "Home",
  display: "grid",
  status: "active",
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

/* ---------------------------------- form ---------------------------------- */

export default function BlockForm({ id }: { id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL);

  const [editingSource, setEditingSource] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });

  const currentSourceId =
    formData.source.type === "collection"
      ? formData.source.collectionId
      : formData.source.type === "category"
        ? formData.source.categoryId
        : formData.source.type === "promotion"
          ? formData.source.promotionId
          : "";

  const hasSelection = currentSourceId !== "";

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await getBlockById(id);
        if (!res.success || !res.data) {
          setError(res.error || "Failed to load block");
          return;
        }
        const d: any = res.data;
        setFormData({
          name: d.name || "",
          location: d.location || "Home",
          display: d.display || "grid",
          status: d.status === "inactive" ? "inactive" : "active",
          order: d.order ?? 0,
          limit: d.limit ?? 12,
          heading: {
            title: d.heading?.title ?? "",
            subtitle: d.heading?.subtitle ?? "",
            showHeading: d.heading?.showHeading !== false,
          },
          source: {
            type: d.source?.type || "collection",
            collectionId: d.source?.collectionId
              ? String(d.source.collectionId)
              : "",
            categoryId: d.source?.categoryId ? String(d.source.categoryId) : "",
            promotionId: d.source?.promotionId
              ? String(d.source.promotionId)
              : "",
            promotionMode: d.source?.promotionMode || "products",
            items: Array.isArray(d.source?.items)
              ? d.source.items.map((it: any) => ({
                  refModel: it.refModel,
                  refId: String(it.refId),
                }))
              : [],
          },
          displayConfig: {
            ...INITIAL.displayConfig,
            ...(d.displayConfig ?? {}),
          },
          sourceStyles: { ...INITIAL.sourceStyles, ...(d.sourceStyles ?? {}) },
          cta: {
            text: d.cta?.text ?? "",
            link: d.cta?.link ?? "",
            style: d.cta?.style ?? "none",
          },
        });
      } catch (err) {
        console.error("[BlockForm] load", err);
        setError("Failed to load block");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (formData.source.type === "manual" || !currentSourceId) {
      setPreview({ status: "idle" });
      return;
    }
    let cancelled = false;
    setPreview({ status: "loading" });
    getSourcePreview(formData.source.type, currentSourceId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) setPreview({ status: "loaded", data: res.data });
        else if ("missing" in res && res.missing)
          setPreview({ status: "missing" });
        else setPreview({ status: "error" });
      })
      .catch(() => {
        if (!cancelled) setPreview({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [formData.source.type, currentSourceId]);

  useEffect(() => {
    setEditingSource(false);
  }, [
    formData.source.type,
    formData.source.collectionId,
    formData.source.categoryId,
    formData.source.promotionId,
  ]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const setSource = (patch: Partial<FormState["source"]>) =>
    setFormData((p) => ({ ...p, source: { ...p.source, ...patch } }));

  const setDisplayConfig = (patch: Partial<FormState["displayConfig"]>) =>
    setFormData((p) => ({
      ...p,
      displayConfig: { ...p.displayConfig, ...patch },
    }));

  const setSourceStyles = (patch: Partial<FormState["sourceStyles"]>) =>
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
    if (formData.source.type === "collection") setSource({ collectionId: "" });
    else if (formData.source.type === "category") setSource({ categoryId: "" });
    else if (formData.source.type === "promotion")
      setSource({ promotionId: "" });
    setEditingSource(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (!formData.name.trim()) return setError("Name is required");
      if (formData.source.type !== "manual" && !hasSelection) {
        return setError(
          `Select a ${SOURCE_LABEL[formData.source.type].toLowerCase()}`,
        );
      }
      if (
        formData.source.type === "manual" &&
        formData.source.items.length === 0
      )
        return setError("Add at least one item");
      if (
        formData.cta.style !== "none" &&
        (!formData.cta.text.trim() || !formData.cta.link.trim())
      )
        return setError("CTA requires both text and link");

      const fd = new FormData();
      fd.append("name", formData.name.trim());
      fd.append("location", formData.location);
      fd.append("display", formData.display);
      fd.append("status", formData.status);
      fd.append("order", String(formData.order));
      fd.append("limit", String(formData.limit));

      fd.append("source.type", formData.source.type);
      if (formData.source.type === "collection")
        fd.append("source.collectionId", formData.source.collectionId);
      if (formData.source.type === "category")
        fd.append("source.categoryId", formData.source.categoryId);
      if (formData.source.type === "promotion") {
        fd.append("source.promotionId", formData.source.promotionId);
        fd.append("source.promotionMode", formData.source.promotionMode);
      }
      if (formData.source.type === "manual")
        fd.append("source.items", JSON.stringify(formData.source.items));

      fd.append("heading.title", formData.heading.title);
      fd.append("heading.subtitle", formData.heading.subtitle);
      fd.append(
        "heading.showHeading",
        formData.heading.showHeading ? "true" : "false",
      );

      (
        Object.keys(
          formData.displayConfig,
        ) as (keyof typeof formData.displayConfig)[]
      ).forEach((k) =>
        fd.append(`displayConfig.${k}`, String(formData.displayConfig[k])),
      );
      (
        Object.keys(
          formData.sourceStyles,
        ) as (keyof typeof formData.sourceStyles)[]
      ).forEach((k) =>
        fd.append(`sourceStyles.${k}`, String(formData.sourceStyles[k])),
      );

      fd.append("cta.text", formData.cta.text.trim());
      fd.append("cta.link", formData.cta.link.trim());
      fd.append("cta.style", formData.cta.style);

      const res = id ? await updateBlock(id, fd) : await createBlock(fd);

      if (res.success) {
        setSuccess(id ? "Block updated" : "Block created");
        setTimeout(() => {
          router.push(LIST_PATH);
          router.refresh();
        }, 1000);
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

  const columnsDisabled =
    formData.display === "carousel" || formData.display === "list";
  const showSourcePicker =
    formData.source.type === "manual" || !hasSelection || editingSource;

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl  lg:px-8">
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
            {id ? "Edit block" : "New block"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Place a collection, category, promotion, or manual list on a page in
            a specific layout.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 pb-24">
          {/* ─────────────── GENERAL ─────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>General</legend>

            <Field label="Name" required>
              <input
                type="text"
                className={inputCls}
                value={formData.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Featured products"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
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

            <div className="grid gap-4 sm:grid-cols-2">
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

            <Field
              label="Item limit"
              hint={`Maximum ${MAX_BLOCK_LIMIT} items.`}
            >
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
          </fieldset>

          {/* ─────────────── HEADING ─────────────── */}
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

            <div className="grid gap-4 sm:grid-cols-2">
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

          {/* ─────────────── SOURCE ─────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Source</legend>

            <Field
              label="Type"
              required
              hint={SOURCE_HELP[formData.source.type]}
            >
              <select
                className={inputCls}
                value={formData.source.type}
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

            {formData.source.type === "manual" ? (
              <Field label="Items">
                <ManualPicker
                  value={formData.source.items}
                  onChange={(items) => setSource({ items })}
                  disabled={isSubmitting}
                />
              </Field>
            ) : (
              <Field label={SOURCE_LABEL[formData.source.type]} required>
                {showSourcePicker ? (
                  <div>
                    <RefPicker
                      label=""
                      refType={
                        SOURCE_REF_TYPE[
                          formData.source.type as
                            | "collection"
                            | "category"
                            | "promotion"
                        ]
                      }
                      value={currentSourceId}
                      onChange={(v) => {
                        if (formData.source.type === "collection")
                          setSource({ collectionId: v });
                        else if (formData.source.type === "category")
                          setSource({ categoryId: v });
                        else if (formData.source.type === "promotion")
                          setSource({ promotionId: v });
                      }}
                      disabled={isSubmitting}
                      required
                    />
                    {hasSelection && (
                      <button
                        type="button"
                        onClick={() => setEditingSource(false)}
                        className="mt-1.5 text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Cancel — keep current selection
                      </button>
                    )}
                  </div>
                ) : (
                  <SourcePreviewCard
                    state={preview}
                    sourceType={formData.source.type}
                    promotionMode={formData.source.promotionMode}
                    onEdit={() => setEditingSource(true)}
                    onRemove={handleSourceClear}
                  />
                )}
              </Field>
            )}

            {formData.source.type === "promotion" && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Promotion mode">
                    <select
                      className={inputCls}
                      value={formData.source.promotionMode}
                      onChange={(e) =>
                        setSource({
                          promotionMode: e.target.value as PromotionMode,
                        })
                      }
                      disabled={isSubmitting}
                    >
                      {PROMOTION_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m === "products"
                            ? "Products in scope"
                            : "The promotion itself (banner)"}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Badge style">
                    <select
                      className={inputCls}
                      value={formData.sourceStyles.promotionBadgeStyle}
                      onChange={(e) =>
                        setSourceStyles({
                          promotionBadgeStyle: e.target.value,
                        })
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
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.sourceStyles.promotionShowCode}
                    onChange={(e) =>
                      setSourceStyles({ promotionShowCode: e.target.checked })
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  Show promotion code
                </label>

                {formData.display === "banner" &&
                  formData.source.promotionMode === "products" && (
                    <p className="text-[13px] text-amber-700">
                      Banner display usually wants <strong>self</strong> mode so
                      the promotion tile renders — not its products.
                    </p>
                  )}
              </div>
            )}

            {formData.source.type === "collection" && (
              <div className="space-y-4 border-t border-border pt-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.sourceStyles.collectionShowItemCount}
                    onChange={(e) =>
                      setSourceStyles({
                        collectionShowItemCount: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  Show item count
                </label>

                <Field label="Count position">
                  <select
                    className={inputCls}
                    value={formData.sourceStyles.collectionCountPosition}
                    onChange={(e) =>
                      setSourceStyles({
                        collectionCountPosition: e.target.value,
                      })
                    }
                    disabled={
                      isSubmitting ||
                      !formData.sourceStyles.collectionShowItemCount
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

            {formData.source.type === "manual" && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Card size">
                    <select
                      className={inputCls}
                      value={formData.sourceStyles.manualCardSize}
                      onChange={(e) =>
                        setSourceStyles({ manualCardSize: e.target.value })
                      }
                      disabled={isSubmitting}
                    >
                      {CARD_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Card variant">
                    <select
                      className={inputCls}
                      value={formData.sourceStyles.manualCardVariant}
                      onChange={(e) =>
                        setSourceStyles({ manualCardVariant: e.target.value })
                      }
                      disabled={isSubmitting}
                    >
                      {CARD_VARIANTS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.sourceStyles.manualShowDescription}
                    onChange={(e) =>
                      setSourceStyles({
                        manualShowDescription: e.target.checked,
                      })
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  Show description
                </label>
              </div>
            )}
          </fieldset>

          {/* ─────────────── CALL TO ACTION ─────────────── */}
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
                  placeholder="e.g. See all"
                />
              </Field>

              <Field label="Link">
                <input
                  type="text"
                  className={inputCls}
                  value={formData.cta.link}
                  onChange={(e) => setCta({ link: e.target.value })}
                  disabled={isSubmitting || formData.cta.style === "none"}
                  placeholder="/products"
                />
              </Field>
            </div>
          </fieldset>

          {/* ─────────────── PRESENTATION ─────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Presentation</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Theme">
                <select
                  className={inputCls}
                  value={formData.displayConfig.theme}
                  onChange={(e) => setDisplayConfig({ theme: e.target.value })}
                  disabled={isSubmitting}
                >
                  {BLOCK_THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Card shape">
                <select
                  className={inputCls}
                  value={formData.displayConfig.cardShape}
                  onChange={(e) =>
                    setDisplayConfig({ cardShape: e.target.value })
                  }
                  disabled={isSubmitting}
                >
                  {CARD_SHAPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Columns">
                <select
                  className={inputCls}
                  value={formData.displayConfig.columns}
                  onChange={(e) =>
                    setDisplayConfig({ columns: Number(e.target.value) })
                  }
                  disabled={isSubmitting || columnsDisabled}
                >
                  {BLOCK_COLUMN_COUNTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Gap (px)">
                <input
                  type="number"
                  min={0}
                  max={64}
                  className={inputCls}
                  value={formData.displayConfig.gap}
                  onChange={(e) =>
                    setDisplayConfig({
                      gap: Math.min(
                        64,
                        Math.max(0, Number(e.target.value) || 0),
                      ),
                    })
                  }
                  disabled={isSubmitting}
                />
              </Field>

              <Field label="Alignment">
                <select
                  className={inputCls}
                  value={formData.displayConfig.alignment}
                  onChange={(e) =>
                    setDisplayConfig({ alignment: e.target.value })
                  }
                  disabled={isSubmitting}
                >
                  {BLOCK_ALIGNMENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Animation">
              <select
                className={inputCls}
                value={formData.displayConfig.animation}
                onChange={(e) =>
                  setDisplayConfig({ animation: e.target.value })
                }
                disabled={isSubmitting}
              >
                {BLOCK_ANIMATIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-2 sm:grid-cols-3">
              <ToggleCard
                label="Borderless"
                checked={formData.displayConfig.borderless}
                onChange={(v) => setDisplayConfig({ borderless: v })}
                disabled={isSubmitting}
              />
              <ToggleCard
                label="Rounded"
                checked={formData.displayConfig.rounded}
                onChange={(v) => setDisplayConfig({ rounded: v })}
                disabled={isSubmitting}
              />
              <ToggleCard
                label="Shadow"
                checked={formData.displayConfig.shadow}
                onChange={(v) => setDisplayConfig({ shadow: v })}
                disabled={isSubmitting}
              />
            </div>
          </fieldset>

          {/* ─────────────── ACTIONS ─────────────── */}
          <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
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
                "Update block"
              ) : (
                "Create block"
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

function ToggleCard({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-[14px] transition ${
        checked
          ? "border-primary/50 bg-primary/5 text-foreground"
          : "border-border bg-background text-foreground/80 hover:bg-muted/40"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span>{label}</span>
      {checked && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Source preview card                               */
/* -------------------------------------------------------------------------- */

function SourcePreviewCard({
  state,
  sourceType,
  promotionMode,
  onEdit,
  onRemove,
}: {
  state: PreviewState;
  sourceType: BlockSourceType;
  promotionMode: PromotionMode;
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
  const warnings: string[] = [];

  if (sourceType === "promotion") {
    if (!d.imageUrl) {
      warnings.push(
        "No banner image — add one in the promotion editor for banner display.",
      );
    }
    if (d.meta.isActive === false) warnings.push("This promotion is inactive.");
    if (d.meta.endDate && new Date(d.meta.endDate) < new Date()) {
      warnings.push("This promotion has ended.");
    }
  }

  const subline = (() => {
    if (sourceType === "promotion") {
      const parts: string[] = [];
      if (d.meta.calculationType) parts.push(d.meta.calculationType);
      if (d.meta.code) parts.push(`Code: ${d.meta.code}`);
      if (promotionMode === "self") parts.push("Banner (self)");
      else parts.push("Products in scope");
      return parts.join(" · ");
    }
    if (sourceType === "collection") {
      return `${d.meta.type} · ${d.meta.targetType}`;
    }
    if (sourceType === "category" && d.meta.slug) {
      return `/${d.meta.slug}`;
    }
    return null;
  })();

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
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-[10px] font-medium text-muted-foreground">
            No image
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {d.name}
          </p>
          {subline && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {subline}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg px-2 py-1 text-[12px] font-medium text-foreground/80 hover:bg-muted"
          >
            Change
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove selection"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {warnings.length > 0 && (
        <div className="space-y-1 border-t border-amber-200 bg-amber-50 px-3 py-2">
          {warnings.map((w, i) => (
            <p
              key={i}
              className="flex items-start gap-1.5 text-[12px] text-amber-800"
            >
              <span aria-hidden>⚠</span>
              <span>{w}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
