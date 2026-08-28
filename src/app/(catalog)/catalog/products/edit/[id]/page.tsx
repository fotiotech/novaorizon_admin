// app/catalog/products/edit/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import ProductForm from "@/app/(catalog)/catalog/products/component/ProductForm";

export default function EditProductPage() {
  const { id } = useParams();
  return <ProductForm productId={id as string} />;
}
