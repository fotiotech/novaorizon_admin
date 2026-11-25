"use client";

import { useEffect, useState } from "react";
import { getBrands } from "@/lib/api/brand";
import { listCategories } from "@/lib/api/category";
import FilesUploader from "@/components/FilesUploader";
import RichTextEditorWrapper from "@/app/(root)/catalog/products/component/RichTextEditorWrapper";
import { useFileUploader } from "@/hooks/useFileUploader";

const INPUT =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
const LABEL = "block text-[13px] font-medium text-foreground mb-1.5";
const CARD = "rounded-xl border border-border bg-card p-4 space-y-4";

export function ProductGeneralFields({
  productId,
  productData,
  onChange,
}: {
  productId: string;
  productData: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}) {
  const [categories, setCategories] = useState<
    { _id: string; name: string; parentId?: string | null }[]
  >([]);
  const [brands, setBrands] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCategories(), getBrands()])
      .then(([categoryList, brandList]) => {
        if (cancelled) return;
        setCategories(
          (categoryList as any[]).map((category) => ({
            _id: String(category._id ?? category.id),
            name: category.name,
            parentId: category.parentId ?? null,
          })),
        );
        setBrands(
          (brandList as any[]).map((brand) => ({
            _id: String(brand._id ?? brand.id),
            name: brand.name,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryId =
    typeof productData.categoryId === "object" && productData.categoryId
      ? String(productData.categoryId._id ?? "")
      : String(productData.categoryId ?? "");
  const brandId =
    typeof productData.brand === "object" && productData.brand
      ? String(productData.brand._id ?? "")
      : String(productData.brand ?? "");

  const images = Array.isArray(productData.images) ? productData.images : [];
  const uploader = useFileUploader(productId, images, "products");

  useEffect(() => {
    const next = uploader.files;
    const current = Array.isArray(productData.images) ? productData.images : [];
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      onChange({ images: next });
    }
  }, [uploader.files, productData.images, onChange]);

  const set = (key: string, value: any) => onChange({ [key]: value });

  return (
    <div className="space-y-4">
      {/* Basic */}
      <section className={CARD}>
        <h2 className="text-sm font-semibold text-foreground">
          Basic information
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={LABEL}>
            Name <span className="text-destructive">*</span>
            <input
              className={`${INPUT} mt-1`}
              value={productData.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Product name"
            />
          </label>
          <label className={LABEL}>
            SKU
            <input
              className={`${INPUT} mt-1`}
              value={productData.sku ?? ""}
              onChange={(e) => set("sku", e.target.value)}
              placeholder="SKU"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={LABEL}>
            Category
            <select
              className={`${INPUT} mt-1`}
              value={categoryId}
              onChange={(e) => set("categoryId", e.target.value || null)}
            >
              <option value="">Select category…</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL}>
            Brand
            <select
              className={`${INPUT} mt-1`}
              value={brandId}
              onChange={(e) => set("brand", e.target.value || null)}
            >
              <option value="">Select brand…</option>
              {brands.map((brand) => (
                <option key={brand._id} value={brand._id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={LABEL}>
            Status
            <select
              className={`${INPUT} mt-1`}
              value={productData.status ?? "draft"}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className={LABEL}>
            Tags
            <input
              className={`${INPUT} mt-1`}
              value={
                Array.isArray(productData.tags)
                  ? productData.tags.join(", ")
                  : (productData.tags ?? "")
              }
              onChange={(e) =>
                set(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                )
              }
              placeholder="summer, sale, new"
            />
          </label>
        </div>

        <label className={LABEL}>
          Short description
          <textarea
            className={`${INPUT} mt-1 min-h-20`}
            value={productData.shortDescription ?? ""}
            onChange={(e) => set("shortDescription", e.target.value)}
          />
        </label>

        <div>
          <span className={LABEL}>Description</span>
          <RichTextEditorWrapper
            value={productData.description ?? ""}
            onChange={(value) => set("description", value)}
            productId={productId}
            placeholder="Describe the product…"
            contentMaxHeight={320}
          />
        </div>
      </section>

      {/* Pricing */}
      <section className={CARD}>
        <h2 className="text-sm font-semibold text-foreground">Pricing</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={LABEL}>
            Price
            <input
              type="number"
              min={0}
              className={`${INPUT} mt-1`}
              value={productData.price ?? ""}
              onChange={(e) => set("price", Number(e.target.value) || 0)}
            />
          </label>
          <label className={LABEL}>
            List price
            <input
              type="number"
              min={0}
              className={`${INPUT} mt-1`}
              value={productData.listPrice ?? ""}
              onChange={(e) => set("listPrice", Number(e.target.value) || 0)}
            />
          </label>
        </div>
      </section>

      {/* Stock */}
      <section className={CARD}>
        <h2 className="text-sm font-semibold text-foreground">Stock</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={LABEL}>
            Quantity
            <input
              type="number"
              min={0}
              className={`${INPUT} mt-1`}
              value={productData.quantity ?? 0}
              onChange={(e) => set("quantity", Number(e.target.value) || 0)}
            />
          </label>
          <label className={LABEL}>
            Low stock threshold
            <input
              type="number"
              min={0}
              className={`${INPUT} mt-1`}
              value={productData.lowStockThreshold ?? 5}
              onChange={(e) =>
                set("lowStockThreshold", Number(e.target.value) || 0)
              }
            />
          </label>
        </div>
      </section>

      {/* Media */}
      <section className={CARD}>
        <h2 className="text-sm font-semibold text-foreground">Media</h2>
        <FilesUploader
          files={uploader.files}
          loading={uploader.loading}
          addFiles={uploader.addFiles}
          onRemove={async (index, url) => {
            await uploader.removeFile(index, url);
          }}
        />
      </section>
    </div>
  );
}