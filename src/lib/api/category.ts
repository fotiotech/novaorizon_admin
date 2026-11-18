// lib/api/category.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";

/* ------------------------------ types ------------------------------ */

/**
 * The backend's `projectForList` strips the raw `inheritedProperty` doc and
 * emits `hasInheritedSnapshot: boolean` in its place. `property` is either
 * populated or `null`.
 */
export interface ApiCategory {
  _id: string;
  name: string;
  parentId: string | null;
  slug?: string;
  description?: string | null;
  imageUrl?: string[];
  inheritProperty?: boolean;
  hasInheritedSnapshot?: boolean;
  sortOrder?: number | null;
  property?: {
    _id: string;
    name: string;
    code?: string;
    [k: string]: any;
  } | null;
  [k: string]: any;
}

/**
 * Shape returned by `GET /categories/:id/attribute-sets` (built by
 * `buildCategoryAttributeSets`). Consumers cast this where they need
 * specific fields — the backend contract is intentionally loose here.
 */
export type AttributeSetResult = Record<string, any>;

export interface SaveCategoryInput {
  name: string;
  parentId?: string | null;
  description?: string;
  imageUrl?: string[];
  propertyId?: string | null;
  inheritProperty?: boolean;
  // Legacy fields tolerated so existing form state can be passed as-is.
  _id?: string;
  property?: any;
  attributes?: any;
}

/* ----------------------------- CRUD ------------------------------- */

/** GET /api/categories — admin only */
export async function listCategories(): Promise<ApiCategory[]> {
  const res = await api.get<{ data: ApiCategory[] }>("/categories");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/categories/:id — admin only */
export async function getCategoryById(id: string): Promise<ApiCategory> {
  const res = await api.get<{ data: ApiCategory }>(`/categories/${id}`);
  return res.data.data;
}

/**
 * GET /api/categories/:id/children — admin only.
 * Returns the direct children of a category (no list projection applied by
 * the backend, matching the old server action's `parentId` branch).
 */
export async function listCategoryChildren(
  id: string,
): Promise<ApiCategory[]> {
  const res = await api.get<{ data: ApiCategory[] }>(
    `/categories/${id}/children`,
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/**
 * GET /api/categories/name/:name/children — admin only.
 * Matches the old `getCategory(null, null, name)` lookup by exact name.
 */
export async function listCategoryChildrenByName(
  name: string,
): Promise<ApiCategory[]> {
  const res = await api.get<{ data: ApiCategory[] }>(
    `/categories/name/${encodeURIComponent(name)}/children`,
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/**
 * Compatibility helper for callers that used the old
 * `getCategory(id?, parentId?, name?)` server action:
 *   - name     → children of the category with that exact name
 *   - id       → the category (or null when it does not exist)
 *   - parentId → the direct children
 *   - none     → every category
 */
export async function getCategory(
  id?: string | null,
  parentId?: string | null,
  name?: string | null,
): Promise<ApiCategory | ApiCategory[] | null> {
  if (name) return listCategoryChildrenByName(name);

  if (id) {
    try {
      return await getCategoryById(id);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) return null;
      throw err;
    }
  }

  if (parentId) return listCategoryChildren(parentId);

  return listCategories();
}

/** POST /api/categories or PATCH /api/categories/:id — admin only */
export async function saveCategory(
  input: SaveCategoryInput,
  id?: string,
): Promise<ApiCategory> {
  // Strip legacy fields; backend only accepts the six declared in
  // `CategoryBody`. Anything else is ignored server-side.
  const payload = {
    name: input.name,
    parentId: input.parentId || null,
    description: input.description,
    imageUrl: input.imageUrl ?? [],
    propertyId: input.propertyId || null,
    inheritProperty: input.inheritProperty ?? false,
  };

  const res = id
    ? await api.patch<{ success: boolean; data: ApiCategory }>(
        `/categories/${id}`,
        payload,
      )
    : await api.post<{ success: boolean; data: ApiCategory }>(
        "/categories",
        payload,
      );

  return res.data.data;
}

/** DELETE /api/categories/:id — admin only */
export async function deleteCategory(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/categories/${id}`,
  );
  return res.data;
}

/* -------------------------- Images -------------------------------- */

/** POST /api/categories/:id/images/delete — admin only */
export async function deleteCategoryImage(
  id: string,
  imageUrl: string,
): Promise<{ success: boolean; data: string[] }> {
  const res = await api.post<{ success: boolean; data: string[] }>(
    `/categories/${id}/images/delete`,
    { imageUrl },
  );
  return res.data;
}

/* ---------------------- Property assignment ----------------------- */

/** PATCH /api/categories/:id/property — admin only */
export async function assignPropertyToCategory(
  categoryId: string,
  propertyId: string | null,
): Promise<{ success: boolean }> {
  const res = await api.patch<{ success: boolean }>(
    `/categories/${categoryId}/property`,
    { propertyId },
  );
  return res.data;
}

/* ------------------------- Inheritance ---------------------------- */

/** POST /api/categories/:id/inheritance — admin only */
export async function runCategoryInheritance(
  categoryId: string,
): Promise<{ success: boolean; warning?: string }> {
  const res = await api.post<{ success: boolean; warning?: string }>(
    `/categories/${categoryId}/inheritance`,
  );
  return res.data;
}

/* ---------------------- Attribute sets ---------------------------- */

/** GET /api/categories/:id/attribute-sets — admin only */
export async function fetchCategoryAttributeSets(
  categoryId: string,
): Promise<AttributeSetResult[]> {
  const res = await api.get<{ data: AttributeSetResult[] }>(
    `/categories/${categoryId}/attribute-sets`,
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/* -------------------- Product counts ------------------------------ */

/** GET /api/products/category-counts — admin only */
export async function getCategoryProductCounts(): Promise<
  Record<string, number>
> {
  const res = await api.get<{ data: Record<string, number> }>(
    "/products/category-counts",
  );
  return res.data?.data ?? {};
}

/* -------------------- Meta endpoints (dropdowns) ------------------ */

export interface AttributeSetMeta {
  _id: string;
  title: string;
  code: string;
}

export interface AttributeGroupMeta {
  _id: string;
  name: string;
  code: string;
}

export interface AttributeMeta {
  _id: string;
  name: string;
  code: string;
  type: string;
}

/** GET /api/categories/meta/attribute-sets — admin only */
export async function getAllAttributeSets(): Promise<AttributeSetMeta[]> {
  const res = await api.get<{ data: AttributeSetMeta[] }>(
    "/categories/meta/attribute-sets",
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/categories/meta/attribute-groups — admin only */
export async function getAllAttributeGroups(): Promise<AttributeGroupMeta[]> {
  const res = await api.get<{ data: AttributeGroupMeta[] }>(
    "/categories/meta/attribute-groups",
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/** GET /api/categories/meta/attributes — admin only */
export async function getAllAttributes(): Promise<AttributeMeta[]> {
  const res = await api.get<{ data: AttributeMeta[] }>(
    "/categories/meta/attributes",
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}
