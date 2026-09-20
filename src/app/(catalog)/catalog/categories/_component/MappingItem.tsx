"use client";

import { useEffect, useState } from "react";
import AttributeSelector from "./AttributeSelector";
import GroupSelector from "./GroupSelector";

interface Mapping {
  id: string;
  set: string;
  groups: {
    group: string;
    attributes: {
      attribute: string;
      isRequired: boolean;
      isHighlight: boolean;
    }[];
  }[];
}

interface AttributeSetOption {
  _id: string;
  title: string;
  code: string;
}

interface GroupOption {
  _id: string;
  name: string;
  code: string;
}

interface AttributeOption {
  _id: string;
  name: string;
  code: string;
  type: string;
}

type AttributeFlag = "isRequired" | "isHighlight";

interface MappingItemProps {
  mapping: Mapping;
  index: number;
  allSets: AttributeSetOption[];
  allGroups: GroupOption[];
  allAttributes: AttributeOption[];
  groupFilter: string;
  attrFilters: Record<string, string>;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdateSet: (setId: string) => void;
  onRemove: () => void;
  onToggleGroup: (groupId: string) => void;
  onToggleAttribute: (groupId: string, attrId: string) => void;
  onToggleFlag: (groupId: string, attrId: string, flag: AttributeFlag) => void;
  onGroupFilterChange: (value: string) => void;
  onAttrFilterChange: (groupId: string, value: string) => void;
  hasSetError: boolean;
  fieldError?: string;
}

export default function MappingItem({
  mapping,
  index,
  allSets,
  allGroups,
  allAttributes,
  groupFilter,
  attrFilters,
  expanded,
  onToggleExpand,
  onUpdateSet,
  onRemove,
  onToggleGroup,
  onToggleAttribute,
  onToggleFlag,
  onGroupFilterChange,
  onAttrFilterChange,
  hasSetError,
  fieldError,
}: MappingItemProps) {
  const { id, set, groups } = mapping;
  const setErrorId = `set-error-${id}`;

  // Only ONE group's attribute body is expanded at a time within this
  // mapping. Clicking another group's header collapses the previous one.
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // If the active group is removed from the mapping (deselected in
  // GroupSelector), drop the stale pointer so nothing dangles.
  useEffect(() => {
    if (activeGroupId && !groups.some((g) => g.group === activeGroupId)) {
      setActiveGroupId(null);
    }
  }, [groups, activeGroupId]);

  const totalGroups = groups.length;
  const totalAttributes = groups.reduce(
    (acc, g) => acc + g.attributes.length,
    0,
  );
  const setTitle =
    allSets.find((s) => s._id === set)?.title || set || "Not selected";
  const isConfigured = !!set && totalGroups > 0 && totalAttributes > 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
      <div className="flex items-center gap-2 bg-muted/40 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-3"
          aria-expanded={expanded}
        >
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">
                {setTitle}
              </span>
              {isConfigured && (
                <span className="hidden shrink-0 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 sm:inline-flex">
                  Ready
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {totalGroups} {totalGroups === 1 ? "group" : "groups"}
              </span>
              <span className="text-border">•</span>
              <span>
                {totalAttributes}{" "}
                {totalAttributes === 1 ? "attribute" : "attributes"}
              </span>
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {expanded ? "▲" : "▼"}
          </span>
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove set"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-border px-3 py-3 sm:space-y-5 sm:px-4 sm:py-4">
          <div>
            <label
              htmlFor={`set-select-${id}`}
              className="block text-sm font-medium text-foreground"
            >
              Attribute Set <span className="text-destructive">*</span>
            </label>
            <select
              id={`set-select-${id}`}
              value={set}
              onChange={(e) => onUpdateSet(e.target.value)}
              className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                hasSetError ? "border-destructive" : "border-border"
              }`}
              aria-invalid={hasSetError}
              aria-describedby={hasSetError ? setErrorId : undefined}
            >
              <option value="">Choose a set…</option>
              {allSets.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title} ({s.code})
                </option>
              ))}
            </select>
            {hasSetError && (
              <p id={setErrorId} className="mt-1 text-xs text-destructive">
                {fieldError || "Please select a set."}
              </p>
            )}
          </div>

          {set && (
            <div className="space-y-4 sm:space-y-5">
              <GroupSelector
                mappingId={id}
                selectedGroups={groups.map((g) => g.group)}
                allGroups={allGroups}
                filter={groupFilter}
                onFilterChange={onGroupFilterChange}
                onToggleGroup={onToggleGroup}
              />

              {groups.length > 0 && (
                <div className="space-y-2.5 sm:space-y-3">
                  {groups.map((group) => {
                    const groupId = group.group;
                    const groupName =
                      allGroups.find((g) => g._id === groupId)?.name || groupId;
                    const attrFilterKey = `${id}-${groupId}`;
                    const attrFilter = attrFilters[attrFilterKey] || "";
                    const isActive = activeGroupId === groupId;

                    return (
                      <AttributeSelector
                        key={groupId}
                        mappingId={id}
                        groupId={groupId}
                        groupName={groupName}
                        selectedAttributes={group.attributes}
                        allAttributes={allAttributes}
                        filter={attrFilter}
                        expanded={isActive}
                        onToggleExpand={() =>
                          setActiveGroupId((prev) =>
                            prev === groupId ? null : groupId,
                          )
                        }
                        onFilterChange={(value) =>
                          onAttrFilterChange(groupId, value)
                        }
                        onToggleAttribute={(attrId) =>
                          onToggleAttribute(groupId, attrId)
                        }
                        onToggleFlag={(attrId, flag) =>
                          onToggleFlag(groupId, attrId, flag)
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
