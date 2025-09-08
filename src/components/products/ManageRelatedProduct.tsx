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

interface RelatedProduct {
  id: string;
  relationship_type: string;
}

const ManageRelatedProduct: React.FC<ManageRelatedProductProps> = ({
  id,
  product,
  attribute,
}) => {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);

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
      // Handle both old and new data formats
      if (Array.isArray(product.related_products)) {
        setRelatedProducts(product.related_products);
      } else if (
        product.related_products.ids &&
        product.related_products.relationship_type
      ) {
        // Convert old format to new format
        const newRelatedProducts = product.related_products.ids.map(
          (id: string) => ({
            id,
            relationship_type: product.related_products.relationship_type,
          })
        );
        setRelatedProducts(newRelatedProducts);

        // Update the store with new format
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
      })
    );
  };

  const handleProductSelect = (productId: string) => {
    const existingIndex = relatedProducts.findIndex(
      (rp) => rp.id === productId
    );

    if (existingIndex >= 0) {
      // Remove product if already selected
      const updated = relatedProducts.filter((rp) => rp.id !== productId);
      setRelatedProducts(updated);
      handleChange("related_products", updated);
    } else {
      // Add product with empty relationship type
      const updated = [
        ...relatedProducts,
        { id: productId, relationship_type: "" },
      ];
      setRelatedProducts(updated);
      handleChange("related_products", updated);
    }
  };

  const handleRelationshipChange = (
    productId: string,
    relationshipType: string
  ) => {
    const updated = relatedProducts.map((rp) =>
      rp.id === productId ? { ...rp, relationship_type: relationshipType } : rp
    );
    setRelatedProducts(updated);
    handleChange("related_products", updated);
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
              const isSelected = relatedProducts.some(
                (rp) => rp.id === item._id
              );
              const relationshipType = isSelected
                ? relatedProducts.find((rp) => rp.id === item._id)
                    ?.relationship_type || ""
                : "";

              return (
                <div
                  key={item._id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition hover:shadow-md ${
                    isSelected ? "border-indigo-500 " : "border-gray-200"
                  }`}
                >
                  <div
                    className="flex items-center gap-3 flex-1"
                    onClick={() => handleProductSelect(item._id)}
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
                    </div>
                  </div>

                  {isSelected && (
                    <input
                      type="text"
                      title="Relation Type"
                      className="p-1 border rounded w-40"
                      name="relationship_type"
                      value={relationshipType}
                      placeholder="Relationship type"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleRelationshipChange(item._id, e.target.value)
                      }
                    />
                  )}
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
