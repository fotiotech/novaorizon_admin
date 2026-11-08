// lib/content/blocks/getBlocksForLocation.ts
import { unstable_cache } from "next/cache";
import { connection } from "@/utils/connection";
import { Block } from "@/models/Block";
import { resolveBlock, type ResolvedBlock, type ResolveCtx } from "./resolve";
import type { BlockLocation } from "@/lib/content/constants";

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
        console.error("[getBlocksForLocation] resolve failed:", d._id, err);
        return null;
      }),
    ),
  );

  // Editorial blocks legitimately have zero items — their content lives
  // on `editorial`. Every other block requires at least one item to render.
  return resolved.filter(
    (r): r is ResolvedBlock =>
      r !== null && (r.items.length > 0 || Boolean(r.editorial)),
  );
}

export const getCachedBlocksForLocation = (location: BlockLocation) =>
  unstable_cache(() => getBlocksForLocation(location), ["blocks", location], {
    tags: ["blocks", `blocks:${location}`],
    revalidate: 300,
  })();
