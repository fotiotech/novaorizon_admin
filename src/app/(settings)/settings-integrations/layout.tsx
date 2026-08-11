// app/settings/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const settingsLinks = [
  { name: "General Settings", href: "/settings/general" },
  { name: "Payment Methods", href: "/settings/payment" },
  { name: "Shipping Options", href: "/settings/shipping" },
  { name: "Tax Configuration", href: "/settings/tax" },
  { name: "Localization", href: "/settings/local" },
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
