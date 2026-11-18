import { normalizeOffer } from "@/app/store/slices/normalizedData";
import { AppDispatch } from "@/app/store/store";
import api from "@/lib/api";
import { setOffers } from "@/app/store/slices/offerSlice";

export const fetchOffer =
  (id?: string | null) => async (dispatch: AppDispatch) => {
    try {
      // Fetch the offer(s) straight from the backend.
      const res = await api.get<{ data: any[] | any }>("/offers", {
        params: id ? { id } : undefined,
      });
      const data = res.data?.data;

      // Check if data is empty or undefined
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return null;
      }

      // Normalize the data
      const normalizedData = normalizeOffer(
        Array.isArray(data) ? data : [data]
      );

      // Convert Date objects to strings
      const byId = Object.keys(normalizedData.entities.offers || {}).reduce(
        (acc: Record<string, any>, key: string) => {
          const offer = (normalizedData.entities.offers ?? {})[key];
          acc[key] = {
            ...offer,
            updated_ad: offer.updated_ad
              ? new Date(offer.updated_ad).toISOString()
              : null,
          };
          return acc;
        },
        {} as Record<string, any>
      );

      // Dispatch normalized data to the store
      dispatch(
        setOffers({
          byId,
          allIds: Array.isArray(normalizedData.result)
            ? normalizedData.result
            : Object.keys(normalizedData.result || {}),
        })
      );

      console.log("Offer successfully dispatched to Redux store.");
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };