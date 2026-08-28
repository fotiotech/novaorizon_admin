// app/actions/reset-password.ts
"use server";

import User from "@/models/User";
import { connection } from "@/utils/connection";
import bcrypt from "bcryptjs";

export async function resetPassword(prevState: any, formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword || !token) {
    return { error: "All fields are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    await connection();

    // Find the user with a matching token that is still valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!user) {
      return { error: "Invalid or expired recovery token." };
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Save and atomically remove the recovery attributes
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpiry: "" },
      },
    );

    return { success: "Your password has been reset successfully!" };
  } catch (error) {
    console.error(error);
    return { error: "Failed to reset password. Please try again." };
  }
}
