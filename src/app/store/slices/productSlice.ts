import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ProductState {
  byId: Record<string, any>;
  allIds: string[];
}

const initialState: ProductState = {
  byId: {},
  allIds: [],
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    setProducts: (
      state,
      action: PayloadAction<{ byId: Record<string, any>; allIds: string[] }>
    ) => {
      state.byId = action.payload.byId;
      state.allIds = action.payload.allIds;
    },

    addProduct: (state, action: PayloadAction<{ _id: string; field: string; value: any }>) => {
      const { _id, field, value } = action.payload;
      
      if (!_id) {
        console.error("Missing _id in addProduct");
        return;
      }

      // Initialize product if it doesn't exist
      if (!state.byId[_id]) {
        state.byId[_id] = {};
        state.allIds.push(_id);
      }

      // Directly assign the field and value
      state.byId[_id][field] = value;
    },

    resetProduct: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (!state.byId[id]) {
        state.byId[id] = {};
        state.allIds.push(id);
      }
    },

    clearProduct: (state) => {
      state.byId = {};
      state.allIds = [];
    },
  },
});

export const { setProducts, addProduct, resetProduct, clearProduct } =
  productSlice.actions;
export default productSlice.reducer;