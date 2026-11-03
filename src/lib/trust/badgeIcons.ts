// lib/badgeIcons.ts
export const BADGE_ICON_OPTIONS = [
  { value: "shield-check", label: "Shield — Secure Payment" },
  { value: "truck", label: "Truck — Fast Shipping" },
  { value: "headset", label: "Headset — Support" },
  { value: "lock", label: "Lock — Secure" },
  { value: "refresh-cw", label: "Refresh — Returns" },
  { value: "credit-card", label: "Card — Payment" },
  { value: "clock", label: "Clock — Fast Delivery" },
  { value: "award", label: "Award — Quality" },
  { value: "star", label: "Star — Rating" },
  { value: "phone", label: "Phone — Contact" },
  { value: "package", label: "Package — Free Shipping" },
  { value: "badge-check", label: "Badge — Verified" },
] as const;

export type BadgeIconName = (typeof BADGE_ICON_OPTIONS)[number]["value"];

export const BADGE_ICON_VALUES: BadgeIconName[] = BADGE_ICON_OPTIONS.map(
  (o) => o.value,
);

/** Absolute URL (http/https/ftp) or internal path starting with "/". */
export function isValidBadgeLink(v: string): boolean {
  if (!v) return true;
  return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v) || v.startsWith("/");
}
