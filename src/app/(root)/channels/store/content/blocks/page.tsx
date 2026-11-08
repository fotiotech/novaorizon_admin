// app/content-management/blocks/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import { getAllBlocks, deleteBlock, reorderBlocks } from "@/app/actions/blocks";
import { BLOCK_LOCATIONS, type BlockLocation } from "@/lib/content/constants";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface BlockRow {
  _id: string;
  name: string;
  location: BlockLocation;
  display: string;
  status: "active" | "inactive";
  order: number;
  /** Editorial blocks carry an editorialId and no source. */
  source?: { type: string };
  editorialId?: string | null;
}

const LIST_PATH = "/channels/store/content/blocks";

/** Short summary of what this block renders. */
function describeBlock(b: BlockRow): string {
  if (b.display === "editorial") {
    return b.editorialId ? "editorial" : "editorial (missing)";
  }
  return b.source?.type ?? "source (missing)";
}

/** Badge color per block family. */
function badgeClass(b: BlockRow): string {
  if (b.display === "editorial") {
    return "bg-violet-50 text-violet-700";
  }
  return "bg-blue-50 text-blue-700";
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function BlocksAdminPage() {
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getAllBlocks();
      if (res.success) setBlocks(res.data || []);
      else setError(res.error || "Failed to load blocks");
    } catch (err) {
      console.error(err);
      setError("Failed to load blocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<BlockLocation, BlockRow[]>();
    BLOCK_LOCATIONS.forEach((loc) => map.set(loc, []));
    for (const b of blocks) {
      if (!map.has(b.location)) map.set(b.location, []);
      map.get(b.location)!.push(b);
    }
    for (const [loc, list] of map) {
      map.set(
        loc,
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      );
    }
    return map;
  }, [blocks]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete block "${name}"?`)) return;
    setBusyId(id);
    try {
      const res = await deleteBlock(id);
      if (res.success) {
        setBlocks((prev) => prev.filter((b) => b._id !== id));
        setSuccess("Block deleted");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(res.error || "Failed to delete");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (
    location: BlockLocation,
    index: number,
    dir: -1 | 1,
  ) => {
    const list = grouped.get(location) ?? [];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;

    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];

    const orderedIds = next.map((b) => b._id);

    setBlocks((prev) => {
      const others = prev.filter((b) => b.location !== location);
      const reordered = next.map((b, i) => ({ ...b, order: i }));
      return [...others, ...reordered];
    });

    setBusyId(list[index]._id);
    try {
      const res = await reorderBlocks(location, orderedIds);
      if (!res.success) {
        setError(res.error || "Failed to reorder");
        await load();
      }
    } finally {
      setBusyId(null);
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
    <div className="min-h-screen bg-card pb-16">
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

        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              Content blocks
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Blocks are rendered on the storefront in the order shown below.
            </p>
          </div>
          <Link
            href={`${LIST_PATH}/new`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            + New block
          </Link>
        </header>

        {blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-sm text-gray-600">No blocks yet.</p>
            <Link
              href={`${LIST_PATH}/new`}
              className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Create your first block
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {BLOCK_LOCATIONS.map((location) => {
              const list = grouped.get(location) ?? [];
              if (list.length === 0) return null;
              return (
                <section key={location}>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    {location}
                  </h2>
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {list.map((b, i) => (
                      <div
                        key={b._id}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          i > 0 ? "border-t border-gray-100" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMove(location, i, -1)}
                            disabled={i === 0 || busyId === b._id}
                            className="rounded text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            aria-label="Move up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(location, i, 1)}
                            disabled={i === list.length - 1 || busyId === b._id}
                            className="rounded text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            aria-label="Move down"
                          >
                            ▼
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-gray-900">
                              {b.name}
                            </p>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                              {b.display}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${badgeClass(b)}`}
                            >
                              {describeBlock(b)}
                            </span>
                            {b.status === "inactive" && (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
                                inactive
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Link
                            href={`${LIST_PATH}/${b._id}`}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(b._id, b.name)}
                            disabled={busyId === b._id}
                            className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
