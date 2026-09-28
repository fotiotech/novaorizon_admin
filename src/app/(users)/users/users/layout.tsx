import SectionLayout from "@/components/SectionLayout";

const userManagementLinks = [
  { name: "Users", href: "/settings/users" },
  { name: "Roles & Permissions", href: "/settings/users/permissions_roles" },
];

export default function UserManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="User Management" links={userManagementLinks}>
      {children}
    </SectionLayout>
  );
}
