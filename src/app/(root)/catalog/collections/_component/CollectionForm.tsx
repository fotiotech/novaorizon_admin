"use client";

import React, { useEffect, useMemo, useState } from "react";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import {
  createCollection,
  updateCollection,
  getCollectionById,
  deleteCollectionImage,
  fetchAvailableItems,
} from "@/app/actions/collection";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import RuleEditor from "./RuleEditor";
import {
  ENTITY_METADATA,
  type EntityMetadata,
} from "@/lib/content/entityMetadata";
import {
  TARGET_TYPES,
  DISPLAY_LAYOUTS,
  CARD_SHAPES,
  CTA_STYLES,
  COLLECTION_TYPES,
  DEFAULT_COLLECTION_DISPLAY,
  COLLECTION_MANUAL_LIMIT,
  COLLECTION_LIST_PATH,
  type TargetType,
  type CardShape,
  type CtaStyle,
  type CollectionType,
  type DisplayLayout,
} from "@/lib/content/collectionTypes";

const MANUAL_ITEM_LIMIT = COLLECTION_MANUAL_LIMIT;
const LIST_PATH = COLLECTION_LIST_PATH;

/* ------------------------------ enum labels ------------------------------- */

const TYPE_LABELS: Record<CollectionType, string> = {
  rule: "Rule-based",
  manual: "Manual selection",
  recommendation: "Recommendation",
};

const TYPE_SUPPORT: Record<CollectionType, (cfg: EntityMetadata) => boolean> = {
  rule: (c) => c.supportsRule,
  manual: (c) => c.supportsManual,
  recommendation: (c) => c.supportsRecommendation,
};

const CARD_SHAPE_LABELS: Record<CardShape, string> = {
  default: "Default",
  circle: "Circle",
};

const CTA_STYLE_LABELS: Record<CtaStyle, string> = {
  none: "None",
  link: "Link",
  button: "Button",
};

/* ------------------------------- style tokens ------------------------------ */

const labelCls = "block text-[13px] font-medium text-foreground mb-1.5";
const inputCls =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground";
const helperCls = "mt-1.5 text-[12px] text-muted-foreground";
const fieldsetCls = "rounded-xl border border-border bg-card p-5 space-y-4";
const legendCls = "px-1.5 text-[13px] font-semibold text-foreground";

/* --------------------------------- types ---------------------------------- */

type Rule = {
  attribute: string;
  operator: string;
  value: string;
  position: number;
};

const EMPTY_RULE: Rule = {
  attribute: "",
  operator: "$eq",
  value: "",
  position: 0,
};

/* ---------------------------------- form ---------------------------------- */

