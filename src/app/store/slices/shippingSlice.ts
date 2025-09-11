import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ShippingState {
  byId: Record<string, any>; // Stores shipping addresses by their IDs
  allIds: string[]; // Stores the list of shipping address IDs
}

const initialState: ShippingState = {
  byId: {},
  allIds: [],
};

const shippingSlice = createSlice({
  name: "shipping",
  initialState,
  reducers: {
    setShippings: (
      state,
      action: PayloadAction<{ byId: Record<string, any>; allIds: string[] }>
    ) => {
      state.byId = action.payload.byId;
      state.allIds = action.payload.allIds;
    },
    addShipping: (state, action: PayloadAction<any | null>) => {
      const { _id, ...shippingData } = action.payload;

      if (!_id) {
        console.error("Shipping ID is undefined. Payload:", action.payload);
        return;
      }

      if (!shippingData || typeof shippingData !== "object") {
        console.error(
          "Invalid shipping data. Skipping addShipping. Payload:",
          action.payload
        );
        return;
      }

      if (!state.byId[_id]) {
        if (!state.allIds.includes(_id)) {
          state.allIds.push(_id);
        }
        state.byId[_id] = shippingData;
      } else {
        state.byId[_id] = {
          ...state.byId[_id],
          ...shippingData,
        };
      }
    },
    // New reducer for updating specific fields without changing status
    updateShippingLocal: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<any> }>
    ) => {
      const { id, changes } = action.payload;

      if (!state.byId[id]) {
        console.error(`Shipping with ID ${id} not found`);
        return;
      }

      // Update only the provided fields, preserving the status
      state.byId[id] = {
        ...state.byId[id],
        ...changes,
        // Explicitly preserve the status to prevent accidental changes
        status: state.byId[id].status,
      };
    },
  },
});

export const { setShippings, addShipping, updateShippingLocal } =
  shippingSlice.actions;
export default shippingSlice.reducer;
