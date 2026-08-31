// Dialog.tsx
import React from "react";

export const Dialog = ({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      {children}
    </div>
  );
};

export const DialogContent = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl sm:p-6">
    {children}
  </div>
);

export const DialogTrigger = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
  >
    {children}
  </button>
);
