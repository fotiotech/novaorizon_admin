// components/AdminLayout.tsx
"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminSideBar from "./AdminSideBar";
import AdminTopBar from "./AdminTopBar";

// Extend the User type to include 'role'
declare module "next-auth" {
  interface User {
    role?: string;
  }
}

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
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

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    // Check if user has admin role
    if (!session.user || session.user.role !== "admin") {
      router.push("/auth/unauthorized");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading novaorizon...</p>
        </div>
      </div>
    );
  }

  if (!session || !session.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <AdminSideBar
        sideBarToggle={sideBarToggle}
        setSideBarToggle={setSideBarToggle}
        screenSize={screenSize}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopBar
          sideBarToggle={sideBarToggle}
          setSideBarToggle={setSideBarToggle}
          screenSize={screenSize}
        />

        <main className="flex-1 overflow-auto p-2 md:p-6 m-2 rounded-lg">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
