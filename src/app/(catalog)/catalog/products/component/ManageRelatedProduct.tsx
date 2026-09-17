"use client";

import { findProducts, findProductById } from "@/app/actions/products";
import Image from "next/image";
import React, { useEffect, useState, useMemo, useRef } from "react";
import Select from "react-select";
import { Search, Close, Link as LinkIcon, Check } from "@mui/icons-material";

interface ManageRelatedProductProps {
  id: string;
  product?: any;
  attribute?: any[];
  onUpdate: (field: string, value: any) => void;
}

interface RelatedProduct {
  id: string;
  relationshipType: string;
}

const normalizeCode = (code?: string): string =>
  !code ? "" : code.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const readProductValue = (obj: any, ...keys: string[]) => {
  if (!obj) return undefined;
  for (const key of keys) if (obj[key] !== undefined) return obj[key];
  return undefined;
};

/**
 * Extract a product id from any historical relatedProducts shape.
 */
const extractRelatedProductId = (rp: any): string => {
  if (!rp) return "";
  if (typeof rp === "string") return rp;

  if (typeof rp.id === "string" && rp.id) return rp.id;
  if (typeof rp._id === "string" && rp._id) return rp._id;

  const product = rp.product ?? rp.productId ?? rp.product_id;
  if (typeof product === "string" && product) return product;
  if (product && typeof product === "object") {
    if (typeof product._id === "string" && product._id) return product._id;
    if (typeof product.id === "string" && product.id) return product.id;
  }
  return "";
};

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

const SELECT_STYLES = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring) / 0.25)" : "none",
    minHeight: "34px",
    fontSize: "0.8125rem",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
    "&:hover": {
      borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--border))",
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    overflow: "hidden",
    boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
  }),
  menuPortal: (provided: any) => ({ ...provided, zIndex: 9999 }),
  menuList: (provided: any) => ({ ...provided, padding: 4 }),
  option: (provided: any, state: any) => ({
    ...provided,
    fontSize: "0.8125rem",
    backgroundColor: state.isSelected
      ? "hsl(var(--primary))"
      : state.isFocused
        ? "hsl(var(--accent))"
        : "hsl(var(--popover))",
    color: state.isSelected
      ? "hsl(var(--primary-foreground))"
      : "hsl(var(--popover-foreground))",
    cursor: "pointer",
    borderRadius: "0.375rem",
  }),
  singleValue: (p: any) => ({
    ...p,
    color: "hsl(var(--foreground))",
    fontSize: "0.8125rem",
  }),
  placeholder: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.8125rem",
  }),
  input: (p: any) => ({ ...p, color: "hsl(var(--foreground))" }),
  indicatorSeparator: (p: any) => ({
    ...p,
    backgroundColor: "hsl(var(--border))",
  }),
  dropdownIndicator: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    padding: 6,
    "&:hover": { color: "hsl(var(--foreground))" },
  }),
  clearIndicator: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    padding: 6,
    "&:hover": { color: "hsl(var(--foreground))" },
  }),
  noOptionsMessage: (p: any) => ({
    ...p,
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.8125rem",
  }),
} as const;

const PORTAL_PROPS = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  menuPosition: "fixed" as const,
  menuShouldScrollIntoView: false,
} as const;

