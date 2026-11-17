"use server";

import { FormState, SignupFormSchema } from "./definitions";
import { requireAdmin } from "@/lib/authz";
import { ApiError, apiFetch } from "@/lib/server-api";

/**
 * Staff accounts are created by an existing admin, never by the public.
 * The backend (`POST /api/auth/signup` with a non-customer `role`) enforces
 * that rule too.
 */
export async function signup(
  state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

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
    await apiFetch("/auth/signup", {
      method: "POST",
      body: { name, email, password, role: "seller" },
    });

    return {
      message: "Account created successfully. Please log in to your account.",
    };
  } catch (error: any) {
    console.error(error);
    if (error instanceof ApiError) {
      if (error.status === 409) {
        return { error: "Email is already registered." };
      }
      return { error: error.message };
    }
    return { error: "Registration failed. Try again." };
  }
}
