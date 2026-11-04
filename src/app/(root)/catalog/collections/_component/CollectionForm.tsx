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
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  const recNeedsUser =
    formData.type === "recommendation" &&
    ["personalized", "recentlyViewed"].includes(formData.recommendationType);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {id ? "Edit" : "Create"} Collection
        </h1>
        <p className="text-gray-600 mt-1">
          Rule‑based, manual, or recommendation, targeting{" "}
          {cfg.label.toLowerCase()}.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Target Entity *
            </label>
            <select
              name="targetType"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
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
            <p className="text-sm text-gray-500 mt-1">
              Changing this resets rules, manual picks, and the default card
              shape.
            </p>
          </div>
          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Collection Type *
            </label>
            <select
              name="type"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
              value={formData.type}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              {cfg.supportsRule && <option value="rule">Rule‑based</option>}
              {cfg.supportsManual && (
                <option value="manual">Manual selection</option>
              )}
              {cfg.supportsRecommendation && (
                <option value="recommendation">Recommendation</option>
              )}
            </select>
          </div>
        </div>

        {formData.type === "recommendation" && cfg.supportsRecommendation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-blue-200 bg-blue-50">
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Kind *
              </label>
              <select
                name="recommendationType"
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
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
              <label className="block mb-1 font-medium text-gray-700">
                Limit
              </label>
              <input
                type="number"
                name="recommendationLimit"
                min={1}
                max={100}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                value={formData.recommendationLimit}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of items to return (1‑100).
              </p>
            </div>
            {recNeedsUser && (
              <p className="md:col-span-2 text-xs text-gray-600">
                "{formData.recommendationType}" resolves per signed-in shopper —
                anonymous visitors get nothing back.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              name="name"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
              required
              disabled={isSubmitting}
              value={formData.name}
              onChange={handleChange}
              placeholder={`e.g. Featured ${cfg.label}`}
            />
          </div>
          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
              value={formData.status}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-gray-700">
            Cover Image
          </label>
          <FilesUploader
            files={files}
            loading={fileLoading}
            addFiles={addFiles}
            onRemove={handleRemoveImage}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-medium text-gray-700">
              Order
            </label>
            <input
              type="number"
              name="order"
              min={0}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
              value={formData.order}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center gap-3 mt-7 select-none">
            <Toggle
              checked={formData.showName}
              onChange={(v) => setFormData((p) => ({ ...p, showName: v }))}
              label="Show collection name in rendered output"
              disabled={isSubmitting}
            />
            <span className="text-gray-700">
              Show collection name in rendered output
            </span>
          </div>
        </div>

        {/* ------------------------------ CTA ------------------------------ */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Call to action</h3>
            <span className="text-xs text-gray-500">
              Renders next to the section heading
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-sm text-gray-700">Style</label>
              <select
                name="ctaStyle"
                className="w-full border rounded p-2 text-sm"
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
              <label className="block mb-1 text-sm text-gray-700">Text</label>
              <input
                type="text"
                name="ctaText"
                className="w-full border rounded p-2 text-sm"
                value={formData.ctaText}
                onChange={handleChange}
                disabled={isSubmitting || formData.ctaStyle === "none"}
                placeholder="e.g. See all"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700">Link</label>
              <input
                type="text"
                name="ctaLink"
                className="w-full border rounded p-2 text-sm"
                value={formData.ctaLink}
                onChange={handleChange}
                disabled={isSubmitting || formData.ctaStyle === "none"}
                placeholder="/products or https://…"
              />
            </div>
          </div>
          {formData.ctaStyle !== "none" &&
            (!formData.ctaText.trim() || !formData.ctaLink.trim()) && (
              <p className="text-xs text-amber-600">
                Both text and link are required for the CTA to render.
              </p>
            )}
        </div>

        {formData.type === "rule" && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Sort (optional)</h3>
              <span className="text-xs text-gray-500">
                Leave field empty to keep MongoDB's natural order
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm text-gray-700">
                  Field
                </label>
                <input
                  type="text"
                  name="sort.field"
                  className="w-full border rounded p-2 text-sm"
                  value={formData.sort.field}
                  onChange={handleChange}
                  placeholder="e.g. trendingRank"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm text-gray-700">
                  Direction
                </label>
                <select
                  name="sort.direction"
                  className="w-full border rounded p-2 text-sm"
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

        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <h3 className="font-semibold text-gray-800">Display</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block mb-1 text-sm text-gray-700">Layout</label>
              <select
                name="display.layout"
                className="w-full border rounded p-2 text-sm"
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
              <label className="block mb-1 text-sm text-gray-700">
                Columns
              </label>
              <input
                type="number"
                name="display.columns"
                min={1}
                max={6}
                className="w-full border rounded p-2 text-sm"
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
              <label className="block mb-1 text-sm text-gray-700">
                Gap (px)
              </label>
              <input
                type="number"
                name="display.gap"
                min={0}
                max={64}
                className="w-full border rounded p-2 text-sm"
                value={formData.display.gap}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700">Images</label>
              <select
                name="display.showImages"
                className="w-full border rounded p-2 text-sm"
                value={formData.display.showImages ? "true" : "false"}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="true">Show</option>
                <option value="false">Hide</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700">Shape</label>
              <select
                name="display.cardShape"
                className="w-full border rounded p-2 text-sm"
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
        </div>

        {formData.type === "rule" ? (
          <RuleEditor
            rules={rules}
            onRulesChange={setRules}
            targetType={formData.targetType}
          />
        ) : formData.type === "manual" ? (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-lg font-semibold">Select {cfg.label}</h3>
              <div className="text-sm">
                <Counter current={items.length} max={MANUAL_ITEM_LIMIT} />
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder={`Search ${cfg.label.toLowerCase()}…`}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="p-2 border rounded"
              >
                <option value="asc">Name (A → Z)</option>
                <option value="desc">Name (Z → A)</option>
              </select>
            </div>

            <div className="flex items-center justify-between mb-2 text-sm">
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
                  className="px-3 py-1 border border-blue-500 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title={
                    atLimit
                      ? `Selection limit of ${MANUAL_ITEM_LIMIT} reached`
                      : `Add all visible items (max ${MANUAL_ITEM_LIMIT} total)`
                  }
                >
                  Select all visible
                </button>
                <button
                  type="button"
                  onClick={clearAllVisible}
                  disabled={isSubmitting || !someVisibleSelected}
                  className="px-3 py-1 border border-gray-400 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Clear
                </button>
              </div>
              <span className="text-gray-500">
                {availableItems.length} visible
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto border rounded divide-y divide-gray-100">
              {availableItems.length === 0 ? (
                <p className="p-6 text-center text-gray-500">
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
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors focus:outline-none focus:bg-blue-50 ${
                        disabled
                          ? "opacity-50 cursor-not-allowed"
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
                          className={`h-9 w-9 object-cover border bg-white shrink-0 ${
                            formData.display.cardShape === "circle"
                              ? "rounded-full"
                              : "rounded-md"
                          }`}
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-md border bg-gray-100 shrink-0" />
                      )}
                      <span
                        className={`text-sm truncate ${
                          selected
                            ? "text-gray-900 font-medium"
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
        ) : null}

        <div>
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showJson ? "Hide" : "Show"} JSON preview
          </button>
          {showJson && (
            <pre className="mt-2 bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-auto max-h-60">
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
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(LIST_PATH)}
            className="px-5 py-2.5 border rounded-lg"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-primary text-white px-5 py-2.5 rounded-lg disabled:opacity-50 flex items-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Spinner />
            ) : id ? (
              "Update Collection"
            ) : (
              "Create Collection"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Small reusable widgets                            */
/* -------------------------------------------------------------------------- */

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
      className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
        disabled
          ? "border-gray-200 bg-gray-50"
          : checked
            ? "border-blue-600 bg-blue-600"
            : "border-gray-300 bg-white group-hover:border-blue-400"
      }`}
    >
      {checked && (
        <svg
          className="w-3.5 h-3.5 text-white"
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
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
    <span className={`inline-flex items-center gap-1.5 ${tone}`}>
      {current} / {max} selected
      {current >= max && <span aria-hidden>· limit reached</span>}
    </span>
  );
}
