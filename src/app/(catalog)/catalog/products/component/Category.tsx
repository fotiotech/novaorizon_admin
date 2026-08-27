"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { addProduct, resetProduct } from "@/app/store/slices/productSlice";
import { fetchCategory } from "@/fetch/fetchCategory";
import { ObjectId } from "bson";

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

  const firstProductId = products.allIds[0] || "";
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    firstProductId ? products.byId[firstProductId]?.category_id || "" : "",
  );

  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebounce(filter, 300);

  const tempId = useMemo(() => new ObjectId().toString(), []);

  useEffect(() => {
    if (firstProductId) return;
    dispatch(resetProduct(tempId));
  }, [dispatch, firstProductId, tempId]);

  useEffect(() => {
    dispatch(fetchCategory());
  }, [dispatch]);

  useEffect(() => {
    if (firstProductId) {
      const currentCategory = products.byId[firstProductId]?.category_id || "";
      setSelectedCategoryId(currentCategory);
    }
  }, [firstProductId, products.byId]);

  const handleSelectCategory = useCallback((id: string) => {
    setSelectedCategoryId(id);
    setFilter("");
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedCategoryId("");
  }, []);

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

  useEffect(() => {
    setFocusedIndex(-1);
  }, [debouncedFilter]);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      if (items[focusedIndex]) {
        items[focusedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex]);

  if ("loading" in category && (category as any).loading) {
    return (
      <div className="bg-card rounded-lg shadow-md p-4 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pri-500"></div>
      </div>
    );
  }

  if ("error" in category && (category as any).error) {
    return (
      <div className="bg-card rounded-lg shadow-md p-4 text-destructive">
        Error loading categories: {String((category as any).error)}
      </div>
    );
  }

  const selectedCategoryName = selectedCategoryId
    ? category.byId[selectedCategoryId]?.name || ""
    : "";

  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-md p-4">
      <h3 className="text-xl font-semibold mb-4 text-foreground">
        Select Category
      </h3>

      <input
        type="text"
        placeholder="Filter categories..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Filter categories"
        className="mb-4 p-3 w-full border border-border rounded-md focus:ring-2 focus:ring-pri-500 focus:border-transparent bg-background text-foreground"
      />

      <div
        className="bg-muted rounded-lg p-3 h-[500px] overflow-y-auto"
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
                        ? "bg-pri-500/10 border-2 border-pri-500"
                        : "bg-card hover:bg-muted/50"
                    }
                    ${isFocused ? "ring-2 ring-pri-400" : ""}
                    shadow-sm hover:shadow-md
                  `}
                  onClick={() => handleSelectCategory(categoryData._id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <span className="font-medium text-foreground">
                    {categoryData.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <svg
                        className="w-5 h-5 text-pri-500"
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
                          ? "bg-pri-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
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
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No categories found
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {selectedCategoryId ? (
            <>
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-thir-500"
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
                Selected:{" "}
                <strong className="text-foreground">
                  {selectedCategoryName}
                </strong>
              </span>
              <button
                onClick={handleClearSelection}
                className="text-destructive hover:text-destructive/80 transition-colors underline-offset-2 hover:underline"
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
                ? "bg-primary hover:bg-primary-600 text-white shadow-md hover:shadow-lg"
                : "bg-muted text-muted-foreground cursor-not-allowed"
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
