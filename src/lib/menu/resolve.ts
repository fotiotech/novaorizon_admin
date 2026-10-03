// lib/menu/resolve.ts

/**
 * Resolve a menu item's href from its type and reference/URL. Decoupled from
 * the Mongoose model so it can run in RSC, client components, and actions.
 *
 * URL shape for referenced docs: /{prefix}/{slug}/{id}
 * If the slug is missing (ref doc deleted, or enrichment didn't run), we
 * fall back to /{prefix}/{id} so the link still resolves.
 */
export interface ResolvableItem {
  type: string;
  refId?: unknown;
  slug?: string | null;
  url?: string | null;
}

export function resolveHref(item: ResolvableItem): string {
  const id = item.refId ? String(item.refId) : "";
  const slug = item.slug ? String(item.slug) : "";

  const build = (prefix: string) => {
    if (!id) return "#";
    return slug ? `/${prefix}/${slug}/${id}` : `/${prefix}/${id}`;
  };

  switch (item.type) {
    case "category":
      return build("category");
    case "product":
      return build("products");
    case "collection":
      return build("collections");
    case "page":
    case "custom":
    default:
      return item.url || "#";
  }
}
