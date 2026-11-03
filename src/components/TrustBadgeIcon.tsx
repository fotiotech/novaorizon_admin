// components/TrustBadgeIcon.tsx
"use client";

import {
  ShieldCheck,
  Truck,
  Headphones,
  Lock,
  RefreshCw,
  CreditCard,
  Clock,
  Award,
  Star,
  Phone,
  Package,
  BadgeCheck,
} from "lucide-react";
import type { ComponentType } from "react";

type IconProps = { size?: number; className?: string };

const ICON_MAP: Record<string, ComponentType<IconProps>> = {
  "shield-check": ShieldCheck,
  truck: Truck,
  headset: Headphones,
  lock: Lock,
  "refresh-cw": RefreshCw,
  "credit-card": CreditCard,
  clock: Clock,
  award: Award,
  star: Star,
  phone: Phone,
  package: Package,
  "badge-check": BadgeCheck,
};

export default function TrustBadgeIcon({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? ShieldCheck;
  return <Icon size={size} className={className} />;
}
