// fetch/fetchProducts.ts

import { findProducts, updateProduct } from "@/app/actions/products";
import { normalizeProducts } from "@/app/store/slices/normalizedData";
import { setProducts } from "@/app/store/slices/productSlice";
import { AppDispatch } from "@/app/store/store";

// Utility to recursively convert Maps to plain objects (keep if needed)
const convertMapToObject = (data: any): any => {
  if (data instanceof Map) {
    return Object.fromEntries(data);
  } else if (Array.isArray(data)) {
    return data.map((item) => convertMapToObject(item));
  } else if (typeof data === "object" && data !== null) {
    return Object.keys(data).reduce(
      (acc, key) => {
        acc[key] = convertMapToObject(data[key]);
        return acc;
      },
      {} as Record<string, any>,
    );
  }
  return data;
};

// Fetch products (single or all)
export const fetchProducts = (id?: string) => async (dispatch: AppDispatch) => {
  try {
    const data = id ? await findProducts(id) : await findProducts();

    // Check for server error response
    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    ) {
      console.error("Server error:", data.error);
      return;
    }

    // If data is empty array or null/undefined
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn("No products found");
      dispatch(setProducts({ byId: {}, allIds: [] }));
      return;
    }

    // Convert any Map to plain objects (optional)
    const sanitizedData = Array.isArray(data)
      ? data.map((item) => convertMapToObject(item))
      : convertMapToObject(data);

    const normalizedData = normalizeProducts(
      Array.isArray(sanitizedData) ? sanitizedData : [sanitizedData],
    );

    if (!normalizedData.result || normalizedData.result.includes(undefined)) {
      console.error(
        "Normalization failed. Check the schema or data structure.",
      );
      return;
    }

    dispatch(
      setProducts({
        byId: normalizedData.entities.products || {},
        allIds: normalizedData.result || [],
      }),
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    // Optionally dispatch an error action
  }
};

// New thunk: update a product's stock and threshold, then refetch
export const updateProductStock =
  (id: string, quantity: number, lowStockThreshold: number) =>
  async (dispatch: AppDispatch) => {
    try {
      const response = await updateProduct(id, { quantity, lowStockThreshold });
      if (!response.success) {
        throw new Error(response.error || "Failed to update product");
      }
      // Re-fetch all products to keep the store in sync
      await dispatch(fetchProducts());
      return { success: true };
    } catch (error) {
      console.error("Error updating product:", error);
      return { success: false, error: (error as Error).message };
    }
  };
