"use client";

import { EMAIL_REGEX } from "@/app/lib/definitions";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import Link from "next/link";
import { useState } from "react";

type StaffRole = "seller" | "support" | "admin";

interface FormState {
  errors?: Record<string, string[]>;
  error?: string;
  message?: string;
}

export default function SignupForm() {
  const { adminSignup } = useAuth();

  const [state, setState] = useState<FormState>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("seller");
  const [pending, setPending] = useState(false);

  const clearError = (field: string) => {
    setClientErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setState((prev) => {
      if (!prev.errors?.[field]) return prev;
      const next = { ...prev, errors: { ...prev.errors } };
      delete next.errors![field];
      return next;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!name.trim()) e.name = "Full name is required.";
    else if (parts.length < 2)
      e.name = "Please enter both your first and last name.";

    if (!email) e.email = "Email is required.";
    else if (!EMAIL_REGEX.test(email)) e.email = "Please enter a valid email.";

    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Must be at least 8 characters.";
    else if (!/[a-zA-Z]/.test(password))
      e.password = "Contain at least one letter.";
    else if (!/[0-9]/.test(password))
      e.password = "Contain at least one number.";
    else if (!/[^a-zA-Z0-9]/.test(password))
      e.password = "Contain at least one special character.";

    setClientErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setPending(true);
    setState({});

    try {
      // Uses the shared axios instance (cookie-based auth).
      // The admin's session cookie is sent automatically.
      // `role` is explicit — this creates a staff account, not a customer.
      const created = await adminSignup(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        role,
      );

      setState({
        message: `${created.role} account created for ${created.email}. They can now sign in.`,
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("seller");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const body = (err.response.data ?? {}) as {
          error?: string;
          fieldErrors?: Record<string, string[]>;
        };

        if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
          setState({ errors: body.fieldErrors });
        } else if (err.response.status === 401) {
          setState({
            error: "Your admin session expired. Please sign in again.",
          });
        } else if (err.response.status === 403) {
          setState({
            error:
              body.error ||
              "You do not have permission to create staff accounts.",
          });
        } else if (err.response.status === 429) {
          setState({ error: "Rate limit reached. Try again later." });
        } else {
          setState({
            error: body.error || `Signup failed (${err.response.status})`,
          });
        }
      } else {
        // No response — network / CORS. Include a hint so the user isn't stuck.
        setState({
          error:
            "Network error. Check that the API server is running and CORS is configured for this origin.",
        });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <Link href={"/"} className="mb-8">
        <img
          title="logo"
          src="/novaorizon-dark.png"
          alt="logo"
          className="h-16 w-40"
        />
      </Link>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="pb-6 px-8 pt-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
            Create Staff Account
          </h1>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
            Admin-only. The account will be pre-verified and ready to sign in.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                placeholder="Jane Doe"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                disabled={pending}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                  state.errors?.name || clientErrors.name
                    ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                    : "border-gray-300 focus:ring-blue-200 dark:focus:ring-blue-800 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60`}
              />
              {(clientErrors.name || state.errors?.name) && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {clientErrors.name || state.errors!.name![0]}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter their email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                disabled={pending}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                  state.errors?.email || clientErrors.email
                    ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                    : "border-gray-300 focus:ring-blue-200 dark:focus:ring-blue-800 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60`}
              />
              {(clientErrors.email || state.errors?.email) && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {clientErrors.email || state.errors!.email![0]}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                title="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                disabled={pending}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                  state.errors?.password || clientErrors.password
                    ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                    : "border-gray-300 focus:ring-blue-200 dark:focus:ring-blue-800 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60`}
                placeholder="At least 8 chars, with letter, number, special"
              />
              {clientErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {clientErrors.password}
                </p>
              )}
              {state.errors?.password && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Password requirements:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 list-disc pl-5 space-y-1">
                    {state.errors.password.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Role */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Role
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                disabled={pending}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
              >
                <option value="seller">
                  Seller — products, orders, inventory
                </option>
                <option value="support">
                  Support — customer issues, read-only orders
                </option>
                <option value="admin">
                  Admin — full access, can create staff
                </option>
              </select>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
              The account will be pre-verified. The staff member can add profile
              details (phone, language, theme) after signing in.
            </p>

            <div className="flex gap-2 mt-6">
              <SubmitButton pending={pending} />
            </div>

            {state.error && (
              <div className="p-3 mt-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-center text-sm">
                {state.error}
              </div>
            )}

            {state.message && !state.errors && (
              <div className="p-3 mt-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-center text-sm">
                {state.message}
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you a customer?{" "}
              <Link
                href="/auth/sign_up"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      disabled={pending}
      type="submit"
      className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center"
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Creating Account...
        </>
      ) : (
        "Create Staff Account"
      )}
    </button>
  );
}
