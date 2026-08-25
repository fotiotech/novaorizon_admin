"use client";

import React, { useMemo, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Provider as ReduxProvider } from "react-redux";
import { UserDataProvider } from "./context/UserDataContext"; // 👈 Import the new provider
import { CartProvider } from "./context/CartContext";
import { store, persistor } from "./store/store";
import { PersistGate } from "redux-persist/integration/react";

interface ProviderProps {
  children: ReactNode;
}

const Providers = ({ children }: ProviderProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ReduxProvider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <CartProvider>
              <UserDataProvider>{children}</UserDataProvider>
            </CartProvider>
          </PersistGate>
        </ReduxProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
};

export default Providers;
