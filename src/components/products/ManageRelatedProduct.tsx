import { findProducts } from "@/app/actions/products";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { addProduct } from "@/app/store/slices/productSlice";
import { useAppDispatch } from "@/app/hooks";

interface ManageRelatedProductProps {
  id: string;
  code: string;
}

const ManageRelatedProduct: React.FC<ManageRelatedProductProps> = ({
  id,
  code,
}) => {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<any[]>([]);
  const [related, setRelated] = useState<any>({});
  const [selectedProductId, setSelectedProductId] = useState<string | null>("");

  useEffect(() => {
    async function fetchProducts() {
      const res = await findProducts();
      console.log("Fetched products:", res);
      if (Array.isArray(res)) setProducts(res);
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      dispatch(
        addProduct({
          _id: id,
          field: code,
          value: related,
        })
      );
    }
  }, [related, selectedProductId, id, code, dispatch]);

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setRelated((prev: any) => ({ ...prev, ids: [productId] }));
  };

  return (
    <div>
      <div className="h-72 overflow-y-auto space-y-4 p-2">
        {products.map((item) => {
          const isSelected = selectedProductId === item._id;
          return (
            <div
              key={item._id}
              onClick={() => handleProductClick(item._id)}
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
              <div>
                <h2 className="text-lg font-medium line-clamp-1">
                  {item.title || "Untitled Product"}
                </h2>
                {isSelected && (
                  <input
                    type="text"
                    title="Relation Type"
                    className="mt-1 block w-full p-1 border rounded"
                    name="relationship_type"
                    value={related.relationship_type || ""}
                    placeholder="Enter relationship type e.g. Similar, Related"
                    onChange={(e) =>
                      setRelated((prev: any) => ({
                        ...prev,
                        relationship_type: e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManageRelatedProduct;
