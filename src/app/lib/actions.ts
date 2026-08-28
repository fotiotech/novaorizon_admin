"use server";

import { FormState, SignupFormSchema } from "./definitions";
import User from "@/models/User";
import { connection } from "@/utils/connection";
import crypto from "crypto";
import { Resend } from "resend";
import { VerificationTemplate } from "../(auth)/components/VerificationTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function signup(state: FormState, formData: FormData) {
  // Validate form fields
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // If any form fields are invalid, return early
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // Call the provider or db to create a user...

  // 2. Prepare data for insertion into database
  const { name, email, password } = validatedFields.data;

  try {
    await connection();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { error: "Email is already registered." };
    }
    // 2. Hash password and generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour expiry

    // 3. Insert the user into the database or call an Auth Library's API
    const newUser = new User({
      name: name,
      email: email,
      password: password,
      verificationToken: token,
      tokenExpiry: expires,
      role: "customer",
      status: "inactive",
    });

    const user = await newUser.save();

    if (!user) {
      return {
        message: "An error occurred while creating your account.",
      };
    }

    // 4. Send the verification link
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;

    await resend.emails.send({
      from: "Novaorizon <fotiodev1g@gmail.com>",
      to: email,
      subject: "Verify your email address",
      react: VerificationTemplate({ verificationUrl }),
    });

    return { success: "Verification email sent! Please check your inbox." };
  } catch (error: any) {
    console.error(error);
    return { error: "Registration failed. Try again." };
  }
}
