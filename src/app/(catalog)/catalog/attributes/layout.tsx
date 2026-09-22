// app/catalog/attributes/layout.tsx
// Sub-navigation for attributes now lives in the sidebar (menu-config).
// This layout is a pass-through — delete it if you don't need a wrapper.

export default function AttributesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
