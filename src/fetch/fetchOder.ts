import { normalizeOrder } from "@/app/store/slices/normalizedData";
import { AppDispatch } from "@/app/store/store";
import { setOrders } from "@/app/store/slices/orderSlice";
import { findOrders } from "@/app/actions/order";

export const fetchOrder =
    (orderNumber?: string | null) => async (dispatch: AppDispatch) => {
        try {
            let data;

            // Fetch order data based on the provided parameter
            if (orderNumber) {
                data = await findOrders(orderNumber);
            } else {
                data = await findOrders();
            }

            // Check if data is empty or undefined
            if (!data || (Array.isArray(data) && data.length === 0)) {
                return null;
            }

            // Normalize the data
            const normalizedData = normalizeOrder(
                Array.isArray(data) ? data : [data]
            );

            // Convert Date objects to strings
            const byId = Object.keys(normalizedData.entities.orders || {}).reduce(
                (acc: Record<string, any>, key: string) => {
                    const order = (normalizedData.entities.orders ?? {})[key];
                    acc[key] = {
                        ...order,
                        updated_at: order.updated_at
                            ? new Date(order.updated_at).toISOString()
                            : null,
                    };
                    return acc;
                },
                {} as Record<string, any>
            );

            // Dispatch normalized data to the store
            dispatch(
                setOrders({
                    byId,
                    allIds: Array.isArray(normalizedData.result)
                        ? normalizedData.result
                        : Object.keys(normalizedData.result || {}),
                })
            );

            console.log("Order successfully dispatched to Redux store.");
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    };