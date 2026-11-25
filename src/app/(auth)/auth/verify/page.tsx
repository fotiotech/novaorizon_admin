"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AdminVerifyPage() {
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(() => {
        setState("success");
        setMessage("Email verified. You can sign in now.");
      })
      .catch((err) => {
        setState("error");
        setMessage(
          err?.response?.data?.error ??
            "This link is invalid or has expired.",
        );
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full space-y-4 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Email verification
        </h2>
        {state === "loading" ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verifying…
          </p>
        ) : (
          <>
            <p
              className={
                state === "success"
                  ? "text-sm text-green-600"
                  : "text-sm text-red-600"
              }
            >
              {message}
            </p>
            <Link
              href="/auth/login"
              className="inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
