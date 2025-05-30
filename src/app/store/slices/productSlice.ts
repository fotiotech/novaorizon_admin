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
    addProduct: (state, action: PayloadAction<any | null>) => {
      const { _id, path, value } = action.payload;
      if (!_id) {
        console.error("Missing _id in updateField");
        return;
      }
      // Ensure the product exists
      if (!state.byId[_id]) {
        state.byId[_id] = {};
        state.allIds.push(_id);
      }

      // Walk the `path` and set the value
      const keys = path.split(".");
      let cursor: any = state.byId[_id];

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i === keys.length - 1) {
          cursor[key] = value;
        } else {
          // create nested object if missing
          if (typeof cursor[key] !== "object" || cursor[key] === null) {
            cursor[key] = {};
          }
          cursor = cursor[key];
        }
      }
    },

    // (optional) initialize or reset a product
    resetProduct: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (!state.byId[id]) {
        state.byId[id] = {};
        state.allIds.push(id);
      }
    },

    // reducer
    updateVariants: (
      state,
      action: PayloadAction<{ productId: string; variants: any[] }>
    ) => {
      const { productId, variants } = action.payload;
      if (state.byId[productId]) {
        state.byId[productId].variants = variants;
      }
    },

    removeVariant: (
      state,
      action: PayloadAction<{ productId: string; index: number }>
    ) => {
      const { productId, index } = action.payload;
      if (state.byId[productId]?.variants) {
        state.byId[productId].variants.splice(index, 1);
      }
    },

    clearProduct: (state) => {
      // Reset to initial state
      state.byId = {};
      state.allIds = [];
    },
  },
});

export const {
  setProducts,
  addProduct,
  resetProduct,
  updateVariants,
  removeVariant,
  clearProduct,
} = productSlice.actions;
export default productSlice.reducer;
