// app/reset-password/page.tsx
"use client";

import { useActionState, use } from "react";
import { resetPassword } from "@/app/actions/reset-password";
import Link from "next/link";
import { SignIn } from "@/components/auth/SignInButton";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  // Unwrap searchParams using React.use() hook
  const { token } = use(searchParams);
  const [state, formAction, isPending] = useActionState(resetPassword, null);

  if (!token) {
    return (
      <div className="text-center mt-12 text-red-500 font-semibold">
        Missing or invalid token.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Set New Password</h1>

      <form action={formAction} className="space-y-4">
        {/* Pass the token back securely via hidden field */}
        <input type="hidden" name="token" value={token} />

        <div>
          <label className="block mb-1 font-medium">New Password</label>
          <input
            type="password"
            name="password"
            required
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            required
            className="border p-2 w-full rounded"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isPending ? "Updating..." : "Update Password"}
        </button>
      </form>

      {state?.error && (
        <p className="text-red-500 mt-3 text-sm">{state.error}</p>
      )}
      {state?.success && (
        <div className="mt-3">
          <p className="text-green-500 text-sm font-medium mb-2">
            {state.success}
          </p>
          <SignIn />
        </div>
      )}
    </div>
  );
}
