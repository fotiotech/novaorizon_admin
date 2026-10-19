// components/ContentBlockForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getBlockById,
  createBlock,
  updateBlock,
  getBlockOptions,
  deleteBlockBackgroundImage,
  type BlockOptions,
  type BlockRefOption,
} from "@/app/actions/contentBlock";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import FilesUploader from "@/components/FilesUploader";
import useFileUploader from "@/hooks/useFileUploader";
import {
  BLOCK_LOCATIONS,
  BLOCK_DISPLAYS,
  BLOCK_SOURCE_TYPES,
  RECOMMENDATION_KINDS,
  PROMOTION_MODES,
  BLOCK_REF_MODELS,
  BLOCK_COLUMN_COUNTS,
  BLOCK_THEMES,
  BLOCK_ALIGNMENTS,
  CTA_STYLES,
  CARD_SHAPES,
  PROMOTION_BADGE_STYLES,
  COLLECTION_COUNT_POSITIONS,
  RECOMMENDATION_BADGE_STYLES,
  RELATED_VARIANTS,
  CARD_SIZES,
  CARD_VARIANTS,
  DEFAULT_BLOCK_DISPLAY_CONFIG,
  DEFAULT_BLOCK_SOURCE_STYLES,
  DEFAULT_BLOCK_LIMIT,
  MAX_BLOCK_LIMIT,
  type BlockLocation,
  type BlockDisplay,
  type BlockSourceType,
  type RecommendationKind,
  type PromotionMode,
  type BlockRefModel,
  type BlockDisplayConfig,
  type BlockSourceStyles,
  type BlockTheme,
  type BlockAlignment,
  type CtaStyle,
  type CardShape,
  type PromotionBadgeStyle,
  type CollectionCountPosition,
  type RecommendationBadgeStyle,
  type RelatedVariant,
  type CardSize,
  type CardVariant,
} from "@/lib/content/constants";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type UiRef = {
  _key: string;
  _id?: string;
  refModel: BlockRefModel;
  refId: string;
  label: string;
  image: string;
  description: string;
};

interface BlockFormState {
  name: string;
  description: string;

  location: BlockLocation;
  sectionTitle: string;
  order: number;
  visible: boolean;

  sourceType: BlockSourceType;
  collectionId: string;
  promotionId: string;
  promotionMode: PromotionMode;
  recommendationKind: RecommendationKind | "";
  relatedStrategy: "auto" | "collection";
  relatedCollectionId: string;
  refs: UiRef[];
  limit: number;

  display: BlockDisplay;
  columns: number;
  showImages: boolean;
  displayConfig: BlockDisplayConfig;
  sourceStyles: BlockSourceStyles;

  ctaText: string;
  ctaLink: string;
  ctaStyle: CtaStyle;

  backgroundColor: string;
  backgroundImage: string;
}

const emptyForm: BlockFormState = {
  name: "",
  description: "",
  location: "Home",
  sectionTitle: "",
  order: 0,
  visible: true,

  sourceType: "collection",
  collectionId: "",
  promotionId: "",
  promotionMode: "products",
  recommendationKind: "",
  relatedStrategy: "auto",
  relatedCollectionId: "",
  refs: [],
  limit: DEFAULT_BLOCK_LIMIT,

  display: "grid",
  columns: 4,
  showImages: true,
  displayConfig: { ...DEFAULT_BLOCK_DISPLAY_CONFIG },
  sourceStyles: { ...DEFAULT_BLOCK_SOURCE_STYLES },

  ctaText: "",
  ctaLink: "",
  ctaStyle: "link",

  backgroundColor: "",
  backgroundImage: "",
};

const newRef = (): UiRef => ({
  _key: crypto.randomUUID(),
  refModel: "Product",
  refId: "",
  label: "",
  image: "",
  description: "",
});

