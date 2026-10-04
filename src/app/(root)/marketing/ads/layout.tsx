import SectionLayout from "@/components/SectionLayout";

const campaignLinks = [
  { name: "Overview", href: "/marketing/campaigns" },
  { name: "Settings", href: "/marketing/campaigns/settings" },
];

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="Campaigns" links={campaignLinks}>
      {children}
    </SectionLayout>
  );
}
