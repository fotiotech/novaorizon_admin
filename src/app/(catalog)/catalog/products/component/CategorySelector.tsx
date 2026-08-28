// app/(catalog)/catalog/products/component/CategorySelector.tsx
"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { getCategories } from "@/app/actions/category";

interface CategorySelectorProps {
  initialCategoryId?: string;
  onSelect: (categoryId: string) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  initialCategoryId,
  onSelect,
}) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string>(initialCategoryId || "");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        setError("Failed to load categories.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredCategories = useMemo(() => {
    if (!filter) return categories;
    const term = filter.toLowerCase().trim();
    return categories.filter((cat) => cat.name.toLowerCase().includes(term));
  }, [categories, filter]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      onSelect(id);
      setFilter("");
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    setSelectedId("");
    onSelect("");
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        const cat = filteredCategories[focusedIndex];
        if (cat) handleSelect(cat._id);
      }
    }
  };

  useEffect(() => {
    setFocusedIndex(-1);
  }, [filter]);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      if (items[focusedIndex]) {
        items[focusedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex]);

  if (loading)
    return <div className="animate-pulse h-64 bg-gray-200 rounded" />;
  if (error) return <div className="text-red-500">{error}</div>;

  const selectedCategory = categories.find((c) => c._id === selectedId);

  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-md p-4">
      <h3 className="text-xl font-semibold mb-4">Select Category</h3>

      <input
        type="text"
        placeholder="Filter categories..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={handleKeyDown}
        className="mb-4 p-3 w-full border border-border rounded-md focus:ring-2 focus:ring-pri-500 bg-background text-foreground"
      />

      <div
        className="bg-muted rounded-lg p-3 h-[500px] overflow-y-auto"
        role="listbox"
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {filteredCategories.length > 0 ? (
          <div className="space-y-2">
            {filteredCategories.map((cat, index) => {
              const isSelected = selectedId === cat._id;
              const isFocused = focusedIndex === index;
              return (
                <div
                  key={cat._id}
                  role="option"
                  aria-selected={isSelected}
                  className={`flex justify-between items-start gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer
                    ${isSelected ? "bg-pri-500/10 border-2 border-pri-500" : "bg-card hover:bg-muted/50"}
                    ${isFocused ? "ring-2 ring-pri-400" : ""}
                    shadow-sm hover:shadow-md`}
                  onClick={() => handleSelect(cat._id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">
                      {cat.name}
                    </div>
                    {cat.url_slug && (
                      <div className="text-xs text-gray-400 line-clamp-1">
                        {cat.url_slug}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSelected && (
                      <svg
                        className="w-5 h-5 text-pri-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                        handleSelect(cat._id);
                      }}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-pri-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
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
          {selectedId ? (
            <>
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-thir-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
                  {selectedCategory?.name}
                </strong>
              </span>
              <button
                onClick={handleClear}
                className="text-destructive hover:text-destructive/80 transition-colors underline-offset-2 hover:underline"
              >
                Clear
              </button>
            </>
          ) : (
            "Please select a category to continue"
          )}
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;
