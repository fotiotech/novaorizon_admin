"use client";

import { ReactNode } from "react";
import SectionLayout from "@/components/SectionLayout";

const posLinks = [
  { name: "Dashboard", href: "/channels/pos" },
  { name: "Sales", href: "/sales" },
  { name: "Products", href: "/catalog/products" },
  { name: "Customers", href: "/customers/customers" },
  { name: "Reports", href: "/channels/pos/reports" },
];

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <SectionLayout title="Point of Sales" links={posLinks}>
      {children}
    </SectionLayout>
  );
}
