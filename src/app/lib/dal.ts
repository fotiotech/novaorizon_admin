"use server"; // To ensure server-only execution in Next.js

import { cookies } from "next/headers";
import { decrypt } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { cache } from "react";
import User from "@/models/users";
import { connection } from "@/utils/connection";
import Session from "@/models/Session";

// Verifies the session and retrieves the user information
export const verifySession = cache(async () => {
  const cookie = cookies().get("session")?.value;

  if (!cookie) {
    return null;
  }

  const session = await decrypt(cookie);

  if (!session?.sessionId) {
    return null;
  }

  try {
    await connection();

    const sess = await Session.findOne({ _id: session.sessionId });
    const user = await User.findOne({ _id: sess.userId });

    if (!user) {
      return null;
    }

    // Prepare the user object with the required fields

    return {
      isAuth: true,
      userId: sess.userId.toString(),
      role: user.role,
      email: user.email,
      username: user.username,
    };
  } catch (error) {
    console.log("Failed to verify session", error);
    // redirect("/auth/login");
  }
});

// Fetches user data based on the verified session
export const getUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  try {
    await connection();
    // Find the user by their id from the session
    const currentUser = await User.findOne(
      { _id: session.userId } // Assuming session.userId is the user's _id
    );

    

    return {
      _id: currentUser?._id.toString(),
      username: currentUser?.username,
      email: currentUser?.email,
      role: currentUser?.role,
    };
  } catch (error) {
    console.log("Failed to fetch user", error);
    return null;
  }
});
