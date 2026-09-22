import axios from "axios";

type NotificationType =
  | "order"
  | "payment"
  | "promotion"
  | "product"
  | "system";

export const triggerNotification = async (
  userId: string,
  message: string,
  type: NotificationType = "system",
) => {
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/notify`,
      { userId, message, type },
    );
    if (res.data.status === "Notification sent") {
      console.log("Notification triggered successfully");
    }
  } catch (error) {
    console.error("Error triggering notification:", error);
  }
};
