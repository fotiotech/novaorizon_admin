import React, { LegacyRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Person2 } from "@mui/icons-material";

interface MenuLink {
  name: string;
  href: string;
  icon?: React.ReactNode;
}

interface MenuSection {
  title: string;
  links: MenuLink[];
}

interface AdminSideBarProps {
  domNode?: LegacyRef<HTMLDivElement>;
  sideBarToggle: boolean;
  screenSize: number;
  setSideBarToggle: (open: boolean) => void;
}

const menuConfig: MenuSection[] = [
  {
    title: "Dashboard",
    links: [
      { name: "Overview", href: "/" },
      { name: "Reports", href: "/reports" },
    ],
  },
  {
    title: "Products",
    links: [
      { name: "All Products", href: "/products/products_list" },
      { name: "List Product", href: "/products/list_product" },
      { name: "Categories & Subcategories", href: "/categories" },
      { name: "Brands", href: "/brands" },
      { name: "Attributes & Tags", href: "/attributes" },
      { name: "Inventory", href: "/inventory" },
    ],
  },
  {
    title: "Orders",
    links: [
      { name: "All Orders", href: "/orders" },
      { name: "Pending Orders", href: "/pending_orders" },
      { name: "Shipped Orders", href: "/shipped_orders" },
      { name: "Completed Orders", href: "/completed_orders" },
      { name: "Returns", href: "/returns" },
    ],
  },
  // ...other sections omitted for brevity
  {
    title: "Users",
    links: [
      { name: "Admin Users", href: "/users", icon: <Person2 /> },
      { name: "Permissions & Roles", href: "/permissions_roles" },
    ],
  },
];

const AdminSideBar: React.FC<AdminSideBarProps> = ({
  domNode,
  sideBarToggle,
  screenSize,
  setSideBarToggle,
}) => {
  const pathname = usePathname();
  const open = "absolute z-10 left-0 ";
  const hide = " absolute -left-full z-10";

  const handleClose = () => {
    if (screenSize <= 1024) setSideBarToggle(false);
  };

  return (
    <aside
      ref={domNode}
      className={`${
        screenSize <= 1024 ? (sideBarToggle ? open : hide) : ""
      } w-3/4 lg:w-64 md:w-1/2 shadow overflow-y-auto scrollbar-none bg-pri 
        border-r border-gray-800 dark:bg-pri-dark
         text-sec dark:text-pri`}
    >
      <div className="p-4 flex items-center justify-between lg:justify-center">
        <Link href="/">
          <Image src="/logo.png" alt="logo" width={60} height={40} />
        </Link>
        {screenSize <= 1024 && (
          <button onClick={handleClose} className="lg:hidden text-xl">
            ✕
          </button>
        )}
      </div>
      <nav className="p-4 space-y-6 ">
        {menuConfig.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={handleClose}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                      pathname === link.href || pathname.startsWith(link.href)
                        ? "bg-gray-300 dark:bg-gray-600"
                        : ""
                    }`}
                  >
                    {link.icon}
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSideBar;
