// app/users/permissions_roles/page.tsx
import Link from "next/link";
import { findUsers } from "@/app/actions/users";

export default async function PermissionRolePage() {
  // Fetch all users from the server action
  const users = await findUsers();

  // Filter out users with role === 'customer'
  const filteredUsers = users.filter((user: any) => user.role !== "");

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users – Roles & Permissions</h1>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="text-gray-500">No users found (excluding customers).</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Email
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Role
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Permissions
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any) => (
                <tr key={user._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{user.name}</td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block bg-gray-200 text-gray-800 text-xs font-medium px-2 py-1 rounded">
                      {user.role || "none"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {user.permissions && user.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.map((perm: string) => (
                          <span
                            key={perm}
                            className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">
                        No permissions
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/users/permissions_roles/${user._id}/edit`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
