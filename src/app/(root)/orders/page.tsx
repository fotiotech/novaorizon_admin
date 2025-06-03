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
      console.log("Deleted order:", result);
    } else {
      console.log("Failed to delete order or order not found.");
    }
  }

  if (loading) {
    return <div className="text-center mt-6">Loading orders...</div>;
  }

  if (!allOrders.length) {
    return <div className="text-center mt-6">No orders found.</div>;
  }

  return (
    <div className="">
      <h2 className="text-2xl font-bold mb-6">All Orders</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allOrders.map((order) => (
          <Link
            key={order._id}
            href={`/orders/order_details?orderNumber=${order.orderNumber}`}
          >
            <div className="border rounded-lg p-4 shadow-sm hover:shadow-md">
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Order #{order.orderNumber}
                  </h3>
                  <button
                    title="delete"
                    type="button"
                    onClick={() => delOrder(order.orderNumber)}
                  >
                    <Delete />
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  Placed on:{" "}
                  {new Date(order.createdAt || "").toLocaleDateString()}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold">Customer:</p>
                <p className="text-sm text-gray-800">
                  {order.firstName} {order.lastName}
                </p>
                <p className="text-sm text-gray-600">{order.email}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold">Status:</p>
                <p
                  className={`text-sm ${
                    order.paymentStatus === "paid"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {order.paymentStatus}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold">Products:</p>
                <ul className="mt-2 space-y-2">
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
                          className="rounded"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity} &times;{" "}
                          <Prices amount={item.price} />
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold">Total:</p>
                <p className="text-lg font-bold text-gray-300">
                  <Prices amount={order.total} />
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AllOrderPage;
