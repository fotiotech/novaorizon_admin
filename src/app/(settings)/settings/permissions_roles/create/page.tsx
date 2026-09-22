// app/admin/users/[userId]/edit/page.tsx

import UserRolePermissionsForm from "../../users/_component/UserRolePermissionsForm";

export default function CreateUserPage() {
  return (
    <div className="container mx-auto py-8">
      <UserRolePermissionsForm />
    </div>
  );
}
