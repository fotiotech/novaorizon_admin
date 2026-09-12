"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

export function MuiThemeBridge({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () =>
      setMode(root.classList.contains("dark") ? "dark" : "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          background: {
            default: "transparent",
            paper: mode === "dark" ? "#1f2937" : "#ffffff",
          },
          primary: { main: "#6366f1" },
          error: { main: "#ef4444" },
          warning: { main: "#f59e0b" },
          success: { main: "#10b981" },
        },
      }),
    [mode],
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
