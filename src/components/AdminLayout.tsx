"use client";

import React, { ReactNode, useEffect, useState } from "react";
import useClickOutside, { useScreenSize } from "@/components/Hooks";
import AdminSideBar from "./AdminSideBar";
import AdminTopBar from "./AdminTopBar";
import { useSession } from "next-auth/react";

// Extend the User type to include 'role'
declare module "next-auth" {
  interface User {
    role?: string;
  }
}
import { useRouter } from "next/navigation";
import Spinner from "./Spinner";

interface adminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: adminLayoutProps) => {
  const [sideBarToggle, setSideBarToggle] = useState(false);
  const [screenSize, setScreenSize] = useState(0);
  const { data: session, status } = useSession();
  const router = useRouter();

  const domNode = useClickOutside(() => {
    setSideBarToggle(false);
  });

  useScreenSize(() => {
    setScreenSize(window.innerWidth);
  });

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
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session || !session.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className=" flex h-screen overflow-hidden bg-gray-100 dark:bg-sec-dark text-pri ">
      <AdminSideBar
        domNode={domNode}
        sideBarToggle={sideBarToggle}
        setSideBarToggle={setSideBarToggle}
        screenSize={screenSize}
      />

      <div className="flex-1 flex flex-col overflow-hidden whitespace-nowrap ml-0">
        <AdminTopBar
          domNode={domNode}
          sideBarToggle={sideBarToggle}
          setSideBarToggle={setSideBarToggle}
          screenSize={screenSize}
        />

        <div className="flex-1 overflow-auto scrollbar-none p-6  text-sec dark:text-pri">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
