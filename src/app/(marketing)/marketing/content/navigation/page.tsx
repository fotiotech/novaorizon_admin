// app/marketing/content/page.tsx
"use client";

import Link from "next/link";
import React from "react";
import {
  ArrowForward,
  Menu as MenuIcon,
  Collections,
  Layers,
  Image as ImageIcon,
  Campaign,
} from "@mui/icons-material";

const ContentMerchandising = () => {
  const menuExamples = [
    "Navigation menus",
    "Header menus",
    "Footer menus",
    "Category menus",
    "Promotional menus",
  ];

  const collectionExamples = [
    "Seasonal collections",
    "Product category groups",
    "Featured products",
    "Sale items",
    "New arrivals",
  ];

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      {/* ---------------- Primary actions ---------------- */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Menus card */}
        <div className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MenuIcon fontSize="small" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Menus</h2>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Create and manage navigation menus to organize your store's content
            and guide customers.
          </p>

          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Examples
            </p>
            <div className="flex flex-wrap gap-1.5">
              {menuExamples.map((example) => (
                <span
                  key={example}
                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {example}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Link
              href="/marketing/content/navigation/menus"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Manage Menus
              <ArrowForward sx={{ fontSize: 16 }} />
            </Link>
          </div>
        </div>

        {/* Collections card */}
        <div className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Collections fontSize="small" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Collections
              </h2>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Organize products into collections with custom rules to showcase
            related items together.
          </p>

          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Examples
            </p>
            <div className="flex flex-wrap gap-1.5">
              {collectionExamples.map((example) => (
                <span
                  key={example}
                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {example}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Link
              href="/marketing/content/navigation/collection"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Manage Collections
              <ArrowForward sx={{ fontSize: 16 }} />
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------- Features ---------------- */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Merchandising features
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tools that help you surface the right products to the right
            customers.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <Layers sx={{ fontSize: 16 }} className="text-primary" />
              <h3 className="text-xs font-semibold text-foreground">
                Dynamic Product Grouping
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatically group products based on attributes, categories, or
              custom rules.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <ImageIcon sx={{ fontSize: 16 }} className="text-primary" />
              <h3 className="text-xs font-semibold text-foreground">
                Visual Merchandising
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Showcase products with custom images, banners, and promotional
              content.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <Campaign sx={{ fontSize: 16 }} className="text-primary" />
              <h3 className="text-xs font-semibold text-foreground">
                Seasonal Campaigns
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Create time-limited collections and menus for holidays and special
              events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentMerchandising;
