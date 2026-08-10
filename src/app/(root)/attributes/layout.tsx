"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function AttributesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`bg-gray-800 text-white transition-all duration-300 ${
          isOpen ? "w-64" : "w-16"
        } flex flex-col`}
      >
        {/* Toggle button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className={`font-bold ${isOpen ? "block" : "hidden"}`}>
            Attribute Manager
          </h2>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-gray-700 transition"
            aria-label="Toggle sidebar"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/attributes"
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition"
          >
            <span>📋</span>
            <span className={isOpen ? "block" : "hidden"}>Attributes</span>
          </Link>
          <Link
            href="/attributes/group"
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition"
          >
            <span>📂</span>
            <span className={isOpen ? "block" : "hidden"}>Groups</span>
          </Link>
          <Link
            href="/attributes/sets"
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition"
          >
            <span>📦</span>
            <span className={isOpen ? "block" : "hidden"}>Sets</span>
          </Link>
          <Link
            href="/attributes/units"
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition"
          >
            <span>📏</span>
            <span className={isOpen ? "block" : "hidden"}>Units</span>
          </Link>
          <hr className="border-gray-600 my-2" />
          <Link
            href="/categories/groupsets"
            className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition"
          >
            <span>🔗</span>
            <span className={isOpen ? "block" : "hidden"}>
              Category Mapping
            </span>
          </Link>
        </nav>
      </aside>

      {/* Main content – capped width, centered */}
      <main
        className={`flex-1 bg-gray-100 dark:bg-gray-900 min-h-screen transition-all duration-300`}
      >
        {children}
      </main>
    </div>
  );
}
