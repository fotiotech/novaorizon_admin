"use client";

import React, { useMemo, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as ReduxProvider } from "react-redux";
import { UserDataProvider } from "./context/UserDataContext"; // 👈 Import the new provider
import { CartProvider } from "./context/CartContext";
import { store, persistor } from "./store/store";
import { PersistGate } from "redux-persist/integration/react";
import { AuthProvider } from "@/hooks/useAuth";

interface ProviderProps {
  children: ReactNode;
}

const Providers = ({ children }: ProviderProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ReduxProvider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <UserDataProvider>
              {/* <CartProvider></CartProvider> */}
              {children}
            </UserDataProvider>
          </PersistGate>
        </ReduxProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default Providers;