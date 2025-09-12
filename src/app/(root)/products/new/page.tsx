"use client";

import React from "react";
import ProductForm from "../component/ProductForm";
import { useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import Category from "../component/Category";

const CreateProduct = () => {
  const products = useAppSelector((state: RootState) => state.product);
  const _id = products.allIds[0];
  const product = products.byId[_id] || {};

  if (!product.category_id) return <Category />;
  return (
    <div>
      <ProductForm />
    </div>
  );
};

export default CreateProduct;
