// components/theme-provider.tsx
"use client";

import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import theme from "@/lib/mui-theme";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </NextThemesProvider>
  );
}
