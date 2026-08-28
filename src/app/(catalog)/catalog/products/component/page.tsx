// app/verify/page.tsx

import User from "@/models/User";
import { connection } from "@/utils/connection";
import Link from "next/link";
import { SignIn } from "../../../../(auth)/components/SignInButton";

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

  await connection();

  // Find user matching token where the current time is less than tokenExpiry
  const user = await User.findOne({
    verificationToken: token,
    tokenExpiry: { $gt: new Date() },
  });

  if (!user) {
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

  // Atomically update user validation status and strip tokens to prevent replay attacks
  await User.updateOne(
    { _id: user._id },
    {
      $set: { isVerified: true, status: "active" },
      $unset: { verificationToken: "", tokenExpiry: "" },
    },
  );

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
