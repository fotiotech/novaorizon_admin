import { normalizeShipping } from "@/app/store/slices/normalizedData";
import { AppDispatch } from "@/app/store/store";
import { setShippings } from "@/app/store/slices/shippingSlice";
import { getAllShippings, getShippingById } from "@/app/actions/shipping";

export const fetchShipping =
  (id?: string | null) => async (dispatch: AppDispatch) => {
    try {
      let data;
      if (id) {
        data = await getShippingById(id);
      } else {
        data = await getAllShippings();
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return null;
      }

      const normalizedData = normalizeShipping(Array.isArray(data) ? data : [data]);

      const byId = Object.keys(normalizedData.entities.shippings || {}).reduce(
        (acc: Record<string, any>, key: string) => {
          const shipping = (normalizedData.entities.shippings ?? {})[key];
          acc[key] = {
            ...shipping,
            updated_at: shipping.updated_at
              ? new Date(shipping.updated_at).toISOString()
              : null,
          };
          return acc;
        },
        {} as Record<string, any>
      );

      dispatch(
        setShippings({
          byId,
          allIds: Array.isArray(normalizedData.result)
            ? normalizedData.result
            : Object.keys(normalizedData.result || {}),
        })
      );

      console.log("Shipping successfully dispatched to Redux store.");
    } catch (error) {
      console.error("Error fetching shippings:", error);
    }
  };