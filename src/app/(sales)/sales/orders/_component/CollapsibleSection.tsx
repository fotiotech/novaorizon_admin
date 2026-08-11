"use client";

import { useState } from "react";

export const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-border last:border-b-0 pb-4 last:pb-0">
      <button
        title="title"
        className="flex justify-between items-center w-full text-left focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-lg sm:text-xl font-semibold text-muted-foreground">
          {title}
        </h2>
        <span className="text-lg">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </section>
  );
};
