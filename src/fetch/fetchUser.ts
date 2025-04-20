import { findUsers } from "@/app/actions/users";
import { normalizeUser } from "@/app/store/slices/normalizedData";
import { setUser } from "@/app/store/slices/userSlice"; // Correct action for users
import { AppDispatch } from "@/app/store/store";

export const fetchUser =
  (id?: string | null) => async (dispatch: AppDispatch) => {
    try {
      let data;

      // Fetch user data based on the presence of an ID
      if (id) {
        data = await findUsers(id);
      } else {
        data = await findUsers();
      }

      console.log("Fetched user data:", data);

      // Check if data is empty or undefined
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.error("No users found");
        return;
      }

      // Normalize the data
      const normalizedData = normalizeUser(Array.isArray(data) ? data : [data]);
      console.log("Normalized user data:", normalizedData);

      // Dispatch normalized data to the store
      dispatch(
        setUser({
          byId: normalizedData.entities.users || {},
          allIds: Object.keys(normalizedData.entities.users || {}),
        })
      );

      console.log("Users successfully dispatched to Redux store.");
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error; // Optionally rethrow the error
    }
  };
