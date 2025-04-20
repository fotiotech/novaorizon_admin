"use client";

import { deleteProduct } from "@/app/actions/products";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const DeleteProduct = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.toLowerCase();
  const [response, setResponse] = useState<string | null>(null);

  useEffect(() => {
    const deleteItem = async () => {
      try {
        const response = id ? await deleteProduct(id) : null;
        if (!response) {
          throw new Error("Failed to delete product");
        }
        setResponse(response);
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    };
    deleteItem();
  }, [id]);
  return (
    <div>
      Delete Product
      {response && <p className="font-bold">Product deleted successfully</p>}
    </div>
  );
};

export default DeleteProduct;
