import { findProducts } from "@/app/actions/products";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { addProduct } from "@/app/store/slices/productSlice";
import { useAppDispatch } from "@/app/hooks";
import Fields from "./Fields";

interface ManageRelatedProductProps {
  id: string;
  product?: any;
  attribute?: any;
}

const ManageRelatedProduct: React.FC<ManageRelatedProductProps> = ({
  id,
  product,
  attribute,
}) => {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function fetchProducts() {
      const res = await findProducts();
      if (Array.isArray(res)) setProducts(res);
    }
    fetchProducts();
  }, []);

  const handleChange = (field: string, value: any) => {
    dispatch(
      addProduct({
        _id: id,
        field,
        value,
      })
    );
  };

  // Find the related_products attribute
  const relatedProductsAttr = attribute.find(
    (attr: any) => attr.code === "related_products"
  );

  return (
    <div>
      {relatedProductsAttr && (
        <div className="h-72 overflow-y-auto space-y-4 p-2">
          <label className="block mb-1">{relatedProductsAttr.name}</label>
          <div>
            {products.map((item) => {
              const isSelected = selectedProductId === item._id;
              return (
                <div
                  key={item._id}
                  onClick={() => {
                    setSelectedProductId(item._id);
                    handleChange("related_products", {
                      ids: [item._id],
                      relationship_type:
                        product.related_products?.relationship_type || "",
                    });
                  }}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition hover:shadow-md ${
                    isSelected ? "border-indigo-500 " : "border-gray-200"
                  }`}
                >
                  <div className="w-12 h-12 relative flex-shrink-0">
                    <Image
                      src={item.main_image || "/placeholder.png"}
                      alt={item.title || "Product Image"}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-medium line-clamp-1">
                      {item.title || "Untitled Product"}
                    </h2>
                    {isSelected && (
                      <input
                        type="text"
                        title="Relation Type"
                        className="mt-1 block w-full p-1 border rounded"
                        name="relationship_type"
                        value={
                          product.related_products?.relationship_type || ""
                        }
                        placeholder="Enter relationship type e.g. Similar, Related"
                        onChange={(e) =>
                          handleChange("related_products", {
                            ids: product.related_products?.ids || [],
                            relationship_type: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRelatedProduct;
