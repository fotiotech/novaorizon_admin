"use client";

import { deleteProduct } from "@/app/actions/products";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const DeleteProduct = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.toLowerCase();
  const recreate = searchParams.get("recreate") === "1";
  const [response, setResponse] = useState<string | null>(null);

  useEffect(() => {
    const deleteItem = async () => {
      try {
        const response = id ? await deleteProduct(id, { recreate }) : null;
        if (!response) {
          throw new Error("Failed to delete product");
        }
        setResponse(response as any);
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    };
    deleteItem();
  }, [id, recreate]);
  return (
    <div>
      {recreate ? "Delete and Recreate Product" : "Delete Product"}
      {response && (
        <p className="font-bold">
          {recreate
            ? "Product deleted and recreated successfully"
            : "Product deleted successfully"}
        </p>
      )}
    </div>
  );
};

export default DeleteProduct;
