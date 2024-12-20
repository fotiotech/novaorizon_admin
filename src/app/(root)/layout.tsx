import { AdminLayout } from "@/components";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={` `}>
      <AdminLayout>{children}</AdminLayout>
    </div>
  );
}
