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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {children}
    </div>
  );
};

export const DialogContent = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
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
  <button onClick={onClick} className="btn">
    {children}
  </button>
);