export default function CollectionForm({ id }: { id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const [rules, setRules] = useState<Rule[]>([EMPTY_RULE]);
  const [items, setItems] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    status: "active",
    type: "rule" as CollectionType,
    targetType: "Product" as TargetType,
    order: 0,
    sort: { field: "", direction: "asc" as "asc" | "desc" },
    showName: true,
    recommendationType: "",
    recommendationLimit: 10,
    ctaText: "",
    ctaLink: "",
    ctaStyle: "none" as CtaStyle,
    display: {
      layout: DEFAULT_COLLECTION_DISPLAY.layout as DisplayLayout,
      columns: DEFAULT_COLLECTION_DISPLAY.columns,
      gap: DEFAULT_COLLECTION_DISPLAY.gap,
      showImages: DEFAULT_COLLECTION_DISPLAY.showImages,
      cardShape: DEFAULT_COLLECTION_DISPLAY.cardShape as CardShape,
    },
  });

  const cfg = useMemo(
    () => ENTITY_METADATA[formData.targetType],
    [formData.targetType],
  );

  const {
    files,
    loading: fileLoading,
    addFiles,
    setFiles,
  } = useFileUploader(
    id,
    formData.imageUrl ? [formData.imageUrl] : [],
    "collections",
  );

  useEffect(() => {
    const url = files[0] || "";
    if (url !== formData.imageUrl) {
      setFormData((p) => ({ ...p, imageUrl: url }));
    }
  }, [files, formData.imageUrl]);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        setLoading(true);
        const res = await getCollectionById(id);
        if (!res.success || !res.data) return;
        const d: any = res.data;

        setFormData({
          name: d.name || "",
          description: d.description || "",
          imageUrl: d.imageUrl || "",
          status: d.status || "active",
          type: (d.type as CollectionType) || "rule",
          targetType: (d.targetType as TargetType) || "Product",
          order: d.order || 0,
          sort: {
            field: d.sort?.field || "",
            direction: (d.sort?.direction as "asc" | "desc") || "asc",
          },
          showName: d.showName !== false,
          recommendationType: d.recommendationType || "",
          recommendationLimit: d.recommendationLimit ?? 10,
          ctaText: d.ctaText || "",
          ctaLink: d.ctaLink || "",
          ctaStyle: (d.ctaStyle as CtaStyle) || "none",
          display: {
            layout:
              (d.display?.layout as DisplayLayout) ||
              DEFAULT_COLLECTION_DISPLAY.layout,
            columns: d.display?.columns ?? DEFAULT_COLLECTION_DISPLAY.columns,
            gap: d.display?.gap ?? DEFAULT_COLLECTION_DISPLAY.gap,
            showImages:
              d.display?.showImages ?? DEFAULT_COLLECTION_DISPLAY.showImages,
            cardShape:
              (d.display?.cardShape as CardShape) ||
              ENTITY_METADATA[d.targetType as TargetType]?.defaultCardShape ||
              DEFAULT_COLLECTION_DISPLAY.cardShape,
          },
        });

        setRules(d.rules?.length ? d.rules : [EMPTY_RULE]);
        setItems(
          Array.isArray(d.items)
            ? d.items.map((x: any) => (typeof x === "object" ? x._id : x))
            : [],
        );
        setFiles(d.imageUrl ? [d.imageUrl] : []);
      } catch (err) {
        console.error("Load failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, setFiles]);

  const [prevTarget, setPrevTarget] = useState<TargetType | null>(null);
  useEffect(() => {
    if (prevTarget === null) {
      setPrevTarget(formData.targetType);
      return;
    }
    if (prevTarget !== formData.targetType) {
      setRules([EMPTY_RULE]);
      setItems([]);
      setAvailableItems([]);
      setFormData((p) => ({
        ...p,
        type:
          p.type === "recommendation" &&
          !ENTITY_METADATA[formData.targetType].supportsRecommendation
            ? "rule"
            : p.type,
        recommendationType: "",
        display: {
          ...p.display,
          cardShape:
            ENTITY_METADATA[formData.targetType].defaultCardShape ??
            DEFAULT_COLLECTION_DISPLAY.cardShape,
        },
      }));
      setPrevTarget(formData.targetType);
    }
  }, [formData.targetType, prevTarget]);

  useEffect(() => {
    if (formData.type !== "manual") return;
    fetchAvailableItems(formData.targetType, itemSearch, sortOrder)
      .then((res) => res.success && setAvailableItems(res.data || []))
      .catch(console.error);
  }, [formData.targetType, formData.type, itemSearch, sortOrder]);

  /* -------------------------------- handlers ------------------------------- */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const v =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    if (name.startsWith("display.")) {
      const key = name.split(".")[1];
      setFormData((p) => ({
        ...p,
        display: {
          ...p.display,
          [key]:
            key === "columns" || key === "gap"
              ? Number(v) || 0
              : key === "showImages"
                ? v === true || v === "true"
                : v,
        } as any,
      }));
      return;
    }

    if (name === "order" || name === "recommendationLimit") {
      setFormData((p) => ({ ...p, [name]: Number(v) || 0 }));
      return;
    }

    if (name === "sort.field") {
      setFormData((p: any) => ({ ...p, sort: { ...p.sort, field: v } }));
      return;
    }
    if (name === "sort.direction") {
      setFormData((p) => ({
        ...p,
        sort: { ...p.sort, direction: v as "asc" | "desc" },
      }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: v }));
  };

  const atLimit = items.length >= MANUAL_ITEM_LIMIT;

  const toggleItem = (itemId: string) => {
    if (items.includes(itemId)) {
      setItems(items.filter((x) => x !== itemId));
      return;
    }
    if (items.length >= MANUAL_ITEM_LIMIT) {
      setError(`You can select at most ${MANUAL_ITEM_LIMIT} items.`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    setItems([...items, itemId]);
  };

  const selectAllVisible = () => {
    const remaining = MANUAL_ITEM_LIMIT - items.length;
    if (remaining <= 0) {
      setError(
        `Selection limit of ${MANUAL_ITEM_LIMIT} reached. Remove some items first.`,
      );
      setTimeout(() => setError(null), 3000);
      return;
    }
    const visibleIds = availableItems.map((i) => i._id);
    const unselected = visibleIds.filter((id) => !items.includes(id));
    const toAdd = unselected.slice(0, remaining);
    if (toAdd.length > 0) {
      setItems((prev) => Array.from(new Set([...prev, ...toAdd])));
    }
    if (unselected.length > remaining) {
      setError(
        `Added ${toAdd.length} of ${unselected.length} — limit is ${MANUAL_ITEM_LIMIT}.`,
      );
      setTimeout(() => setError(null), 3000);
    }
  };

  const clearAllVisible = () => {
    const visibleSet = new Set(availableItems.map((i) => i._id));
    setItems((prev) => prev.filter((id) => !visibleSet.has(id)));
  };

  const allVisibleSelected =
    availableItems.length > 0 &&
    availableItems.every((i) => items.includes(i._id));
  const someVisibleSelected = availableItems.some((i) => items.includes(i._id));

  const handleRemoveImage = async (index: number) => {
    if (id) {
      const res = await deleteCollectionImage(id);
      if (!res.success) throw new Error(res.error || "Failed to remove image");
      setFiles([]);
      setFormData((p) => ({ ...p, imageUrl: "" }));
      setSuccess("Image removed");
      setTimeout(() => setSuccess(null), 2500);
    } else {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (!formData.name.trim()) {
        setError("Name is required");
        return;
      }
      if (formData.type === "rule" && !cfg.supportsRule) {
        setError(`Rule collections are not supported for ${cfg.label}`);
        return;
      }
      if (formData.type === "manual" && !cfg.supportsManual) {
        setError(`Manual collections are not supported for ${cfg.label}`);
        return;
      }
      if (formData.type === "recommendation") {
        if (!cfg.supportsRecommendation) {
          setError(`Recommendations are not supported for ${cfg.label}`);
          return;
        }
        if (!formData.recommendationType) {
          setError("Select a recommendation kind");
          return;
        }
        if (
          formData.recommendationLimit < 1 ||
          formData.recommendationLimit > 100
        ) {
          setError("Recommendation limit must be between 1 and 100");
          return;
        }
      }

      if (
        formData.ctaStyle !== "none" &&
        (!formData.ctaText.trim() || !formData.ctaLink.trim())
      ) {
        setError(
          formData.ctaStyle === "button"
            ? "A button CTA requires both text and a link."
            : "A link CTA requires both text and a link.",
        );
        return;
      }

      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("description", formData.description);
      fd.append("imageUrl", formData.imageUrl || "");
      fd.append("status", formData.status);
      fd.append("type", formData.type);
      fd.append("targetType", formData.targetType);
      fd.append("order", String(formData.order));
      fd.append("sort.field", formData.sort.field);
      fd.append("sort.direction", formData.sort.direction);
      fd.append("showName", formData.showName ? "true" : "false");
      fd.append("rules", JSON.stringify(formData.type === "rule" ? rules : []));
      fd.append(
        "items",
        JSON.stringify(formData.type === "manual" ? items : []),
      );
      fd.append(
        "recommendationType",
        formData.type === "recommendation" ? formData.recommendationType : "",
      );
      fd.append("recommendationLimit", String(formData.recommendationLimit));
      fd.append("display.layout", formData.display.layout);
      fd.append("display.columns", String(formData.display.columns));
      fd.append("display.gap", String(formData.display.gap));
      fd.append(
        "display.showImages",
        formData.display.showImages ? "true" : "false",
      );
      fd.append("display.cardShape", formData.display.cardShape);
      fd.append("ctaText", formData.ctaText);
      fd.append("ctaLink", formData.ctaLink);
      fd.append("ctaStyle", formData.ctaStyle);

      const res = id
        ? await updateCollection(id, fd)
        : await createCollection(fd);

      if (res.success) {
        setSuccess(id ? "Collection updated" : "Collection created");
        setTimeout(() => {
          router.push(LIST_PATH);
          router.refresh();
        }, 1200);
      } else {
        setError(res.error || "Failed to save collection");
      }
    } catch {
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

  const recNeedsUser =
    formData.type === "recommendation" &&
    ["personalized", "recentlyViewed"].includes(formData.recommendationType);

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
            {id ? "Edit collection" : "New collection"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Targeting{" "}
            <span className="font-medium text-foreground">
              {cfg.label.toLowerCase()}
            </span>
            .
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 pb-24">
          {/* ────────────────────────── BASICS ────────────────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Basics</legend>

            <Field label="Name" required>
              <input
                type="text"
                name="name"
                className={inputCls}
                required
                disabled={isSubmitting}
                value={formData.name}
                onChange={handleChange}
                placeholder={`e.g. Featured ${cfg.label}`}
              />
            </Field>

            <Field label="Description">
              <textarea
                name="description"
                rows={3}
                className={`${inputCls} resize-y`}
                disabled={isSubmitting}
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional. Shown only in admin lists."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Target entity" required>
                <select
                  name="targetType"
                  className={inputCls}
                  value={formData.targetType}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {TARGET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ENTITY_METADATA[t].label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Collection type" required>
                <select
                  name="type"
                  className={inputCls}
                  value={formData.type}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {COLLECTION_TYPES.filter((t) => TYPE_SUPPORT[t](cfg)).map(
                    (t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select
                  name="status"
                  className={inputCls}
                  value={formData.status}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>

              <Field label="Sort order">
                <input
                  type="number"
                  name="order"
                  min={0}
                  className={inputCls}
                  value={formData.order}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </Field>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-foreground">
              <input
                type="checkbox"
                checked={formData.showName}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, showName: e.target.checked }))
                }
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
              />
              Show collection name in rendered output
            </label>
          </fieldset>

          {/* ──────────────────── RECOMMENDATION (if any) ─────────────────── */}
          {formData.type === "recommendation" && cfg.supportsRecommendation && (
            <fieldset className={fieldsetCls}>
              <legend className={legendCls}>Recommendation</legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kind" required>
                  <select
                    name="recommendationType"
                    className={inputCls}
                    value={formData.recommendationType}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Select…</option>
                    {(cfg.recommendationTypes ?? []).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Limit" hint="Number of items to return (1-100).">
                  <input
                    type="number"
                    name="recommendationLimit"
                    min={1}
                    max={100}
                    className={inputCls}
                    value={formData.recommendationLimit}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </Field>
              </div>

              {recNeedsUser && (
                <p className={helperCls}>
                  "{formData.recommendationType}" resolves per signed-in shopper
                  — anonymous visitors see nothing.
                </p>
              )}
            </fieldset>
          )}

          {/* ────────────────────────── CONTENT ────────────────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>
              {formData.type === "rule"
                ? "Content rules"
                : formData.type === "manual"
                  ? "Content selection"
                  : "Content"}
            </legend>

            {formData.type === "manual" && (
              <div className="flex justify-end">
                <Counter current={items.length} max={MANUAL_ITEM_LIMIT} />
              </div>
            )}

            {formData.type === "rule" ? (
              <RuleEditor
                rules={rules}
                onRulesChange={setRules}
                targetType={formData.targetType}
              />
            ) : formData.type === "manual" ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    placeholder={`Search ${cfg.label.toLowerCase()}…`}
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className={inputCls}
                  />
                  <select
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(e.target.value as "asc" | "desc")
                    }
                    className={`${inputCls} sm:w-48`}
                  >
                    <option value="asc">Name (A → Z)</option>
                    <option value="desc">Name (Z → A)</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllVisible}
                      disabled={
                        isSubmitting ||
                        availableItems.length === 0 ||
                        allVisibleSelected ||
                        atLimit
                      }
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Select all visible
                    </button>
                    <button
                      type="button"
                      onClick={clearAllVisible}
                      disabled={isSubmitting || !someVisibleSelected}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </div>
                  <span className="text-[12px] text-muted-foreground">
                    {availableItems.length} visible
                  </span>
                </div>

                <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                  {availableItems.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      No {cfg.label.toLowerCase()} found.
                    </p>
                  ) : (
                    availableItems.map((item) => {
                      const selected = items.includes(item._id);
                      const disabled = !selected && atLimit;
                      return (
                        <div
                          key={item._id}
                          role="checkbox"
                          aria-checked={selected}
                          aria-disabled={disabled}
                          tabIndex={disabled ? -1 : 0}
                          onClick={() => !disabled && toggleItem(item._id)}
                          onKeyDown={(e) => {
                            if (disabled) return;
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              toggleItem(item._id);
                            }
                          }}
                          className={`flex cursor-pointer items-center gap-3 p-3 transition-colors focus:outline-none focus:bg-muted/40 ${
                            disabled
                              ? "cursor-not-allowed opacity-50"
                              : selected
                                ? "bg-primary/5"
                                : "hover:bg-muted/40"
                          }`}
                        >
                          <Checkbox checked={selected} disabled={disabled} />
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt=""
                              className={`h-9 w-9 shrink-0 border border-border bg-background object-cover ${
                                formData.display.cardShape === "circle"
                                  ? "rounded-full"
                                  : "rounded-md"
                              }`}
                            />
                          ) : (
                            <div className="h-9 w-9 shrink-0 rounded-md border border-border bg-muted/40" />
                          )}
                          <span
                            className={`truncate text-sm ${
                              selected
                                ? "font-medium text-foreground"
                                : "text-foreground/80"
                            }`}
                          >
                            {item.name}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <p className={helperCls}>
                Recommendation collections resolve at runtime. Preview items are
                not shown.
              </p>
            )}
          </fieldset>

          {/* ─────────────────────── PRESENTATION ─────────────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Presentation</legend>

            <p className={helperCls}>
              Applied when this collection renders on its own (e.g.{" "}
              <code className="text-foreground">/catalog/collections</code>).
              Content Blocks override these with their own display settings.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Layout">
                <select
                  name="display.layout"
                  className={inputCls}
                  value={formData.display.layout}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {DISPLAY_LAYOUTS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Card shape">
                <select
                  name="display.cardShape"
                  className={inputCls}
                  value={formData.display.cardShape}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {CARD_SHAPES.map((s) => (
                    <option key={s} value={s}>
                      {CARD_SHAPE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Columns">
                <input
                  type="number"
                  name="display.columns"
                  min={1}
                  max={6}
                  className={inputCls}
                  value={formData.display.columns}
                  onChange={handleChange}
                  disabled={
                    isSubmitting ||
                    formData.display.layout === "carousel" ||
                    formData.display.layout === "list"
                  }
                />
              </Field>
              <Field label="Gap (px)">
                <input
                  type="number"
                  name="display.gap"
                  min={0}
                  max={64}
                  className={inputCls}
                  value={formData.display.gap}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </Field>
              <Field label="Images">
                <select
                  name="display.showImages"
                  className={inputCls}
                  value={formData.display.showImages ? "true" : "false"}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="true">Show</option>
                  <option value="false">Hide</option>
                </select>
              </Field>
            </div>

            {formData.type === "rule" && (
              <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <Field label="Sort field">
                  <input
                    type="text"
                    name="sort.field"
                    className={inputCls}
                    value={formData.sort.field}
                    onChange={handleChange}
                    placeholder="e.g. trendingRank"
                    disabled={isSubmitting}
                  />
                </Field>
                <Field label="Direction">
                  <select
                    name="sort.direction"
                    className={inputCls}
                    value={formData.sort.direction}
                    onChange={handleChange}
                    disabled={isSubmitting || !formData.sort.field}
                  >
                    <option value="asc">Ascending (1, 2, 3…)</option>
                    <option value="desc">Descending (…, 3, 2, 1)</option>
                  </select>
                </Field>
              </div>
            )}

            <div className="space-y-4 border-t border-border pt-4">
              <Field label="CTA style">
                <select
                  name="ctaStyle"
                  className={inputCls}
                  value={formData.ctaStyle}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {CTA_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {CTA_STYLE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="CTA text">
                  <input
                    type="text"
                    name="ctaText"
                    className={inputCls}
                    value={formData.ctaText}
                    onChange={handleChange}
                    disabled={isSubmitting || formData.ctaStyle === "none"}
                    placeholder="e.g. See all"
                  />
                </Field>
                <Field label="CTA link">
                  <input
                    type="text"
                    name="ctaLink"
                    className={inputCls}
                    value={formData.ctaLink}
                    onChange={handleChange}
                    disabled={isSubmitting || formData.ctaStyle === "none"}
                    placeholder="/products or https://…"
                  />
                </Field>
              </div>

              {formData.ctaStyle !== "none" &&
                (!formData.ctaText.trim() || !formData.ctaLink.trim()) && (
                  <p className="text-[13px] text-destructive">
                    Both text and link are required for the CTA to render.
                  </p>
                )}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <label className={labelCls}>Cover image</label>
              <FilesUploader
                files={files}
                loading={fileLoading}
                addFiles={addFiles}
                onRemove={handleRemoveImage}
              />
            </div>
          </fieldset>

          {/* ──────────────────────── ADVANCED ──────────────────────── */}
          <fieldset className={fieldsetCls}>
            <legend className={legendCls}>Advanced</legend>

            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm text-foreground">
                {showJson ? "Hide" : "Show"} JSON preview
              </span>
              <Chevron open={showJson} />
            </button>

            {showJson && (
              <pre className="max-h-60 overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-[12px] text-foreground">
                {JSON.stringify(
                  {
                    ...formData,
                    ...(formData.type === "rule" && { rules }),
                    ...(formData.type === "manual" && { items }),
                  },
                  null,
                  2,
                )}
              </pre>
            )}
          </fieldset>

          {/* ─────────────────────── ACTIONS ─────────────────────── */}
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
                "Update collection"
              ) : (
                "Create collection"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Small primitives                              */
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-muted-foreground transition-transform ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Checkbox({
  checked,
  disabled,
}: {
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
        disabled
          ? "border-border bg-muted/50"
          : checked
            ? "border-primary bg-primary"
            : "border-border bg-background"
      }`}
    >
      {checked && (
        <svg
          className="h-3.5 w-3.5 text-primary-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

function Counter({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const tone =
    current >= max
      ? "text-destructive font-semibold"
      : pct >= 80
        ? "text-amber-600 font-medium"
        : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] ${tone}`}>
      {current} / {max} selected
      {current >= max && <span aria-hidden>· limit reached</span>}
    </span>
  );
}
