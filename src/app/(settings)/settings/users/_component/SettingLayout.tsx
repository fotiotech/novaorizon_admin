// app/settings/layout.tsx
import AdminSideBar from "@/components/AdminSideBar";
import SectionLayout from "@/components/SectionLayout";
import {
  AttachMoney,
  LocalShipping,
  ManageAccounts,
  Payment,
  Receipt,
  Replay,
  Room,
  Settings,
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

const settingsLinks = [
  { name: "General Settings", href: "/general", icon: <Settings /> },
  { name: "Users", href: "/users", icon: <ManageAccounts /> },
  { name: "Payments", href: "/payments", icon: <Payment /> },
  { name: "Shipping", href: "/shipping", icon: <LocalShipping /> },
  { name: "Tax Configuration", href: "/tax", icon: <Receipt /> },
  { name: "Localization", href: "/local", icon: <Room /> },
  { name: "Finances", href: "/finances", icon: <AttachMoney /> },
  { name: "Returns", href: "/returns", icon: <Replay /> },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sideBarToggle, setSideBarToggle] = useState(false);
  const [screenSize, setScreenSize] = useState(0);
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleClickOutside = () => {
    if (screenSize <= 1024) setSideBarToggle(false);
  };

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => setScreenSize(window.innerWidth);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <html lang="en">
      <body>
        <AdminSideBar
          sideBarToggle={sideBarToggle}
          setSideBarToggle={setSideBarToggle}
          screenSize={screenSize}
        />
        <SectionLayout title="Settings" links={settingsLinks}>
          {children}
        </SectionLayout>
      </body>
    </html>
  );
}
