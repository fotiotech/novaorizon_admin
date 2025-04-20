import { createSlice, PayloadAction, configureStore } from "@reduxjs/toolkit";

interface UserState {
  byId: Record<string, any>; // Stores users by their IDs
  allIds: string[]; // Stores the list of users IDs
}

const initialState: UserState = {
  byId: {},
  allIds: [],
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Sets the users in the state
    setUser: (
      state,
      action: PayloadAction<{ byId: Record<string, any>; allIds: string[] }>
    ) => {
      state.byId = action.payload.byId;
      state.allIds = action.payload.allIds;
    },
    // Updates the selected user in the state
    addUser: (state, action: PayloadAction<any | null>) => {
      state.byId = action.payload;
    },
  },
});

export const { setUser, addUser } = userSlice.actions;
export default userSlice.reducer;
