"use client";

import React from "react";

export default function MarketingPage() {
  return (
    <div className="bg-background text-foreground">
      <header className="border-b border-border bg-card/80 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <h1 className="text-3xl font-bold sm:text-4xl">Marketing</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Manage your marketing campaigns and strategies
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              📊
            </div>
            <h3 className="mb-2 text-lg font-semibold">Campaigns</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage marketing campaigns
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-2xl">
              📈
            </div>
            <h3 className="mb-2 text-lg font-semibold">Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track performance and insights
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl">
              👥
            </div>
            <h3 className="mb-2 text-lg font-semibold">Audience</h3>
            <p className="text-sm text-muted-foreground">
              Manage and segment your audience
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
