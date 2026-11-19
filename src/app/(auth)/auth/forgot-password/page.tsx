// app/auth/forgot-password/page.tsx
"use client";

import { useState } from "react";
import api from "@/lib/api";
import { SignIn } from "@/app/(auth)/_component/SignInButton";

type FormState = { error?: string; success?: string } | null;

export default function ForgotPasswordPage() {
  const [state, setState] = useState<FormState>(null);
  const [isPending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      setState({ error: "Please provide an email address." });
      return;
    }

    setPending(true);
    setState(null);

    try {
      const res = await api.post<{ message?: string }>("/auth/forgot-password", {
        email,
      });
      setState({
        success:
          res.data?.message ??
          "If that account exists, a reset link has been sent!",
      });
    } catch (error: any) {
      setState({
        error:
          error?.response?.data?.error ??
          "An error occurred. Please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-5 sm:space-y-6 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your email and we'll dispatch a secure recovery token.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700"
              placeholder="Email address"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
          >
            {isPending ? "Sending Link..." : "Send Reset Link"}
          </button>
        </form>

        {state?.error && (
          <p className="text-red-500 text-center text-sm font-medium">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p className="text-green-600 dark:text-green-400 text-center text-sm font-medium">
            {state.success}
          </p>
        )}

        <div className="text-center text-sm">
          Back to <SignIn />
        </div>
      </div>
    </div>
  );
}
