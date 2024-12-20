"use server";

import {
  FormState,
  LoginFormState,
  SigninFormSchema,
  SignupFormSchema,
} from "./definitions";
import { redirect } from "next/navigation";
import { createSession, deleteSession, updateSession } from "./session";
import Customer from "@/models/Customer";
import User from "@/models/users";
import { connection } from "@/utils/connection";
import { verifySession } from "./dal";
import { ObjectId } from "mongoose";

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
      role: "customer",
      status: "active",
    });

    const user = await newUser.save();

    if (!user) {
      return {
        message: "An error occurred while creating your account.",
      };
    }

    // Current steps:
    // 4. Create user session
    await createSession(user?._id.toString());

    const newCustomer = new Customer({ userId: user._id });
    await newCustomer.save();

    // 5. Redirect user
    redirect("/auth/login");
  }
}

export const authenticate = async (
  state:
    | {
        errors: {
          email?: string[] | undefined;
          password?: string[] | undefined;
        };
        message?: string;
      }
    | undefined,
  formData: FormData
) => {
  const validatedFields = SigninFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      ...state,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  await connection();

  const user = await User.findOne({ email });
  console.log(user);

  if (!user || !(await user.matchPassword(password))) {
    console.log("Wrong password");
    return;
  }

  // Handle session
  const session = await verifySession();
  if (session) {
    const updatedSession = await updateSession();
    console.log("Session updated:", updatedSession);
  } else {
    await createSession(user._id.toString());
  }

  redirect("/");
};

export async function logout(id: string) {
  deleteSession(id);
  redirect("/auth/login");
}
