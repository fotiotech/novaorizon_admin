"use client";

import { findProducts } from "@/app/actions/products";
import Image from "next/image";
import React, { useEffect, useState, useMemo } from "react";
import { addProduct } from "@/app/store/slices/productSlice";
import { useAppDispatch } from "@/app/hooks";
import Select from "react-select";

interface ManageRelatedProductProps {
  id: string;
  product?: any;
  attribute?: any[];
}

interface RelatedProduct {
  id: string;
  relationship_type: string;
}

const ManageRelatedProduct: React.FC<ManageRelatedProductProps> = ({
  id,
  product,
  attribute = [],
}) => {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Find attributes from the group
  const relatedAttr = attribute.find((a) => a.code === "related_products");
  const relationTypeAttr = attribute.find((a) => a.code === "relation_type");

  // Fetch products on mount
  useEffect(() => {
    async function fetchProducts() {
      const res = await findProducts();
      if (Array.isArray(res)) setProducts(res);
    }
    fetchProducts();
  }, []);

  // Initialize relatedProducts from product data
  useEffect(() => {
    if (product?.related_products) {
      if (Array.isArray(product.related_products)) {
        setRelatedProducts(product.related_products);
      } else if (
        product.related_products.ids &&
        product.related_products.relationship_type
      ) {
        const newRelatedProducts = product.related_products.ids.map(
          (id: string) => ({
            id,
            relationship_type: product.related_products.relationship_type,
          }),
        );
        setRelatedProducts(newRelatedProducts);
        handleChange("related_products", newRelatedProducts);
      }
    }
  }, [product?.related_products]);

  const handleChange = (field: string, value: any) => {
    dispatch(
      addProduct({
        _id: id,
        field,
        value,
      }),
    );
  };

  const handleProductSelect = (productId: string) => {
    const existingIndex = relatedProducts.findIndex(
      (rp) => rp.id === productId,
    );

    let updated;
    if (existingIndex >= 0) {
      updated = relatedProducts.filter((rp) => rp.id !== productId);
    } else {
      const defaultType = relationTypeAttr?.options?.[0] || "";
      updated = [
        ...relatedProducts,
        { id: productId, relationship_type: defaultType },
      ];
    }
    setRelatedProducts(updated);
    handleChange("related_products", updated);
  };

  const handleRelationshipChange = (productId: string, value: string) => {
    const updated = relatedProducts.map((rp) =>
      rp.id === productId ? { ...rp, relationship_type: value } : rp,
    );
    setRelatedProducts(updated);
    handleChange("related_products", updated);
  };

  const handleRemoveProduct = (productId: string) => {
    const updated = relatedProducts.filter((rp) => rp.id !== productId);
    setRelatedProducts(updated);
    handleChange("related_products", updated);
  };

  // Filter products by search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.title?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term),
    );
  }, [products, searchTerm]);

  // Build options for relation type select
  const relationOptions =
    relationTypeAttr?.options?.map((opt: string) => ({
      value: opt,
      label: opt,
    })) || [];

  if (!relatedAttr) return null;

  return (
    <div className="space-y-4">
      {/* Header with search and count */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            {relatedAttr.name}
          </span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            {relatedProducts.length} selected
          </span>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
          />
          <svg
            className="absolute left-2 top-2.5 w-4 h-4 text-gray-400"
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

      {/* Product list */}
      <div className="h-72 overflow-y-auto space-y-2 pr-1">
        {filteredProducts.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-sm">
            {searchTerm
              ? "No products match your search."
              : "No products found."}
          </p>
        ) : (
          filteredProducts.map((item) => {
            const selected = relatedProducts.find((rp) => rp.id === item._id);
            const isSelected = !!selected;
            const relationshipType = selected?.relationship_type || "";

            return (
              <div
                key={item._id}
                className={`group flex flex-wrap items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? "border-indigo-400 bg-indigo-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {/* Clickable area to select/deselect */}
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleProductSelect(item._id)}
                >
                  <div className="w-12 h-12 relative flex-shrink-0">
                    <Image
                      src={item.main_image || "/placeholder.png"}
                      alt={item.title || "Product"}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-800 truncate">
                      {item.title || "Untitled Product"}
                    </h3>
                    {item.sku && (
                      <p className="text-xs text-gray-500 truncate">
                        SKU: {item.sku}
                      </p>
                    )}
                  </div>
                  {/* Selected checkmark */}
                  {isSelected && (
                    <svg
                      className="w-5 h-5 text-indigo-600 flex-shrink-0"
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

                {/* Relationship type selector & remove button */}
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
                        className="w-36 p-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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

export default ManageRelatedProduct;
