import { findAllAttributeGroups } from "@/app/actions/attributegroup";
import { normalizeAttributeGroup } from "@/app/store/slices/normalizedData";
import { setAttributeGroups } from "@/app/store/slices/attributeGroupSlice";
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

export const fetchAttributeGroup =
  (categoryId?: string) => async (dispatch: AppDispatch) => {
    try {
      console.log(
        "Fetching attribute groups for category ID:",
        categoryId || "all categories"
      );

      // Fetch attribute groups using the provided `findAttributeGroups` function
      const data = categoryId
        ? await findAllAttributeGroups(categoryId)
        : await findAllAttributeGroups();
      console.log("Fetched data:", data);

      // Check if data is empty or undefined
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.error("No attribute groups found");
        return;
      }

      // Convert any Map in the data to plain objects
      const sanitizedData = Array.isArray(data)
        ? data.map((item) => convertMapToObject(item))
        : convertMapToObject(data);

      // Normalize the data
      const normalizedData = normalizeAttributeGroup(
        Array.isArray(sanitizedData) ? sanitizedData : [sanitizedData]
      );
      console.log("Normalized data:", normalizedData);

      // Validate normalized data
      if (!normalizedData.result || normalizedData.result.includes(undefined)) {
        console.error(
          "Normalization failed. Check the schema or data structure."
        );
        return;
      }

      // Dispatch normalized data to the store
      dispatch(
        setAttributeGroups({
          attributeGroups: normalizedData.entities.attributeGroups || {},
          attributeGroupIds: normalizedData.result || [],
        })
      );

      console.log("Attribute groups successfully dispatched to Redux store.");
    } catch (error) {
      console.error("Error fetching attribute groups:", error);
    }
  };
