// lib/draftKeys.ts
export const NEW_PRODUCT_DRAFT_KEY = "new-product-draft-id";

export function getOrCreateNewProductDraftKey(): string {
  if (typeof window === "undefined") return NEW_PRODUCT_DRAFT_KEY;
  const existing = sessionStorage.getItem(NEW_PRODUCT_DRAFT_KEY);
  if (existing) return existing;
  const fresh = `new-${crypto.randomUUID()}`;
  sessionStorage.setItem(NEW_PRODUCT_DRAFT_KEY, fresh);
  return fresh;
}

export function clearNewProductDraftKey(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(NEW_PRODUCT_DRAFT_KEY);
}
