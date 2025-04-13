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
      const { productId, ...productData } = action.payload;

      // Check if the product already exists in the state
      if (!state.byId[productId]) {
        // If not, initialize the product in the state
        state.byId[productId] = productData;
        state.allIds.push(productId); // Add the productId to the allIds array
      } else {
        // If the product exists, update its fields
        state.byId[productId] = {
          ...state.byId[productId],
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
        selectedValues: string[];
      }>
    ) => {
      const { productId, groupName, attrName, selectedValues } = action.payload;
      if (state.byId[productId]) {
        if (!state.byId[productId].attributes) {
          state.byId[productId].attributes = {};
        }
        if (!state.byId[productId].attributes[groupName]) {
          state.byId[productId].attributes[groupName] = {};
        }
        state.byId[productId].attributes[groupName][attrName] = selectedValues;
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
            basePrice: state.byId[productId].basePrice,
            taxRate: state.byId[productId].taxRate,
            discount: state.byId[productId].discount,
          })
        );
      }
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
} = productSlice.actions;
export default productSlice.reducer;
