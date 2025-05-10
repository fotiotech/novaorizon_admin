import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface OfferState {
  byId: Record<string, any>; // Stores offers by their IDs
  allIds: string[]; // Stores the list of offer IDs
}

const initialState: OfferState = {
  byId: {},
  allIds: [],
};

const offerSlice = createSlice({
  name: "offer",
  initialState,
  reducers: {
    // Sets the categories in the state
    setOffers: (
      state,
      action: PayloadAction<{ byId: Record<string, any>; allIds: string[] }>
    ) => {
      state.byId = action.payload.byId;
      state.allIds = action.payload.allIds;
    },
    // Updates the selected category in the state
    addOffer: (state, action: PayloadAction<any | null>) => {
      const { _id, ...offerData } = action.payload;

      // Validate offerId
      if (!_id) {
        console.error("Offer ID is undefined. Payload:", action.payload);
        return;
      }

      // Validate offerData
      if (!offerData || typeof offerData !== "object") {
        console.error(
          "Invalid offer data. Skipping addOffer. Payload:",
          action.payload
        );
        return;
      }

      // Check if the Offer already exists in the state
      if (!state.byId[_id]) {
        // If not, initialize the Offer in the state
        if (!state.allIds.includes(_id)) {
          state.allIds.push(_id); // Add the OfferId to the allIds array
        }
        state.byId[_id] = offerData;
      } else {
        // If the offer exists, update its fields
        state.byId[_id] = {
          ...state.byId[_id],
          ...offerData,
        };
      }
    },
  },
});

export const { setOffers, addOffer } = offerSlice.actions;
export default offerSlice.reducer;
