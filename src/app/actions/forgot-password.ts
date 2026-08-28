// app/actions/forgot-password.ts
"use server";

import User from "@/models/User";
import { connection } from "@/utils/connection";
import crypto from "crypto";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function requestPasswordReset(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Please provide an email address." };
  }

  try {
    await connection();

    const user = await User.findOne({ email });

    // Security Best Practice: Don't explicitly reveal if an account doesn't exist
    if (!user) {
      return { success: "If that account exists, a reset link has been sent!" };
    }

    // Generate token valid for 1 hour
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000);

    await User.updateOne(
      { _id: user._id },
      { $set: { resetPasswordToken: token, resetPasswordExpiry: expires } },
    );

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    await resend.emails.send({
      from: "Acme Security <fotiodev1@gmail.com>",
      to: email,
      subject: "Reset your password",
      html: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to choose a new password. This link expires in 1 hour.</p>`,
    });

    return { success: "If that account exists, a reset link has been sent!" };
  } catch (error) {
    console.error(error);
    return { error: "An error occurred. Please try again." };
  }
}
