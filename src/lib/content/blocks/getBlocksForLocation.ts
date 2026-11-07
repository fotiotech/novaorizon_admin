// lib/content/blocks/getBlocksForLocation.ts
import { unstable_cache } from "next/cache";
import { connection } from "@/utils/connection";
import { Block } from "@/models/Block";
import { resolveBlock, type ResolvedBlock, type ResolveCtx } from "./resolve";
import type { BlockLocation } from "@/lib/content/constants";

/**
 * Fresh resolve. Use on pages that depend on user context (e.g.
 * ProductRelated blocks backed by "recentlyViewed").
 */
export async function getBlocksForLocation(
  location: BlockLocation,
  ctx: ResolveCtx = {},
): Promise<ResolvedBlock[]> {
  await connection();

  const docs = await Block.find({ location, status: "active" })
    .sort({ order: 1, created_at: -1 })
    .lean();

  const resolved = await Promise.all(
    docs.map((d) =>
      resolveBlock(d, ctx).catch((err) => {
        // One bad block must not take down the page.
        console.error("[getBlocksForLocation] resolve failed:", d._id, err);
        return null;
      }),
    ),
  );

  return resolved.filter(
    (r): r is ResolvedBlock => r !== null && r.items.length > 0,
  );
}

/**
 * Cached resolve — no user context. Use on Home / landing pages where the
 * blocks are anonymous-friendly. Invalidate via `revalidateTag("blocks:Home")`
 * (already wired in `app/actions/blocks.ts`).
 *
 * Do NOT use this for locations containing recommendation blocks; those need
 * a userId and must hit `getBlocksForLocation` directly.
 */
export const getCachedBlocksForLocation = (location: BlockLocation) =>
  unstable_cache(() => getBlocksForLocation(location), ["blocks", location], {
    tags: ["blocks", `blocks:${location}`],
    revalidate: 300,
  })();
