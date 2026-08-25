// app/admin/users/[userId]/edit/page.tsx

import UserRolePermissionsForm from "../../_component/UserRolePermissionsForm";

export default function CreateUserPage() {
  return (
    <div className="container mx-auto py-8">
      <UserRolePermissionsForm />
    </div>
  );
}
