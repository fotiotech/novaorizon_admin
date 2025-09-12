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
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
          </div>
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

        <main className="flex-1 overflow-auto p-2 md:p-6 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
