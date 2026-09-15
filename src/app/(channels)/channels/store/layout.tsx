"use client";

import React from "react";

import SectionLayout from "@/components/SectionLayout";

const navItems = [
  { name: "Pages", href: "/channels/store/pages" },
  { name: "Posts", href: "/channels/store/posts" },
  { name: "Media", href: "/channels/store/media" },
  { name: "Blog", href: "/channels/store/blog" },
  { name: "Tags", href: "/channels/store/tags" },
  { name: "FAQs", href: "/channels/store/faqs" },
];

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionLayout title="Store" links={navItems}>
      {children}
    </SectionLayout>
  );
}