const ManageRelatedProduct: React.FC<ManageRelatedProductProps> = ({
  id,
  product,
  attribute = [],
  onUpdate,
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const isFirstRender = useRef(true);
  const isInitializing = useRef(true);

  const relatedAttr = attribute.find(
    (a) => normalizeCode(a.code) === "relatedProducts",
  );
  const relationTypeAttr = attribute.find(
    (a) => normalizeCode(a.code) === "relationType",
  );

  useEffect(() => {
    async function fetchProducts() {
      const res = await findProducts({ pageSize: 100 });
      if (res && Array.isArray(res.products)) setProducts(res.products);
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    setRelatedProducts([]);
    setSearchTerm("");
    isInitializing.current = true;
    isFirstRender.current = true;
  }, [id]);

  useEffect(() => {
    const relatedProductsData = readProductValue(
      product,
      "relatedProducts",
      "related_products",
    );

    let initial: RelatedProduct[] = [];

    if (Array.isArray(relatedProductsData)) {
      const seen = new Set<string>();
      initial = relatedProductsData
        .map((rp: any) => ({
          id: extractRelatedProductId(rp),
          relationshipType: rp.relationshipType || rp.relationship_type || "",
        }))
        .filter((rp) => {
          if (!rp.id) return false;
          if (seen.has(rp.id)) return false;
          seen.add(rp.id);
          return true;
        });
    } else if (relatedProductsData?.ids) {
      const defaultType =
        relatedProductsData.relationshipType ||
        relatedProductsData.relationship_type ||
        "";
      const seen = new Set<string>();
      initial = (relatedProductsData.ids as any[])
        .map((pid) => extractRelatedProductId(pid))
        .filter((pid) => {
          if (!pid) return false;
          if (seen.has(pid)) return false;
          seen.add(pid);
          return true;
        })
        .map((pid) => ({ id: pid, relationshipType: defaultType }));
    }

    setRelatedProducts((prev) => {
      const same =
        prev.length === initial.length &&
        prev.every(
          (p, i) =>
            p.id === initial[i].id &&
            p.relationshipType === initial[i].relationshipType,
        );
      return same ? prev : initial;
    });

    isInitializing.current = false;
  }, [product]);

  // ---------------------------------------------------------------
  // Ensure every related product has a row in `products`.
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!relatedProducts.length) return;
    if (products.length === 0) return;

    const known = new Set(products.map((p) => String(p._id)));
    const missing = Array.from(new Set(relatedProducts.map((rp) => rp.id)))
      .filter(Boolean)
      .filter((id) => !known.has(id));
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const results = await Promise.all(
          missing.map((pid) => findProductById(pid).catch(() => null)),
        );
        if (cancelled) return;

        const valid = results.filter(
          (r: any) => r && r._id && r.success !== false && !r.error,
        );
        if (valid.length === 0) return;

        setProducts((prev) => {
          const existing = new Set(prev.map((p) => String(p._id)));
          const toAdd = valid.filter((p: any) => !existing.has(String(p._id)));
          return toAdd.length ? [...prev, ...toAdd] : prev;
        });
      } catch {
        /* silent */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [relatedProducts, products]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isInitializing.current) return;
    onUpdate("relatedProducts", relatedProducts);
  }, [relatedProducts, onUpdate]);

  const handleProductSelect = (productId: string) => {
    const idx = relatedProducts.findIndex((rp) => rp.id === productId);
    let updated: RelatedProduct[];
    if (idx >= 0) {
      updated = relatedProducts.filter((rp) => rp.id !== productId);
    } else {
      const defaultType = relationTypeAttr?.options?.[0] || "";
      updated = [
        ...relatedProducts,
        { id: productId, relationshipType: defaultType },
      ];
    }
    setRelatedProducts(updated);
  };

  const handleRelationshipChange = (productId: string, value: string) => {
    setRelatedProducts((prev) =>
      prev.map((rp) =>
        rp.id === productId ? { ...rp, relationshipType: value } : rp,
      ),
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setRelatedProducts((prev) => prev.filter((rp) => rp.id !== productId));
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.title?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term),
    );
  }, [products, searchTerm]);

  const relationOptions =
    relationTypeAttr?.options?.map((opt: string) => ({
      value: opt,
      label: opt,
    })) || [];

  if (!relatedAttr) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <LinkIcon fontSize="small" className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {relatedAttr.name}
          </span>
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {relatedProducts.length} selected
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            fontSize="small"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search products…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${INPUT_CLASS} pl-9`}
          />
        </div>
      </div>

      {/* Product list */}
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/40 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Search className="text-muted-foreground" fontSize="small" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {searchTerm ? "No matches" : "No products found"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchTerm
                ? "Try a different search term."
                : "Products will appear here once available."}
            </p>
          </div>
        ) : (
          filteredProducts.map((item) => {
            const selected = relatedProducts.find((rp) => rp.id === item._id);
            const isSelected = !!selected;
            const relationshipType = selected?.relationshipType || "";

            return (
              <div
                key={item._id}
                className={`group flex flex-wrap items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleProductSelect(item._id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="relative h-11 w-11 flex-none overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={
                        item.mainImage || item.main_image || "/placeholder.png"
                      }
                      alt={item.name || item.title || "Product"}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-foreground">
                      {item.name || item.title || "Untitled product"}
                    </h3>
                    {item.sku && (
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {item.sku}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check style={{ fontSize: 14 }} />
                    </span>
                  )}
                </button>

                {isSelected && (
                  <div className="flex flex-none items-center gap-1.5">
                    {relationOptions.length > 0 ? (
                      <Select
                        options={relationOptions}
                        value={
                          relationOptions.find(
                            (opt: any) => opt.value === relationshipType,
                          ) || null
                        }
                        onChange={(opt) =>
                          handleRelationshipChange(
                            item._id,
                            opt ? opt.value : "",
                          )
                        }
                        placeholder="Type"
                        className="w-36"
                        classNamePrefix="react-select"
                        styles={SELECT_STYLES}
                        isClearable
                        {...PORTAL_PROPS}
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-36 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                        value={relationshipType}
                        placeholder="Relation type"
                        onChange={(e) =>
                          handleRelationshipChange(item._id, e.target.value)
                        }
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(item._id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Close fontSize="small" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default React.memo(ManageRelatedProduct);
