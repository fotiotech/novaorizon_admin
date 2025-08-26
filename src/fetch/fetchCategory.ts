import { getCategory } from "@/app/actions/category";
import { normalizeCategory } from "@/app/store/slices/normalizedData";
import { setCategories } from "@/app/store/slices/categorySlice";
import { AppDispatch } from "@/app/store/store";

export const fetchCategory =
  (id?: string | null, parentId?: string | null, name?: string | null) =>
  async (dispatch: AppDispatch) => {
    try {
      let data;

      // Fetch category data based on the provided parameter
      if (id) {
        data = await getCategory(id, null, null);
      } else if (parentId) {
        const res = parentId !== '' ? await getCategory(null, parentId, null) : null;
        if (res?.length > 0) {
          console.log("Fetched category res:", res);
          data = res;
        }
      } else if (name) {
        data = await getCategory(null, null, name);
      } else {
        data = await getCategory();
      }

      console.log("Fetched category data:", data);

      // Check if data is empty or undefined
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return null;
      }

      // Normalize the data
      const normalizedData = normalizeCategory(
        Array.isArray(data) ? data : [data]
      );

      // Convert Date objects to strings
      const byId = Object.keys(normalizedData.entities.categories || {}).reduce(
        (acc: Record<string, any>, key: string) => {
          const category = (normalizedData.entities.categories ?? {})[key];
          acc[key] = {
            ...category,
            updated_ad: category.updated_ad
              ? new Date(category.updated_ad).toISOString()
              : null,
          };
          return acc;
        },
        {} as Record<string, any>
      );

      // Dispatch normalized data to the store
      dispatch(
        setCategories({
          byId,
          allIds: Array.isArray(normalizedData.result)
            ? normalizedData.result
            : Object.keys(normalizedData.result || {}),
        })
      );

      console.log("Categories successfully dispatched to Redux store.");
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };
