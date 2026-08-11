"use client";

import { ReactNode } from "react";
import SectionLayout from "@/components/SectionLayout";

const posLinks = [
  { name: "Dashboard", href: "/pos" },
  { name: "Sales", href: "/pos/sales" },
  { name: "Products", href: "/pos/products" },
  { name: "Customers", href: "/pos/customers" },
  { name: "Reports", href: "/pos/reports" },
];

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <SectionLayout title="Point of Sales" links={posLinks}>
      {children}
    </SectionLayout>
  );
}
