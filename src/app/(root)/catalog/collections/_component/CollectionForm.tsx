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
import { ENTITY_METADATA } from "@/lib/content/entityMetadata";
import {
  TARGET_TYPES,
  type TargetType,
  type CardShape,
  type CtaStyle,
} from "@/lib/content/collectionTypes";

const MANUAL_ITEM_LIMIT = 50;
const LIST_PATH = "/catalog/collections";
const LAYOUTS = ["carousel", "grid", "list", "hero"] as const;

type CollectionType = "rule" | "manual" | "recommendation";
type Rule = {
  attribute: string;
  operator: string;
  value: string;
  position: number;
};

/* -------------------------------------------------------------------------- */
/*                                Style tokens                                */
/* -------------------------------------------------------------------------- */

const inputCls =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

const selectCls =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

const textareaCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

const sectionCard =
  "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden";

const sectionPad = "p-5 sm:p-6";

export default function CollectionForm({ id }: { id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const [rules, setRules] = useState<Rule[]>([
    { attribute: "", operator: "$eq", value: "", position: 0 },
  ]);
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
      layout: "carousel" as (typeof LAYOUTS)[number],
      columns: 4,
      gap: 16,
      showImages: true,
      cardShape: "default" as CardShape,
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
            layout: d.display?.layout || "carousel",
            columns: d.display?.columns ?? 4,
            gap: d.display?.gap ?? 16,
            showImages: d.display?.showImages !== false,
            cardShape:
              (d.display?.cardShape as CardShape) ||
              ENTITY_METADATA[d.targetType as TargetType]?.defaultCardShape ||
              "default",
          },
        });

        setRules(
          d.rules?.length
            ? d.rules
            : [{ attribute: "", operator: "$eq", value: "", position: 0 }],
        );
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
      setRules([{ attribute: "", operator: "$eq", value: "", position: 0 }]);
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
            ENTITY_METADATA[formData.targetType].defaultCardShape ?? "default",
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

  /* ------------------------------ handlers ------------------------------- */

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

  /* ------------------------------- render -------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50/60 pb-24">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
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

        {/* Page header */}
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            {id ? "Edit collection" : "New collection"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Rule-based, manual, or recommendation — targeting{" "}
            <span className="font-medium text-gray-800">
              {cfg.label.toLowerCase()}
            </span>
            .
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ────────────────────────── BASICS ────────────────────────── */}
          <section className={sectionCard}>
            <div className={`${sectionPad} space-y-4`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <label className={labelCls}>
                    Name <span className="text-rose-500">*</span>
                  </label>
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
                </div>

                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    name="status"
                    className={selectCls}
                    value={formData.status}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    Target entity <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="targetType"
                    className={selectCls}
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
                </div>

                <div>
                  <label className={labelCls}>
                    Collection type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="type"
                    className={selectCls}
                    value={formData.type}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  >
                    {cfg.supportsRule && (
                      <option value="rule">Rule-based</option>
                    )}
                    {cfg.supportsManual && (
                      <option value="manual">Manual selection</option>
                    )}
                    {cfg.supportsRecommendation && (
                      <option value="recommendation">Recommendation</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Sort order</label>
                  <input
                    type="number"
                    name="order"
                    min={0}
                    className={inputCls}
                    value={formData.order}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className={textareaCls}
                  disabled={isSubmitting}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional. Shown only in admin lists."
                />
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                <Toggle
                  checked={formData.showName}
                  onChange={(v) => setFormData((p) => ({ ...p, showName: v }))}
                  label="Show collection name in rendered output"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700">
                  Show collection name in rendered output
                </span>
              </div>
            </div>
          </section>

          {/* ──────────────────── RECOMMENDATION (if any) ────────────── */}
          {formData.type === "recommendation" && cfg.supportsRecommendation && (
            <section className="rounded-xl border border-blue-200 bg-blue-50/60 shadow-sm">
              <div className={`${sectionPad} space-y-4`}>
                <SectionLabel>Recommendation</SectionLabel>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>
                      Kind <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="recommendationType"
                      className={selectCls}
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
                  </div>
                  <div>
                    <label className={labelCls}>Limit</label>
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
                    <p className="mt-1 text-xs text-gray-500">
                      Number of items to return (1-100).
                    </p>
                  </div>
                </div>

                {recNeedsUser && (
                  <p className="rounded-md bg-blue-100/70 px-3 py-2 text-xs text-blue-800">
                    "{formData.recommendationType}" resolves per signed-in
                    shopper — anonymous visitors see nothing.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ─────────────────────── CONTENT ─────────────────────────── */}
          <section className={sectionCard}>
            <div className={sectionPad}>
              <div className="mb-4 flex items-center justify-between">
                <SectionLabel>
                  {formData.type === "rule"
                    ? "Content rules"
                    : formData.type === "manual"
                      ? `Content selection`
                      : "Content"}
                </SectionLabel>
                {formData.type === "manual" && (
                  <Counter current={items.length} max={MANUAL_ITEM_LIMIT} />
                )}
              </div>

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
                      className={`${selectCls} sm:w-48`}
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
                        className="rounded-md border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Select all visible
                      </button>
                      <button
                        type="button"
                        onClick={clearAllVisible}
                        disabled={isSubmitting || !someVisibleSelected}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">
                      {availableItems.length} visible
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {availableItems.length === 0 ? (
                      <p className="p-6 text-center text-sm text-gray-500">
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
                            className={`flex cursor-pointer items-center gap-3 p-3 transition-colors focus:outline-none focus:bg-blue-50 ${
                              disabled
                                ? "cursor-not-allowed opacity-50"
                                : selected
                                  ? "bg-blue-50/60 hover:bg-blue-50"
                                  : "hover:bg-gray-50"
                            }`}
                          >
                            <Checkbox checked={selected} disabled={disabled} />
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageUrl}
                                alt=""
                                className={`h-9 w-9 shrink-0 border bg-white object-cover ${
                                  formData.display.cardShape === "circle"
                                    ? "rounded-full"
                                    : "rounded-md"
                                }`}
                              />
                            ) : (
                              <div className="h-9 w-9 shrink-0 rounded-md border bg-gray-100" />
                            )}
                            <span
                              className={`truncate text-sm ${
                                selected
                                  ? "font-medium text-gray-900"
                                  : "text-gray-700"
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
                <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
                  Recommendation collections resolve at runtime. Preview items
                  are not shown.
                </p>
              )}
            </div>
          </section>

          {/* ────────────────────── PRESENTATION ─────────────────────── */}
          <section className={sectionCard}>
            <div className={`${sectionPad} space-y-5`}>
              <SectionLabel>Presentation</SectionLabel>

              {/* Display */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <label className={labelCls}>Layout</label>
                  <select
                    name="display.layout"
                    className={selectCls}
                    value={formData.display.layout}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  >
                    {LAYOUTS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Columns</label>
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
                </div>
                <div>
                  <label className={labelCls}>Gap (px)</label>
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
                </div>
                <div>
                  <label className={labelCls}>Images</label>
                  <select
                    name="display.showImages"
                    className={selectCls}
                    value={formData.display.showImages ? "true" : "false"}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  >
                    <option value="true">Show</option>
                    <option value="false">Hide</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Card shape</label>
                  <select
                    name="display.cardShape"
                    className={selectCls}
                    value={formData.display.cardShape}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    title={
                      formData.targetType === "Category"
                        ? "Circle is the natural shape for categories."
                        : "Round or square card corners."
                    }
                  >
                    <option value="default">Default</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>
              </div>

              {/* Sort — only for rule collections */}
              {formData.type === "rule" && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Sort
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Field</label>
                      <input
                        type="text"
                        name="sort.field"
                        className={inputCls}
                        value={formData.sort.field}
                        onChange={handleChange}
                        placeholder="e.g. trendingRank"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Direction</label>
                      <select
                        name="sort.direction"
                        className={selectCls}
                        value={formData.sort.direction}
                        onChange={handleChange}
                        disabled={isSubmitting || !formData.sort.field}
                      >
                        <option value="asc">Ascending (1, 2, 3…)</option>
                        <option value="desc">Descending (…, 3, 2, 1)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Call to action
                  </p>
                  <span className="text-xs text-gray-400">
                    Rendered next to the section heading
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelCls}>Style</label>
                    <select
                      name="ctaStyle"
                      className={selectCls}
                      value={formData.ctaStyle}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    >
                      <option value="none">None</option>
                      <option value="link">Link</option>
                      <option value="button">Button</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Text</label>
                    <input
                      type="text"
                      name="ctaText"
                      className={inputCls}
                      value={formData.ctaText}
                      onChange={handleChange}
                      disabled={isSubmitting || formData.ctaStyle === "none"}
                      placeholder="e.g. See all"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Link</label>
                    <input
                      type="text"
                      name="ctaLink"
                      className={inputCls}
                      value={formData.ctaLink}
                      onChange={handleChange}
                      disabled={isSubmitting || formData.ctaStyle === "none"}
                      placeholder="/products or https://…"
                    />
                  </div>
                </div>
                {formData.ctaStyle !== "none" &&
                  (!formData.ctaText.trim() || !formData.ctaLink.trim()) && (
                    <p className="mt-2 text-xs text-amber-600">
                      Both text and link are required for the CTA to render.
                    </p>
                  )}
              </div>

              {/* Cover image */}
              <div>
                <label className={labelCls}>Cover image</label>
                <FilesUploader
                  files={files}
                  loading={fileLoading}
                  addFiles={addFiles}
                  onRemove={handleRemoveImage}
                />
              </div>
            </div>
          </section>

          {/* ──────────────────── ADVANCED / JSON ─────────────────────── */}
          <section className={sectionCard}>
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50 sm:px-6"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Advanced
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {showJson ? "Hide" : "Show"} JSON preview
                <Chevron open={showJson} />
              </span>
            </button>
            {showJson && (
              <div className="border-t border-gray-100 bg-gray-900 px-5 py-4 sm:px-6">
                <pre className="overflow-auto max-h-60 text-xs text-gray-100">
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
              </div>
            )}
          </section>
        </form>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => router.push(LIST_PATH)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner />
                <span className="ml-1">Saving…</span>
              </>
            ) : id ? (
              "Update collection"
            ) : (
              "Create collection"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Small reusable widgets                            */
/* -------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </p>
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
      className={`transition-transform ${open ? "rotate-180" : ""}`}
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
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
        disabled
          ? "border-gray-200 bg-gray-50"
          : checked
            ? "border-blue-600 bg-blue-600"
            : "border-gray-300 bg-white"
      }`}
    >
      {checked && (
        <svg
          className="h-3.5 w-3.5 text-white"
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

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Counter({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const tone =
    current >= max
      ? "text-red-600 font-semibold"
      : pct >= 80
        ? "text-amber-600 font-medium"
        : "text-gray-600";
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${tone}`}>
      {current} / {max} selected
      {current >= max && <span aria-hidden>· limit reached</span>}
    </span>
  );
}
