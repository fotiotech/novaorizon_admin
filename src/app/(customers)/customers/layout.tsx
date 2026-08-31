// app/customers/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const customersLinks = [
  { name: "Customer List", href: "/customers/customers" },
  { name: "Segmentation", href: "/customers/segmentation" },
  { name: "Communication History", href: "/customers/chat" },
  { name: "Reviews", href: "/customers/reviews" },
];

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="Customers" links={customersLinks}>
      {children}
    </SectionLayout>
  );
}
