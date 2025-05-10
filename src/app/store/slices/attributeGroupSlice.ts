import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AttributeGroupState {
    attributeGroups: Record<string, any>;
    attributeGroupIds: string[];
}

const initialState: AttributeGroupState = {
    attributeGroups: {},
    attributeGroupIds: [],
};

const attributeGroupSlice = createSlice({
    name: "attributeGroup",
    initialState,
    reducers: {
        setAttributeGroups: (
            state,
            action: PayloadAction<{
                attributeGroups: Record<string, any>;
                attributeGroupIds: string[];
            }>
        ) => {
            state.attributeGroups = action.payload.attributeGroups;
            state.attributeGroupIds = action.payload.attributeGroupIds;
        },
        addAttributeGroup: (state, action: PayloadAction<any | null>) => {
            const { _id, ...attributeGroupData } = action.payload;

            // Validate groupId
            if (!_id) {
                console.error("Group ID is undefined. Payload:", action.payload);
                return;
            }

            // Validate attributeGroupData
            if (!attributeGroupData || typeof attributeGroupData !== "object") {
                console.error(
                    "Invalid attribute group data. Skipping addAttributeGroup. Payload:",
                    action.payload
                );
                return;
            }

            // Check if the group already exists in the state
            if (!state.attributeGroups[_id]) {
                // If not, initialize the group in the state
                if (!state.attributeGroupIds.includes(_id)) {
                    state.attributeGroupIds.push(_id); // Add the groupID to the allIds array
                }
                state.attributeGroups[_id] = attributeGroupData;
            } else {
                // If the group exists, update its fields
                state.attributeGroups[_id] = {
                    ...state.attributeGroups[_id],
                    ...attributeGroupData,
                };
            }
        },
    },
});

export const { setAttributeGroups, addAttributeGroup } = attributeGroupSlice.actions;
export default attributeGroupSlice.reducer;