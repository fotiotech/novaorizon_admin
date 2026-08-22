// app/sales/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const salesLinks = [
  { name: "Orders", href: "/sales/orders" },
  { name: "Carriers", href: "/sales/carriers" },
  { name: "Refunds", href: "/sales/refunds" },
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
