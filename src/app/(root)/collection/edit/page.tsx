"use client"

import { useSearchParams } from "next/navigation";
import React from "react";
import CollectionForm from "../_component/CollectionForm";

const EditCollection = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  return (
    <div>
      <h2>Edit Collection</h2> <div>{id && <CollectionForm id={id} />}</div>
    </div>
  );
};

export default EditCollection;
