// app/marketing/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const marketingLinks = [
  { name: "Content", href: "/marketing/content" },
  { name: "Campaigns", href: "/marketing/campaigns" },
  { name: "Promotions", href: "/marketing/promotions" },
  { name: "Promotion Type", href: "/marketing/promotions/types" },
  { name: "Properties", href: "/marketing/promotions/properties" },
  { name: "Email Campaigns", href: "/marketing/email_marketing" },
  { name: "SEO", href: "/marketing/seo" },
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
