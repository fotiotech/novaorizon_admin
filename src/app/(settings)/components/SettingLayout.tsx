import SectionLayout from "@/components/SectionLayout";

const settingsLinks = [
  { name: "General Settings", href: "/settings/general" },
  { name: "Users", href: "/settings/users" },
  { name: "Payments", href: "/settings/payment" },
  { name: "Shipping", href: "/settings/shipping" },
  { name: "Tax Configuration", href: "/settings/tax" },
  { name: "Localization", href: "/settings/local" },
  { name: "Finances", href: "/settings/finances" },
  { name: "Returns", href: "/settings/returns" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="Settings" links={settingsLinks}>
      {children}
    </SectionLayout>
  );
}
