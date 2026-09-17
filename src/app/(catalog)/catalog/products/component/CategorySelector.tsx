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
import {
  Check,
  Close,
  Search,
  Category as CategoryIcon,
} from "@mui/icons-material";

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
      } catch {
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
    } else if (e.key === "Escape") {
      setFilter("");
    }
  };

  useEffect(() => {
    setFocusedIndex(-1);
  }, [filter]);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      if (items[focusedIndex]) {
        (items[focusedIndex] as HTMLElement).scrollIntoView({
          block: "nearest",
        });
      }
    }
  }, [focusedIndex]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2 p-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  const selectedCategory = categories.find((c) => c._id === selectedId);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Select category
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose a category to load its attributes
          </p>
        </div>
        {selectedCategory && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Close fontSize="small" />
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search
            fontSize="small"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search categories…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            aria-label="Filter categories"
          />
        </div>
      </div>

      {/* List */}
      <div
        className="max-h-[420px] overflow-y-auto p-2"
        role="listbox"
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Categories"
      >
        {filteredCategories.length > 0 ? (
          <div className="space-y-1">
            {filteredCategories.map((cat, index) => {
              const isSelected = selectedId === cat._id;
              const isFocused = focusedIndex === index;
              return (
                <div
                  key={cat._id}
                  role="option"
                  aria-selected={isSelected}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isSelected
                      ? "bg-primary/10"
                      : isFocused
                        ? "bg-muted"
                        : "hover:bg-muted"
                  }`}
                  onClick={() => handleSelect(cat._id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isSelected ? (
                        <Check fontSize="small" />
                      ) : (
                        <CategoryIcon fontSize="small" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {cat.name}
                      </div>
                      {cat.url_slug && (
                        <div className="truncate text-xs text-muted-foreground">
                          {cat.url_slug}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="inline-flex flex-none items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      Selected
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No categories found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filter
                ? "Try a different search term."
                : "No categories available."}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs">
        {selectedCategory ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Check fontSize="small" className="text-primary" />
            Selected:{" "}
            <span className="font-medium text-foreground">
              {selectedCategory.name}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Select a category to continue
          </span>
        )}
        {filteredCategories.length > 0 && (
          <span className="text-muted-foreground">
            {filteredCategories.length}{" "}
            {filteredCategories.length === 1 ? "category" : "categories"}
          </span>
        )}
      </div>
    </div>
  );
};

export default CategorySelector;
