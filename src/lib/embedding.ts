// lib/embedding.ts

export const EMBEDDING_MODEL = "voyage-4-lite";
export const EMBEDDING_DIMENSIONS = 1024;

export interface EmbeddableProduct {
  name?: string;
  categoryName?: string;
  brandName?: string;
  shortDescription?: string;
  description?: string;
  tags?: string[];
}

/**
 * Build the canonical text for a product embedding.
 *
 * Order matters: the most discriminative fields go first. If a product
 * has a very long description, we still want the model to weight the
 * name and category heavily — Voyage models pay attention to position
 * within the input, but a cleaner signal in the first ~200 characters
 * gives noticeably better retrieval on short queries.
 *
 * Truncation: voyage-4-lite has a 32K-token context window, so for
 * e-commerce descriptions you'll almost never hit it. We cap at 4000
 * characters (~1000 tokens) purely to keep embedding latency down and
 * cost predictable.
 */
export function buildEmbeddingText(p: EmbeddableProduct): string {
  const parts: string[] = [];
  if (p.name) parts.push(p.name);
  if (p.categoryName) parts.push(`Category: ${p.categoryName}`);
  if (p.brandName) parts.push(`Brand: ${p.brandName}`);
  if (p.tags?.length) parts.push(`Tags: ${p.tags.join(", ")}`);
  if (p.shortDescription) parts.push(p.shortDescription);
  if (p.description) parts.push(p.description);

  const text = parts.join("\n").trim();
  return text.length > 4000 ? text.slice(0, 4000) : text;
}

/**
 * True when a product's stored embedding is missing or stale relative
 * to its current content. Callers use this to skip pointless re-embeds.
 */
export function needsReembedding(
  product: EmbeddableProduct & {
    embedding?: number[];
    embeddingText?: string;
  },
): boolean {
  if (!Array.isArray(product.embedding) || product.embedding.length === 0) {
    return true;
  }
  const current = buildEmbeddingText(product);
  return current !== (product.embeddingText ?? "");
}
