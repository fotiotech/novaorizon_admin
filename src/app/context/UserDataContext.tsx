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
import { IAddress } from "@/models/Address";
import { IPaymentMethod } from "@/models/PaymentMethod";

// ---------- Types ----------
interface UserDataContextValue {
  user: any; // session.user
  addresses: IAddress[];
  paymentMethods: IPaymentMethod[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ---------- Context ----------
const UserDataContext = createContext<UserDataContextValue | undefined>(
  undefined,
);

// ---------- Provider ----------
export function UserDataProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const user = session?.user;

  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.id) {
      setAddresses([]);
      setPaymentMethods([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [addrs, methods] = await Promise.all([
        getUserAddresses(),
        getUserPaymentMethods(),
      ]);
      setAddresses(addrs);
      setPaymentMethods(methods);
    } catch (err: any) {
      setError(err.message || "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  // Re‑fetch when user changes or session becomes available
  useEffect(() => {
    if (status === "loading") return;
    fetchData();
  }, [user?.id, status]);

  const value: UserDataContextValue = {
    user,
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

// ---------- Hook ----------
export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
}
