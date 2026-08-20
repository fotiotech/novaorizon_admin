// app/marketing/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const marketingLinks = [
  { name: "Promotions", href: "/marketing/promotions" },
  { name: "Email Campaigns", href: "/marketing/email_marketing" },
  { name: "Content Management", href: "/marketing/content_merchandising" },
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
