"use client";

import { signup } from "@/app/lib/actions";
import Image from "next/image";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useState, useEffect } from "react";

export default function SignupForm() {
  const [state, action] = useFormState(signup, undefined);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({});

  // Update errors when state changes
  useEffect(() => {
    if (state?.errors) {
      setErrors(state.errors);
    }
  }, [state]);

  // Clear error when user starts typing in a field
  const clearError = (fieldName: string) => {
    if (errors[fieldName]) {
      const newErrors = { ...errors };
      delete newErrors[fieldName];
      setErrors(newErrors);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <Link href={"/"} className="mb-8">
        <Image
          title="logo"
          src="/logo.png"
          width={80}
          height={40}
          alt="logo"
          className="p-2 hover:opacity-80 transition-opacity"
        />
      </Link>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="py-6 px-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
            Create Your Account
          </h1>

          <form action={action} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Full Name
              </label>
              <input
                name="name"
                placeholder="Enter your full name"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                  errors?.name
                    ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                    : "border-gray-300 focus:ring-blue-200 dark:focus:ring-blue-800 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                onChange={() => clearError("name")}
              />
              {errors?.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.name[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email Address
              </label>
              <input
                name="email"
                type="email"
                placeholder="Enter your email"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                  errors?.email
                    ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                    : "border-gray-300 focus:ring-blue-200 dark:focus:ring-blue-800 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                onChange={() => clearError("email")}
              />
              {errors?.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <input
                title="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                  errors?.password
                    ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                    : "border-gray-300 focus:ring-blue-200 dark:focus:ring-blue-800 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="Create a strong password"
              />
              {errors?.password && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Password requirements:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 list-disc pl-5 space-y-1">
                    {errors.password.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <SubmitButton />

            {state?.message && !state.errors && (
              <div className="p-3 mt-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-center">
                {state.message}
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 py-4 px-8 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            By creating an account, you agree to our{" "}
            <Link
              href="/terms"
              className="underline hover:text-gray-700 dark:hover:text-gray-300"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline hover:text-gray-700 dark:hover:text-gray-300"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      type="submit"
      className="w-full py-2.5 px-4 mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center"
    >
      {pending ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Creating Account...
        </>
      ) : (
        "Sign Up"
      )}
    </button>
  );
}
