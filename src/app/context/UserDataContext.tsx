"use client";

import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/* -------------------------------------------------------------------------- */
/*                              Client-side types                             */
/*                                                                            */
/* The original file imported `IAddress` and `IPaymentMethod` from Mongoose   */
/* models — fine in a Next.js full-stack repo where the frontend and backend  */
/* are one package, but this frontend is separate from `server/`. Importing   */
/* a model file here pulls in mongoose at bundle time. These are the JSON     */
/* shapes that come back from `/api/addresses` and `/api/payment-methods`.    */
/* -------------------------------------------------------------------------- */

export interface IAddress {
  _id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPaymentMethod {
  _id: string;
  userId: string;
  methodType: "CreditCard" | "MobileMoney" | "PayPal";
  details: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface IPhone {
  countryCode?: string | null;
  number?: string | null;
  e164?: string | null;
}

export interface IPreferences {
  language?: string;
  currency?: string;
  theme?: "light" | "dark" | "system";
  timezone?: string;
  country?: string | null;

  /** Service notifications — order/account messages. */
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    whatsapp?: boolean;
  };

  /** Marketing consent. `email` is the canonical newsletter opt-in. */
  marketing?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    whatsapp?: boolean;
    productRecommendations?: boolean;
  };

  priceDropAlerts?: boolean;
  backInStockAlerts?: boolean;

  /** Consent audit trail. */
  consentedAt?: string | null;
  unsubscribedAt?: string | null;
}

export type Gender = "male" | "female" | "other" | "prefer_not_to_say" | null;

export interface IUserProfile {
  _id?: string;
  name?: string | null;
  email?: string;
  image?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender;
  phone?: IPhone;
  phoneVerified?: boolean;
  preferences?: IPreferences;
  profileCompleted?: boolean;
  onboardingCompleted?: boolean;
  role?: string;
  status?: string;
}

export interface ProfileCompletion {
  hasName: boolean;
  hasPhone: boolean;
  hasAvatar: boolean;
  hasPreferences: boolean;
  completed: boolean;
  percentage: number;
  missing: Array<"name" | "phone" | "avatar" | "preferences">;
}

export interface UserDataContextValue {
  /**
   * Auth identity from the JWT. `id` matches `profile._id`.
   * Not the full DB row — for that, use `profile`.
   */
  user: ReturnType<typeof useAuth>["user"];
  profile: IUserProfile | null;
  phone: IPhone | undefined;
  preferences: IPreferences | undefined;
  profileCompletion: ProfileCompletion;

  addresses: IAddress[];
  paymentMethods: IPaymentMethod[];

  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function calculateCompletion(profile: IUserProfile | null): ProfileCompletion {
  if (!profile) {
    return {
      hasName: false,
      hasPhone: false,
      hasAvatar: false,
      hasPreferences: false,
      completed: false,
      percentage: 0,
      missing: ["name", "phone", "avatar", "preferences"],
    };
  }

  // First + last name rule, consistent with the server-side validation.
  const parts = (profile.name ?? "").trim().split(/\s+/).filter(Boolean);
  const hasName = parts.length >= 2;

  const hasPhone = Boolean(profile.phone?.number?.trim?.());
  const hasAvatar = Boolean(profile.image);
  const hasPreferences = Boolean(
    profile.preferences?.language &&
    profile.preferences?.currency &&
    profile.preferences?.theme,
  );

  const checks: Array<[ProfileCompletion["missing"][number], boolean]> = [
    ["name", hasName],
    ["phone", hasPhone],
    ["avatar", hasAvatar],
    ["preferences", hasPreferences],
  ];

  const done = checks.filter(([, ok]) => ok).length;
  const missing = checks.filter(([, ok]) => !ok).map(([k]) => k);

  return {
    hasName,
    hasPhone,
    hasAvatar,
    hasPreferences,
    completed: done === checks.length,
    percentage: Math.round((done / checks.length) * 100),
    missing,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 Context                                    */
/* -------------------------------------------------------------------------- */

const UserDataContext = createContext<UserDataContextValue | undefined>(
  undefined,
);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * `user?.id` is the only dep — we don't want to refetch when the user's
   * display name or image updates but their identity hasn't changed.
   */
  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setAddresses([]);
      setPaymentMethods([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Three requests in parallel. Cookie travels automatically
      // (`withCredentials: true` on the shared `api` client).
      const [profRes, addrsRes, methodsRes] = await Promise.all([
        api.get<{ data: IUserProfile }>("/users/me"),
        api.get<{ data: IAddress[] }>("/addresses"),
        api.get<{ data: IPaymentMethod[] }>("/payment-methods"),
      ]);

      setProfile(profRes.data.data ?? null);
      setAddresses(addrsRes.data.data ?? []);
      setPaymentMethods(methodsRes.data.data ?? []);
    } catch (err: any) {
      // A 401 here means the cookie expired between mount and fetch
      // (edge case: page was open for 30+ days). Clear profile state
      // so the UI reflects "logged out" rather than stale data.
      if (err?.response?.status === 401) {
        setProfile(null);
        setAddresses([]);
        setPaymentMethods([]);
        setError(null);
      } else {
        setError(
          err?.response?.data?.error ??
            err?.message ??
            "Failed to load user data",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Re-fetch when the auth identity changes — login, logout, or user swap.
  // Wait for `authLoading` to settle first so we don't fire against the
  // /auth/me probe that useAuth is still resolving.
  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [fetchData, authLoading]);

  const value: UserDataContextValue = {
    user,
    profile,
    phone: profile?.phone,
    preferences: profile?.preferences,
    profileCompletion: calculateCompletion(profile),

    addresses,
    paymentMethods,

    loading: loading || authLoading,
    error,
    refetch: fetchData,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

/**
 * Standard hook — throws if used outside a UserDataProvider.
 * Use this in authenticated surfaces (profile, dashboard, etc.).
 */
export function useUserData(): UserDataContextValue {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
}

/**
 * Non-throwing variant — returns null if no provider is mounted.
 * Use this in shared UI (footer, header) that may render on public routes.
 */
export function useUserDataOptional(): UserDataContextValue | null {
  return useContext(UserDataContext) ?? null;
}
