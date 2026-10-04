// app/(dashboard)/catalog/categories/_hooks/useCategoryTree.ts
"use client";

import { useMemo } from "react";

export interface CategoryPropertyRef {
  _id: string;
  name: string;
  code?: string;
}

export interface CategoryNode {
  _id: string;
  name: string;
  url_slug?: string;
  slug?: string;
  description?: string;
  parent_id?: string | null;
  parentId?: string | null;
  imageUrl?: string[];
  property?: CategoryPropertyRef | string | null;
  hasInheritedSnapshot?: boolean;
  inheritProperty?: boolean;
}

export interface TreeRow extends CategoryNode {
  level: number;
  hasChildren: boolean;
  childCount: number;
  parentName: string | null;
}

export const getParentId = (node: CategoryNode): string | null => {
  const pid = node.parentId ?? node.parent_id ?? null;
  return pid ? String(pid) : null;
};

/**
 * Builds the category tree from a flat list.
 *
 * - One index pass: nodesById + childrenByParent + roots.
 * - Orphans (parent id not in list) get promoted to roots so nothing vanishes.
 * - Filtering derives a `matches` set and an `autoExpand` set (ancestors of
 *   matches). While filtering, expansion is derived, not user-controlled.
 * - When the filter clears, the caller's `explicitExpanded` set takes over.
 */
export function useCategoryTree(
  flat: CategoryNode[],
  filter: string,
  explicitExpanded: Set<string>,
) {
  // ---- Pass 1: index -------------------------------------------------
  const index = useMemo(() => {
    const nodesById = new Map<string, CategoryNode>();
    for (const c of flat) {
      if (!c?._id) continue;
      nodesById.set(String(c._id), c);
    }

    const childrenByParent = new Map<string | null, CategoryNode[]>();
    for (const c of flat) {
      if (!c?._id) continue;
      const id = String(c._id);
      const pid = getParentId(c);
      // Promote orphans / self-parents to roots.
      const effectivePid = pid && pid !== id && nodesById.has(pid) ? pid : null;
      const bucket = childrenByParent.get(effectivePid) ?? [];
      bucket.push(c);
      childrenByParent.set(effectivePid, bucket);
    }

    const roots = childrenByParent.get(null) ?? [];
    return { nodesById, childrenByParent, roots };
  }, [flat]);

  // ---- Pass 2: filter -> matches + autoExpand ------------------------
  const { matches, autoExpand } = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) {
      return {
        matches: null as Set<string> | null,
        autoExpand: new Set<string>(),
      };
    }

    const matches = new Set<string>();
    const autoExpand = new Set<string>();

    for (const [id, node] of index.nodesById) {
      if (!node.name.toLowerCase().includes(q)) continue;
      matches.add(id);

      // Walk up to mark every ancestor for auto-expansion.
      let pid = getParentId(node);
      const seen = new Set<string>();
      while (pid && index.nodesById.has(pid) && !seen.has(pid)) {
        seen.add(pid);
        autoExpand.add(pid);
        pid = getParentId(index.nodesById.get(pid)!);
      }
    }

    return { matches, autoExpand };
  }, [filter, index]);

  // ---- Pass 3: flatten to rows ---------------------------------------
  const rows = useMemo<TreeRow[]>(() => {
    const out: TreeRow[] = [];

    const isVisible = (id: string): boolean =>
      !matches || matches.has(id) || autoExpand.has(id);

    const shouldExpand = (id: string): boolean =>
      matches ? autoExpand.has(id) : explicitExpanded.has(id);

    const walk = (nodes: CategoryNode[], level: number) => {
      for (const node of nodes) {
        if (!node?._id) continue;
        const id = String(node._id);
        if (!isVisible(id)) continue;

        const children = index.childrenByParent.get(id) ?? [];
        const pid = getParentId(node);

        out.push({
          ...node,
          level,
          hasChildren: children.length > 0,
          childCount: children.length,
          parentName: pid ? (index.nodesById.get(pid)?.name ?? null) : null,
        });

        if (children.length > 0 && shouldExpand(id)) {
          walk(children, level + 1);
        }
      }
    };

    walk(index.roots, 0);
    return out;
  }, [index, matches, autoExpand, explicitExpanded]);

  return {
    rows,
    roots: index.roots,
    nodesById: index.nodesById,
    childrenByParent: index.childrenByParent,
    isFiltering: matches !== null,
  };
}
