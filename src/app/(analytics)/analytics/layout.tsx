// app/analytics/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const analyticsLinks = [
  { name: "Sales Analytics", href: "/analytics/sales_reports" },
  { name: "Customer Analytics", href: "/analytics/customer_report" },
  { name: "Inventory Reports", href: "/analytics/inventory_reports" },
];

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="Analytics" links={analyticsLinks}>
      {children}
    </SectionLayout>
  );
}
