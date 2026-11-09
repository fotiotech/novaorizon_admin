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

  // A block renders when it has items OR banners. `resolveBlock` already
  // returns null for banner blocks with zero resolved banners, so this
  // filter is a defensive guard for resolved-but-empty blocks.
  return resolved.filter(
    (r): r is ResolvedBlock =>
      r !== null &&
      (r.items.length > 0 || Boolean(r.banners && r.banners.length > 0)),
  );
}

export const getCachedBlocksForLocation = (location: BlockLocation) =>
  unstable_cache(() => getBlocksForLocation(location), ["blocks", location], {
    tags: ["blocks", `blocks:${location}`],
    revalidate: 300,
  })();
