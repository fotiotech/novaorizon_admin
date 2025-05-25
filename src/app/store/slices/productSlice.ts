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
      const { _id, ...productData } = action.payload;

      // Validate productId
      if (!_id) {
        console.error("Product ID is undefined. Payload:", action.payload);
        return;
      }

      // Validate productData
      if (!productData || typeof productData !== "object") {
        console.error(
          "Invalid product data. Skipping addProduct. Payload:",
          action.payload
        );
        return;
      }

      // Check if the product already exists in the state
      if (!state.byId[_id]) {
        // If not, initialize the product in the state
        if (!state.allIds.includes(_id)) {
          state.allIds.push(_id); // Add the productId to the allIds array
        }
        state.byId[_id] = productData;
      } else {
        // If the product exists, update its fields
        state.byId[_id] = {
          ...state.byId[_id],
          ...productData,
        };
      }
    },

    updateAttributes: (
      state,
      action: PayloadAction<{
        productId: string;
        groupName: string;
        attrName: string;
        selectedValues: any;
      }>
    ) => {
      const { productId, groupName, attrName, selectedValues } = action.payload;
      const product = state.byId[productId];
      if (product) {
        if (!product.attributes) {
          product.attributes = {};
        }
        if (!product.attributes[groupName]) {
          product.attributes[groupName] = {} as Record<string, any>;
        }
        product.attributes[groupName][attrName] = selectedValues;
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

    syncVariantWithParent: (
      state,
      action: PayloadAction<{ productId: string }>
    ) => {
      const { productId } = action.payload;
      if (state.byId[productId]?.variants) {
        state.byId[productId].variants = state.byId[productId].variants.map(
          (variant: any) => ({
            ...variant,
            variantName: state.byId[productId].product_name,
            basePrice: state.byId[productId].basePrice,
            taxRate: state.byId[productId].taxRate,
            discount: state.byId[productId].discount,
          })
        );
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
  updateAttributes,
  updateVariants,
  removeVariant,
  syncVariantWithParent,
  clearProduct,
} = productSlice.actions;
export default productSlice.reducer;
