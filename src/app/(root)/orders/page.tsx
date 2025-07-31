"use client";

import { deleteOrder, findOrders } from "@/app/actions/order";
import { Prices } from "@/components/Prices";
import { Orders } from "@/constant/types";
import { Delete } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const AllOrderPage = () => {
  const [allOrders, setAllOrders] = useState<Orders[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getAllOrders() {
      try {
        const response = await findOrders();
        if (response) {
          setAllOrders(response as any);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }

    getAllOrders();
  }, []);

  async function delOrder(number: string) {
    const result = await deleteOrder(number);
    if (result) {
      setAllOrders((prev) =>
        prev.filter((order) => order.orderNumber !== number)
      );
    } else {
      console.log("Failed to delete order or order not found.");
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Loading orders...
      </div>
    );
  }

  if (!allOrders.length) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No orders found.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-3xl font-bold text-primary mb-8">All Orders</h2>
        <Link href={"/orders/chat"}>Chats</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {allOrders.map((order) => (
          <div
            key={order._id}
            className="border border-border rounded-2xl shadow-sm hover:shadow-md transition-all bg-background"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Order #{order.orderNumber}
                </h3>
                <button
                  title="Delete Order"
                  type="button"
                  onClick={() => delOrder(order.orderNumber)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Delete fontSize="small" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Placed on:{" "}
                {new Date(order.createdAt || "").toLocaleDateString()}
              </p>

              <div className="text-sm space-y-1 mb-4">
                <p className="font-semibold">Customer:</p>
                <p>
                  {order.firstName} {order.lastName}
                </p>
                <p className="text-muted-foreground">{order.email}</p>
              </div>

              <div className="text-sm space-y-1 mb-4">
                <p className="font-semibold">Payment Status:</p>
                <p
                  className={`font-medium ${
                    order.paymentStatus === "paid"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {order.paymentStatus}
                </p>
              </div>

              <div className="text-sm space-y-2 mb-4">
                <p className="font-semibold">Products:</p>
                <ul className="space-y-2">
                  {order.products.map((item) => (
                    <li
                      key={item.productId?.toString()}
                      className="flex items-center gap-4"
                    >
                      {item.imageUrl && (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={50}
                          height={50}
                          className="rounded-lg"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × <Prices amount={item.price} />
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold">Total:</p>
                <p className="text-lg font-bold text-primary">
                  <Prices amount={order.total} />
                </p>
              </div>

              <Link
                href={`/orders/order_details?orderNumber=${order.orderNumber}`}
                className="inline-block mt-4 text-sm text-blue-500 hover:underline"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllOrderPage;
