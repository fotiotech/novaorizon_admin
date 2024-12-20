"use client";

import React, { ReactNode, useState } from "react";
import useClickOutside, { useScreenSize } from "@/components/Hooks";
import AdminSideBar from "./AdminSideBar";
import AdminTopBar from "./AdminTopBar";

interface adminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: adminLayoutProps) => {
  const [sideBarToggle, setSideBarToggle] = useState(false);
  const [screenSize, setScreenSize] = useState(0);

  const domNode = useClickOutside(() => {
    setSideBarToggle(false);
  });

  useScreenSize(() => {
    setScreenSize(window.innerWidth);
  });

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-sec-dark">
      <AdminSideBar
        domNode={domNode}
        sideBarToggle={sideBarToggle}
        setSideBarToggle={setSideBarToggle}
        screenSize={screenSize}
      />

      <div
        className="flex-1
         text-sec dark:text-pri flex flex-col"
      >
        <AdminTopBar
          domNode={domNode}
          sideBarToggle={sideBarToggle}
          setSideBarToggle={setSideBarToggle}
          screenSize={screenSize}
        />

        <div
          className="flex-1 overflow-auto  p-2
         text-sec dark:text-pri "
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
