"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  findProducts,
  deleteProduct,
  recreateProduct,
  getProductFilterCategories,
  updateProductCategory,
} from "@/app/actions/products";
import { getCategories } from "@/app/actions/category";
import { getProductDraft, deleteProductDraft } from "@/app/actions/drafts";
import {
  getOrCreateNewProductDraftKey,
  clearNewProductDraftKey,
} from "@/app/lib/products/draftKeys";
import {
  Delete,
  FilterList,
  Edit,
  Autorenew,
  Category as CategoryIcon,
  EditNote,
  Search,
  Close,
  Add,
  SearchOff,
  Inventory2,
} from "@mui/icons-material";
import { useDebouncedCallback } from "use-debounce";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { PopoverMenu } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

interface Product {
  _id: string;
  name: string;
  sku: string;
  slug: string;
  categoryId: { _id: string; name: string } | string | null;
  brand: { _id: string; name: string } | string | null;
  quantity: number;
  lowStockThreshold: number;
  listPrice: number;
  price: number;
  images: string[];
  tags: string[];
  status: "draft" | "active" | "inactive";
  createdAt: string;
}

interface FilterOptions {
  search: string;
  categoryId: string;
  status: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface DraftSummary {
  name?: string;
  updatedAt?: string;
}

const ITEMS_PER_PAGE = 10;

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    categoryId: "",
    status: "",
  });
  const [searchInput, setSearchInput] = useState("");

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);

  const [draftSummary, setDraftSummary] = useState<DraftSummary | null>(null);
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [recreateTarget, setRecreateTarget] = useState<Product | null>(null);
  const [isRecreating, setIsRecreating] = useState(false);

  const [categoryTarget, setCategoryTarget] = useState<Product | null>(null);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  useEffect(() => {
    (async () => {
      try {
        const [filterRows, allRows] = await Promise.all([
          getProductFilterCategories(),
          getCategories(),
        ]);
        setCategories(filterRows);
        setAllCategories(
          (allRows as any[]).map((c) => ({
            id: (c._id ?? c.id).toString(),
            name: c.name,
          })),
        );
      } catch (e) {
        console.error("Failed to load categories", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const draftKey = getOrCreateNewProductDraftKey();
        const draft = await getProductDraft(draftKey);
        if (
          draft?.data &&
          typeof draft.data === "object" &&
          Object.keys(draft.data).length > 0
        ) {
          setDraftSummary({
            name:
              typeof draft.data.name === "string" ? draft.data.name : undefined,
            updatedAt: draft.updatedAt ? String(draft.updatedAt) : undefined,
          });
        } else {
          setDraftSummary(null);
        }
      } catch (err) {
        console.error("Failed to load draft summary:", err);
      }
    })();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await findProducts({
        q: filters.search,
        categoryId: filters.categoryId || undefined,
        status: (filters.status as any) || undefined,
        page,
        pageSize: ITEMS_PER_PAGE,
        sort: "createdAt",
        sortDir: "desc",
      });
      setProducts(res.products as Product[]);
      setTotal(res.total);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  /* ------------------------------------------------------------------ */
  /* Draft banner                                                        */
  /* ------------------------------------------------------------------ */
  const handleContinueDraft = () => {
    router.push("/catalog/products/new");
  };

  const handleDiscardDraft = async () => {
    setIsDiscardingDraft(true);
    const toastId = toast.loading("Discarding draft...");
    try {
      const draftKey = getOrCreateNewProductDraftKey();
      await deleteProductDraft(draftKey);
      clearNewProductDraftKey();
      setDraftSummary(null);
      toast.success("Draft discarded", { id: toastId });
    } catch {
      toast.error("Failed to discard draft", { id: toastId });
    } finally {
      setIsDiscardingDraft(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Delete                                                              */
  /* ------------------------------------------------------------------ */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting product...");
    try {
      const result = await deleteProduct(deleteTarget._id);
      if (result.success) {
        toast.success(`"${deleteTarget.name}" deleted`, { id: toastId });
        await fetchProducts();
      } else {
        toast.error(result.error || "Failed to delete product", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("An error occurred while deleting the product.", {
        id: toastId,
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Recreate                                                            */
  /* ------------------------------------------------------------------ */
  const confirmRecreate = async () => {
    if (!recreateTarget) return;
    setIsRecreating(true);
    const toastId = toast.loading("Staging draft...");
    try {
      const draftKey = getOrCreateNewProductDraftKey();
      const result = await recreateProduct(recreateTarget._id, draftKey);
      if (result.success) {
        toast.success(
          `"${recreateTarget.name}" staged. Review and save on the next page — the original will be removed then.`,
          { id: toastId, duration: 5000 },
        );
        setRecreateTarget(null);
        router.push("/catalog/products/new");
      } else {
        toast.error(result.error || "Failed to recreate product", {
          id: toastId,
        });
      }
    } catch (err) {
      console.error("Recreate error:", err);
      toast.error("An error occurred while recreating the product.", {
        id: toastId,
      });
    } finally {
      setIsRecreating(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Edit Category                                                       */
  /* ------------------------------------------------------------------ */
  const openCategoryEditor = (product: Product) => {
    setCategoryTarget(product);
    const currentId =
      typeof product.categoryId === "string"
        ? product.categoryId
        : (product.categoryId?._id ?? "");
    setNewCategoryId(currentId);
  };

  const confirmCategoryChange = async () => {
    if (!categoryTarget) return;
    if (!newCategoryId) {
      toast.error("Please select a category");
      return;
    }
    setIsSavingCategory(true);
    const toastId = toast.loading("Updating category...");
    try {
      const result = await updateProductCategory(
        categoryTarget._id,
        newCategoryId,
      );
      if (result.success) {
        toast.success("Category updated", { id: toastId });
        await fetchProducts();
        setCategoryTarget(null);
      } else {
        toast.error(result.error || "Failed to update category", {
          id: toastId,
        });
      }
    } catch (err: any) {
      console.error("Category update error:", err);
      toast.error(err?.message || "An error occurred", { id: toastId });
    } finally {
      setIsSavingCategory(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Filters                                                             */
  /* ------------------------------------------------------------------ */
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, 400);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setSearchInput("");
    debouncedSearch.cancel();
    setFilters({ search: "", categoryId: "", status: "" });
    setPage(1);
  };

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const hasActiveFilters =
    !!filters.search || !!filters.categoryId || !!filters.status;

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.categoryId ? 1 : 0) +
    (filters.status ? 1 : 0);

  const getCategoryName = (cat: Product["categoryId"]): string => {
    if (!cat) return "Uncategorized";
    if (typeof cat === "string") return cat;
    return cat.name || "Uncategorized";
  };

  /* Refined stock pill — subtle bg, ring, colored dot */
  const stockStyles: Record<string, string> = {
    "in stock":
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    "low stock":
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    "out of stock":
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  };

  const getStockBadge = (product: Product) => {
    const qty = product.quantity || 0;
    const threshold = product.lowStockThreshold || 5;
    if (qty === 0) return { label: "Out of stock", key: "out of stock" };
    if (qty <= threshold) return { label: "Low stock", key: "low stock" };
    return { label: "In stock", key: "in stock" };
  };

  const StockBadge = ({ product }: { product: Product }) => {
    const { label, key } = getStockBadge(product);
    const cls = stockStyles[key];
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        {label}
      </span>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Filter inputs — shared by desktop bar and mobile sheet              */
  /* ------------------------------------------------------------------ */
  const searchInputEl = (
    <div className="relative w-full">
      <Search
        fontSize="small"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        value={searchInput}
        onChange={handleSearchChange}
        placeholder="Search name, SKU, tags…"
        className={`${inputClass} pl-9`}
      />
    </div>
  );

  const categorySelectEl = (
    <select
      name="categoryId"
      value={filters.categoryId}
      onChange={handleSelectChange}
      className={`${inputClass} capitalize`}
    >
      <option value="">All categories</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  );

  const statusSelectEl = (
    <select
      name="status"
      value={filters.status}
      onChange={handleSelectChange}
      className={`${inputClass} capitalize`}
    >
      <option value="">All status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
      <option value="draft">Draft</option>
    </select>
  );

  if (loading && products.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="space-y-4 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={() => void fetchProducts()}
            className="mt-4 rounded-lg border border-destructive/40 px-4 py-1.5 text-sm font-medium transition hover:bg-destructive/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl py-8 ">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Products
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your catalog, pricing, and stock
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted md:hidden"
            aria-label="Open filters"
          >
            <FilterList fontSize="small" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          <Link
            href="/catalog/products/new"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:flex-initial"
          >
            <Add fontSize="small" />
            New product
          </Link>
        </div>
      </div>

      {/* Draft banner */}
      {draftSummary && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-500/10">
          <div className="flex min-w-0 items-start gap-3">
            <EditNote className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                Unfinished draft
                {draftSummary.name ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    — {draftSummary.name}
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">
                You have an unsaved product. Continue where you left off, or
                discard it to start fresh.
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardDraft}
              disabled={isDiscardingDraft}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDiscardingDraft ? "Discarding…" : "Discard"}
            </button>
            <button
              type="button"
              onClick={handleContinueDraft}
              disabled={isDiscardingDraft}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue editing
            </button>
          </div>
        </div>
      )}

      {/* Desktop filter bar */}
      <div className="hidden md:block">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-6">{searchInputEl}</div>
            <div className="lg:col-span-3">{categorySelectEl}</div>
            <div className="lg:col-span-3">{statusSelectEl}</div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex justify-end border-t border-border pt-3">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Close fontSize="small" />
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Search & Filters"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Search
            </label>
            {searchInputEl}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Category
            </label>
            {categorySelectEl}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Status
            </label>
            {statusSelectEl}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Card */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              All products
            </h2>
            {total > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {total}
              </span>
            )}
          </div>
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Loading…
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
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
                  Price
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Stock
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Category
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        {hasActiveFilters ? (
                          <SearchOff className="text-muted-foreground" />
                        ) : (
                          <Inventory2 className="text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {hasActiveFilters
                          ? "No products match your filters"
                          : "No products yet"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hasActiveFilters
                          ? "Try adjusting or clearing your filters."
                          : "Add your first product to get started."}
                      </p>
                      <div className="mt-4">
                        {hasActiveFilters ? (
                          <button
                            onClick={handleClearFilters}
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                          >
                            Clear filters
                          </button>
                        ) : (
                          <Link
                            href="/catalog/products/new"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                          >
                            <Add fontSize="small" />
                            New product
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product._id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-lg bg-muted">
                          {product.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Inventory2
                              fontSize="small"
                              className="text-muted-foreground"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/catalog/products/edit/${product._id}`}
                            className="block truncate text-sm font-medium text-foreground transition hover:text-primary"
                          >
                            {product.name || "Untitled"}
                          </Link>
                          {product.tags?.length > 0 && (
                            <p className="truncate text-xs text-muted-foreground">
                              {product.tags.slice(0, 3).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-muted-foreground">
                      {product.sku || "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-foreground">
                      CFA {(product.listPrice || product.price || 0).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StockBadge product={product} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {getCategoryName(product.categoryId)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="flex justify-end">
                        <PopoverMenu
                          ariaLabel={`Actions for ${product.name}`}
                          items={[
                            {
                              key: "edit",
                              label: "Edit product",
                              icon: <Edit fontSize="small" />,
                              href: `/catalog/products/edit/${product._id}`,
                            },
                            {
                              key: "recreate",
                              label: "Recreate as draft",
                              icon: <Autorenew fontSize="small" />,
                              onClick: () => setRecreateTarget(product),
                            },
                            {
                              key: "category",
                              label: "Edit category",
                              icon: <CategoryIcon fontSize="small" />,
                              onClick: () => openCategoryEditor(product),
                            },
                            {
                              key: "delete",
                              label: "Delete",
                              icon: <Delete fontSize="small" />,
                              danger: true,
                              onClick: () => {
                                setDeleteTarget(product);
                                setIsDeleteOpen(true);
                              },
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {products.length}
              </span>{" "}
              of <span className="font-medium text-foreground">{total}</span>{" "}
              products
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{page}</span> /{" "}
                {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteOpen(false);
            setDeleteTarget(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this product"}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        danger
      />

      {/* Recreate confirmation */}
      <ConfirmDialog
        isOpen={!!recreateTarget}
        onClose={() => {
          if (!isRecreating) setRecreateTarget(null);
        }}
        onConfirm={confirmRecreate}
        title="Recreate Product"
        message={`"${recreateTarget?.name || "This product"}" will be staged as a new draft and you'll be redirected to the create page. The original stays untouched until you click Save on the new product. Continue?`}
        confirmLabel={isRecreating ? "Staging..." : "Recreate"}
      />

      {/* Edit Category dialog */}
      {categoryTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => {
            if (!isSavingCategory) setCategoryTarget(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full rounded-t-2xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              Edit category
            </h3>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Change the category for{" "}
              <span className="font-medium text-foreground">
                {categoryTarget.name || "this product"}
              </span>
              .
            </p>

            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Category
            </label>
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              disabled={isSavingCategory}
              className={`${inputClass} mb-5`}
            >
              <option value="" disabled>
                Select a category…
              </option>
              {allCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryTarget(null)}
                disabled={isSavingCategory}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCategoryChange}
                disabled={isSavingCategory || !newCategoryId}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingCategory ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
