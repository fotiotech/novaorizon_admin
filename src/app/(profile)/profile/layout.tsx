// app/marketing/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const profileLinks = [{ name: "Account", href: "/account" }];

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="Profile" links={profileLinks}>
      {children}
    </SectionLayout>
  );
}
