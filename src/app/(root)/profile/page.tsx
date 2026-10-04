"use client";

import { useUserData } from "@/app/context/UserDataContext";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Logout,
  Close,
  Person,
  Home,
  CreditCard,
  Refresh,
} from "@mui/icons-material";

export default function ProfilePage() {
  const { user, addresses, paymentMethods, loading, error, refetch } =
    useUserData();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // `redirect: false` lets us control the destination ourselves,
      // and passing a safe callbackUrl prevents the nested-callback loop.
      await signOut({ redirect: false });
      // Full reload wipes any in-memory session state, then lands on
      // the login page with a clean callbackUrl of "/".
      window.location.href = "/auth/login?callbackUrl=%2F";
    } catch (err) {
      console.error("Sign out failed:", err);
      setIsSigningOut(false);
      setIsSignOutOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <div className="border-b border-border px-5 py-4">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-3 p-5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center text-destructive">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 rounded-lg border border-destructive/40 px-4 py-1.5 text-sm font-medium transition hover:bg-destructive/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Person className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Please log in to view your profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            My profile
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your personal information, addresses, and payment methods.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsSignOutOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-background px-3.5 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
        >
          <Logout fontSize="small" />
          Sign out
        </button>
      </div>

      {/* Personal Information */}
      <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Person fontSize="small" className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Personal information
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Name
            </label>
            <p className="mt-1.5 text-sm text-foreground">
              {user.name || "Not provided"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Email
            </label>
            <p className="mt-1.5 text-sm text-foreground">{user.email}</p>
          </div>
        </div>
      </section>

      {/* Saved Addresses */}
      <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Home fontSize="small" className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Saved addresses
            </h2>
            {addresses.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {addresses.length}
              </span>
            )}
          </div>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Refresh"
          >
            <Refresh fontSize="small" />
            Refresh
          </button>
        </div>
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Home className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No addresses saved
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Addresses you save during checkout will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {addresses.map((addr) => (
              <li key={addr._id?.toString()} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {addr.street}, {addr.city}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {addr.state} {addr.postalCode}, {addr.country}
                    </p>
                  </div>
                  {addr.isDefault && (
                    <span className="inline-flex flex-none items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                      Default
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payment Methods */}
      <section className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <CreditCard fontSize="small" className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Payment methods
            </h2>
            {paymentMethods.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {paymentMethods.length}
              </span>
            )}
          </div>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Refresh"
          >
            <Refresh fontSize="small" />
            Refresh
          </button>
        </div>
        {paymentMethods.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CreditCard className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No payment methods saved
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cards you save during checkout will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {paymentMethods.map((method: any) => (
              <li key={method._id?.toString()} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {method.details?.cardType || "Card"} ••••{" "}
                      {method.details?.last4}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Expires {method.details?.expiryMonth}/
                      {method.details?.expiryYear}
                    </p>
                  </div>
                  {method.isDefault && (
                    <span className="inline-flex flex-none items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                      Default
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sign out confirmation */}
      {isSignOutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => {
            if (!isSigningOut) setIsSignOutOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
        >
          <div
            className="w-full rounded-t-2xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Logout fontSize="small" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="signout-title"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  Sign out?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&apos;ll need to sign in again to access your profile and
                  orders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSigningOut) setIsSignOutOpen(false);
                }}
                disabled={isSigningOut}
                className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                <Close fontSize="small" />
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSignOutOpen(false)}
                disabled={isSigningOut}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSigningOut && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground" />
                )}
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
