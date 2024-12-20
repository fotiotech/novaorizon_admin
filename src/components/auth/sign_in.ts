"use server";
import { signIn } from "@/app/auth";

export async function sign_in() {
  return await signIn("google", { callbackUrl: "/" });
}
