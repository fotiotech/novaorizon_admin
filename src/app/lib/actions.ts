"use server";

import {
  FormState,
  SignupFormSchema,
} from "./definitions";
import { redirect } from "next/navigation";
import Customer from "@/models/Customer";
import User from "@/models/users";
import { connection } from "@/utils/connection";
import { signIn } from "@/app/auth";

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

  await connection();

  const data = await User.findOne({ email });

  if (data) {
    return redirect("/auth/login");
  } else {
    // 3. Insert the user into the database or call an Auth Library's API
    const newUser = new User({
      username: name,
      email: email,
      password: password,
      role: "user",
      status: "active",
    });

    const user = await newUser.save();

    if (!user) {
      return {
        message: "An error occurred while creating your account.",
      };
    }

    const newCustomer = new Customer({ userId: user._id });
    await newCustomer.save();

    return signIn();
  }
}
