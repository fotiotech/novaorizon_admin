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
      state.byId = action.payload;
    },
  },
});

export const { setCategories, addCategory } = categorySlice.actions;
export default categorySlice.reducer;
