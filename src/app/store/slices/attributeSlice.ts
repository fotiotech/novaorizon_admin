import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AttributeState {
  attributes: Record<string, any>;
  attributeIds: string[];
}

const initialState: AttributeState = {
  attributes: {},
  attributeIds: [],
};

const attributeSlice = createSlice({
  name: "attribute",
  initialState,
  reducers: {
    setAttributes: (
      state,
      action: PayloadAction<{
        attributes: Record<string, any>;
        attributeIds: string[];
      }>
    ) => {
      state.attributes = action.payload.attributes;
      state.attributeIds = action.payload.attributeIds;
    },
    addAttribute: (
      state,
      action: PayloadAction<{ _id: string; attributes?: Record<string, any[]> }>
    ) => {
      const { _id, attributes = {} } = action.payload;
      console.log("Adding attribute", _id, attributes);
      if (!_id) return console.error("Missing ID");

      if (!state.attributeIds.includes(_id)) {
        state.attributeIds.push(_id);
      }

      // Always initialize the bucket
      state.attributes[_id] = {
        _id,
        attributes: {
          // preserve any existing keys
          ...(state.attributes[_id]?.attributes ?? {}),
          // overwrite or add the new ones
          ...attributes,
        },
      };
    },
  },
});

export const { setAttributes, addAttribute } = attributeSlice.actions;
export default attributeSlice.reducer;
