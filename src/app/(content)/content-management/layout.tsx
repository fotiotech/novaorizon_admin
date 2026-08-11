import React from "react";

type Props = {
  children: React.ReactNode;
};

export const metadata = {
  title: "Content Management",
  description: "Manage pages, posts and media",
};

export default function ContentLayout({ children }: Props) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 260,
          background: "#0f172a",
          color: "#fff",
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          Content
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a
            href="/content/pages"
            style={{ color: "#cbd5e1", textDecoration: "none" }}
          >
            Pages
          </a>
          <a
            href="/content/posts"
            style={{ color: "#cbd5e1", textDecoration: "none" }}
          >
            Posts
          </a>
          <a
            href="/content/media"
            style={{ color: "#cbd5e1", textDecoration: "none" }}
          >
            Media
          </a>
          <a
            href="/content/categories"
            style={{ color: "#cbd5e1", textDecoration: "none" }}
          >
            Categories
          </a>
          <a
            href="/content/tags"
            style={{ color: "#cbd5e1", textDecoration: "none" }}
          >
            Tags
          </a>
        </nav>
      </aside>

      <main
        style={{
          flex: 1,
          background: "#f8fafc",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>Content Management</h1>
          <div style={{ color: "#475569" }}>Admin</div>
        </header>

        <section
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 16,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          {children}
        </section>
      </main>
    </div>
  );
}
