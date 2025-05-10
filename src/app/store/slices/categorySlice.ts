import { createSlice, PayloadAction, configureStore } from "@reduxjs/toolkit";

interface CategoryState {
  byId: Record<string, any>; // Stores categories by their IDs
  allIds: string[]; // Stores the list of category IDs
}

const initialState: CategoryState = {
  byId: {},
  allIds: [],
};

const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    // Sets the categories in the state
    setCategories: (
      state,
      action: PayloadAction<{ byId: Record<string, any>; allIds: string[] }>
    ) => {
      state.byId = action.payload.byId;
      state.allIds = action.payload.allIds;
    },
    // Updates the selected category in the state
    addCategory: (state, action: PayloadAction<any | null>) => {
      const { _id, ...categoryData } = action.payload;

      // Validate categoryId
      if (!_id) {
        console.error("Category ID is undefined. Payload:", action.payload);
        return;
      }

      // Validate categoryData
      if (!categoryData || typeof categoryData !== "object") {
        console.error(
          "Invalid Category data. Skipping addCategory. Payload:",
          action.payload
        );
        return;
      }

      // Check if the Category already exists in the state
      if (!state.byId[_id]) {
        // If not, initialize the Category in the state
        if (!state.allIds.includes(_id)) {
          state.allIds.push(_id); // Add the CategoryId to the allIds array
        }
        state.byId[_id] = categoryData;
      } else {
        // If the category exists, update its fields
        state.byId[_id] = {
          ...state.byId[_id],
          ...categoryData,
        };
      }
    },
  },
});

export const { setCategories, addCategory } = categorySlice.actions;
export default categorySlice.reducer;
