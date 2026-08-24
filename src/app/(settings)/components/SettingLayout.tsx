// app/settings/layout.tsx
"use client";

import AdminTopBar from "@/components/AdminTopBar";
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
import { useState, useEffect } from "react";

const settingsLinks = [
  { name: "General Settings", href: "/settings/general" },
  { name: "Users", href: "/settings/users" },
  { name: "Payments", href: "/settings/payments" },
  { name: "Shipping", href: "/settings/shipping" },
  { name: "Tax Configuration", href: "/settings/tax" },
  { name: "Localization", href: "/settings/local" },
  { name: "Finances", href: "/settings/finances" },
  { name: "Returns", href: "/settings/returns" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sideBarToggle, setSideBarToggle] = useState(false);
  const [screenSize, setScreenSize] = useState(0);

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
        <AdminTopBar
          sideBarToggle={sideBarToggle}
          setSideBarToggle={setSideBarToggle}
          screenSize={screenSize}
        />
        <div className="p-2 lg:p-6">
          <SectionLayout title="Settings" links={settingsLinks}>
            {children}
          </SectionLayout>
        </div>
      </body>
    </html>
  );
}
