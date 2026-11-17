import axios from "axios";

type NotificationType =
  | "order"
  | "payment"
  | "promotion"
  | "product"
  | "system";

// TODO(migration): no backend endpoint yet — per-user notification send.
// The server only exposes POST /api/notifications/send, an admin broadcast
// that takes { kind, message } and notifies every active admin (no userId).
export const triggerNotification = async (
  userId: string,
  message: string,
  type: NotificationType = "system",
) => {
  try {
    const res = await axios.post("/api/notify", { userId, message, type });
    if (res.data.status === "Notification sent") {
      console.log("Notification triggered successfully");
    }
  } catch (error) {
    console.error("Error triggering notification:", error);
  }
};
