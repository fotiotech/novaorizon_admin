// components/BadgePicker.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpward,
  ArrowDownward,
  Add,
  Close,
  Check,
  InfoOutlined,
} from "@mui/icons-material";
import {
  listActiveTrustBadges,
  type TrustBadgeDTO,
} from "@/app/actions/trust_badge";
import { BADGE_ICON_OPTIONS, isValidBadgeLink } from "@/lib/trust/badgeIcons";
import TrustBadgeIcon from "./TrustBadgeIcon";

export interface BadgeSelection {
  badgeId: string | null;
  icon: string;
  title: string;
  description: string;
  popupText: string;
  link: string;
}

interface Props {
  value: BadgeSelection[];
  onChange: (next: BadgeSelection[]) => void;
  max?: number;
  disabled?: boolean;
}

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

const emptyAdHoc = (): BadgeSelection => ({
  badgeId: null,
  icon: "shield-check",
  title: "",
  description: "",
  popupText: "",
  link: "",
});

export default function BadgePicker({
  value,
  onChange,
  max = 5,
  disabled,
}: Props) {
  const [options, setOptions] = useState<TrustBadgeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [adHoc, setAdHoc] = useState<BadgeSelection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listActiveTrustBadges();
        if (!cancelled) setOptions(data);
      } catch (e) {
        if (!cancelled) setError("Failed to load badge library");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedIds = useMemo(
    () => new Set(value.filter((b) => b.badgeId).map((b) => b.badgeId!)),
    [value],
  );

  const atMax = value.length >= max;

  const toggleLibraryBadge = (badge: TrustBadgeDTO) => {
    if (disabled) return;
    if (selectedIds.has(badge._id)) {
      onChange(value.filter((b) => b.badgeId !== badge._id));
      return;
    }
    if (atMax) return;
    onChange([
      ...value,
      {
        badgeId: badge._id,
        icon: badge.icon,
        title: badge.title,
        description: badge.description ?? "",
        popupText: badge.popupText ?? "",
        link: badge.link ?? "",
      },
    ]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const removeAt = (index: number) =>
    onChange(value.filter((_, i) => i !== index));

  const commitAdHoc = () => {
    if (!adHoc) return;
    if (!adHoc.title.trim()) {
      setError("Ad-hoc badge needs a title");
      return;
    }
    if (adHoc.link && !isValidBadgeLink(adHoc.link.trim())) {
      setError("Link must be a valid URL or start with /");
      return;
    }
    if (atMax) {
      setError(`You can add up to ${max} badges`);
      return;
    }
    onChange([...value, { ...adHoc, title: adHoc.title.trim() }]);
    setAdHoc(null);
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Selected badges (ordered) */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Selected badges</span>
          <span>
            {value.length}/{max}
          </span>
        </div>

        {value.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background/40 px-3 py-4 text-xs italic text-muted-foreground">
            No badges selected. Pick from the library below or add an ad-hoc
            badge.
          </p>
        ) : (
          <ul className="space-y-2">
            {value.map((badge, i) => (
              <li
                key={`${badge.badgeId ?? "adhoc"}-${i}`}
                className="flex items-start gap-2 rounded-lg border border-border bg-background/50 p-2.5"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <TrustBadgeIcon name={badge.icon} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {badge.title || "(untitled)"}
                    </p>
                    {badge.badgeId ? (
                      <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                        Library
                      </span>
                    ) : (
                      <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                        Ad-hoc
                      </span>
                    )}
                  </div>
                  {badge.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {badge.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={disabled || i === 0}
                    className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUpward sx={{ fontSize: 14 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={disabled || i === value.length - 1}
                    className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDownward sx={{ fontSize: 14 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    disabled={disabled}
                    className="rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    aria-label="Remove"
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Library */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Badge library
        </p>
        {loading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : options.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background/40 px-3 py-3 text-xs text-muted-foreground">
            No badges in the library yet. Create some in{" "}
            <a
              href="/content-management/trust-badges"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Trust badges
            </a>
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {options.map((badge) => {
              const selected = selectedIds.has(badge._id);
              const disabledRow = disabled || (!selected && atMax);
              return (
                <button
                  key={badge._id}
                  type="button"
                  onClick={() => toggleLibraryBadge(badge)}
                  disabled={disabledRow}
                  className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-background hover:bg-muted/60"
                  } ${disabledRow ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selected ? (
                      <Check sx={{ fontSize: 14 }} />
                    ) : (
                      <TrustBadgeIcon name={badge.icon} size={13} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {badge.title}
                    </p>
                    {badge.description && (
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {badge.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Ad-hoc editor */}
      {adHoc ? (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              New ad-hoc badge
            </p>
            <button
              type="button"
              onClick={() => {
                setAdHoc(null);
                setError(null);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Cancel"
            >
              <Close sx={{ fontSize: 14 }} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Icon
              </label>
              <select
                value={adHoc.icon}
                onChange={(e) => setAdHoc({ ...adHoc, icon: e.target.value })}
                className={INPUT}
              >
                {BADGE_ICON_OPTIONS.map((o: any) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-8">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Title *
              </label>
              <input
                type="text"
                value={adHoc.title}
                onChange={(e) => setAdHoc({ ...adHoc, title: e.target.value })}
                className={INPUT}
                placeholder="Secure Payment"
              />
            </div>
            <div className="sm:col-span-12">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Description
              </label>
              <input
                type="text"
                value={adHoc.description}
                onChange={(e) =>
                  setAdHoc({ ...adHoc, description: e.target.value })
                }
                className={INPUT}
                placeholder="SSL encrypted checkout"
              />
            </div>
            <div className="sm:col-span-7">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Popup text
              </label>
              <textarea
                rows={2}
                value={adHoc.popupText}
                onChange={(e) =>
                  setAdHoc({ ...adHoc, popupText: e.target.value })
                }
                className={`${INPUT} resize-y`}
                placeholder="We accept all major credit cards…"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Link
              </label>
              <input
                type="text"
                value={adHoc.link}
                onChange={(e) => setAdHoc({ ...adHoc, link: e.target.value })}
                className={INPUT}
                placeholder="https://… or /return-policy"
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={commitAdHoc}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Add sx={{ fontSize: 14 }} />
              Add badge
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdHoc(emptyAdHoc());
            setError(null);
          }}
          disabled={disabled || atMax}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Add sx={{ fontSize: 14 }} />
          Add ad-hoc badge
        </button>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <InfoOutlined sx={{ fontSize: 14 }} />
          {error}
        </p>
      )}
    </div>
  );
}
