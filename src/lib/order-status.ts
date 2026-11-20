// lib/order-status.ts
//
// Client-side mirror of `server/utils/order-lifecycle.ts` so the admin UI can
// render only the transitions the API will accept.
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "return_requested",
  "returned",
  "cancelled",
] as const;

export type LifecycleStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<
  LifecycleStatus,
  readonly LifecycleStatus[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"],
  returned: [],
  cancelled: [],
};

export const ORDER_STATUS_LABELS: Record<LifecycleStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  return_requested: "Return requested",
  returned: "Returned",
  cancelled: "Cancelled",
};

export function normalizeOrderStatus(raw: unknown): LifecycleStatus {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "in transit") return "shipped";
  if (value === "completed") return "delivered";
  return (ORDER_STATUSES as readonly string[]).includes(value)
    ? (value as LifecycleStatus)
    : "pending";
}

export function nextStatuses(current: unknown): readonly LifecycleStatus[] {
  return ORDER_TRANSITIONS[normalizeOrderStatus(current)] ?? [];
}
