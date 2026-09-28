"use server";

import { FormState, SignupFormSchema } from "./definitions";
import User from "@/models/User";
import { connection } from "@/utils/connection";
import crypto from "crypto";

export async function signup(state: FormState, formData: FormData) {
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validatedFields.data;

  try {
    await connection();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { error: "Email is already registered." };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000);

    // Phone + preferences (language / currency / theme / notifications /
    // marketing) are collected later from the profile page — the model's
    // defaults apply here.
    const newUser = new User({
      name,
      email,
      password,

      isVerified: true,
      emailVerified: new Date(),
      status: "active",

      verificationToken: token,
      tokenExpiry: expires,

      role: "customer",
      profileCompleted: false,
    });

    const user = await newUser.save();

    if (!user) {
      return {
        message: "An error occurred while creating your account.",
      };
    }

    return {
      message: "Account created successfully. Please log in to your account.",
    };
  } catch (error: any) {
    console.error(error);
    return { error: "Registration failed. Try again." };
  }
}
