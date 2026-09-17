"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { getUserAddresses } from "@/app/actions/address";
import { getUserPaymentMethods } from "@/app/actions/payment";
import { getUserProfile } from "@/app/actions/users";
import { IAddress } from "@/models/Address";
import { IPaymentMethod } from "@/models/PaymentMethod";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

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

  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    whatsapp?: boolean;
  };

  marketing?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    whatsapp?: boolean;
    productRecommendations?: boolean;
  };

  orderUpdates?: boolean;
  priceDropAlerts?: boolean;
  backInStockAlerts?: boolean;
  newsletter?: boolean;
}

export interface IUserProfile {
  _id?: string;
  // `name` removed — User model now only has `fullName`
  fullName?: string | null;
  email?: string;
  image?: string | null;
  phone?: IPhone;
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
  user: any;
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

  // Only `fullName` now — plus the first+last rule for consistency
  // with the server-side validation.
  const parts = (profile.fullName ?? "").trim().split(/\s+/).filter(Boolean);
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
  const { data: session, status } = useSession();
  const user = session?.user;

  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
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
      const [prof, addrs, methods] = await Promise.all([
        getUserProfile(),
        getUserAddresses(),
        getUserPaymentMethods(),
      ]);
      setProfile((prof as IUserProfile) ?? null);
      setAddresses(addrs);
      setPaymentMethods(methods);
    } catch (err: any) {
      setError(err.message || "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when user changes or session becomes available
  useEffect(() => {
    if (status === "loading") return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, status]);

  const value: UserDataContextValue = {
    user,
    profile,
    phone: profile?.phone,
    preferences: profile?.preferences,
    profileCompletion: calculateCompletion(profile),

    addresses,
    paymentMethods,

    loading: loading || status === "loading",
    error,
    refetch: fetchData,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
}
