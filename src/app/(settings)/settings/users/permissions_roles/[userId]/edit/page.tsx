// app/admin/users/[userId]/edit/page.tsx

import UserRolePermissionsForm from "../../../_component/UserRolePermissionsForm";

export default async function EditUserPage(
  props: {
    params: Promise<{ userId: string }>;
  }
) {
  const params = await props.params;
  return (
    <div className="container mx-auto py-8">
      <UserRolePermissionsForm userId={params.userId} />
    </div>
  );
}
