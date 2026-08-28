// app/catalog/products/create/page.tsx
"use client";

import { useState } from "react";
import CategorySelector from "@/app/(catalog)/catalog/products/component/CategorySelector";
import ProductForm from "@/app/(catalog)/catalog/products/component/ProductForm";

export default function CreateProductPage() {
  const [categoryId, setCategoryId] = useState<string | null>(null);

  if (!categoryId) {
    return <CategorySelector onSelect={setCategoryId} />;
  }

  // pass the selected category as initialCategoryId
  return <ProductForm initialCategoryId={categoryId} />;
}
