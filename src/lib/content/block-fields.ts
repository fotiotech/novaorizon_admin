// lib/content/block-fields.ts
//
// Client-side mirror of `server/config/block-presentation.ts`. The admin editor
// only renders controls that the current display/source can actually use; the
// backend prunes anything else on save.
import type { BlockDisplay, BlockSourceType } from "@/lib/content/constants";

export const DISPLAY_PRESENTATION_FIELDS: Record<BlockDisplay, readonly string[]> = {
  grid: [
    "columns",
    "cardShape",
    "cardRatio",
    "cardSize",
    "cardStyle",
    "titlePosition",
    "imagePosition",
    "borderless",
    "rounded",
    "shadow",
    "alignment",
  ],
  carousel: [
    "cardShape",
    "cardRatio",
    "cardSize",
    "cardStyle",
    "titlePosition",
    "imagePosition",
    "borderless",
    "rounded",
    "shadow",
    "alignment",
  ],
  list: [
    "cardStyle",
    "titlePosition",
    "imagePosition",
    "borderless",
    "rounded",
    "shadow",
    "alignment",
  ],
  hero: [
    "alignment",
    "imagePosition",
    "titlePosition",
    "borderless",
    "rounded",
    "shadow",
  ],
  slides: [
    "cardRatio",
    "titlePosition",
    "imagePosition",
    "borderless",
    "rounded",
    "shadow",
    "alignment",
  ],
  bento: [
    "titlePosition",
    "imagePosition",
    "borderless",
    "rounded",
    "shadow",
    "alignment",
  ],
  masonry: [
    "columns",
    "cardRatio",
    "cardStyle",
    "titlePosition",
    "borderless",
    "rounded",
    "shadow",
    "alignment",
  ],
};

export const SOURCE_PRESENTATION_FIELDS: Record<BlockSourceType, readonly string[]> = {
  manual: ["cardVariant", "showDescription"],
  collection: ["showItemCount", "countPosition"],
  promotion: ["badgeStyle", "showCode"],
  category: [],
};

export function displayFieldsFor(display: string): Set<string> {
  return new Set(DISPLAY_PRESENTATION_FIELDS[display as BlockDisplay] ?? []);
}

export function sourceFieldsFor(sourceType: string): Set<string> {
  return new Set(SOURCE_PRESENTATION_FIELDS[sourceType as BlockSourceType] ?? []);
}