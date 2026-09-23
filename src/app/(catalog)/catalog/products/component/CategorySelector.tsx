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
  KeyboardArrowRight,
} from "@mui/icons-material";

interface Category {
  _id: string;
  name: string;
  url_slug?: string;
  parentId?: string | null;
  parent_id?: string | null;
}

interface CategorySelectorProps {
  initialCategoryId?: string;
  onSelect: (categoryId: string) => void;
}

const getParentId = (c: Category): string | null => {
  const pid = c.parentId ?? c.parent_id ?? null;
  return pid ? String(pid) : null;
};

const CategorySelector: React.FC<CategorySelectorProps> = ({
  initialCategoryId,
  onSelect,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string>(initialCategoryId || "");
  const [browsePath, setBrowsePath] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------
  // Load
  // -----------------------------------------------------------------
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

  // -----------------------------------------------------------------
  // Lookup tables
  // -----------------------------------------------------------------
  const nodesById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) {
      if (c && c._id) m.set(c._id, c);
    }
    return m;
  }, [categories]);

  const childrenCountById = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of categories) {
      const pid = getParentId(c);
      if (!pid) continue;
      m.set(pid, (m.get(pid) ?? 0) + 1);
    }
    return m;
  }, [categories]);

  const rootCategories = useMemo(
    () => categories.filter((c) => !getParentId(c)),
    [categories],
  );

  const getAncestorPath = useCallback(
    (id: string): string[] => {
      const path: string[] = [];
      let current: string | null = id;
      const seen = new Set<string>();
      while (current && !seen.has(current)) {
        seen.add(current);
        path.unshift(current);
        const node = nodesById.get(current);
        current = node ? getParentId(node) : null;
      }
      return path;
    },
    [nodesById],
  );

  // -----------------------------------------------------------------
  // Auto-enter the single top-level root (e.g. "All Category") so the
  // user lands on the first meaningful level instead of a level that
  // contains only that one node.
  // -----------------------------------------------------------------
  useEffect(() => {
    if (categories.length === 0) return;
    if (browsePath.length > 0) return;

    // Prefer to open the level that contains the initial selection so
    // the currently-selected row is visible.
    if (initialCategoryId) {
      const path = getAncestorPath(initialCategoryId);
      if (path.length > 0) {
        setBrowsePath(path.slice(0, -1));
        return;
      }
    }

    // Exactly one root — enter it.
    if (rootCategories.length === 1) {
      setBrowsePath([rootCategories[0]._id]);
      return;
    }

    // Multiple roots — prefer one named "All Category"/"All Categories".
    const allRoot = rootCategories.find((r) => {
      const n = r.name.trim().toLowerCase();
      return n === "all category" || n === "all categories";
    });
    if (allRoot) setBrowsePath([allRoot._id]);
  }, [
    categories,
    initialCategoryId,
    browsePath.length,
    getAncestorPath,
    rootCategories,
  ]);

  // -----------------------------------------------------------------
  // Current level + breadcrumbs + search
  // -----------------------------------------------------------------
  const isSearching = filter.trim().length > 0;

  const currentParentId = useMemo(
    () => (browsePath.length > 0 ? browsePath[browsePath.length - 1] : null),
    [browsePath],
  );

  const levelItems = useMemo(() => {
    return categories
      .filter((c) => {
        const pid = getParentId(c);
        if (currentParentId === null) return pid === null;
        return pid === currentParentId;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, currentParentId]);

  const searchItems = useMemo(() => {
    if (!isSearching) return [] as Category[];
    const q = filter.trim().toLowerCase();
    return categories
      .filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, filter, isSearching]);

  const displayItems = isSearching ? searchItems : levelItems;

  // Breadcrumb items carry an explicit `pathIndex` so click handling is
  // unambiguous regardless of whether the "All categories" home crumb
  // is rendered.
  const breadcrumbItems = useMemo(() => {
    const items: { pathIndex: number; id: string | null; name: string }[] = [];

    // Only show the synthetic home crumb when there's more than one root
    // to return to.
    if (rootCategories.length > 1) {
      items.push({ pathIndex: -1, id: null, name: "All categories" });
    }

    browsePath.forEach((id, i) => {
      items.push({
        pathIndex: i,
        id,
        name: nodesById.get(id)?.name ?? "Unknown",
      });
    });
    return items;
  }, [browsePath, nodesById, rootCategories.length]);

  // -----------------------------------------------------------------
  // Animation direction tracking
  // -----------------------------------------------------------------
  const prevNavRef = useRef<{ pathLen: number; isSearching: boolean }>({
    pathLen: 0,
    isSearching: false,
  });
  const [navDirection, setNavDirection] = useState<"in" | "out" | "fade">(
    "fade",
  );

  useEffect(() => {
    const prev = prevNavRef.current;
    const next = { pathLen: browsePath.length, isSearching };
    let dir: "in" | "out" | "fade" = "fade";
    if (next.isSearching !== prev.isSearching) dir = "fade";
    else if (next.pathLen > prev.pathLen) dir = "in";
    else if (next.pathLen < prev.pathLen) dir = "out";
    setNavDirection(dir);
    prevNavRef.current = next;
  }, [browsePath, isSearching]);

  const animationKey = isSearching
    ? "search"
    : `browse:${browsePath.join("|")}`;
  const animationClass =
    navDirection === "in"
      ? "browse-anim-in"
      : navDirection === "out"
        ? "browse-anim-out"
        : "browse-anim-fade";

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      onSelect(id);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    setSelectedId("");
    onSelect("");
    setBrowsePath([]);
    setFilter("");
  }, [onSelect]);

  const handleOpen = useCallback(
    (id: string) => {
      if (isSearching) {
        // Jump to the category's ancestor chain so breadcrumbs make sense.
        setBrowsePath(getAncestorPath(id));
        setFilter("");
      } else {
        setBrowsePath((prev) => [...prev, id]);
      }
    },
    [isSearching, getAncestorPath],
  );

  const handleBreadcrumbClick = (pathIndex: number) => {
    setBrowsePath((prev) =>
      pathIndex < 0 ? [] : prev.slice(0, pathIndex + 1),
    );
    setFilter("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (displayItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev < displayItems.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < displayItems.length) {
        const cat = displayItems[focusedIndex];
        if (cat) handleSelect(cat._id);
      }
    } else if (e.key === "Escape") {
      if (filter) setFilter("");
      else if (browsePath.length > 0) {
        setBrowsePath((p) => p.slice(0, -1));
      }
    }
  };

  useEffect(() => {
    setFocusedIndex(-1);
  }, [filter, currentParentId, isSearching]);

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

  // -----------------------------------------------------------------
  // Loading / error
  // -----------------------------------------------------------------
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl overflow-x-clip rounded-xl border border-border bg-card">
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
    <div className="mx-auto w-full max-w-4xl overflow-x-clip rounded-xl border border-border bg-card">
      {/* Keyframes + animation classes */}
      <style>{`
        @keyframes browseIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes browseOut {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes browseFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .browse-anim-in {
          animation: browseIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .browse-anim-out {
          animation: browseOut 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .browse-anim-fade {
          animation: browseFade 220ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .browse-anim-in,
          .browse-anim-out,
          .browse-anim-fade {
            animation: none;
          }
        }
      `}</style>

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

      {/* Breadcrumbs (hidden while searching) */}
      {!isSearching && breadcrumbItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-2 text-xs">
          {breadcrumbItems.map((item, idx) => {
            const isLast = idx === breadcrumbItems.length - 1;
            return (
              <React.Fragment key={item.id ?? "root"}>
                {idx > 0 && (
                  <KeyboardArrowRight
                    fontSize="small"
                    className="text-muted-foreground/60"
                    style={{ fontSize: 14 }}
                  />
                )}
                {isLast ? (
                  <span className="font-medium text-foreground">
                    {item.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbClick(item.pathIndex)}
                    className="rounded px-1.5 py-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {item.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search
            fontSize="small"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder={
              isSearching ? "Searching all categories…" : "Search categories…"
            }
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            aria-label="Filter categories"
          />
        </div>
      </div>

      {/* Animated list region */}
      <div
        key={animationKey}
        className={animationClass}
        ref={listRef}
        role="listbox"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Categories"
      >
        <div className="max-h-[420px] overflow-y-auto p-2">
          {displayItems.length > 0 ? (
            <div className="space-y-1">
              {displayItems.map((cat, index) => {
                const isSelected = selectedId === cat._id;
                const isFocused = focusedIndex === index;
                const hasChildren = (childrenCountById.get(cat._id) ?? 0) > 0;
                const parentName = isSearching
                  ? (() => {
                      const pid = getParentId(cat);
                      return pid ? (nodesById.get(pid)?.name ?? null) : null;
                    })()
                  : null;

                return (
                  <div
                    key={cat._id}
                    role="option"
                    aria-selected={isSelected}
                    className={`group flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors ${
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
                        {isSearching && parentName ? (
                          <div className="truncate text-[11px] text-muted-foreground/80">
                            in {parentName}
                          </div>
                        ) : cat.url_slug ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {cat.url_slug}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-none items-center gap-2">
                      {isSelected && !hasChildren && (
                        <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          Selected
                        </span>
                      )}
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpen(cat._id);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground group-hover:bg-background"
                          aria-label={`Open ${cat.name}`}
                          title="Open subcategories"
                        >
                          <KeyboardArrowRight fontSize="small" />
                        </button>
                      )}
                    </div>
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
                {isSearching
                  ? "No matches"
                  : browsePath.length === 0
                    ? "No categories"
                    : "No subcategories"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isSearching
                  ? "Try a different search term."
                  : browsePath.length === 0
                    ? "No categories available."
                    : "This category has no children."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs">
        {selectedCategory ? (
          <span className="inline-flex items-center gap-1.5 truncate text-muted-foreground">
            <Check fontSize="small" className="text-primary" />
            Selected:{" "}
            <span className="truncate font-medium text-foreground">
              {selectedCategory.name}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Select a category to continue
          </span>
        )}
        {displayItems.length > 0 && (
          <span className="flex-none text-muted-foreground">
            {displayItems.length}{" "}
            {displayItems.length === 1 ? "category" : "categories"}
          </span>
        )}
      </div>
    </div>
  );
};

export default CategorySelector;
