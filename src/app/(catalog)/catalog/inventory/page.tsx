// app/inventory/page.tsx

"use client";
import React, { useCallback, useEffect, memo, useState } from "react";
import { Edit, Warning, Inventory2 } from "@mui/icons-material";
import { Snackbar, Alert } from "@mui/material";
import { findProducts, updateProductStockLevel } from "@/app/actions/products";

interface ProductRow {
  _id: string;
  productName: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  lastUpdated: string;
}

interface StatsData {
  count: number;
  totalStock: number;
}

interface InventoryStats {
  in_stock: StatsData;
  low_stock: StatsData;
  out_of_stock: StatsData;
  lowStockProducts: ProductRow[];
}

const PAGE_SIZE = 100; // findProducts caps at 100 server-side

/* ------------------------------------------------------------------ */
/* Shared tokens                                                       */
/* ------------------------------------------------------------------ */
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

const stockStyles: Record<string, string> = {
  in_stock:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  low_stock:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  out_of_stock:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
};

const stockLabels: Record<ProductRow["stockStatus"], string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

const getStockStatus = (
  quantity: number,
  threshold: number,
): ProductRow["stockStatus"] => {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= threshold) return "low_stock";
  return "in_stock";
};

/* ------------------------------------------------------------------ */
/* Mapping — products.ts aggregation projection                        */
/* ------------------------------------------------------------------ */
const mapProduct = (p: any): ProductRow => {
  const qty = Number(p?.quantity ?? 0);
  const threshold = Number(p?.lowStockThreshold ?? 10);
  const lastUpdated =
    p?.updatedAt?.toString?.() ||
    p?.createdAt?.toString?.() ||
    new Date().toISOString();

  return {
    _id: String(p?._id ?? ""),
    productName: String(p?.name ?? ""),
    sku: String(p?.sku ?? ""),
    stockQuantity: qty,
    lowStockThreshold: threshold,
    stockStatus: getStockStatus(qty, threshold),
    lastUpdated,
  };
};

/* ------------------------------------------------------------------ */
/* Small presentational components                                     */
/* ------------------------------------------------------------------ */
const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status: ProductRow["stockStatus"];
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${stockStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {stockLabels[status]}
    </span>
  );
});

