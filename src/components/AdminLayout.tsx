"use client";

import React, { ReactNode, useState, useEffect } from "react";
import useClickOutside, { useScreenSize } from "@/components/Hooks";
import AdminSideBar from "./AdminSideBar";
import AdminTopBar from "./AdminTopBar";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sideBarToggle, setSideBarToggle] = useState(false);
  const [screenSize, setScreenSize] = useState<number | null>(null);

  const domNode = useClickOutside(() => {
    if (screenSize && screenSize < 1024) { // Only close on mobile
      setSideBarToggle(false);
    }
  });

  // Improved screen size handling
  useEffect(() => {
    const handleResize = () => setScreenSize(window.innerWidth);
    
    // Set initial size
    setScreenSize(window.innerWidth);
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-sec-dark text-pri">
      <AdminSideBar
        domNode={domNode}
        sideBarToggle={sideBarToggle}
        setSideBarToggle={setSideBarToggle}
        screenSize={screenSize ?? 0}
      />

      <div className="flex-1 flex flex-col overflow-hidden whitespace-nowrap ml-0">
        <AdminTopBar
          sideBarToggle={sideBarToggle}
          setSideBarToggle={setSideBarToggle}
          screenSize={screenSize ?? 0}
        />

        <main className="flex-1 overflow-auto p-6 text-sec dark:text-pri">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;