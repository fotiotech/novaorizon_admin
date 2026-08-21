// app/marketing/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const marketingLinks = [
  { name: "Promotions", href: "/marketing/promotions" },
  { name: "Promotion Type", href: "/marketing/promotions/types" },
  { name: "Properties", href: "/marketing/promotions/properties" },
  { name: "Email Campaigns", href: "/marketing/email_marketing" },
  { name: "Content Merchandising", href: "/marketing/content_merchandising" },
  { name: "Hero Sections", href: "/marketing/hero_section" },
  { name: "Navigation Menus", href: "/marketing/content_merchandising/menus" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="Marketing" links={marketingLinks}>
      {children}
    </SectionLayout>
  );
}
