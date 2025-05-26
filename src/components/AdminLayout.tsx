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
    <div className=" flex h-screen overflow-hidden bg-gray-100 dark:bg-sec-dark">
      <AdminSideBar
        domNode={domNode}
        sideBarToggle={sideBarToggle}
        setSideBarToggle={setSideBarToggle}
        screenSize={screenSize}
      />

      <div
        className="flex-1 flex flex-col overflow-hidden ml-0"
      >
        <AdminTopBar
          domNode={domNode}
          sideBarToggle={sideBarToggle}
          setSideBarToggle={setSideBarToggle}
          screenSize={screenSize}
        />

        <div className="flex-1 overflow-auto scrollbar-none p-6 text-sec dark:text-pri">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
