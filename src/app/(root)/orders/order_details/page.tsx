"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Orders } from "@/constant/types";
import { findOrders } from "@/app/actions/order";
import { useSearchParams } from "next/navigation";
import { Prices } from "@/components/Prices";
import { CartItem } from "@/app/reducer/cartReducer";

const OrderDetailsPage = () => {
  const orderNumber = useSearchParams()?.get("orderNumber");
  const [order, setOrder] = useState<Orders>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getAllOrders() {
      try {
        if (orderNumber) {
          const response = await findOrders(orderNumber as string, undefined);
          if (response) {
            setOrder(response as any);
          }
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }

    getAllOrders();
  }, [orderNumber]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {loading ? (
        <div className="flex justify-center items-center h-96">
          <p className="text-lg text-muted-foreground">Loading Details...</p>
        </div>
      ) : (
        <div className="space-y-8 bg-background border border-border p-6 rounded-2xl shadow-md">
          <h1 className="text-3xl font-bold text-primary mb-4">
            Order #{order?.orderNumber}
          </h1>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-muted-foreground">
              Order Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <p>
                <strong>Status:</strong> {order?.orderStatus}
              </p>
              <p>
                <strong>Payment:</strong> {order?.paymentStatus} via{" "}
                {order?.paymentMethod}
              </p>
              {order?.transactionId && (
                <p>
                  <strong>Transaction ID:</strong> {order?.transactionId}
                </p>
              )}
              <p>
                <strong>Date:</strong>{" "}
                {new Date(order?.createdAt || "").toLocaleString()}
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-muted-foreground">
              Customer
            </h2>
            <p>
              <strong>Name:</strong> {order?.firstName} {order?.lastName}
            </p>
            <p>
              <strong>Email:</strong> {order?.email}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-muted-foreground">
              Shipping
            </h2>
            <p>
              <strong>Address:</strong> {order?.shippingAddress?.street},{" "}
              {order?.shippingAddress?.city}, {order?.shippingAddress?.state},{" "}
              {order?.shippingAddress?.postalCode},{" "}
              {order?.shippingAddress?.country}
            </p>
            <p>
              <strong>Status:</strong> {order?.shippingStatus as any}
            </p>
            {order?.shippingDate && (
              <p>
                <strong>Shipped:</strong>{" "}
                {new Date(order.shippingDate).toLocaleDateString()}
              </p>
            )}
            {order?.deliveryDate && (
              <p>
                <strong>Delivered:</strong>{" "}
                {new Date(order.deliveryDate).toLocaleDateString()}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Products
            </h2>
            <ul className="space-y-4">
              {order?.products.map((product: CartItem) => (
                <li
                  key={product.productId}
                  className="flex items-center gap-4 p-4 border border-border rounded-xl"
                >
                  {product.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={64}
                      height={64}
                      className="rounded-lg"
                    />
                  )}
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {product.name}
                    </p>
                    <p className="text-muted-foreground">
                      Qty: {product.quantity}
                    </p>
                    <p className="text-muted-foreground">
                      Price: <Prices amount={product.price} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t pt-4 space-y-2">
            <h2 className="text-xl font-semibold text-muted-foreground">
              Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <p>
                <strong>Subtotal:</strong> <Prices amount={order?.subtotal!} />
              </p>
              <p>
                <strong>Tax:</strong> <Prices amount={order?.tax!} />
              </p>
              <p>
                <strong>Shipping:</strong>{" "}
                <Prices amount={order?.shippingCost!} />
              </p>
              <p>
                <strong>Discount:</strong> -<Prices amount={order?.discount!} />
              </p>
              <p className="col-span-2 text-lg font-bold text-primary">
                Total: <Prices amount={order?.total!} />
              </p>
            </div>
          </section>

          {order?.notes && (
            <section className="pt-4">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Notes
              </h2>
              <p className="text-muted-foreground">{order?.notes}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
