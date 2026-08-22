// app/admin/users/[userId]/edit/page.tsx

import UserRolePermissionsForm from "../../../_component/UserRolePermissionsForm";

export default function EditUserPage({
  params,
}: {
  params: { userId: string };
}) {
  return (
    <div className="container mx-auto py-8">
      <UserRolePermissionsForm userId={params.userId} />
    </div>
  );
}
