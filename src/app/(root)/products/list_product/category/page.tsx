"use client";

import { getCategory } from "@/app/actions/category";
import { Category as Cat } from "@/constant/types";
import React, { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import Link from "next/link";
import { addCategory } from "@/app/store/slices/categorySlice";
import { addProduct } from "@/app/store/slices/productSlice";
import { v4 as uuidv4 } from "uuid";
import { fetchCategory } from "@/fetch/fetchCategory";

type CategoryProps = { initialId?: string | null };

const Category: React.FC<CategoryProps> = ({ initialId }) => {
  const dispatch = useAppDispatch();
  const category = useAppSelector((state) => state.category);
  const products = useAppSelector((state) => state.product);

  // 1️⃣ Create a ref that holds our “working” ID.  It only gets set once.

  const id = products.allIds.length ? products.allIds[0] : uuidv4();

  console.log("products", products);

  // Initialize product in Redux if it doesn't exist
  useEffect(() => {
    if (!products.allIds.length) {
      dispatch(addProduct({ _id: id }));
    }
  }, [dispatch, id, products.allIds.length]);

  // Get the category_id from the product state
  const category_id = products.byId[id]?.category_id || "";
  const [parentId, setParentId] = useState<string>(category_id);

  // Update local state when Redux category_id changes
  useEffect(() => {
    setParentId(category_id);
  }, [category_id]);

  // Fetch categories based on selected parent
  useEffect(() => {
    const fetchData = async () => {
      try {
        // If we have a parentId, fetch its subcategories, otherwise fetch all categories
        dispatch(fetchCategory(null, parentId || null, null));
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchData();
  }, [parentId, dispatch]);

  const handleSelect = (catId: string) => {
    if (!catId) return;

    setParentId(catId);

    // Update both category and product states
    dispatch(addCategory({ categoryId: catId }));
    dispatch(
      addProduct({
        _id: id,
        category_id: catId,
      })
    );
  };

  return (
    <div className="p-2 mt-4">
      <h3 className="text-lg font-semibold mb-4">Select Category</h3>
      <ul className="flex flex-col gap-2 bg-[#eee] h-[500px] scrollbar-none overflow-clip overflow-y-auto dark:bg-sec-dark">
        {category?.allIds.length > 0 &&
          category?.allIds.map((idx) => {
            const categoryData = category.byId[idx];
            if (!categoryData) return null;

            return (
              <li
                key={idx}
                className="flex justify-between items-center rounded-lg bg-slate-600 p-2"
              >
                <p
                  onClick={() => handleSelect(categoryData._id)}
                  className="flex-1 cursor-pointer"
                >
                  {categoryData?.categoryName}
                </p>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(categoryData._id);
                  }}
                  className={`${
                    parentId === categoryData._id ? "bg-blue-400" : ""
                  } px-2 rounded-lg border`}
                >
                  Select
                </span>
              </li>
            );
          })}
      </ul>

      <div className="flex justify-between mt-6">
        <div className="text-sm text-gray-500">
          {parentId
            ? "Category selected"
            : "Please select a category to continue"}
        </div>
        <Link
          href={parentId ? "/products/list_product/basic_infos" : "#"}
          className={`${
            parentId
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-gray-400 cursor-not-allowed"
          } text-white p-2 rounded transition-colors`}
          onClick={(e) => {
            if (!parentId) {
              e.preventDefault();
            }
          }}
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default Category;
