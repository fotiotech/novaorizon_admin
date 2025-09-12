"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";
import { fetchCategory } from "@/fetch/fetchCategory";

const Category = () => {
  const dispatch = useAppDispatch();
  const category = useAppSelector((state) => state.category);
  const products = useAppSelector((state) => state.product);
  const _id = products.allIds[0];
  const [filter, setFilter] = useState("");
  const [category_id, setCategory_id] = useState(
    _id ? products.byId[_id]?.category_id || "" : ""
  );

  // Fetch categories based on selected parent
  useEffect(() => {
    dispatch(fetchCategory(null, category_id || null, null));
  }, [category_id, dispatch]);

  const handleSelect = useCallback(() => {
    if (!category_id) return;

    dispatch(
      addProduct({
        _id,
        field: "category_id",
        value: category_id,
      })
    );
  }, [dispatch, category_id]);

  // Memoize filtered categories for performance
  const filteredCategories = useMemo(() => {
    return category.allIds.filter((idx) => {
      const categoryData = category.byId[idx];
      if (!categoryData) return false;
      if (!filter) return true;
      return categoryData.name?.toLowerCase().includes(filter.toLowerCase());
    });
  }, [category.allIds, category.byId, filter]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        Select Category
      </h3>

      <input
        type="text"
        placeholder="Filter categories..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4 p-3 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
      />

      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 h-[500px] overflow-y-auto">
        {filteredCategories.length > 0 ? (
          <div className="space-y-2">
            {filteredCategories.map((idx) => {
              const categoryData = category.byId[idx];
              if (!categoryData) return null;

              return (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-gray-600 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <button
                      onClick={() => setCategory_id(categoryData._id)}
                      className="text-left w-full font-medium text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {categoryData.name}
                    </button>
                  </div>
                  <button
                    onClick={() => setCategory_id(categoryData._id)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      category_id === categoryData._id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-500 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-400"
                    }`}
                  >
                    {category_id === categoryData._id ? "Selected" : "Select"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No categories found
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {category_id
            ? "Category selected"
            : "Please select a category to continue"}
        </div>
        <button
          type="button"
          disabled={!category_id}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            category_id
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          }`}
          onClick={handleSelect}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Category;
