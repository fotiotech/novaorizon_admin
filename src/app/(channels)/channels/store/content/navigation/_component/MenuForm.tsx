// components/MenuForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMenuById,
  createMenu,
  updateMenu,
  getMenuRefOptions,
  deleteMenuBackgroundImage,
  deleteMenuImage,
  type MenuRefOptions,
} from "@/app/actions/menu";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import FilesUploader from "@/components/FilesUploader";
import useFileUploader from "@/hooks/useFileUploader";
import {
  MENU_LOCATIONS,
  SUBMENU_DISPLAY_TYPES,
  ALIGNMENTS,
  POSITIONS,
  ANIMATIONS,
  COLUMN_COUNTS,
  LINK_TYPES,
  REF_TYPES,
  REF_MODEL_BY_TYPE,
  MAX_DEPTH,
  type LinkType,
  type SubmenuDisplayType,
  type Alignment,
  type Position,
  type MenuDisplayType,
} from "@/lib/menu/constants";
import {
  getCapabilities,
  supportsMenuFeature,
  availableDisplays,
  locationHint,
  displayWarning,
  snapDisplay,
  defaultSubmenuDisplay,
  type LocationCapabilities,
  type MenuFeatureKey,
} from "@/lib/menu/capabilities";
import {
  DEFAULT_DISPLAY_CONFIG,
  MENU_THEMES,
  type IMenuDisplayConfig,
  type IMenuFeaturedSlot,
} from "@/models/Menu";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type UiItem = {
  _key: string;
  _id?: string;
  label: string;
  type: LinkType;
  refId: string | null;
  refModel: string | null;
  url: string;
  icon: string | null;
  badge: string | null;
  openInNewTab: boolean;
  isVisible: boolean;
  submenuDisplay: SubmenuDisplayType | null;
  columns: number;
  submenuPosition: Position;
  align: Alignment;
  featured: IMenuFeaturedSlot | null;
  children: UiItem[];
};

interface MenuFormState {
  name: string;
  description: string;
  image: string;
  items: UiItem[];
  location: string;
  order: number;
  isSticky: boolean;
  visible: boolean;
  display: MenuDisplayType;
  columns: number;
  maxDepth: number;
  showImages: boolean;
  displayConfig: IMenuDisplayConfig;
  backgroundColor: string;
  backgroundImage: string;
}

/* -------------------------------------------------------------------------- */
/*                            Item constructors                               */
/* -------------------------------------------------------------------------- */

const baseItem = (): UiItem => ({
  _key: crypto.randomUUID(),
  label: "",
  type: "custom",
  refId: null,
  refModel: null,
  url: "",
  icon: null,
  badge: null,
  openInNewTab: false,
  isVisible: true,
  submenuDisplay: null,
  columns: 3,
  submenuPosition: "bottom-start",
  align: "start",
  featured: null,
  children: [],
});

const makeItemForLocation = (location: string): UiItem => ({
  ...baseItem(),
  submenuDisplay: defaultSubmenuDisplay(location),
});

const emptyMenu: MenuFormState = {
  name: "",
  description: "",
  image: "",
  items: [],
  location: "NavBar",
  order: 0,
  isSticky: false,
  visible: true,
  display: "horizontal",
  columns: 4,
  maxDepth: 2,
  showImages: false,
  displayConfig: { ...DEFAULT_DISPLAY_CONFIG },
  backgroundColor: "#ffffff",
  backgroundImage: "",
};

const NUMERIC_FIELDS = new Set(["order", "columns", "maxDepth"]);

/* -------------------------------------------------------------------------- */
/*                              Tree utilities                                */
/* -------------------------------------------------------------------------- */

function getAtPath(items: UiItem[], path: number[]): UiItem | undefined {
  let list = items;
  let current: UiItem | undefined;
  for (const i of path) {
    current = list[i];
    if (!current) return undefined;
    list = current.children;
  }
  return current;
}