const StatCard = memo(function StatCard({
  label,
  count,
  hint,
  tone,
  icon,
}: {
  label: string;
  count: number;
  hint: string;
  tone: "success" | "warning" | "danger";
  icon?: React.ReactNode;
}) {
  const toneRing: Record<typeof tone, string> = {
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    danger: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  } as const;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneRing[tone]}`}
        >
          {icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {count}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
const InventoryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    quantity: 0,
    lowStockThreshold: 0,
  });
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  /* ---- Load all inventory via findProducts ---- */
  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collected: ProductRow[] = [];
      let page = 1;
      let totalPages = 1;

      // Walk all pages so we don't silently truncate at 100.
      do {
        const res = await findProducts({
          page,
          pageSize: PAGE_SIZE,
          sort: "createdAt",
          sortDir: "desc",
        });

        if (res.error) throw new Error(res.error);

        (res.products ?? []).forEach((p: any) => collected.push(mapProduct(p)));

        totalPages = Math.max(1, res.totalPages ?? 1);
        page++;
      } while (page <= totalPages);

      // Dedupe defensively (safe if pages ever overlap).
      const unique = Array.from(
        new Map(collected.map((r) => [r._id, r])).values(),
      );

      setProducts(unique);

      const statsObj: InventoryStats = {
        in_stock: { count: 0, totalStock: 0 },
        low_stock: { count: 0, totalStock: 0 },
        out_of_stock: { count: 0, totalStock: 0 },
        lowStockProducts: [],
      };

      unique.forEach((prod) => {
        statsObj[prod.stockStatus].count++;
        statsObj[prod.stockStatus].totalStock += prod.stockQuantity;
        if (prod.stockStatus === "low_stock")
          statsObj.lowStockProducts.push(prod);
      });

      setStats(statsObj);
    } catch (err: any) {
      console.error("Failed to load inventory:", err);
      setError(err?.message || "Failed to load inventory");
      setProducts([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const handleCloseSnackbar = () => {
    setSnackbar((s) => ({ ...s, open: false }));
  };

  const handleEdit = (product: ProductRow) => {
    setEditingProduct(product._id);
    setEditValues({
      quantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
    });
  };

  const handleCancel = () => {
    if (saving) return;
    setEditingProduct(null);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      const res = await updateProductStockLevel(
        id,
        editValues.quantity,
        editValues.lowStockThreshold,
      );

      if (!res.success) {
        throw new Error(res.error || "Update failed");
      }

      setSnackbar({
        open: true,
        message: "Product updated successfully",
        severity: "success",
      });
      setEditingProduct(null);
      await loadInventory();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.message || "Failed to update product",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const quantityColor = (quantity: number, threshold: number) => {
    if (quantity <= 0) return "text-rose-600 dark:text-rose-400";
    if (quantity <= threshold) return "text-amber-600 dark:text-amber-400";
    return "text-foreground";
  };

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="w-full max-w-7xl overflow-x-clip py-6">
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          className="w-full"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Inventory
        </h1>
        <p className="text-sm text-muted-foreground">
          Track stock levels and replenish what&apos;s running low
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div>
            <span className="font-semibold">Error: </span>
            {error}
          </div>
          <button
            onClick={() => void loadInventory()}
            className="flex-none rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium transition hover:bg-destructive/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="In stock"
            count={stats.in_stock.count}
            hint={`${stats.in_stock.totalStock} units available`}
            tone="success"
          />
          <StatCard
            label="Low stock"
            count={stats.low_stock.count}
            hint="Need attention soon"
            tone="warning"
            icon={<Warning fontSize="small" />}
          />
          <StatCard
            label="Out of stock"
            count={stats.out_of_stock.count}
            hint="Need replenishment"
            tone="danger"
            icon={<Warning fontSize="small" />}
          />
        </div>
      )}

      {/* Low stock alert panel */}
      {stats && stats.lowStockProducts.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 dark:bg-amber-500/10">
          <div className="mb-3 flex items-center gap-2">
            <Warning
              fontSize="small"
              className="text-amber-600 dark:text-amber-400"
            />
            <h2 className="text-sm font-semibold text-foreground">
              Low stock alerts
            </h2>
            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              {stats.lowStockProducts.length}
            </span>
          </div>
          <ul className="divide-y divide-amber-500/20">
            {stats.lowStockProducts.map((p) => (
              <li
                key={p._id}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate text-sm text-foreground">
                  {p.productName || "Untitled"}
                </span>
                <span className="flex-none text-xs text-muted-foreground">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {p.stockQuantity}
                  </span>{" "}
                  / {p.lowStockThreshold}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Table / Cards wrapper */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              All inventory
            </h2>
            {products.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {products.length}
              </span>
            )}
          </div>
          {saving && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Saving…
            </span>
          )}
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inventory2 className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No products in inventory
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add products to start tracking stock.
            </p>
          </div>
        ) : (
          <>
            {/* ---------------- DESKTOP TABLE ---------------- */}
            <div className="hidden md:block">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Product
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        SKU
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Stock
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Threshold
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Last updated
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map((prod) => {
                      const isEditing = editingProduct === prod._id;
                      return (
                        <tr
                          key={prod._id}
                          className="transition-colors hover:bg-muted/40"
                        >
                          <td className="px-5 py-4">
                            <div className="max-w-[240px] truncate font-medium text-foreground">
                              {prod.productName || "Untitled"}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {prod.sku || "—"}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                value={editValues.quantity}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    quantity: Math.max(
                                      0,
                                      parseInt(e.target.value) || 0,
                                    ),
                                  }))
                                }
                                disabled={saving}
                                className={`${INPUT_CLASS} w-24`}
                              />
                            ) : (
                              <span
                                className={`font-semibold ${quantityColor(
                                  prod.stockQuantity,
                                  prod.lowStockThreshold,
                                )}`}
                              >
                                {prod.stockQuantity}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                value={editValues.lowStockThreshold}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    lowStockThreshold: Math.max(
                                      0,
                                      parseInt(e.target.value) || 0,
                                    ),
                                  }))
                                }
                                disabled={saving}
                                className={`${INPUT_CLASS} w-24`}
                              />
                            ) : (
                              <span className="text-muted-foreground">
                                {prod.lowStockThreshold}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={prod.stockStatus} />
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs text-muted-foreground">
                              {new Date(prod.lastUpdated).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleSave(prod._id)}
                                  disabled={saving}
                                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {saving ? "Saving…" : "Save"}
                                </button>
                                <button
                                  onClick={handleCancel}
                                  disabled={saving}
                                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEdit(prod)}
                                aria-label={`Edit inventory for ${prod.productName}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              >
                                <Edit fontSize="small" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ---------------- MOBILE CARDS ---------------- */}
            <ul className="divide-y divide-border md:hidden">
              {products.map((prod) => {
                const isEditing = editingProduct === prod._id;
                return (
                  <li key={prod._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {prod.productName || "Untitled"}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {prod.sku || "—"}
                        </p>
                      </div>
                      {!isEditing && (
                        <button
                          onClick={() => handleEdit(prod)}
                          aria-label={`Edit inventory for ${prod.productName}`}
                          className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Edit fontSize="small" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={editValues.quantity}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  quantity: Math.max(
                                    0,
                                    parseInt(e.target.value) || 0,
                                  ),
                                }))
                              }
                              disabled={saving}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Threshold
                            </label>
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={editValues.lowStockThreshold}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  lowStockThreshold: Math.max(
                                    0,
                                    parseInt(e.target.value) || 0,
                                  ),
                                }))
                              }
                              disabled={saving}
                              className={INPUT_CLASS}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(prod._id)}
                            disabled={saving}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusBadge status={prod.stockStatus} />
                          <span className="text-xs text-muted-foreground">
                            Stock:{" "}
                            <span
                              className={`font-semibold ${quantityColor(
                                prod.stockQuantity,
                                prod.lowStockThreshold,
                              )}`}
                            >
                              {prod.stockQuantity}
                            </span>{" "}
                            / {prod.lowStockThreshold}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Updated{" "}
                          {new Date(prod.lastUpdated).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
