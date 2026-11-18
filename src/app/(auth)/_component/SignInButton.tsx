"use client";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

/** Signs the user in through the app's login page (backend session). */
export function SignIn() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/auth/login")}
      className="bg-primary rounded-full py-1 px-3 text-white hover:bg-primary/90 transition-colors"
    >
      Sign In
    </button>
  );
}

/** Clears the backend session cookie, then returns to the login page. */
export function SignOut() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        try {
          await api.post("/auth/logout");
        } catch {
          /* ignore */
        }
        router.push("/auth/login");
      }}
      className=""
    >
      Sign Out
    </button>
  );
}
