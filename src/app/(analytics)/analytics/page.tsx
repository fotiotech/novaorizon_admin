"use client";

import React from "react";

const sampleData = [50, 75, 40, 90, 65, 30, 80];

function SimpleBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "end", height: 160 }}>
      {data.map((v, i) => (
        <div
          key={i}
          title={`${v}`}
          style={{
            width: 28,
            background: "linear-gradient(180deg,#60a5fa,#3b82f6)",
            height: `${(v / max) * 100}%`,
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <main
      style={{
        padding: 24,
        fontFamily: "Segoe UI, Roboto, system-ui, sans-serif",
      }}
    >
      <h1 style={{ margin: 0, marginBottom: 12 }}>Analytics</h1>

      <section
        style={{
          background: "#fff",
          padding: 16,
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          maxWidth: 880,
        }}
      >
        <h2 style={{ fontSize: 14, margin: "0 0 12px 0", color: "#334155" }}>
          Overview
        </h2>

        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>1,248</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Active users (last 30 days)
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <SimpleBarChart data={sampleData} />
          </div>
        </div>
      </section>
    </main>
  );
}
