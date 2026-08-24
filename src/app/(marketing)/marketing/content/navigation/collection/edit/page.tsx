"use client";

import React from "react";
import CollectionForm from "../_component/CollectionForm";
import { useSearchParams } from "next/navigation";

const EditProductCollection = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return <div className="">{id && <CollectionForm id={id} />}</div>;
};

export default EditProductCollection;
