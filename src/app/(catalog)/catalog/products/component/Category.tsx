"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { addProduct } from "@/app/store/slices/productSlice";
import { fetchCategory } from "@/fetch/fetchCategory";

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const Category = () => {
  const dispatch = useAppDispatch();
  const category = useAppSelector((state) => state.category);
  const products = useAppSelector((state) => state.product);

  // Safely get the first product ID
  const firstProductId = products.allIds[0] || "";
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    firstProductId ? products.byId[firstProductId]?.category_id || "" : "",
  );

  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebounce(filter, 300);

  // Fetch categories only once on mount
  useEffect(() => {
    dispatch(fetchCategory()); // assumes fetchCategory can be called without params
  }, [dispatch]);

  // Update selectedCategoryId if the product's category changes externally
  useEffect(() => {
    if (firstProductId) {
      const currentCategory = products.byId[firstProductId]?.category_id || "";
      setSelectedCategoryId(currentCategory);
    }
  }, [firstProductId, products.byId]);

  // Handler to select a category
  const handleSelectCategory = useCallback((id: string) => {
    setSelectedCategoryId(id);
    setFilter(""); // Clear filter after selection for better UX
  }, []);

  // Handler to clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedCategoryId("");
  }, []);

  // Handler to dispatch the selected category to the product
  const handleNext = useCallback(() => {
    if (!selectedCategoryId || !firstProductId) return;
    dispatch(
      addProduct({
        _id: firstProductId,
        field: "category_id",
        value: selectedCategoryId,
      }),
    );
  }, [dispatch, selectedCategoryId, firstProductId]);

  // Filter categories based on debounced filter
  const filteredCategories = useMemo(() => {
    return category.allIds.filter((idx) => {
      const categoryData = category.byId[idx];
      if (!categoryData) return false;
      if (!debouncedFilter) return true;
      return categoryData.name
        ?.toLowerCase()
        .includes(debouncedFilter.toLowerCase());
    });
  }, [category.allIds, category.byId, debouncedFilter]);

  // Keyboard navigation (up/down arrows) on the list
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredCategories.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredCategories.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredCategories.length) {
          const id = filteredCategories[focusedIndex];
          const data = category.byId[id];
          if (data) handleSelectCategory(data._id);
        }
      }
    },
    [filteredCategories, category.byId, handleSelectCategory, focusedIndex],
  );

  // Reset focused index when filter changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [debouncedFilter]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      if (items[focusedIndex]) {
        items[focusedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex]);

  // Loading and error states
  // Use runtime property checks to avoid TypeScript errors if state shape differs
  if ("loading" in category && (category as any).loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if ("error" in category && (category as any).error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-red-600 dark:text-red-400">
        Error loading categories: {String((category as any).error)}
      </div>
    );
  }

  const selectedCategoryName = selectedCategoryId
    ? category.byId[selectedCategoryId]?.name || ""
    : "";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        Select Category
      </h3>

      {/* Filter Input */}
      <input
        type="text"
        placeholder="Filter categories..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Filter categories"
        className="mb-4 p-3 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
      />

      {/* Category List */}
      <div
        className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 h-[500px] overflow-y-auto"
        role="listbox"
        aria-label="Categories"
        ref={listRef}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {filteredCategories.length > 0 ? (
          <div className="space-y-2">
            {filteredCategories.map((idx, index) => {
              const categoryData = category.byId[idx];
              if (!categoryData) return null;

              const isSelected = selectedCategoryId === categoryData._id;
              const isFocused = focusedIndex === index;

              return (
                <div
                  key={idx}
                  role="option"
                  aria-selected={isSelected}
                  className={`flex justify-between items-center p-3 rounded-lg transition-all duration-200 cursor-pointer
                    ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500"
                        : "bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500"
                    }
                    ${isFocused ? "ring-2 ring-blue-400" : ""}
                    shadow-sm hover:shadow-md
                  `}
                  onClick={() => handleSelectCategory(categoryData._id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <span className="font-medium text-gray-800 dark:text-white">
                    {categoryData.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <svg
                        className="w-5 h-5 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCategory(categoryData._id);
                      }}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-500 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-400"
                      }`}
                      aria-label={`Select ${categoryData.name}`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
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

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          {selectedCategoryId ? (
            <>
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Selected: <strong>{selectedCategoryName}</strong>
              </span>
              <button
                onClick={handleClearSelection}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors underline-offset-2 hover:underline"
                aria-label="Clear selection"
              >
                Clear
              </button>
            </>
          ) : (
            "Please select a category to continue"
          )}
        </div>
        <button
          type="button"
          disabled={!selectedCategoryId}
          onClick={handleNext}
          className={`px-6 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-2
            ${
              selectedCategoryId
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }
          `}
          aria-label="Next"
        >
          Next
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Category;
