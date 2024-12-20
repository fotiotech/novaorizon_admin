"use client";

import { signup } from "@/app/lib/actions";
import Image from "next/image";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

export default function SignupForm() {
  const [state, action] = useFormState(signup, undefined);
  return (
    <>
      <Link href={"/"}>
        <Image
          title="logo"
          src="/logo.png"
          width={60}
          height={30}
          alt="logo"
          className="p-2"
        />
      </Link>
      <form
        action={action}
        className="flex justify-center 
        items-center mt-8"
      >
        <div>
          <h1 className="my-4 text-2xl text-center font-bold">Sign Up</h1>
          <div>
            <label htmlFor="name">Name</label>
            <input name="name" placeholder="Name" />
          </div>
          {state?.errors?.name && <p>{state.errors.name}</p>}
          <div>
            <label htmlFor="email">Email</label>
            <input name="email" type="email" placeholder="Email" />
          </div>
          {state?.errors?.email && <p>{state.errors.email}</p>}
          <div>
            <label htmlFor="password">Password</label>
            <input title="password" name="password" type="password" />
          </div>
          {state?.errors?.password && (
            <div>
              <p>Password must:</p>
              <ul>
                {state.errors.password.map((error) => (
                  <li key={error}>- {error}</li>
                ))}
              </ul>
            </div>
          )}
          <SubmitButton />
          <Link href={"/auth/login"}>
            <p>
              Already have an Account?
              <span className=" font-bold px-1 text-blue-600">Sign in</span>
            </p>
          </Link>
        </div>
      </form>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      type="submit"
      className="p-2 w-full my-2 rounded-lg
    bg-thiR border-2 border-gray-200"
    >
      Sign Up
    </button>
  );
}
