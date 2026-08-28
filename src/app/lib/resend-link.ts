// app/actions/resend-link.ts
"use server";

import { connection } from "@/utils/connection";
import crypto from "crypto";

import { Resend } from "resend";
import { VerificationTemplate } from "../(auth)/components/VerificationTemplate";
import User from "@/models/User";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function resendVerification(email: string) {
  if (!email) return { error: "Missing email." };

  await connection();
  const user = await User.findOne({ email });

  if (!user || user.isVerified) {
    return {
      success: "If that account exists and is unverified, a new link was sent!",
    };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000);

  await User.updateOne(
    { _id: user._id },
    { $set: { verificationToken: token, tokenExpiry: expires } },
  );

  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`;

  await resend.emails.send({
    from: "novaorizon <fotiodev1g@gmail.com>",
    to: email,
    subject: "New Verification Link",
    react: VerificationTemplate({ verificationUrl }),
  });

  return {
    success: "A fresh verification link has been dispatched to your email.",
  };
}
