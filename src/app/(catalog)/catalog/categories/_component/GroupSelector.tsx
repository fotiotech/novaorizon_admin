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
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Groups
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedGroups.length} selected
        </span>
      </div>

      <div className="relative mb-3">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-900/30">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
            No groups match “{filter}”.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map((group) => {
              const isSelected = selectedGroups.includes(group._id);
              return (
                <button
                  key={group._id}
                  type="button"
                  onClick={() => onToggleGroup(group._id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400"
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
