"use client";

import { useAuth, type AppRole } from "@/hooks/useAuth";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function postLoginTarget(role: AppRole, callbackUrl: string | null): string {
  if (callbackUrl) return callbackUrl;
  return role === "admin" ? "/" : "/";
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-300 rounded" />
      </div>
    </div>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const { login, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (user) router.replace(postLoginTarget(user.role, rawCallback));
  }, [loading, user, router, rawCallback]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const signedIn = await login(email.trim().toLowerCase(), password);
      router.replace(postLoginTarget(signedIn.role, rawCallback));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const body = (err.response.data ?? {}) as { error?: string };
        setError(
          body.error ??
            (status === 401
              ? "Invalid email or password"
              : status === 429
                ? "Too many attempts. Try again in 15 minutes."
                : `Sign-in failed (${status}).`),
        );
      } else {
        setError(
          "Network error. Check that the API server is running and CORS is configured for this origin.",
        );
      }
    } finally {
      setPending(false);
    }
  };

  if (loading) return <SignInFallback />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="flex flex-col items-center w-full max-w-md space-y-3">
        <Link href="/" className="mb-8">
          <img src="/novaorizon-dark.png" alt="logo" className="h-16 w-40" />
        </Link>
        <div className="w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md text-center text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              className="w-full px-3 py-2 border rounded-md disabled:opacity-60"
            />
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              className="w-full px-3 py-2 border rounded-md disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="text-sm text-center">
            <Link href="/auth/forgot-password" className="text-indigo-600">
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
