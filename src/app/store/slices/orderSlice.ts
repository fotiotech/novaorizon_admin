import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface OrderState {
    byId: Record<string, any>; // Stores orders by their IDs
    allIds: string[]; // Stores the list of order IDs
}

const initialState: OrderState = {
    byId: {},
    allIds: [],
};

const orderSlice = createSlice({
    name: "order",
    initialState,
    reducers: {
        setOrders: (
            state,
            action: PayloadAction<{ byId: Record<string, any>; allIds: string[] }>
        ) => {
            state.byId = action.payload.byId;
            state.allIds = action.payload.allIds;
        },
        addOrder: (state, action: PayloadAction<any | null>) => {
            const { _id, ...orderData } = action.payload;

            if (!_id) {
                console.error("Order ID is undefined. Payload:", action.payload);
                return;
            }

            if (!orderData || typeof orderData !== "object") {
                console.error(
                    "Invalid order data. Skipping addOrder. Payload:",
                    action.payload
                );
                return;
            }

            if (!state.byId[_id]) {
                if (!state.allIds.includes(_id)) {
                    state.allIds.push(_id);
                }
                state.byId[_id] = orderData;
            } else {
                state.byId[_id] = {
                    ...state.byId[_id],
                    ...orderData,
                };
            }
        },
    },
});

export const { setOrders, addOrder } = orderSlice.actions;
export default orderSlice.reducer;