"use client";


import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { persistor } from "@/app/store/store";
import Link from "next/link";
import { addCategory } from "@/app/store/slices/categorySlice";
import {
  addProduct,
  clearProduct,
  resetProduct,
  setProducts,
} from "@/app/store/slices/productSlice";
import { v4 as uuidv4 } from "uuid";
import { fetchCategory } from "@/fetch/fetchCategory";
import { useSearchParams } from "next/navigation";
import { findProducts } from "@/app/actions/products";

const Category = () => {
  const dispatch = useAppDispatch();
  const pId = useSearchParams().get("id");
  const [prodUpdate, setProdUpdate] = useState<any>({});

  useEffect(() => {
    async function fetchProduct() {
      try {
        if (!pId) return;
        const res = await findProducts(pId);
        if (res) {
          setProdUpdate(res);
          if (res && typeof res === "object" && "_id" in res && res._id) {
            console.log("Dispatching resetProduct with ID:", res._id);
            dispatch(
              setProducts({
                byId: {
                  [res?._id]: { _id: res?._id, category_id: res?.category_id },
                },
                allIds: [res?._id],
              })
            );
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
    fetchProduct();
  }, [pId, dispatch]);

  const category = useAppSelector((state) => state.category);
  const products = useAppSelector((state) => state.product);

  const _id = products.allIds.length ? products.allIds[0] : uuidv4();

  useEffect(() => {
    if (!products.allIds.length) {
      dispatch(resetProduct(_id));
    }
  }, [dispatch, _id, products.allIds.length]);

  const category_id = products.byId[_id]?.category_id || "";
  console.log({ _id, category_id, products });
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
        _id,
        field: "category_id",
        value: catId,
      })
    );
  };

  const [filter, setFilter] = useState<string>("");

  return (
    <div className=" mt-4">
      <h3 className="text-lg font-semibold mb-4">Select Category</h3>
      <input
        type="text"
        placeholder="Filter categories..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-2 p-2 rounded border w-full"
      />
      <ul className="flex flex-col gap-2 bg-[#eee] h-[500px] scrollbar-none overflow-clip overflow-y-auto dark:bg-sec-dark">
        {category?.allIds.length > 0 &&
          category?.allIds
            .filter((idx) => {
              const categoryData = category.byId[idx];
              if (!categoryData) return false;
              if (!filter) return true;
              return categoryData.categoryName
                ?.toLowerCase()
                .includes(filter.toLowerCase());
            })
            .map((idx) => {
              const categoryData = category.byId[idx];
              if (!categoryData) return null;

              return (
                <li
                  key={idx}
                  className="flex justify-between items-center rounded-lg bg-slate-600 p-2"
                >
                  <div className="flex-1">
                    <p
                      onClick={() => handleSelect(categoryData._id)}
                      className="cursor-pointer font-semibold"
                    >
                      {categoryData?.categoryName}
                    </p>
                  </div>
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
          href={parentId ? "/products/new" : "#"}
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
