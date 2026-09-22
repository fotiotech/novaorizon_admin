// src/components/SectionLayout.tsx
"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SectionLink {
  name: string;
  href: string;
  icon?: ReactNode;
}

interface SectionLayoutProps {
  title: string;
  children: ReactNode;
  links?: SectionLink[]; // optional sub-navigation links
}

const SectionLayout: React.FC<SectionLayoutProps> = ({
  title,
  children,
  links = [],
}) => {
  const pathname = usePathname();

  return (
    <div>
      {/* Content container */}
      <div className="text-card-foreground">{children}</div>
    </div>
  );
};

export default SectionLayout;
