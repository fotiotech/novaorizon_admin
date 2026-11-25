"use client";

import React, { useMemo, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserDataProvider } from "./context/UserDataContext"; // 👈 Import the new provider
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "@/hooks/useAuth";

interface ProviderProps {
  children: ReactNode;
}

const Providers = ({ children }: ProviderProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <UserDataProvider>{children}</UserDataProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default Providers;