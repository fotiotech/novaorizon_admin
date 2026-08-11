// app/user-management/layout.tsx
import SectionLayout from "@/components/SectionLayout";

const userManagementLinks = [
  { name: "Users", href: "/user-management/users" },
  { name: "Roles & Permissions", href: "/user-management/permissions_roles" },
  { name: "Audit Log", href: "/user-management/audit_log" },
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
