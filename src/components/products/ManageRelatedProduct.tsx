"use client";

import { findProducts } from "@/app/actions/products";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import CollabsibleSection from "./CollabsibleSection";
import { addProduct } from "@/app/store/slices/productSlice";
import { useAppDispatch } from "@/app/hooks";

interface ManageRelatedProductProps {
  product: any;
  id: string;
}

const ManageRelatedProduct: React.FC<ManageRelatedProductProps> = ({
  product,
  id,
}) => {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    product.related_products?.product_id || null
  );

  useEffect(() => {
    async function fetchProducts() {
      const res = await findProducts();
      if (Array.isArray(res)) setProducts(res);
    }
    fetchProducts();
  }, []);

  const handleChange = (
    group: string,
    index: number,
    field: string,
    value: any
  ) => {
    dispatch(
      addProduct({
        _id: id,
        path: `${group}.${index}.${field}`,
        value,
      })
    );
  };

  const handleProductClick = (idx: number, productId: string) => {
    setSelectedProductId(productId);
    handleChange("related_products", idx, "product_id", productId);
  };

  return (
    <div>
      <h3 className="text-2xl font-semibold border-b pb-2">Related Product</h3>
      <CollabsibleSection>
        <div className="h-72 overflow-y-auto space-y-4 p-2">
          {products.map((item, idx) => {
            const isSelected = selectedProductId === item._id;
            return (
              <div
                key={item._id}
                onClick={() => handleProductClick(idx, item._id)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition hover:shadow-md ${
                  isSelected
                    ? "border-indigo-500 "
                    : "border-gray-200"
                }`}
              >
                <div className="w-12 h-12 relative flex-shrink-0">
                  <Image
                    src={item.media_visuals?.main_image || "/placeholder.png"}
                    alt={item.identification_branding?.name || "Product Image"}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-medium line-clamp-1">
                    {item.identification_branding?.name || "Untitled Product"}
                  </h2>
                  {isSelected && (
                    <input
                      type="text"
                      title="Relation Type"
                      className="mt-1 block w-full p-1 border rounded"
                      name="relationship_type"
                      value={product?.related_products[idx]?.relationship_type || ""}
                      placeholder="Enter relationship type e.g. Similar, Related"
                      onChange={(e) =>
                        handleChange(
                          "related_products",
                          idx,
                          "relationship_type",
                          e.target.value
                        )
                      }
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CollabsibleSection>
    </div>
  );
};

export default ManageRelatedProduct;
