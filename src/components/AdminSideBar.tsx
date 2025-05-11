"use client";
import React, { LegacyRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Person2 } from "@mui/icons-material";

interface adminSideBarProps {
  domNode?: LegacyRef<HTMLDivElement>;
  sideBarToggle: boolean;
  screenSize: number;
  setSideBarToggle: (arg: boolean) => void;
}

const AdminSideBar = ({
  domNode,
  sideBarToggle,
  screenSize,
  setSideBarToggle,
}: adminSideBarProps) => {
  const pathname = usePathname();
  const open = "absolute z-10 left-0 ";
  const hide = " absolute -left-full z-10";

  const handleCloseSideBar = () => {
    if (sideBarToggle !== undefined && screenSize <= 1024) {
      setSideBarToggle(false);
    }
  };

  return (
    <div
      ref={domNode}
      className={`${
        screenSize <= 1024 ? (sideBarToggle ? open : hide) : ""
      } w-3/4 lg:w-80 h-screen shadow overflow-auto bg-pri 
       flex-1 border-r border-gray-800 dark:bg-pri-dark
         text-sec dark:text-pri`}
    >
      <div className="p-2">
        <Link href={"/"}>
          <Image
            title="logo"
            src="/logo.png"
            width={60}
            height={40}
            alt="logo"
            className=" w-auto h-auto"
          />
        </Link>
      </div>
      <div>
        <ul
          className="flex flex-col gap-2 p-2 
        font-semibold text-gray-600"
        >
          <li>
            <h3 className="text-sm">DashBoard</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/"}
                onClick={handleCloseSideBar}
                className={pathname === "/" ? "activeLink" : "inactiveLink"}
              >
                <li>Overview</li>
              </Link>
              <Link
                href={"/reports"}
                onClick={handleCloseSideBar}
                className={
                  pathname === "/reports" ? "activeLink" : "inactiveLink"
                }
              >
                <li>Reports</li>
              </Link>
            </ul>
          </li>

          <li>
            <h3 className="text-sm">Products</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/products/products_list"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/products/products_list")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>All Products</li>
              </Link>
              <Link
                href={"/products/list_product"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/products/list_product")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>List Product</li>
              </Link>
              <Link
                href={"/categories"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/categories")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Categories & Subcategories</li>
              </Link>
              <Link
                href={"/brands"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/brands") ? "activeLink" : "inactiveLink"
                }
              >
                <li>Brands</li>
              </Link>
              <Link
                href={"/attributes"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/attributes")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Attributes & Tags</li>
              </Link>
              <Link
                href={"/inventory"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/inventory")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Inventory</li>
              </Link>
            </ul>
          </li>

          <li>
            <h3 className="text-sm">Orders</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/orders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/orders") ? "activeLink" : "inactiveLink"
                }
              >
                <li>All Orders</li>
              </Link>
              <Link
                href={"/pending_orders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/pending_orders")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Pending Orders</li>
              </Link>
              <Link
                href={"/shipped_orders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/shipped_orders")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Shipped Orders</li>
              </Link>
              <Link
                href={"/completed_orders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/completed_orders")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Completed Orders</li>
              </Link>
              <Link
                href={"/returns"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/returns") ? "activeLink" : "inactiveLink"
                }
              >
                <li>Returns</li>
              </Link>
            </ul>
          </li>

          <li>
            <h3 className="text-sm">Shipping</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/shipping"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/shipping") ? "activeLink" : "inactiveLink"
                }
              >
                <li>Overview</li>
              </Link>
              <Link
                href={"/manage_shipping"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/manage_shipping")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Manage Shipping</li>
              </Link>
            </ul>
          </li>

          <li>
            <h3 className="text-sm">Customers</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/customers"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/customers")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>All Customers</li>
              </Link>
              <Link
                href={"/customer_groups"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/customer_groups")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Customer Groups</li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Marketing</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/discounts_coupons"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/discounts_coupons")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Discounts & Coupons</li>
              </Link>
              <Link
                href={"/email_marketing"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/email_marketing")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Email Marketing</li>
              </Link>
              <Link
                href={"/ads_management"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/ads_management")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Ads Management</li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Content Management</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/blogs"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/blogs") ? "activeLink" : "inactiveLink"
                }
              >
                <li>Blogs</li>
              </Link>
              <Link
                href={"/reviews_ratings"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/reviews_ratings")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Reviews & Ratings</li>
              </Link>
              <Link
                href={"/content_management/banner_sliders"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/content_management/banners_sliders")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Banners & Sliders</li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Users</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/users"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/users") ? "activeLink" : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <Person2 /> <p>Admin Users</p>
                </li>
              </Link>
              <Link
                href={"/permissions_roles"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/permissions_roles")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <p>Permissions & Roles</p>
                </li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Analytics</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/sales_analytics"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/sales_analytics")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <p>Sales Analytics</p>
                </li>
              </Link>
              <Link
                href={"/product_analytics"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/product_analytics")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <p>Product Analytics</p>
                </li>
              </Link>
              <Link
                href={"/customer_analytics"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/customer_analytics")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li className="flex items-center gap-2">
                  <p>Customer Analytics</p>
                </li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">Settings</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/general_settings"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/general_settings")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>General Settings</li>
              </Link>
              <Link
                href={"/payment_methods"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/payment_methods")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Payment Methods</li>
              </Link>
              <Link
                href={"/shipping_methods"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/shipping_methods")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Shipping Methods</li>
              </Link>
              <Link
                href={"/tax_settings"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/tax_settings")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Tax Settings</li>
              </Link>
            </ul>
          </li>
          <li>
            <h3 className="text-sm">System Logs</h3>
            <ul className="flex flex-col gap-1 p-1">
              <Link
                href={"/activity_logs"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/activity_logs")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Activity Logs</li>
              </Link>
              <Link
                href={"/error_logs"}
                onClick={handleCloseSideBar}
                className={
                  pathname.includes("/error_logs")
                    ? "activeLink"
                    : "inactiveLink"
                }
              >
                <li>Error Logs</li>
              </Link>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AdminSideBar;
