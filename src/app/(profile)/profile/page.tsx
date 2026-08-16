"use client";

import { useUserData } from "@/app/context/UserDataContext";

export default function ProfilePage() {
  const { user, addresses, paymentMethods, loading, error, refetch } =
    useUserData();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-destructive mb-4">Error: {error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-muted-foreground">
          Please log in to view your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information, addresses, and payment methods.
        </p>
      </div>

      <section className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Name
            </label>
            <p className="mt-1 text-foreground">
              {user.name || "Not provided"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <p className="mt-1 text-foreground">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Saved Addresses
          </h2>
          <button
            onClick={refetch}
            className="text-sm text-primary hover:underline"
          >
            Refresh
          </button>
        </div>
        {addresses.length === 0 ? (
          <p className="text-muted-foreground">No addresses saved.</p>
        ) : (
          <ul className="divide-y divide-border">
            {addresses.map((addr) => (
              <li
                key={addr._id?.toString()}
                className="py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {addr.street}, {addr.city}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {addr.state} {addr.postalCode}, {addr.country}
                  </p>
                  {addr.isDefault && (
                    <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-card border border-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Payment Methods
          </h2>
          <button
            onClick={refetch}
            className="text-sm text-primary hover:underline"
          >
            Refresh
          </button>
        </div>
        {paymentMethods.length === 0 ? (
          <p className="text-muted-foreground">No payment methods saved.</p>
        ) : (
          <ul className="divide-y divide-border">
            {paymentMethods.map((method: any) => (
              <li
                key={method._id?.toString()}
                className="py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {method.details?.cardType || "Card"} ••••{" "}
                    {method.details?.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires {method.details?.expiryMonth}/
                    {method.details?.expiryYear}
                  </p>
                  {method.isDefault && ( // if you have an isDefault field
                    <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
