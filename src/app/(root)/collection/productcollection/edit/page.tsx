"use client";

import React from "react";
import ProductCollectionForm from "../../_component/ProductCollectionForm";

const EditProductCollection = ({ id }: { id?: string }) => {
  return (
    <div className="">
      <ProductCollectionForm id={id} />
    </div>
  );
};

export default EditProductCollection;
