"use client";

import { signup } from "@/app/lib/actions";
import { EMAIL_REGEX } from "@/app/lib/definitions";
import Image from "next/image";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useState, useEffect } from "react";

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Profile" },
  { id: 3, label: "Notifications" },
];

const COUNTRY_CODES = [
  { code: "+237", label: "🇨🇲 +237" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+49", label: "🇩🇪 +49" },
  { code: "+234", label: "🇳🇬 +234" },
  { code: "+233", label: "🇬🇭 +233" },
  { code: "+254", label: "🇰🇪 +254" },
];

export default function SignupForm() {
  const [state, action] = useFormState(signup, undefined);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({});
  const [clientErrors, setClientErrors] = useState<{ [key: string]: string }>(
    {},
  );
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state?.errors) {
      setErrors(state.errors);
      const e = state.errors;
      if (e.email || e.password) setStep(1);
      else if (e.fullName || e.phoneNumber || e.phoneCountryCode) setStep(2);
      else setStep(3);
    }
  }, [state]);

  const clearError = (field: string) => {
    setClientErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (errors[field]) {
      const next = { ...errors };
      delete next[field];
      setErrors(next);
    }
  };

  const validateStep1 = () => {
    const e: { [k: string]: string } = {};
    const emailInput = (document.getElementById("email") as HTMLInputElement)
      ?.value;
    const pass = password;
    if (!emailInput) e.email = "Email is required.";
    else if (!EMAIL_REGEX.test(emailInput))
      e.email = "Please enter a valid email.";
    if (!pass) e.password = "Password is required.";
    else if (pass.length < 8) e.password = "Must be at least 8 characters.";
    setClientErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: { [k: string]: string } = {};
    const name = (document.getElementById("fullName") as HTMLInputElement)
      ?.value;
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      e.fullName = "Please enter both your first and last name.";
    }
    setClientErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setClientErrors({});
    setStep((s) => Math.min(s + 1, 3));
  };

  const back = () => {
    setClientErrors({});
    setStep((s) => Math.max(s - 1, 1));
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
        {/* Progress */}
        <div className="px-8 pt-6">
          <div className="flex items-center justify-between mb-6">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div
                  key={s.id}
                  className="flex items-center flex-1 last:flex-none"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                        done
                          ? "bg-blue-600 border-blue-600 text-white"
                          : active
                            ? "bg-white dark:bg-gray-800 border-blue-600 text-blue-600"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400"
                      }`}
                    >
                      {done ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        s.id
                      )}
                    </div>
                    <span
                      className={`mt-1 text-xs ${
                        active
                          ? "text-blue-600 dark:text-blue-400 font-medium"
                          : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        step > s.id
                          ? "bg-blue-600"
                          : "bg-gray-200 dark:bg-gray-600"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pb-6 px-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
            {step === 1 && "Create Your Account"}
            {step === 2 && "Tell Us About You"}
            {step === 3 && "Stay in the Loop"}
          </h1>

          <form action={action} className="space-y-4">
            {/* STEP 1 — ACCOUNT */}
            <div className={step === 1 ? "space-y-4" : "hidden"}>
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
                  placeholder="Enter your email"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                    errors?.email || clientErrors.email
                      ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                      : "border-gray-300 focus:ring-blue-200 dark:focus:ring-blue-800 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  onChange={() => clearError("email")}
                />
                {(clientErrors.email || errors?.email) && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {clientErrors.email || errors.email?.[0]}
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
                  id="password"
                  title="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError("password");
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                    errors?.password || clientErrors.password
                      ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                      : "border-gray-300 focus:ring-blue-200 dark:focus:ring-blue-800 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="Create a strong password"
                />
                {clientErrors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {clientErrors.password}
                  </p>
                )}
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
            </div>

            {/* STEP 2 — PROFILE */}
            <div className={step === 2 ? "space-y-4" : "hidden"}>
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                    errors?.fullName || clientErrors.fullName
                      ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-800"
                      : "border-gray-300 focus:ring-blue-200 dark:focus:ring-blue-800 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  onChange={() => clearError("fullName")}
                />
                {(clientErrors.fullName || errors?.fullName) && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {clientErrors.fullName || errors.fullName?.[0]}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Phone Number{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    name="phoneCountryCode"
                    defaultValue="+237"
                    className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    inputMode="tel"
                    placeholder="6XX XXX XXX"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  We'll use this for order updates. You can verify it later.
                </p>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                You can set your language, currency and theme from your profile
                after signing up.
              </p>
            </div>

            {/* STEP 3 — NOTIFICATIONS */}
            <div className={step === 3 ? "space-y-4" : "hidden"}>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose how we reach you. You can change these anytime from your
                profile.
              </p>

              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Order &amp; account updates
              </p>
              <div className="space-y-2">
                <ToggleRow name="notifyEmail" label="Email" defaultChecked />
                <ToggleRow name="notifyPush" label="Push" defaultChecked />
                <ToggleRow name="notifySms" label="SMS" />
                <ToggleRow name="notifyWhatsapp" label="WhatsApp" />
              </div>

              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
                Marketing
              </p>
              <div className="space-y-2">
                <ToggleRow
                  name="marketingEmail"
                  label="Promotions, offers & newsletter by email"
                />
              </div>
            </div>

            {/* NAVIGATION */}
            <div className="flex gap-2 mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={back}
                  className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Next
                </button>
              ) : (
                <SubmitButton />
              )}
            </div>

            {state?.error && (
              <div className="p-3 mt-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-center text-sm">
                {state.error}
              </div>
            )}

            {state?.message && !state.errors && (
              <div className="p-3 mt-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-center text-sm">
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
        "Create Account"
      )}
    </button>
  );
}

function ToggleRow({
  name,
  label,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="w-10 h-5 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-blue-600 transition-colors" />
        <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
