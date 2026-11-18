// app/verify/page.tsx

import Link from "next/link";
import { apiFetch } from "@/lib/server-api";
import { SignIn } from "../../../../(auth)/_component/SignInButton";

interface VerifyPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="text-center mt-12 text-red-500 font-semibold">
        Missing verification token.
      </div>
    );
  }

  let verified = false;
  try {
    await apiFetch("/auth/verify-email", {
      method: "POST",
      body: { token },
    });
    verified = true;
  } catch (error) {
    console.error("[verify] token rejected:", error);
  }

  if (!verified) {
    return (
      <div className="text-center mt-12">
        <p className="text-red-500 font-semibold">
          The link is invalid or has expired.
        </p>
        <Link
          href="/register"
          className="text-blue-600 hover:underline mt-2 inline-block"
        >
          Register again
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center mt-12 max-w-md mx-auto p-6 border rounded shadow">
      <h1 className="text-2xl font-bold text-green-600">Account Verified!</h1>
      <p className="text-gray-600 mt-2">
        Your email has been successfully confirmed.
      </p>
      <SignIn />
    </div>
  );
}
