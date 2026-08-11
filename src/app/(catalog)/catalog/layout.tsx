// app/catalog/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const catalogLinks = [
  { name: "Products", href: "/catalog/products" },
  { name: "Categories", href: "/catalog/categories" },
  { name: "Brands", href: "/catalog/brands" },
  { name: "Attributes", href: "/catalog/attributes" },
  { name: "Inventory", href: "/catalog/inventory" },
];

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="Catalog" links={catalogLinks}>
      {children}
    </SectionLayout>
  );
}
