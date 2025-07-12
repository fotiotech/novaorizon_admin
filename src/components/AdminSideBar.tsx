import React, { LegacyRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Assignment,
  BarChart,
  Category,
  CheckCircle,
  CollectionsBookmark,
  Dashboard,
  Discount,
  Group,
  Inventory,
  ListAlt,
  LocalShipping,
  Person2,
  Replay,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
} from "@mui/icons-material";

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

const menuConfig = [
  {
    title: "Dashboard",
    links: [
      { name: "Overview", href: "/overview", icon: <Dashboard /> },
      { name: "Reports", href: "/reports", icon: <BarChart /> },
      {
        name: "Collection",
        href: "/collection",
        icon: <CollectionsBookmark />,
      },
    ],
  },
  {
    title: "Users",
    links: [
      { name: "Admin Users", href: "/users", icon: <Person2 /> },
      {
        name: "Permissions & Roles",
        href: "/permissions_roles",
        icon: <Group />,
      },
    ],
  },
  {
    title: "Products",
    links: [
      {
        name: "All Products",
        href: "/products/products_list",
        icon: <ShoppingCart />,
      },
      {
        name: "List Product",
        href: "/products/list_product",
        icon: <ListAlt />,
      },
      { name: "Category", href: "/categories", icon: <Category /> },
      { name: "Brands", href: "/brands", icon: <Tag /> },
      { name: "Attributes & Tags", href: "/attributes", icon: <Assignment /> },
      { name: "Inventory", href: "/inventory", icon: <Inventory /> },
    ],
  },
  {
    title: "Orders",
    links: [
      { name: "All Orders", href: "/orders", icon: <ShoppingBag /> },
      { name: "Pending Orders", href: "/pending_orders", icon: <Assignment /> },
      {
        name: "Shipped Orders",
        href: "/shipped_orders",
        icon: <LocalShipping />,
      },
      {
        name: "Completed Orders",
        href: "/completed_orders",
        icon: <CheckCircle />,
      },
      { name: "Returns", href: "/returns", icon: <Replay /> },
    ],
  },
  {
    title: "Shipping",
    links: [{ name: "Shipping", href: "/shipping", icon: <LocalShipping /> }],
  },
  {
    title: "Promotion",
    links: [
      {
        name: "Discount & Coupons",
        href: "/discounts_coupons",
        icon: <Discount />,
      },
    ],
  },
  {
    title: "Settings",
    links: [
      {
        name: "Store Configuration",
        href: "/store_config",
        icon: <Store />,
      },
    ],
  },
];

const signOutLink: MenuLink = { name: "Sign Out", href: "/auth/signout" };

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
      className={`$${
        screenSize <= 1024 ? (sideBarToggle ? open : hide) : ""
      } w-3/4 lg:w-64 md:w-1/2 shadow h-full overflow-y-auto scrollbar-none bg-pri 
        border-r border-gray-800 dark:bg-pri-dark
         text-sec dark:text-pri flex flex-col justify-between`}
    >
      <div>
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
        <nav className="p-4 space-y-6">
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
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors $${
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
      </div>
      <div className="p-4">
        <Link
          href={signOutLink.href}
          onClick={handleClose}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-red-300 text-black hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors $${
            pathname === signOutLink.href ? "bg-gray-300 dark:bg-gray-600" : ""
          }`}
        >
          {signOutLink.icon}
          <span>{signOutLink.name}</span>
        </Link>
      </div>
    </aside>
  );
};

export default AdminSideBar;
