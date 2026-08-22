// app/marketing/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const marketingLinks = [
  { name: "Promotions", href: "/marketing/promotions" },
  { name: "Promotion Type", href: "/marketing/promotions/types" },
  { name: "Properties", href: "/marketing/promotions/properties" },
  { name: "Email Campaigns", href: "/marketing/email_marketing" },
  
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
