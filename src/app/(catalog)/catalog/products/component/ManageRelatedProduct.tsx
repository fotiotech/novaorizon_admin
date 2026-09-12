"use client";

import { findProducts } from "@/app/actions/products";
import Image from "next/image";
import React, { useEffect, useState, useMemo, useRef } from "react";
import Select from "react-select";

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
      // Server-side filtering is handled in products.ts; keep pageSize small.
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
      initial = relatedProductsData.map((rp: any) => ({
        id: rp.id,
        relationshipType: rp.relationshipType || rp.relationship_type || "",
      }));
    } else if (relatedProductsData?.ids) {
      const defaultType =
        relatedProductsData.relationshipType ||
        relatedProductsData.relationship_type ||
        "";
      initial = relatedProductsData.ids.map((pid: string) => ({
        id: pid,
        relationshipType: defaultType,
      }));
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            {relatedAttr.name}
          </span>
          <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
            {relatedProducts.length} selected
          </span>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-8 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground text-sm"
          />
          <svg
            className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <div className="h-72 overflow-y-auto space-y-2 pr-1">
        {filteredProducts.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">
            {searchTerm
              ? "No products match your search."
              : "No products found."}
          </p>
        ) : (
          filteredProducts.map((item) => {
            const selected = relatedProducts.find((rp) => rp.id === item._id);
            const isSelected = !!selected;
            const relationshipType = selected?.relationshipType || "";

            return (
              <div
                key={item._id}
                className={`group flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? "border-primary/60 bg-primary/10 shadow-sm"
                    : "border-border hover:border-input hover:shadow-sm bg-card"
                }`}
              >
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleProductSelect(item._id)}
                >
                  <div className="w-12 h-12 relative flex-shrink-0">
                    <Image
                      src={
                        item.mainImage || item.main_image || "/placeholder.png"
                      }
                      alt={item.name || item.title || "Product"}
                      fill
                      className="object-cover rounded-lg"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {item.name || item.title || "Untitled Product"}
                    </h3>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground truncate">
                        SKU: {item.sku}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <svg
                      className="w-5 h-5 text-primary flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>

                {isSelected && (
                  <div
                    className="flex items-center gap-2 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                        isClearable
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-36 p-1.5 border border-input rounded text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
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
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
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