function updateChildrenAtPath(
  items: UiItem[],
  path: number[],
  updater: (children: UiItem[]) => UiItem[],
): UiItem[] {
  if (!path.length) return updater(items);
  const [head, ...rest] = path;
  return items.map((item, i) =>
    i === head
      ? {
          ...item,
          children: updateChildrenAtPath(item.children, rest, updater),
        }
      : item,
  );
}

function updateAtPath(
  items: UiItem[],
  path: number[],
  updater: (n: UiItem) => UiItem,
): UiItem[] {
  if (!path.length) return items;
  const [head, ...rest] = path;
  return items.map((item, i) => {
    if (i !== head) return item;
    if (!rest.length) return updater(item);
    return { ...item, children: updateAtPath(item.children, rest, updater) };
  });
}

function insertAtPath(
  items: UiItem[],
  parentPath: number[],
  node: UiItem,
): UiItem[] {
  return updateChildrenAtPath(items, parentPath, (list) => [...list, node]);
}

function removeAtPath(items: UiItem[], path: number[]): UiItem[] {
  if (!path.length) return items;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return updateChildrenAtPath(items, parentPath, (list) =>
    list.filter((_, i) => i !== index),
  );
}

function moveAtPath(items: UiItem[], path: number[], dir: -1 | 1): UiItem[] {
  if (!path.length) return items;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  const siblings = parentPath.length
    ? (getAtPath(items, parentPath)?.children ?? [])
    : items;
  const target = index + dir;
  if (target < 0 || target >= siblings.length) return items;
  return updateChildrenAtPath(items, parentPath, (list) => {
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
}

function countTree(items: UiItem[]): number {
  return items.reduce((sum, i) => sum + 1 + countTree(i.children), 0);
}

function countHidden(items: UiItem[]): number {
  return items.reduce(
    (sum, i) => sum + (i.isVisible ? 0 : 1) + countHidden(i.children),
    0,
  );
}

function toPayloadItems(items: UiItem[]): unknown[] {
  return items.map(({ _key, _id, children, ...rest }) => ({
    ...(_id ? { _id } : {}),
    ...rest,
    children: toPayloadItems(children),
  }));
}

function fromApiItems(raw: any[]): UiItem[] {
  return (raw ?? []).map((item) => ({
    _key: crypto.randomUUID(),
    _id: item._id ? String(item._id) : undefined,
    label: item.label ?? "",
    type: item.type ?? "custom",
    refId: item.refId ? String(item.refId) : null,
    refModel: item.refModel ?? null,
    url: item.url ?? "",
    icon: item.icon ?? null,
    badge: item.badge ?? null,
    openInNewTab: !!item.openInNewTab,
    isVisible: item.isVisible !== false,
    submenuDisplay: item.submenuDisplay ?? null,
    columns: item.columns ?? 3,
    submenuPosition: item.submenuPosition ?? "bottom-start",
    align: item.align ?? "start",
    featured: item.featured ?? null,
    children: fromApiItems(item.children ?? []),
  }));
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
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <div className="min-w-0">
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

function MiniSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`inline-block size-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Tree editor                                   */
/* -------------------------------------------------------------------------- */

type TreeCtx = {
  patch: (path: number[], changes: Partial<UiItem>) => void;
  remove: (path: number[]) => void;
  move: (path: number[], dir: -1 | 1) => void;
  addChild: (parentPath: number[]) => void;
  refOptions: MenuRefOptions;
  menuMaxDepth: number;
  caps: LocationCapabilities;
};

function TreeEditor({
  items,
  parentPath,
  depth,
  ctx,
}: {
  items: UiItem[];
  parentPath: number[];
  depth: number;
  ctx: TreeCtx;
}) {
  const canNest = depth < ctx.menuMaxDepth - 1;

  return (
    <ul
      className={
        depth ? "mt-2 space-y-2 border-l-2 border-border/60 pl-4" : "space-y-2"
      }
    >
      {items.map((item, i) => (
        <TreeRow
          key={item._key}
          item={item}
          path={[...parentPath, i]}
          depth={depth}
          ctx={ctx}
          canNest={canNest}
        />
      ))}
      <li>
        <button
          type="button"
          onClick={() => ctx.addChild(parentPath)}
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
        >
          + Add {depth === 0 ? "top-level" : "nested"} item
        </button>
      </li>
    </ul>
  );
}

function TreeRow({
  item,
  path,
  depth,
  ctx,
  canNest,
}: {
  item: UiItem;
  path: number[];
  depth: number;
  ctx: TreeCtx;
  canNest: boolean;
}) {
  const [showDisplay, setShowDisplay] = useState(false);
  const { caps } = ctx;

  const needsRef = (REF_TYPES as readonly string[]).includes(item.type);
  const options = item.refModel
    ? (ctx.refOptions[item.refModel as keyof MenuRefOptions] ?? [])
    : [];

  const showColumns =
    item.submenuDisplay === "mega" || item.submenuDisplay === "grid";

  const canSubmenu = caps.itemFeatures.has("submenuDisplay");
  const canPanelAlign = caps.itemFeatures.has("panelAlignment");
  const canPanelPos = caps.itemFeatures.has("panelPosition");
  const canItemColumns = caps.itemFeatures.has("columns");
  const canFeatured = caps.itemFeatures.has("featured");
  const canIcon = caps.itemFeatures.has("icon");
  const canBadge = caps.itemFeatures.has("badge");

  const hasDisplayPanel =
    canSubmenu || canPanelAlign || canPanelPos || canItemColumns || canIcon;

  const patchFeatured = (changes: Partial<IMenuFeaturedSlot>) => {
    ctx.patch(path, {
      featured: {
        image: "",
        title: "",
        href: "",
        ctaText: "",
        badge: "",
        ...(item.featured ?? {}),
        ...changes,
      },
    });
  };

  return (
    <li
      className={`rounded-lg border border-border bg-background p-3 transition-opacity ${
        item.isVisible ? "" : "opacity-70"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => ctx.move(path, -1)}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => ctx.move(path, 1)}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Move down"
          >
            ▼
          </button>
        </div>

        <input
          value={item.label}
          onChange={(e) => ctx.patch(path, { label: e.target.value })}
          placeholder="Label"
          className={`${inputCls} max-w-44`}
        />

        <select
          value={item.type}
          onChange={(e) => {
            const type = e.target.value as LinkType;
            const isRef = (REF_TYPES as readonly string[]).includes(type);
            ctx.patch(path, {
              type,
              refId: isRef ? item.refId : null,
              refModel: isRef ? (REF_MODEL_BY_TYPE[type] ?? null) : null,
              url: isRef ? "" : item.url,
            });
          }}
          className={`${inputCls} max-w-32`}
        >
          {LINK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {needsRef ? (
          <select
            value={item.refId ?? ""}
            onChange={(e) => ctx.patch(path, { refId: e.target.value || null })}
            className={`${inputCls} min-w-48 flex-1`}
          >
            <option value="">Select {item.type}…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={item.url}
            onChange={(e) => ctx.patch(path, { url: e.target.value })}
            placeholder="/pages/about"
            className={`${inputCls} min-w-48 flex-1`}
          />
        )}

        {canBadge ? (
          <input
            value={item.badge ?? ""}
            onChange={(e) => ctx.patch(path, { badge: e.target.value || null })}
            placeholder="Badge"
            className={`${inputCls} max-w-24`}
          />
        ) : null}

        <div className="flex items-center gap-1.5">
          <MiniSwitch
            checked={item.isVisible}
            onChange={(v) => ctx.patch(path, { isVisible: v })}
            label={item.isVisible ? "Visible" : "Hidden"}
          />
          <span
            className={`text-xs font-medium ${
              item.isVisible
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground"
            }`}
          >
            {item.isVisible ? "Visible" : "Hidden"}
          </span>
        </div>

        {hasDisplayPanel ? (
          <button
            type="button"
            onClick={() => setShowDisplay((s) => !s)}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            {showDisplay ? "Hide display" : "Display"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => ctx.remove(path)}
          className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
        >
          Remove
        </button>
      </div>

      {showDisplay && hasDisplayPanel ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {canSubmenu ? (
              <Field label="Submenu reveal">
                <select
                  value={item.submenuDisplay ?? ""}
                  onChange={(e) =>
                    ctx.patch(path, {
                      submenuDisplay: (e.target.value ||
                        null) as SubmenuDisplayType | null,
                    })
                  }
                  className={inputCls}
                >
                  <option value="">Default (dropdown)</option>
                  {SUBMENU_DISPLAY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {canPanelAlign ? (
              <Field label="Panel alignment">
                <select
                  value={item.align}
                  onChange={(e) =>
                    ctx.patch(path, { align: e.target.value as Alignment })
                  }
                  className={inputCls}
                >
                  {ALIGNMENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {canPanelPos ? (
              <Field label="Panel position">
                <select
                  value={item.submenuPosition}
                  onChange={(e) =>
                    ctx.patch(path, {
                      submenuPosition: e.target.value as Position,
                    })
                  }
                  className={inputCls}
                >
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {canItemColumns ? (
              <Field label="Columns">
                <select
                  value={item.columns}
                  disabled={!showColumns}
                  onChange={(e) =>
                    ctx.patch(path, { columns: Number(e.target.value) })
                  }
                  className={`${inputCls} disabled:opacity-40`}
                >
                  {COLUMN_COUNTS.map((c) => (
                    <option key={c} value={c}>
                      {c} columns
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {canIcon ? (
              <Field label="Icon" hint="Emoji or icon name.">
                <input
                  value={item.icon ?? ""}
                  onChange={(e) =>
                    ctx.patch(path, { icon: e.target.value || null })
                  }
                  placeholder="🛍️"
                  className={inputCls}
                />
              </Field>
            ) : null}
          </div>

          {canFeatured && showColumns ? (
            <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-3">
              <p className="text-xs font-semibold text-muted-foreground sm:col-span-2 lg:col-span-3">
                Featured slot (optional)
              </p>
              <Field label="Image URL">
                <input
                  value={item.featured?.image ?? ""}
                  onChange={(e) => patchFeatured({ image: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Title">
                <input
                  value={item.featured?.title ?? ""}
                  onChange={(e) => patchFeatured({ title: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Href">
                <input
                  value={item.featured?.href ?? ""}
                  onChange={(e) => patchFeatured({ href: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="CTA text">
                <input
                  value={item.featured?.ctaText ?? ""}
                  onChange={(e) => patchFeatured({ ctaText: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Badge">
                <input
                  value={item.featured?.badge ?? ""}
                  onChange={(e) => patchFeatured({ badge: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {canNest ? (
        <TreeEditor
          items={item.children}
          parentPath={path}
          depth={depth + 1}
          ctx={ctx}
        />
      ) : null}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Live preview                                  */
/* -------------------------------------------------------------------------- */

function LivePreview({ menu }: { menu: MenuFormState }) {
  const cfg = menu.displayConfig;
  const isGrid = menu.display === "grid";

  const alignCls = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    stretch: "justify-between",
  }[cfg.alignment];

  const themePreview =
    cfg.theme === "dark"
      ? "bg-neutral-900 text-neutral-100"
      : cfg.theme === "light"
        ? "bg-white text-neutral-900"
        : "bg-muted";

  const panelCls = [
    "rounded-md border p-3",
    themePreview,
    cfg.borderless ? "border-transparent" : "border-border",
    cfg.rounded ? "rounded-xl" : "rounded-none",
    cfg.shadow ? "shadow-md" : "",
  ].join(" ");

  const visibleItems = menu.items.filter((i) => i.isVisible);

  return (
    <div className="space-y-3">
      {isGrid ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleItems.slice(0, 6).map((item) => (
            <div
              key={item._key}
              className="rounded-md border border-border bg-muted/40 p-3 text-center text-xs font-medium text-foreground"
            >
              {item.icon ? (
                <div className="mb-1 text-lg">{item.icon}</div>
              ) : null}
              {item.label || "Untitled"}
            </div>
          ))}
          {visibleItems.length === 0 ? (
            <p className="col-span-full text-xs text-muted-foreground">
              No items yet.
            </p>
          ) : null}
        </div>
      ) : (
        <div
          className={`flex items-center ${alignCls}`}
          style={{ gap: `${cfg.gap}px` }}
        >
          {visibleItems.slice(0, 5).map((item, i) => (
            <div
              key={item._key}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {item.label || "Untitled"}
              {cfg.showCaret && item.children.length ? (
                <span className="ml-1">▾</span>
              ) : null}
            </div>
          ))}
          {visibleItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">No items yet.</p>
          ) : null}
        </div>
      )}

      {menu.items[0]?.children?.length && !isGrid ? (
        <div
          className={`${panelCls} mx-auto`}
          style={{ maxWidth: cfg.megaWidth }}
        >
          <ul className="space-y-1.5 text-xs">
            {menu.items[0].children
              .filter((c) => c.isVisible)
              .map((child) => (
                <li key={child._key}>
                  <span className="font-medium">
                    {child.label || "Untitled"}
                  </span>
                  {child.children.length ? (
                    <ul className="ml-3 mt-1 space-y-1 opacity-70">
                      {child.children
                        .filter((g) => g.isVisible)
                        .slice(0, 3)
                        .map((g) => (
                          <li key={g._key}>· {g.label || "Untitled"}</li>
                        ))}
                    </ul>
                  ) : null}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <dl className="mt-1 space-y-1 text-xs">
        <PreviewRow label="Items" value={String(countTree(menu.items))} />
        {countHidden(menu.items) > 0 ? (
          <PreviewRow label="Hidden" value={String(countHidden(menu.items))} />
        ) : null}
        <PreviewRow label="Location" value={menu.location} />
        <PreviewRow label="Display" value={menu.display} />
        <PreviewRow label="Theme" value={cfg.theme} />
        <PreviewRow label="Depth" value={String(menu.maxDepth)} />
      </dl>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
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

const emptyRefOptions: MenuRefOptions = {
  Category: [],
  Product: [],
  Collection: [],
};

const MenuForm = ({ id }: { id?: string }) => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [menu, setMenu] = useState<MenuFormState>({ ...emptyMenu });
  const [refOptions, setRefOptions] = useState<MenuRefOptions>(emptyRefOptions);

  const caps = useMemo(() => getCapabilities(menu.location), [menu.location]);

  const imgUpload = useFileUploader(
    id || "new-menu",
    menu.image ? [menu.image] : [],
    "menus/images",
  );
  const bgUpload = useFileUploader(
    id || "new-menu",
    menu.backgroundImage ? [menu.backgroundImage] : [],
    "menus/backgrounds",
  );
  const imgUploadKey = useMemo(() => menu.image || "none", [menu.image]);
  const bgUploadKey = useMemo(
    () => menu.backgroundImage || "none",
    [menu.backgroundImage],
  );

  useEffect(() => {
    const url = imgUpload.files[0] || "";
    if (url !== menu.image) setMenu((p) => ({ ...p, image: url }));
  }, [imgUpload.files, menu.image]);

  useEffect(() => {
    const url = bgUpload.files[0] || "";
    if (url !== menu.backgroundImage) {
      setMenu((p) => ({ ...p, backgroundImage: url }));
    }
  }, [bgUpload.files, menu.backgroundImage]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [refs, existing] = await Promise.all([
          getMenuRefOptions(),
          id ? getMenuById(id) : Promise.resolve(null),
        ]);

        if (refs.success) setRefOptions(refs.data);
        else setError(refs.error);

        if (existing && !existing.success) {
          setError(existing.error);
        } else if (existing && existing.success) {
          const data = existing.data;
          const location = data.location || "NavBar";
          setMenu({
            ...emptyMenu,
            name: data.name || "",
            description: data.description || "",
            image: data.image || "",
            items: fromApiItems(data.items ?? []),
            location,
            order: data.order ?? 0,
            isSticky: data.isSticky ?? false,
            visible: data.visible ?? true,
            display: snapDisplay(location, data.display || "horizontal"),
            columns: data.columns ?? 4,
            maxDepth: data.maxDepth ?? 2,
            showImages: data.showImages ?? false,
            displayConfig: {
              ...DEFAULT_DISPLAY_CONFIG,
              ...(data.displayConfig ?? {}),
            },
            backgroundColor: data.backgroundColor || "#ffffff",
            backgroundImage: data.backgroundImage || "",
          });
          if (data.image) imgUpload.setFiles([data.image]);
          if (data.backgroundImage) bgUpload.setFiles([data.backgroundImage]);
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
    setMenu((p) => ({ ...p, [name]: val }));
  };

  const patchDisplayConfig = (changes: Partial<IMenuDisplayConfig>) => {
    setMenu((p) => ({
      ...p,
      displayConfig: { ...p.displayConfig, ...changes },
    }));
  };

  const handleLocationChange = (nextLocation: string) => {
    setMenu((p) => ({
      ...p,
      location: nextLocation,
      display: snapDisplay(nextLocation, p.display),
    }));
  };

  const treeCtx: TreeCtx = useMemo(
    () => ({
      refOptions,
      menuMaxDepth: menu.maxDepth,
      caps,
      patch: (path, changes) =>
        setMenu((p) => ({
          ...p,
          items: updateAtPath(p.items, path, (n) => ({ ...n, ...changes })),
        })),
      remove: (path) =>
        setMenu((p) => ({ ...p, items: removeAtPath(p.items, path) })),
      move: (path, dir) =>
        setMenu((p) => ({ ...p, items: moveAtPath(p.items, path, dir) })),
      addChild: (parentPath) =>
        setMenu((p) => ({
          ...p,
          items: insertAtPath(
            p.items,
            parentPath,
            makeItemForLocation(p.location),
          ),
        })),
    }),
    [refOptions, menu.maxDepth, caps],
  );

  const handleRemoveImage = async () => {
    if (!id) {
      imgUpload.setFiles([]);
      setMenu((p) => ({ ...p, image: "" }));
      return;
    }
    try {
      const result = await deleteMenuImage(id);
      if (!result.success) throw new Error(result.error || "Failed to remove");
      imgUpload.setFiles([]);
      setMenu((p) => ({ ...p, image: "" }));
      flash("Image removed");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveBackground = async () => {
    if (!id) {
      bgUpload.setFiles([]);
      setMenu((p) => ({ ...p, backgroundImage: "" }));
      return;
    }
    try {
      const result = await deleteMenuBackgroundImage(id);
      if (!result.success) throw new Error(result.error || "Failed to remove");
      bgUpload.setFiles([]);
      setMenu((p) => ({ ...p, backgroundImage: "" }));
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
      if (menu.items.length === 0) {
        setError("Add at least one item.");
        setSubmitting(false);
        return;
      }

      const payload = { ...menu, items: toPayloadItems(menu.items) };
      const result = id
        ? await updateMenu(id, payload)
        : await createMenu(payload);

      if (result.success) {
        setSuccess(result.message || (id ? "Menu updated" : "Menu created"));
        if (!id) {
          setMenu({ ...emptyMenu });
          imgUpload.setFiles([]);
          bgUpload.setFiles([]);
        }
        setTimeout(() => {
          router.push("/marketing/content/navigation/menus");
          router.refresh();
        }, 1500);
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

  const displayOptions = availableDisplays(menu.location);
  const warning = displayWarning(menu.location, menu.display);

  const show = (key: MenuFeatureKey) => supportsMenuFeature(menu.location, key);

  const hasPanelBehaviour =
    show("theme") ||
    show("alignment") ||
    show("animation") ||
    show("gap") ||
    show("megaWidth") ||
    show("showCaret") ||
    show("borderless") ||
    show("rounded") ||
    show("shadow");

  return (
    <div className="mx-auto max-w-6xl p-6">
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

      <h2 className="mb-6 text-2xl font-bold text-foreground">
        {id ? "Edit Menu" : "Create New Menu"}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-6">
          {/* -------------------- Identity -------------------- */}
          <Section title="Identity">
            <Field label="Name *">
              <input
                name="name"
                value={menu.name}
                onChange={handleChange}
                required
                className={inputCls}
                placeholder="e.g., Main Header"
              />
            </Field>

            {show("description") ? (
              <Field label="Description">
                <textarea
                  name="description"
                  value={menu.description}
                  onChange={handleChange}
                  rows={3}
                  className={inputCls}
                />
              </Field>
            ) : null}

            {show("mainImage") ? (
              <div>
                <span className="mb-1 block text-sm font-medium text-foreground">
                  Main image
                </span>
                <FilesUploader
                  key={imgUploadKey}
                  files={imgUpload.files}
                  addFiles={imgUpload.addFiles}
                  onRemove={handleRemoveImage}
                  loading={imgUpload.loading}
                  progressByName={imgUpload.progressByName}
                />
              </div>
            ) : null}
          </Section>

          {/* -------------------- Items -------------------- */}
          <Section
            title="Menu items"
            description="Build the tree. Every item links to a category, product, collection, page, or custom URL."
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{countTree(menu.items)} items</span>
                {countHidden(menu.items) > 0 ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal">
                    {countHidden(menu.items)} hidden
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  setMenu((p) => ({
                    ...p,
                    items: insertAtPath(
                      p.items,
                      [],
                      makeItemForLocation(p.location),
                    ),
                  }))
                }
                className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
              >
                + Add top-level
              </button>
            </div>
            <TreeEditor
              items={menu.items}
              parentPath={[]}
              depth={0}
              ctx={treeCtx}
            />
          </Section>

          {/* -------------------- Placement -------------------- */}
          <Section title="Placement">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Field label="Location">
                  <select
                    value={menu.location}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className={inputCls}
                  >
                    {MENU_LOCATIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="text-xs text-muted-foreground">
                  {locationHint(menu.location)}
                </p>
              </div>

              <Field label="Order (lower = higher priority)">
                <input
                  type="number"
                  name="order"
                  value={menu.order}
                  onChange={handleChange}
                  min={0}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <BooleanChoice
                label="Visible on storefront"
                hint="Hidden menus stay saved but don't render."
                value={menu.visible}
                onChange={(v) => setMenu((p) => ({ ...p, visible: v }))}
              />
              {show("sticky") ? (
                <BooleanChoice
                  label="Sticky on scroll"
                  value={menu.isSticky}
                  onChange={(v) => setMenu((p) => ({ ...p, isSticky: v }))}
                />
              ) : null}
            </div>
          </Section>

          {/* -------------------- Display -------------------- */}
          <Section title="Display & layout">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Menu layout"
                hint="Options depend on the selected location."
              >
                <select
                  value={menu.display}
                  onChange={(e) =>
                    setMenu((p) => ({
                      ...p,
                      display: e.target.value as MenuDisplayType,
                    }))
                  }
                  className={inputCls}
                >
                  {displayOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              {show("columns") ? (
                <Field label="Columns">
                  <select
                    value={menu.columns}
                    onChange={(e) =>
                      setMenu((p) => ({
                        ...p,
                        columns: Number(e.target.value),
                      }))
                    }
                    className={inputCls}
                  >
                    {COLUMN_COUNTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {show("maxDepth") ? (
                <Field label={`Max depth (hard cap ${MAX_DEPTH})`}>
                  <input
                    type="number"
                    name="maxDepth"
                    value={menu.maxDepth}
                    onChange={handleChange}
                    min={1}
                    max={MAX_DEPTH}
                    className={inputCls}
                  />
                </Field>
              ) : null}
            </div>

            {warning ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {warning}
              </div>
            ) : null}

            {show("showImages") ? (
              <BooleanChoice
                label="Show images in items"
                value={menu.showImages}
                onChange={(v) => setMenu((p) => ({ ...p, showImages: v }))}
              />
            ) : null}

            {hasPanelBehaviour ? (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Panel behaviour
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  {show("theme") ? (
                    <Field
                      label="Theme"
                      hint="Colors of the submenu panels (dropdowns, megas)."
                    >
                      <select
                        value={menu.displayConfig.theme}
                        onChange={(e) =>
                          patchDisplayConfig({
                            theme: e.target
                              .value as IMenuDisplayConfig["theme"],
                          })
                        }
                        className={inputCls}
                      >
                        {MENU_THEMES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}

                  {show("alignment") ? (
                    <Field label="Alignment">
                      <select
                        value={menu.displayConfig.alignment}
                        onChange={(e) =>
                          patchDisplayConfig({
                            alignment: e.target
                              .value as IMenuDisplayConfig["alignment"],
                          })
                        }
                        className={inputCls}
                      >
                        {ALIGNMENTS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}

                  {show("animation") ? (
                    <Field label="Animation">
                      <select
                        value={menu.displayConfig.animation}
                        onChange={(e) =>
                          patchDisplayConfig({
                            animation: e.target
                              .value as IMenuDisplayConfig["animation"],
                          })
                        }
                        className={inputCls}
                      >
                        {ANIMATIONS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}

                  {show("gap") ? (
                    <Field label={`Item gap — ${menu.displayConfig.gap}px`}>
                      <input
                        type="range"
                        min={0}
                        max={64}
                        step={2}
                        value={menu.displayConfig.gap}
                        onChange={(e) =>
                          patchDisplayConfig({ gap: Number(e.target.value) })
                        }
                        className="w-full"
                      />
                    </Field>
                  ) : null}

                  {show("megaWidth") ? (
                    <Field label="Mega panel width">
                      <input
                        type="text"
                        value={menu.displayConfig.megaWidth}
                        onChange={(e) =>
                          patchDisplayConfig({ megaWidth: e.target.value })
                        }
                        className={inputCls}
                        placeholder="960px"
                      />
                    </Field>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {show("showCaret") ? (
                    <BooleanChoice
                      label="Show caret on parents"
                      value={menu.displayConfig.showCaret}
                      onChange={(v) => patchDisplayConfig({ showCaret: v })}
                    />
                  ) : null}
                  {show("borderless") ? (
                    <BooleanChoice
                      label="Borderless panel"
                      value={menu.displayConfig.borderless}
                      onChange={(v) => patchDisplayConfig({ borderless: v })}
                    />
                  ) : null}
                  {show("rounded") ? (
                    <BooleanChoice
                      label="Rounded corners"
                      value={menu.displayConfig.rounded}
                      onChange={(v) => patchDisplayConfig({ rounded: v })}
                    />
                  ) : null}
                  {show("shadow") ? (
                    <BooleanChoice
                      label="Drop shadow"
                      value={menu.displayConfig.shadow}
                      onChange={(v) => patchDisplayConfig({ shadow: v })}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </Section>

          {/* -------------------- Surface (conditional) -------------------- */}
          {show("background") ? (
            <Section
              title="Surface"
              description="Background applied to the rendered menu surface."
            >
              <Field label="Background color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="backgroundColor"
                    value={menu.backgroundColor}
                    onChange={handleChange}
                    className="h-10 w-10 rounded border border-border bg-background"
                  />
                  <input
                    type="text"
                    name="backgroundColor"
                    value={menu.backgroundColor}
                    onChange={handleChange}
                    className={`${inputCls} flex-1`}
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
          ) : null}

          {/* -------------------- Actions -------------------- */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  {id ? "Updating…" : "Creating…"}
                </span>
              ) : id ? (
                "Update Menu"
              ) : (
                "Create Menu"
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* -------------------- Preview -------------------- */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live preview
            </h3>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
              <LivePreview menu={menu} />
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default MenuForm;
