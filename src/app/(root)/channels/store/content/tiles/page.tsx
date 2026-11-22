// app/(content)/content-management/tiles/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Add,
  ArrowDownward,
  ArrowUpward,
  Delete,
  Edit,
  Refresh,
  Save,
} from "@mui/icons-material";
import { toast } from "react-hot-toast";
import FilesUploader from "@/components/FilesUploader";
import { useFileUploader } from "@/hooks/useFileUploader";
import {
  listTilesAdmin,
  createTile,
  updateTile,
  deleteTile,
  reorderTiles,
  type TileDTO,
  type TileInput,
} from "@/lib/api/tile";

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

const EMPTY: TileInput = {
  title: "",
  imageUrl: "",
  link: "",
  backgroundColor: "",
  backgroundImage: "",
  status: "active",
  order: 0,
};

export default function TilesPage() {
  const [tiles, setTiles] = useState<TileDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<TileDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TileInput>(EMPTY);

  const logoUploader = useFileUploader(
    undefined,
    form.imageUrl ? [form.imageUrl] : [],
    "tiles",
  );
  const backgroundUploader = useFileUploader(
    undefined,
    form.backgroundImage ? [form.backgroundImage] : [],
    "tiles",
  );

  useEffect(() => {
    const url = logoUploader.files[0] || "";
    setForm((p) => (p.imageUrl === url ? p : { ...p, imageUrl: url }));
  }, [logoUploader.files]);

  useEffect(() => {
    const url = backgroundUploader.files[0] || "";
    setForm((p) =>
      p.backgroundImage === url ? p : { ...p, backgroundImage: url },
    );
  }, [backgroundUploader.files]);

  const load = async () => {
    setLoading(true);
    try {
      setTiles(await listTilesAdmin());
    } catch {
      toast.error("Failed to load tiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(EMPTY);
  };

  const startEdit = (tile: TileDTO) => {
    setCreating(false);
    setEditing(tile);
    setForm({
      title: tile.title,
      imageUrl: tile.imageUrl ?? "",
      link: tile.link ?? "",
      backgroundColor: tile.backgroundColor ?? "",
      backgroundImage: tile.backgroundImage ?? "",
      status: tile.status,
      order: tile.order,
    });
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTile(editing._id, form);
        toast.success("Tile updated");
      } else {
        await createTile(form);
        toast.success("Tile created");
      }
      cancel();
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save tile");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tile: TileDTO) => {
    if (!window.confirm(`Delete "${tile.title}"?`)) return;
    try {
      await deleteTile(tile._id);
      toast.success("Tile deleted");
      if (editing?._id === tile._id) cancel();
      await load();
    } catch {
      toast.error("Failed to delete tile");
    }
  };

  const move = async (tile: TileDTO, direction: -1 | 1) => {
    const index = tiles.findIndex((t) => t._id === tile._id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= tiles.length) return;

    const next = [...tiles];
    [next[index], next[target]] = [next[target], next[index]];
    setTiles(next);
    try {
      await reorderTiles(next.map((t) => t._id));
    } catch {
      toast.error("Failed to reorder tiles");
      await load();
    }
  };

  const showForm = creating || !!editing;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            Tiles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compact logo + title shortcuts shown below the homepage hero.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <Refresh fontSize="small" /> Refresh
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Add fontSize="small" /> New tile
          </button>
        </div>
      </header>

      {showForm && (
        <section className="mb-5 space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? "Edit tile" : "New tile"}
          </h2>

          <label className="block text-[13px] font-medium text-foreground">
            Title
            <input
              className={`${INPUT} mt-1`}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Shoes"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="block text-[13px] font-medium text-foreground">
              Logo / image
              <div className="mt-1">
                <FilesUploader
                  files={logoUploader.files}
                  loading={logoUploader.loading}
                  addFiles={logoUploader.addFiles}
                  onRemove={async (index, url) => {
                    await logoUploader.removeFile(index, url);
                  }}
                  maxFiles={1}
                  compact
                />
              </div>
              <input
                className={`${INPUT} mt-1`}
                value={form.imageUrl ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, imageUrl: e.target.value }))
                }
                placeholder="…or paste an image URL"
              />
            </div>
            <label className="block text-[13px] font-medium text-foreground">
              Link
              <input
                className={`${INPUT} mt-1`}
                value={form.link ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                placeholder="/category/shoes or https://…"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[13px] font-medium text-foreground">
              Background colour
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={form.backgroundColor || "#ffffff"}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, backgroundColor: e.target.value }))
                  }
                  className="h-10 w-12 shrink-0 rounded-lg border border-input bg-background p-1"
                />
                <input
                  className={INPUT}
                  value={form.backgroundColor ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      backgroundColor: e.target.value,
                    }))
                  }
                  placeholder="#f4f4f5"
                />
              </div>
            </label>
            <div className="block text-[13px] font-medium text-foreground">
              Background image
              <div className="mt-1">
                <FilesUploader
                  files={backgroundUploader.files}
                  loading={backgroundUploader.loading}
                  addFiles={backgroundUploader.addFiles}
                  onRemove={async (index, url) => {
                    await backgroundUploader.removeFile(index, url);
                  }}
                  maxFiles={1}
                  compact
                />
              </div>
              <input
                className={`${INPUT} mt-1`}
                value={form.backgroundImage ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, backgroundImage: e.target.value }))
                }
                placeholder="…or paste an image URL"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[13px] font-medium text-foreground">
              Status
              <select
                className={`${INPUT} mt-1`}
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as TileInput["status"],
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="block text-[13px] font-medium text-foreground">
              Order
              <input
                type="number"
                min={0}
                className={`${INPUT} mt-1`}
                value={form.order ?? 0}
                onChange={(e) =>
                  setForm((p) => ({ ...p, order: Number(e.target.value) || 0 }))
                }
              />
            </label>
          </div>

          {form.imageUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.imageUrl}
                alt=""
                className="h-9 w-9 object-contain"
              />
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <Save fontSize="small" /> {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : tiles.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No tiles yet. Create one to show it below the hero.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {tiles.map((tile) => (
              <li
                key={tile._id}
                className="flex items-center gap-3 px-3 py-3 sm:px-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                  {tile.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tile.imageUrl}
                      alt=""
                      className="h-7 w-7 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {tile.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {tile.link || "No link"} ·{" "}
                    {tile.status === "active" ? "Active" : "Inactive"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Move up"
                    onClick={() => void move(tile, -1)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <ArrowUpward fontSize="small" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    onClick={() => void move(tile, 1)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <ArrowDownward fontSize="small" />
                  </button>
                  <button
                    type="button"
                    aria-label="Edit"
                    onClick={() => startEdit(tile)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <Edit fontSize="small" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={() => void remove(tile)}
                    className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <Delete fontSize="small" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}