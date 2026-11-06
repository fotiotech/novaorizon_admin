import AdminLayout from "@/components/AdminLayout";
import { Toaster } from "react-hot-toast";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/authz";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Defense in depth: the proxy also redirects non-admins, but every
  // admin page is gated again at the server boundary.
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "admin") redirect("/auth/unauthorized");

  return (
    <AdminLayout>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#1f2937",
            color: "#f9fafb",
            borderRadius: "0.5rem",
          },
          success: {
            iconTheme: { primary: "#6366f1", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#fff" },
          },
        }}
      />
    </AdminLayout>
  );
}
