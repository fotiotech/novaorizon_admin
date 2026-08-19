// app/sales/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const salesLinks = [
  { name: "Orders", href: "/sales/orders" },
  { name: "Order Status", href: "/sales/order_status" },
  { name: "Carriers", href: "/sales/carriers" },
  { name: "Refunds & Returns", href: "/sales/refunds_returns" },
];

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="Sales" links={salesLinks}>
      {children}
    </SectionLayout>
  );
}
