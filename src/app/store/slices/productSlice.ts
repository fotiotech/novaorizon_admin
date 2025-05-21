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
    updateGetVariant: (
      state,
      action: PayloadAction<{ productId: string; value: boolean }>
    ) => {
      const { productId, value } = action.payload;
      if (state.byId[productId]) {
        state.byId[productId].getVariant = value;
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
    addVariant: (
      state,
      action: PayloadAction<{ productId: string; variant: any }>
    ) => {
      const { productId, variant } = action.payload;
      if (state.byId[productId]) {
        if (!state.byId[productId].variants) {
          state.byId[productId].variants = [];
        }
        state.byId[productId].variants.push(variant);
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
    updateVariantField: (
      state,
      action: PayloadAction<{
        productId: string | null;
        index: number;
        field: string;
        value: any;
      }>
    ) => {
      const { productId, index, field, value } = action.payload;

      if (productId && state.byId[productId]?.variants?.[index]) {
        state.byId[productId].variants[index][field] = value;
      }
    },
    updateVariantAttributes: (
      state,
      action: PayloadAction<{
        productId: string;
        groupName: string;
        attrName: string;
        selectedValues: string[];
      }>
    ) => {
      const { productId, groupName, attrName, selectedValues } = action.payload;
      if (state.byId[productId]) {
        if (!state.byId[productId].variantAttributes) {
          state.byId[productId].variantAttributes = {};
        }
        if (!state.byId[productId].variantAttributes[groupName]) {
          state.byId[productId].variantAttributes[groupName] = {};
        }
        state.byId[productId].variantAttributes[groupName][attrName] =
          selectedValues;
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
  updateGetVariant,
  updateAttributes,
  addVariant,
  removeVariant,
  updateVariantField,
  updateVariantAttributes,
  syncVariantWithParent,
  clearProduct,
} = productSlice.actions;
export default productSlice.reducer;
