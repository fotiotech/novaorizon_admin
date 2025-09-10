"use client";

import React from "react";
import ProductCollectionForm from "../../_component/ProductCollectionForm";
import { useSearchParams } from "next/navigation";

const EditProductCollection = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return <div className="">{id && <ProductCollectionForm id={id} />}</div>;
};

export default EditProductCollection;
