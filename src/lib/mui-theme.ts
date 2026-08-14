// lib/mui-theme.ts
import { createTheme } from "@mui/material/styles";

// Palette uses static hex values (light mode colors).
// Component overrides use CSS variables (var(--...)) so they react to .dark class.
const theme = createTheme({
  palette: {
    mode: "light", // we are not toggling MUI's mode, we rely on CSS vars
    primary: {
      main: "#3b82f6", // pri-500
      light: "#60a5fa", // pri-400
      dark: "#2563eb", // pri-600
    },
    secondary: {
      main: "#f97316", // sec-500
      light: "#fb923c", // sec-400
      dark: "#ea580c", // sec-600
    },
    error: {
      main: "#ef4444", // destructive
    },
    warning: {
      main: "#f97316", // sec-500
    },
    info: {
      main: "#3b82f6", // pri-500
    },
    success: {
      main: "#22c55e", // thir-500
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    text: {
      primary: "#000000",
      secondary: "#6b7280",
    },
  },
  components: {
    // StepLabel label – uses CSS variable for text color
    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: "var(--foreground) !important",
        },
      },
    },
    // StepIcon – uses CSS variables for active/completed states
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: "var(--muted-foreground) !important", // inactive steps
          "&.Mui-active": {
            color: "var(--pri-500) !important",
          },
          "&.Mui-completed": {
            color: "var(--thir-500) !important",
          },
        },
      },
    },
    // Alerts – use CSS variables for background and text
    MuiAlert: {
      styleOverrides: {
        standardError: {
          backgroundColor: "var(--destructive) !important",
          color: "var(--destructive-foreground) !important",
        },
        standardSuccess: {
          backgroundColor: "var(--thir-500) !important",
          color: "white !important",
        },
        standardWarning: {
          backgroundColor: "var(--sec-500) !important",
          color: "white !important",
        },
        standardInfo: {
          backgroundColor: "var(--pri-500) !important",
          color: "white !important",
        },
      },
    },
    // Snackbar – use card background/text variables
    MuiSnackbar: {
      styleOverrides: {
        root: {
          "& .MuiSnackbarContent-root": {
            backgroundColor: "var(--card)",
            color: "var(--card-foreground)",
          },
        },
      },
    },
  },
});

export default theme;
