"use client";

import { useMemo } from "react";

interface GroupOption {
  _id: string;
  name: string;
  code: string;
}

interface GroupSelectorProps {
  mappingId: string;
  selectedGroups: string[];
  allGroups: GroupOption[];
  filter: string;
  onFilterChange: (value: string) => void;
  onToggleGroup: (groupId: string) => void;
}

export default function GroupSelector({
  mappingId,
  selectedGroups,
  allGroups,
  filter,
  onFilterChange,
  onToggleGroup,
}: GroupSelectorProps) {
  const filtered = useMemo(() => {
    const lower = filter.toLowerCase();
    if (!lower) return allGroups;
    return allGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(lower) ||
        g.code.toLowerCase().includes(lower),
    );
  }, [allGroups, filter]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Groups
        </label>
        <span className="text-xs text-muted-foreground">
          {selectedGroups.length} selected
        </span>
      </div>

      <div className="relative mb-2.5">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search groups…"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2.5 sm:p-3">
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No groups match “{filter}”.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {filtered.map((group) => {
              const isSelected = selectedGroups.includes(group._id);
              return (
                <button
                  key={group._id}
                  type="button"
                  onClick={() => onToggleGroup(group._id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition sm:px-3 ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/60 hover:text-primary"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {group.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
