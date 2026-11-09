// app/(root)/channels/store/content/banners/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import {
  listBanners,
  deleteBanner,
  type BannerListItem,
} from "@/app/actions/banner-content";

const LIST_PATH = "/channels/store/content/banners";

export default function BannersListPage() {
  const [rows, setRows] = useState<BannerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listBanners();
      setRows(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setBusyId(id);
    try {
      const res = await deleteBanner(id);
      if (res.success) {
        setRows((prev) => prev.filter((r) => r._id !== id));
        setSuccess("Banner deleted");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(res.error || "Failed to delete");
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
    <div className="min-h-screen bg-background pb-12">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
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
            <h1 className="text-xl font-semibold text-foreground">Banners</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reusable banner content. Blocks select one or more banners and
              choose how to lay them out.
            </p>
          </div>
          <Link
            href={`${LIST_PATH}/new`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            + New banner
          </Link>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">No banners yet.</p>
            <Link
              href={`${LIST_PATH}/new`}
              className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Create your first banner
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {rows.map((row, i) => (
              <div
                key={row._id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                {row.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.imageUrl}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-md border border-border bg-muted object-cover"
                  />
                ) : (
                  <div className="h-12 w-16 shrink-0 rounded-md border border-dashed border-border bg-muted/40" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {row.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Updated{" "}
                    {new Date(row.updated_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`${LIST_PATH}/${row._id}`}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(row._id, row.name)}
                    disabled={busyId === row._id}
                    className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
