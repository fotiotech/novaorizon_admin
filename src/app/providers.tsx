"use client";

import React, { useMemo, ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Provider as ReduxProvider } from "react-redux";
import { UserProvider } from "./context/UserContext";
import { CartProvider } from "./context/CartContext";
import { store } from "./store/store";

interface ProviderProps {
  children: ReactNode;
}

const Providers = ({ children }: ProviderProps) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <SessionProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ReduxProvider store={store}>
            {/* <PersistGate loading={null} persistor={persistor}> */}
            <CartProvider>
              <UserProvider>{children}</UserProvider>
            </CartProvider>
            {/* </PersistGate> */}
          </ReduxProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </SessionProvider>
  );
};

export default Providers;
