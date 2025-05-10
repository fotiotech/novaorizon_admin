import { findProducts } from "@/app/actions/products";
import { normalizeProducts } from "@/app/store/slices/normalizedData";
import { setProducts } from "@/app/store/slices/productSlice";
import { AppDispatch } from "@/app/store/store";

// Utility to recursively convert Maps to plain objects
const convertMapToObject = (data: any): any => {
  if (data instanceof Map) {
    return Object.fromEntries(data); // Convert Map to plain object
  } else if (Array.isArray(data)) {
    return data.map((item) => convertMapToObject(item)); // Recursively handle arrays
  } else if (typeof data === "object" && data !== null) {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = convertMapToObject(data[key]); // Recursively handle nested objects
      return acc;
    }, {} as Record<string, any>);
  }
  return data; // Return primitive values as-is
};

export const fetchProducts = (id?: string) => async (dispatch: AppDispatch) => {
  try {
    // Fetch product(s) using the provided `findProducts` function
    const data = id ? await findProducts(id) : await findProducts();
    console.log("Fetched data:", data);

    // Check if data is empty or undefined
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.error("No products found");
      return;
    }

    // Convert any Map in the data to plain objects
    const sanitizedData = Array.isArray(data)
      ? data.map((item) => convertMapToObject(item))
      : convertMapToObject(data);

    // Normalize the data
    const normalizedData = normalizeProducts(
      Array.isArray(sanitizedData) ? sanitizedData : [sanitizedData]
    );

    // Validate normalized data
    if (!normalizedData.result || normalizedData.result.includes(undefined)) {
      console.error("Normalization failed. Check the schema or data structure.");
      return;
    }

    // Dispatch normalized data to the store
    dispatch(
      setProducts({
        byId: normalizedData.entities.products || {},
        allIds: normalizedData.result || [],
      })
    );

    console.log("Products successfully dispatched to Redux store.");
  } catch (error) {
    console.error("Error fetching products:", error);
  }
};