const NUMERIC_FIELDS = new Set(["order", "columns", "limit"]);

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function fromApi(data: any): BlockFormState {
  const s = data.source ?? {};
  return {
    name: data.name ?? "",
    description: data.description ?? "",
    location: (data.location as BlockLocation) ?? "Home",
    sectionTitle: data.sectionTitle ?? "",
    order: data.order ?? 0,
    visible: data.visible !== false,

    sourceType: (s.type as BlockSourceType) ?? "collection",
    collectionId: s.collectionId ? String(s.collectionId) : "",
    promotionId: s.promotionId ? String(s.promotionId) : "",
    promotionMode: (s.promotionMode as PromotionMode) ?? "products",
    recommendationKind: (s.recommendationKind as RecommendationKind) ?? "",
    relatedStrategy: s.relatedStrategy ?? "auto",
    relatedCollectionId: s.relatedCollectionId
      ? String(s.relatedCollectionId)
      : "",
    refs: (s.refs ?? []).map((r: any) => ({
      _key: crypto.randomUUID(),
      _id: r._id ? String(r._id) : undefined,
      refModel: r.refModel,
      refId: String(r.refId),
      label: r.label ?? "",
      image: r.image ?? "",
      description: r.description ?? "",
    })),
    limit: s.limit ?? DEFAULT_BLOCK_LIMIT,

    display: (data.display as BlockDisplay) ?? "grid",
    columns: data.columns ?? 4,
    showImages: data.showImages !== false,
    displayConfig: {
      ...DEFAULT_BLOCK_DISPLAY_CONFIG,
      ...(data.displayConfig ?? {}),
    },
    sourceStyles: {
      ...DEFAULT_BLOCK_SOURCE_STYLES,
      ...(data.sourceStyles ?? {}),
    },

    ctaText: data.ctaText ?? "",
    ctaLink: data.ctaLink ?? "",
    ctaStyle: (data.ctaStyle as CtaStyle) ?? "link",

    backgroundColor: data.backgroundColor ?? "",
    backgroundImage: data.backgroundImage ?? "",
  };
}

