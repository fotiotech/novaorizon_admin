import { getCategory } from "@/app/actions/category";
import { normalizeCategory } from "@/app/store/slices/normalizedData";
import { setCategories } from "@/app/store/slices/categorySlice";
import { AppDispatch } from "@/app/store/store";

export const fetchCategory = (
  id?: string | null,
  parentId?: string | null,
  name?: string | null
) => async (dispatch: AppDispatch) => {
  try {
    let data;

    // Check parameters and fetch category data accordingly
    if (id) {
      data = await getCategory(id, null, null);
    } else if (parentId) {
      data = await getCategory(null, parentId, null);
    } else if (name) {
      data = await getCategory(null, null, name);
    } else {
      data = await getCategory();
    }

    console.log("Fetched category data:", data);

    // Check if data is empty or undefined
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.error("No categories found");
      return;
    }

    // Normalize the data
    const normalizedData = normalizeCategory(Array.isArray(data) ? data : [data]);
    console.log("Normalized category data:", normalizedData);

    // Dispatch normalized data to the store
    dispatch(
      setCategories({
        byId: normalizedData.entities.categories || {},
        allIds: Object.keys(normalizedData.entities.categories || {}),
      })
    );

    console.log("Categories successfully dispatched to Redux store.");
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
};