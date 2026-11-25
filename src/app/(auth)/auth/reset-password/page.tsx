"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AdminResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!token) return setError("This reset link is missing its token.");
    if (password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ??
          "This reset link is invalid or has expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full space-y-4 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
          Choose a new password
        </h2>
        {done ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-green-600">
              Your password has been reset.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Saving…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
