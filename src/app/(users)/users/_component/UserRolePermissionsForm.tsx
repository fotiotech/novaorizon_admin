// components/UserRolePermissionsForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateUserRoleAndPermissions } from "@/app/actions/users";

// Predefined roles and permissions (customize as needed)
const ROLES = ["admin", "editor", "viewer", "user"];
const PERMISSIONS_LIST = [
  "manage_users",
  "manage_content",
  "view_reports",
  "edit_settings",
  "delete_items",
];

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export default function UserRolePermissionsForm({
  userId,
}: {
  userId?: string;
}) {
  const [user, setUser] = useState<UserData | null>(null);
  const [role, setRole] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const router = useRouter();

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`); // or use server action directly
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data);
        setRole(data.role || "");
        setPermissions(data.permissions || []);
      } catch (err) {
        setMessage({ type: "error", text: "Error loading user" });
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  // Toggle permission checkbox
  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!userId) return;

    const result = await updateUserRoleAndPermissions(
      userId,
      role,
      permissions,
    );
    if (result.success) {
      setMessage({ type: "success", text: result.message });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.message });
    }
    setSaving(false);
  };

  if (loading) return <div>Loading user data...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-lg mx-auto p-6 bg-white rounded shadow"
    >
      <h2 className="text-2xl font-bold">Edit Role & Permissions</h2>
      <p className="text-sm text-gray-600">
        User: {user.name} ({user.email})
      </p>

      {/* Role Select */}
      <div>
        <label
          htmlFor="role"
          className="block text-sm font-medium text-gray-700"
        >
          Role
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Permissions Checkboxes */}
      <div>
        <span className="block text-sm font-medium text-gray-700">
          Permissions
        </span>
        <div className="mt-2 space-y-2">
          {PERMISSIONS_LIST.map((perm) => (
            <label key={perm} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={permissions.includes(perm)}
                onChange={() => togglePermission(perm)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{perm}</span>
            </label>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Update User"}
      </button>
    </form>
  );
}
