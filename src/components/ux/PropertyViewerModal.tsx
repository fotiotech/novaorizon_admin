"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ux/Modal";
import { KeyboardArrowRight } from "@mui/icons-material";
import type { AttributeSetResult } from "@/app/actions/category_property";

interface ViewTarget {
  _id: string;
  name: string;
  inheritProperty?: boolean;
  hasInheritedSnapshot?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  category: ViewTarget | null;
  sets: AttributeSetResult[] | null;
  loading: boolean;
}

function AttributeRow({ attr }: { attr: any }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <span className="text-sm text-foreground">{attr.name}</span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {attr.type}
      </span>
      {attr.isRequired && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Required
        </span>
      )}
      {attr.isHighlight && (
        <span className="rounded bg-pink-100 px-1.5 py-0.5 text-[10px] font-medium text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
          Highlight
        </span>
      )}
    </div>
  );
}

function GroupTree({ node, depth = 0 }: { node: any; depth?: number }) {
  const hasAttributes = node.attributes && node.attributes.length > 0;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="flex items-center gap-2 py-1.5">
        <span className="text-sm font-medium text-foreground">{node.name}</span>
        {node.code && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {node.code}
          </span>
        )}
      </div>

      {hasAttributes && (
        <div className="ml-1 border-l border-border pl-3">
          {node.attributes.map((a: any) => (
            <AttributeRow key={a.id} attr={a} />
          ))}
        </div>
      )}

      {hasChildren && (
        <div className="mt-1">
          {node.children.map((c: any) => (
            <GroupTree key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function countAttrs(nodes: any[]): number {
  let total = 0;
  for (const n of nodes) {
    total += n.attributes?.length || 0;
    if (n.children?.length) total += countAttrs(n.children);
  }
  return total;
}

export default function PropertyViewerModal({
  isOpen,
  onClose,
  category,
  sets,
  loading,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) setCollapsed(new Set());
  }, [isOpen, category?._id]);

  useEffect(() => {
    if (!isOpen) return;
    if (!sets || sets.length === 0) {
      setCollapsed(new Set());
      return;
    }
    setCollapsed(new Set(sets.map((s) => s.id)));
  }, [isOpen, sets]);

  if (!isOpen || !category) return null;

  const isInherited =
    !!category.inheritProperty && !!category.hasInheritedSnapshot;

  const toggleSet = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Property — ${category.name}`}
      size="xl"
    >
      <div className="flex max-h-[70vh] flex-col gap-3 sm:max-h-[75vh] sm:gap-4">
        {/* Source badge — pinned above the scroll area */}
        <div className="flex flex-none items-center gap-2">
          {isInherited ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Inherited (merged from parent + own)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
              Own property
            </span>
          )}
        </div>

        {/* Scrollable body */}
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
              <span className="ml-3 text-sm text-muted-foreground">
                Loading property…
              </span>
            </div>
          ) : !sets || sets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No property assigned to this category.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-1">
              {sets.map((set) => {
                const isCollapsed = collapsed.has(set.id);
                const groupCount = set.groups.length;
                const attrCount = set.groups.reduce(
                  (acc: number, g: any) =>
                    acc +
                    (g.attributes?.length || 0) +
                    (g.children?.length ? countAttrs(g.children) : 0),
                  0,
                );

                return (
                  <div
                    key={set.id}
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSet(set.id)}
                      aria-expanded={!isCollapsed}
                      className={`flex w-full items-center justify-between gap-2 bg-muted/40 px-3 py-2 text-left transition hover:bg-muted/60 ${
                        isCollapsed ? "" : "border-b border-border"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <KeyboardArrowRight
                          fontSize="small"
                          className={`flex-none text-muted-foreground transition-transform duration-200 ${
                            isCollapsed ? "" : "rotate-90"
                          }`}
                        />
                        <span className="truncate text-sm font-semibold text-foreground">
                          {set.title}
                        </span>
                        <span className="flex-none rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {set.code}
                        </span>
                      </div>
                      <div className="flex flex-none items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          {groupCount} {groupCount === 1 ? "group" : "groups"}
                        </span>
                        <span className="text-border">•</span>
                        <span>
                          {attrCount}{" "}
                          {attrCount === 1 ? "attribute" : "attributes"}
                        </span>
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="space-y-2 p-3">
                        {set.groups.length === 0 ? (
                          <p className="text-xs italic text-muted-foreground">
                            No groups selected.
                          </p>
                        ) : (
                          set.groups.map((g: any) => (
                            <GroupTree key={g.id} node={g} />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
