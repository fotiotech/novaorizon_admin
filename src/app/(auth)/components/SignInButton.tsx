"use client";

import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignIn() {
  return (
    <Button
      variant="default"
      size="sm"
      onClick={() => signIn()}
      className="rounded-xl px-4"
    >
      Sign In
    </Button>
  );
}

export function SignOut() {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => signOut()}
      className="rounded-xl px-4"
    >
      Sign Out
    </Button>
  );
}