function toPayload(form: BlockFormState) {
  const source: any = {
    type: form.sourceType,
    limit: form.limit,
  };

  switch (form.sourceType) {
    case "collection":
      source.collectionId = form.collectionId || null;
      break;
    case "category":
      // No extra fields — uses `limit` only.
      break;
    case "promotion":
      source.promotionId = form.promotionId || null;
      source.promotionMode = form.promotionMode;
      break;
    case "recommendation":
      source.recommendationKind = form.recommendationKind || null;
      break;
    case "related":
      source.relatedStrategy = form.relatedStrategy;
      source.relatedCollectionId =
        form.relatedStrategy === "collection"
          ? form.relatedCollectionId || null
          : null;
      break;
    case "manual":
      source.refs = form.refs.map((r, i) => ({
        ...(r._id ? { _id: r._id } : {}),
        refModel: r.refModel,
        refId: r.refId,
        label: r.label || null,
        image: r.image || null,
        description: r.description || null,
        order: i,
      }));
      break;
  }

  return {
    name: form.name,
    description: form.description,
    location: form.location,
    sectionTitle: form.sectionTitle,
    order: form.order,
    visible: form.visible,
    source,
    display: form.display,
    columns: form.columns,
    showImages: form.showImages,
    displayConfig: form.displayConfig,
    sourceStyles: form.sourceStyles,
    ctaText: form.ctaText,
    ctaLink: form.ctaLink,
    ctaStyle: form.ctaStyle,
    backgroundColor: form.backgroundColor,
    backgroundImage: form.backgroundImage,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Primitive atoms                               */
/* -------------------------------------------------------------------------- */

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="mb-3 sm:mb-4">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function BooleanChoice({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex shrink-0 overflow-hidden rounded-md border border-border bg-muted/40 p-0.5"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value}
          onClick={() => onChange(true)}
          className={`rounded px-3 py-1 text-xs font-semibold transition ${
            value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          onClick={() => onChange(false)}
          className={`rounded px-3 py-1 text-xs font-semibold transition ${
            !value
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Bulk add picker                                 */
/* -------------------------------------------------------------------------- */

function BulkAddPicker({
  refOptions,
  existingRefs,
  limit,
  onAdd,
}: {
  refOptions: Record<string, BlockRefOption[]>;
  existingRefs: UiRef[];
  limit: number;
  onAdd: (refs: UiRef[]) => void;
}) {
  const [model, setModel] = useState<BlockRefModel>("Product");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const options = refOptions[model] ?? [];

  const existingIds = useMemo(
    () =>
      new Set(
        existingRefs
          .filter((r) => r.refModel === model && r.refId)
          .map((r) => r.refId),
      ),
    [existingRefs, model],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.name.toLowerCase().includes(q))
      : [...options];
    return list.sort((a, b) =>
      sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
  }, [options, search, sortOrder]);

  const remaining = Math.max(0, limit - existingRefs.length);
  const atLimit = remaining <= 0;
  const availableFiltered = filtered.filter((o) => !existingIds.has(o.id));
  const allVisibleSelected =
    availableFiltered.length > 0 &&
    availableFiltered.every((o) => selectedIds.includes(o.id));

  const toggle = (id: string) => {
    if (existingIds.has(id)) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (atLimit) return;
    const allowed = availableFiltered.slice(0, remaining).map((o) => o.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...allowed])));
  };

  const clear = () => setSelectedIds([]);

  const addSelected = () => {
    if (atLimit) return;
    const ids = selectedIds
      .filter((id) => !existingIds.has(id))
      .slice(0, remaining);
    const refs: UiRef[] = ids
      .map((id) => {
        const opt = options.find((o) => o.id === id);
        if (!opt) return null;
        return {
          ...newRef(),
          refModel: model,
          refId: id,
          label: opt.name,
        };
      })
      .filter(Boolean) as UiRef[];
    onAdd(refs);
    setSelectedIds([]);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
      <div className="mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bulk add {model}s
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick a model, sort by name, then select items to append to the list
          below.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_9rem]">
        <select
          value={model}
          onChange={(e) => {
            setModel(e.target.value as BlockRefModel);
            setSelectedIds([]);
          }}
          className={inputCls}
        >
          {BLOCK_REF_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${model.toLowerCase()}s…`}
          className={inputCls}
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          className={inputCls}
        >
          <option value="asc">Name (A → Z)</option>
          <option value="desc">Name (Z → A)</option>
        </select>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={
              atLimit || allVisibleSelected || availableFiltered.length === 0
            }
            className="rounded border border-blue-500 px-2.5 py-1 font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select All (max {remaining})
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={selectedIds.length === 0}
            className="rounded border border-border px-2.5 py-1 text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={addSelected}
            disabled={atLimit || selectedIds.length === 0}
            className="rounded bg-primary px-2.5 py-1 font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add {selectedIds.length} selected
          </button>
        </div>
        <span className="text-muted-foreground">
          {existingRefs.length}/{limit} total
        </span>
      </div>

      <div className="mt-2 max-h-56 overflow-y-auto rounded border border-border bg-background">
        {availableFiltered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            {atLimit ? `Limit of ${limit} reached.` : "No matching items."}
          </p>
        ) : (
          availableFiltered.map((o) => {
            const isSelected = selectedIds.includes(o.id);
            const disabled = !isSelected && selectedIds.length >= remaining;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => !disabled && toggle(o.id)}
                className={`flex w-full items-center gap-2 border-b border-border px-3 py-1.5 text-left text-xs last:border-b-0 ${
                  disabled ? "opacity-40" : "hover:bg-muted/40"
                }`}
              >
                <span
                  className={`flex size-4 items-center justify-center rounded border-2 ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {isSelected ? "✓" : ""}
                </span>
                <span className="truncate">{o.name}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Manual refs editor                            */
/* -------------------------------------------------------------------------- */

function RefsEditor({
  refs,
  refOptions,
  onChange,
}: {
  refs: UiRef[];
  refOptions: Record<string, BlockRefOption[]>;
  onChange: (refs: UiRef[]) => void;
}) {
  const patch = (index: number, changes: Partial<UiRef>) => {
    onChange(refs.map((r, i) => (i === index ? { ...r, ...changes } : r)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= refs.length) return;
    const next = [...refs];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(refs.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...refs, newRef()]);
  };

  return (
    <div className="space-y-3">
      {refs.map((ref, i) => {
        const options = refOptions[ref.refModel] ?? [];
        const selected = options.find((o) => o.id === ref.refId);

        return (
          <div
            key={ref._key}
            className="rounded-lg border border-border bg-background p-3"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === refs.length - 1}
                  className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Item {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <select
                value={ref.refModel}
                onChange={(e) =>
                  patch(i, {
                    refModel: e.target.value as BlockRefModel,
                    refId: "",
                  })
                }
                className={inputCls}
              >
                {BLOCK_REF_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={ref.refId}
                onChange={(e) => patch(i, { refId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select {ref.refModel}…</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <input
              value={ref.label}
              onChange={(e) => patch(i, { label: e.target.value })}
              placeholder={selected?.name ?? "Label (optional)"}
              className={`${inputCls} mt-2`}
            />

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                value={ref.image}
                onChange={(e) => patch(i, { image: e.target.value })}
                placeholder="Image URL override (optional)"
                className={inputCls}
              />
              <input
                value={ref.description}
                onChange={(e) => patch(i, { description: e.target.value })}
                placeholder="Description override (optional)"
                className={inputCls}
              />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        + Add empty ref
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Live preview                                  */
/* -------------------------------------------------------------------------- */

function LivePreview({ form }: { form: BlockFormState }) {
  const cfg = form.displayConfig;
  const isCircle = cfg.cardShape === "circle";

  const themeCls =
    cfg.theme === "dark"
      ? "bg-neutral-900 text-neutral-100"
      : cfg.theme === "light"
        ? "bg-white text-neutral-900"
        : "bg-muted/40";

  const alignCls = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    stretch: "justify-between",
  }[cfg.alignment];

  const previewCls = [
    "rounded-lg border p-3",
    themeCls,
    cfg.borderless ? "border-transparent" : "border-border",
    cfg.rounded ? "rounded-xl" : "rounded-none",
    cfg.shadow ? "shadow-md" : "",
  ].join(" ");

  const cells = Array.from(
    { length: Math.min(form.columns * 2, 8) },
    (_, i) => i,
  );

  const imageCls = isCircle
    ? "mx-auto aspect-square w-full max-w-[64px] rounded-full bg-current/10"
    : "aspect-square w-full rounded-md bg-current/10";
  const cellCls = isCircle
    ? "flex flex-col items-center gap-1.5"
    : "space-y-1.5";

  return (
    <div className="space-y-3">
      {form.sectionTitle ? (
        <p className="text-sm font-semibold text-foreground">
          {form.sectionTitle}
        </p>
      ) : null}

      {form.display === "grid" && (
        <div className={previewCls}>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${form.columns}, minmax(0, 1fr))`,
            }}
          >
            {cells.map((i) => (
              <div key={i} className={cellCls}>
                {form.showImages ? <div className={imageCls} /> : null}
                <div className="h-1.5 w-10 rounded bg-current/40" />
                {!isCircle ? (
                  <div className="h-1.5 w-16 rounded bg-current/20" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {form.display === "carousel" && (
        <div className={`${previewCls} flex gap-3 overflow-hidden`}>
          {cells.slice(0, 4).map((i) => (
            <div
              key={i}
              className={`min-w-20 flex-1 ${isCircle ? "flex flex-col items-center gap-1.5" : "space-y-1.5"}`}
            >
              {form.showImages ? (
                <div
                  className={
                    isCircle
                      ? "aspect-square w-full max-w-[72px] rounded-full bg-current/10"
                      : "aspect-square w-full rounded-md bg-current/10"
                  }
                />
              ) : null}
              <div className="h-1.5 w-12 rounded bg-current/40" />
            </div>
          ))}
        </div>
      )}

      {form.display === "list" && (
        <div className={`${previewCls} space-y-2`}>
          {cells.slice(0, 4).map((i) => (
            <div key={i} className="flex items-center gap-2">
              {form.showImages ? (
                <div
                  className={`size-6 bg-current/10 ${isCircle ? "rounded-full" : "rounded"}`}
                />
              ) : null}
              <div className="h-1.5 w-24 rounded bg-current/40" />
            </div>
          ))}
        </div>
      )}

      {form.display === "hero" && (
        <div className={`${previewCls}`}>
          <div className="aspect-[16/9] w-full rounded-md bg-current/10" />
          <div className="mt-2 h-2 w-32 rounded bg-current/50" />
        </div>
      )}

      {form.ctaText && form.ctaStyle !== "none" ? (
        <div className={`flex ${alignCls}`}>
          <span
            className={
              form.ctaStyle === "button"
                ? "rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                : "text-xs font-semibold text-primary"
            }
          >
            {form.ctaText} →
          </span>
        </div>
      ) : null}

      <dl className="space-y-1 text-xs">
        <Row label="Location" value={form.location} />
        <Row label="Source" value={form.sourceType} />
        <Row label="Display" value={form.display} />
        <Row label="Shape" value={cfg.cardShape} />
        <Row label="Theme" value={cfg.theme} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Main form                                 */
/* -------------------------------------------------------------------------- */

const emptyOptions: BlockOptions = {
  collections: [],
  promotions: [],
  refOptions: {},
};

const ContentBlockForm = ({ id }: { id?: string }) => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<BlockFormState>({ ...emptyForm });
  const [options, setOptions] = useState<BlockOptions>(emptyOptions);

  const bgUpload = useFileUploader(
    id || "new-block",
    form.backgroundImage ? [form.backgroundImage] : [],
    "blocks/backgrounds",
  );
  const bgUploadKey = useMemo(
    () => form.backgroundImage || "none",
    [form.backgroundImage],
  );

  useEffect(() => {
    const url = bgUpload.files[0] || "";
    if (url !== form.backgroundImage) {
      setForm((p) => ({ ...p, backgroundImage: url }));
    }
  }, [bgUpload.files, form.backgroundImage]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [opts, existing] = await Promise.all([
          getBlockOptions(),
          id ? getBlockById(id) : Promise.resolve(null),
        ]);

        if (opts.success) setOptions(opts.data);
        else setError(opts.error);

        if (existing && !existing.success) {
          setError(existing.error);
        } else if (existing && existing.success) {
          const next = fromApi(existing.data);
          setForm(next);
          if (next.backgroundImage) {
            bgUpload.setFiles([next.backgroundImage]);
          }
        }
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const patch = (changes: Partial<BlockFormState>) =>
    setForm((p) => ({ ...p, ...changes }));

  const patchDisplayConfig = (changes: Partial<BlockDisplayConfig>) =>
    setForm((p) => ({
      ...p,
      displayConfig: { ...p.displayConfig, ...changes },
    }));

  const patchSourceStyles = (changes: Partial<BlockSourceStyles>) =>
    setForm((p) => ({
      ...p,
      sourceStyles: { ...p.sourceStyles, ...changes },
    }));

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : NUMERIC_FIELDS.has(name)
          ? Number(value)
          : value;
    patch({ [name]: val } as any);
  };

  const handleRemoveBackground = async () => {
    if (!id) {
      bgUpload.setFiles([]);
      patch({ backgroundImage: "" });
      return;
    }
    try {
      const result = await deleteBlockBackgroundImage(id);
      if (!result.success) throw new Error(result.error || "Failed to remove");
      bgUpload.setFiles([]);
      patch({ backgroundImage: "" });
      flash("Background image removed");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (form.sourceType === "collection" && !form.collectionId) {
        setError("Select a collection.");
        setSubmitting(false);
        return;
      }
      if (form.sourceType === "promotion" && !form.promotionId) {
        setError("Select a promotion.");
        setSubmitting(false);
        return;
      }
      if (form.sourceType === "recommendation" && !form.recommendationKind) {
        setError("Select a recommendation kind.");
        setSubmitting(false);
        return;
      }
      if (
        form.sourceType === "related" &&
        form.relatedStrategy === "collection" &&
        !form.relatedCollectionId
      ) {
        setError("Select a related collection.");
        setSubmitting(false);
        return;
      }
      if (
        form.sourceType === "manual" &&
        (form.refs.length === 0 || form.refs.some((r) => !r.refId))
      ) {
        setError("Add at least one ref with a selection.");
        setSubmitting(false);
        return;
      }
      if (form.sourceType === "manual" && form.refs.length > MAX_BLOCK_LIMIT) {
        setError(`Manual sources can contain at most ${MAX_BLOCK_LIMIT} refs.`);
        setSubmitting(false);
        return;
      }

      const payload = toPayload(form);
      const result = id
        ? await updateBlock(id, payload)
        : await createBlock(payload);

      if (result.success) {
        setSuccess(result.message || (id ? "Block updated" : "Block created"));
        setTimeout(() => {
          router.push("/channels/store/content/blocks");
          router.refresh();
        }, 1200);
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setSubmitting(false);
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
    <div className="mx-auto max-w-6xl p-2 sm:p-6">
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

      <h2 className="mb-4 text-xl font-bold text-foreground sm:mb-6 sm:text-2xl">
        {id ? "Edit Block" : "Create Block"}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6"
      >
        <div className="space-y-5 sm:space-y-6">
          {/* ---------------- Identity ---------------- */}
          <Section title="Identity">
            <Field label="Name *">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className={inputCls}
                placeholder="e.g., Home — Shop by category"
              />
            </Field>
            <Field label="Description" hint="Admin-only note. Not rendered.">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className={inputCls}
              />
            </Field>
            <Field
              label="Section title"
              hint="Heading shown above the block on the storefront."
            >
              <input
                name="sectionTitle"
                value={form.sectionTitle}
                onChange={handleChange}
                className={inputCls}
                placeholder="e.g., Shop by category"
              />
            </Field>
          </Section>

          {/* ---------------- Placement ---------------- */}
          <Section title="Placement">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location">
                <select
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {BLOCK_LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Order (lower = earlier)">
                <input
                  type="number"
                  name="order"
                  value={form.order}
                  onChange={handleChange}
                  min={0}
                  className={inputCls}
                />
              </Field>
            </div>
            <BooleanChoice
              label="Visible on storefront"
              value={form.visible}
              onChange={(v) => patch({ visible: v })}
            />
          </Section>

          {/* ---------------- Source ---------------- */}
          <Section
            title="Source"
            description="What entities this block renders. The resolver expands the source into a flat list of items at request time."
          >
            <div className="-mx-1 flex flex-wrap gap-2 px-1">
              {BLOCK_SOURCE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => patch({ sourceType: t })}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    form.sourceType === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {form.sourceType === "collection" && (
              <Field
                label="Collection"
                hint="Resolved using the collection's own type (rule / manual / recommendation / related)."
              >
                <select
                  value={form.collectionId}
                  onChange={(e) => patch({ collectionId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select a collection…</option>
                  {options.collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.sublabel ? ` — ${c.sublabel}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {form.sourceType === "category" && (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Lists all categories directly. Tip: set{" "}
                <strong>Card shape → circle</strong> below for the classic
                shop-by-category look — it works with grid, carousel, and list.
              </p>
            )}

            {form.sourceType === "promotion" && (
              <>
                <Field label="Promotion">
                  <select
                    value={form.promotionId}
                    onChange={(e) => patch({ promotionId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select a promotion…</option>
                    {options.promotions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.sublabel ? ` — ${p.sublabel}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Mode"
                  hint="'Products' lists matching products. 'Promotion' renders a single card for the promotion itself."
                >
                  <select
                    value={form.promotionMode}
                    onChange={(e) =>
                      patch({ promotionMode: e.target.value as PromotionMode })
                    }
                    className={inputCls}
                  >
                    {PROMOTION_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            {form.sourceType === "recommendation" && (
              <Field
                label="Kind"
                hint="Resolved per visitor. Falls back to trending when there's no session."
              >
                <select
                  value={form.recommendationKind}
                  onChange={(e) =>
                    patch({
                      recommendationKind: e.target.value as RecommendationKind,
                    })
                  }
                  className={inputCls}
                >
                  <option value="">Select a kind…</option>
                  {RECOMMENDATION_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {form.sourceType === "related" && (
              <>
                <Field
                  label="Strategy"
                  hint="'Auto' uses the product's related engine. 'Collection' runs a collection against the current product."
                >
                  <select
                    value={form.relatedStrategy}
                    onChange={(e) =>
                      patch({
                        relatedStrategy: e.target.value as
                          | "auto"
                          | "collection",
                      })
                    }
                    className={inputCls}
                  >
                    <option value="auto">auto</option>
                    <option value="collection">collection</option>
                  </select>
                </Field>
                {form.relatedStrategy === "collection" && (
                  <Field label="Collection">
                    <select
                      value={form.relatedCollectionId}
                      onChange={(e) =>
                        patch({ relatedCollectionId: e.target.value })
                      }
                      className={inputCls}
                    >
                      <option value="">Select a collection…</option>
                      {options.collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.sublabel ? ` — ${c.sublabel}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </>
            )}

            {form.sourceType === "manual" && (
              <>
                <BulkAddPicker
                  refOptions={options.refOptions}
                  existingRefs={form.refs}
                  limit={MAX_BLOCK_LIMIT}
                  onAdd={(newRefs) =>
                    patch({ refs: [...form.refs, ...newRefs] })
                  }
                />
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Added refs ({form.refs.length} / {MAX_BLOCK_LIMIT})
                    </h4>
                  </div>
                  <RefsEditor
                    refs={form.refs}
                    refOptions={options.refOptions}
                    onChange={(refs) => patch({ refs })}
                  />
                </div>
              </>
            )}

            {form.sourceType !== "manual" && (
              <Field
                label="Limit"
                hint={`Max items to resolve (1–${MAX_BLOCK_LIMIT}).`}
              >
                <input
                  type="number"
                  name="limit"
                  value={form.limit}
                  onChange={handleChange}
                  min={1}
                  max={MAX_BLOCK_LIMIT}
                  className={inputCls}
                />
              </Field>
            )}
          </Section>

          {/* ---------------- Display ---------------- */}
          <Section title="Display & layout">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Display">
                <select
                  value={form.display}
                  onChange={(e) =>
                    patch({ display: e.target.value as BlockDisplay })
                  }
                  className={inputCls}
                >
                  {BLOCK_DISPLAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              {(form.display === "grid" || form.display === "carousel") && (
                <Field label="Columns">
                  <select
                    value={form.columns}
                    onChange={(e) => patch({ columns: Number(e.target.value) })}
                    className={inputCls}
                  >
                    {BLOCK_COLUMN_COUNTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field
                label="Card shape"
                hint={
                  form.displayConfig.cardShape === "circle"
                    ? "Circle overrides the Rounded corners toggle."
                    : "Rectangle card. Toggle Rounded corners below for softer edges."
                }
              >
                <select
                  value={form.displayConfig.cardShape}
                  onChange={(e) =>
                    patchDisplayConfig({
                      cardShape: e.target.value as CardShape,
                    })
                  }
                  className={inputCls}
                >
                  {CARD_SHAPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <BooleanChoice
              label="Show images"
              value={form.showImages}
              onChange={(v) => patch({ showImages: v })}
            />

            <div className="rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Panel behaviour
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Theme">
                  <select
                    value={form.displayConfig.theme}
                    onChange={(e) =>
                      patchDisplayConfig({
                        theme: e.target.value as BlockTheme,
                      })
                    }
                    className={inputCls}
                  >
                    {BLOCK_THEMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Alignment">
                  <select
                    value={form.displayConfig.alignment}
                    onChange={(e) =>
                      patchDisplayConfig({
                        alignment: e.target.value as BlockAlignment,
                      })
                    }
                    className={inputCls}
                  >
                    {BLOCK_ALIGNMENTS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label={`Item gap — ${form.displayConfig.gap}px`}>
                    <input
                      type="range"
                      min={0}
                      max={64}
                      step={2}
                      value={form.displayConfig.gap}
                      onChange={(e) =>
                        patchDisplayConfig({ gap: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <BooleanChoice
                  label="Borderless"
                  value={form.displayConfig.borderless}
                  onChange={(v) => patchDisplayConfig({ borderless: v })}
                />
                <BooleanChoice
                  label="Rounded corners"
                  value={form.displayConfig.rounded}
                  onChange={(v) => patchDisplayConfig({ rounded: v })}
                  hint={
                    form.displayConfig.cardShape === "circle"
                      ? "Ignored when card shape is circle."
                      : undefined
                  }
                />
                <BooleanChoice
                  label="Drop shadow"
                  value={form.displayConfig.shadow}
                  onChange={(v) => patchDisplayConfig({ shadow: v })}
                />
              </div>
            </div>
          </Section>

          {/* ---------------- Source-specific styles ---------------- */}
          <Section
            title="Source-specific styles"
            description="Appearance hints applied only to items resolved from this source type."
          >
            {form.sourceType === "promotion" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Badge style">
                  <select
                    value={form.sourceStyles.promotionBadgeStyle}
                    onChange={(e) =>
                      patchSourceStyles({
                        promotionBadgeStyle: e.target
                          .value as PromotionBadgeStyle,
                      })
                    }
                    className={inputCls}
                  >
                    {PROMOTION_BADGE_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <BooleanChoice
                  label="Show promotion code"
                  value={form.sourceStyles.promotionShowCode}
                  onChange={(v) => patchSourceStyles({ promotionShowCode: v })}
                />
              </div>
            )}

            {form.sourceType === "collection" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <BooleanChoice
                  label="Show item count"
                  value={form.sourceStyles.collectionShowItemCount}
                  onChange={(v) =>
                    patchSourceStyles({ collectionShowItemCount: v })
                  }
                />
                {form.sourceStyles.collectionShowItemCount && (
                  <Field label="Count position">
                    <select
                      value={form.sourceStyles.collectionCountPosition}
                      onChange={(e) =>
                        patchSourceStyles({
                          collectionCountPosition: e.target
                            .value as CollectionCountPosition,
                        })
                      }
                      className={inputCls}
                    >
                      {COLLECTION_COUNT_POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            )}

            {form.sourceType === "recommendation" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Badge style">
                  <select
                    value={form.sourceStyles.recommendationBadgeStyle}
                    onChange={(e) =>
                      patchSourceStyles({
                        recommendationBadgeStyle: e.target
                          .value as RecommendationBadgeStyle,
                      })
                    }
                    className={inputCls}
                  >
                    {RECOMMENDATION_BADGE_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <BooleanChoice
                  label="Show recommendation reason"
                  value={form.sourceStyles.recommendationShowReason}
                  onChange={(v) =>
                    patchSourceStyles({ recommendationShowReason: v })
                  }
                />
              </div>
            )}

            {form.sourceType === "related" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Variant">
                  <select
                    value={form.sourceStyles.relatedVariant}
                    onChange={(e) =>
                      patchSourceStyles({
                        relatedVariant: e.target.value as RelatedVariant,
                      })
                    }
                    className={inputCls}
                  >
                    {RELATED_VARIANTS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <BooleanChoice
                  label="Show match score"
                  value={form.sourceStyles.relatedShowScore}
                  onChange={(v) => patchSourceStyles({ relatedShowScore: v })}
                />
              </div>
            )}

            {form.sourceType === "manual" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Card size">
                  <select
                    value={form.sourceStyles.manualCardSize}
                    onChange={(e) =>
                      patchSourceStyles({
                        manualCardSize: e.target.value as CardSize,
                      })
                    }
                    className={inputCls}
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
                    value={form.sourceStyles.manualCardVariant}
                    onChange={(e) =>
                      patchSourceStyles({
                        manualCardVariant: e.target.value as CardVariant,
                      })
                    }
                    className={inputCls}
                  >
                    {CARD_VARIANTS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <BooleanChoice
                  label="Show description"
                  value={form.sourceStyles.manualShowDescription}
                  onChange={(v) =>
                    patchSourceStyles({ manualShowDescription: v })
                  }
                />
              </div>
            )}

            {form.sourceType === "category" && (
              <p className="text-xs text-muted-foreground">
                Category sources don't have extra style options. Pair with{" "}
                <strong>Card shape → circle</strong> in the Display section for
                the round category tile look.
              </p>
            )}
          </Section>

          {/* ---------------- CTA ---------------- */}
          <Section title="Call to action">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CTA text">
                <input
                  name="ctaText"
                  value={form.ctaText}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="e.g., View all"
                />
              </Field>
              <Field label="CTA link">
                <input
                  name="ctaLink"
                  value={form.ctaLink}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="/collections/all"
                />
              </Field>
              <Field label="CTA style">
                <select
                  name="ctaStyle"
                  value={form.ctaStyle}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {CTA_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* ---------------- Surface ---------------- */}
          <Section
            title="Surface"
            description="Background for the block itself, if it should differ from the page."
          >
            <Field label="Background color">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="color"
                  name="backgroundColor"
                  value={form.backgroundColor || "#ffffff"}
                  onChange={handleChange}
                  className="h-10 w-full rounded border border-border bg-background sm:w-10"
                />
                <input
                  type="text"
                  name="backgroundColor"
                  value={form.backgroundColor}
                  onChange={handleChange}
                  className={`${inputCls} flex-1`}
                  placeholder="transparent"
                />
              </div>
            </Field>
            <div>
              <span className="mb-1 block text-sm font-medium text-foreground">
                Background image
              </span>
              <FilesUploader
                key={bgUploadKey}
                files={bgUpload.files}
                addFiles={bgUpload.addFiles}
                onRemove={handleRemoveBackground}
                loading={bgUpload.loading}
                progressByName={bgUpload.progressByName}
              />
            </div>
          </Section>

          {/* ---------------- Actions ---------------- */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  {id ? "Updating…" : "Creating…"}
                </span>
              ) : id ? (
                "Update Block"
              ) : (
                "Create Block"
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-md border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ---------------- Preview ---------------- */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live preview
            </h3>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 sm:p-4">
              <LivePreview form={form} />
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default ContentBlockForm;
