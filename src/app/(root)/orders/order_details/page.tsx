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
    <div>
      {loading ? (
        <p className="text-center">Loading Details...</p>
      ) : (
        <div className="max-w-4xl mx-auto p-6  shadow-md rounded-lg">
          <h1 className="text-2xl font-bold text-gray-400 mb-6">
            Order Details - {order?.orderNumber}
          </h1>

          {/* Order Info */}
          <section className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-300">
              Order Information
            </h2>
            <p>
              <span className="font-bold">Order Number:</span>{" "}
              {order?.orderNumber}
            </p>
            <p>
              <span className="font-bold">Order Status:</span>{" "}
              {order?.orderStatus}
            </p>
            <p>
              <span className="font-bold">Payment Status:</span>{" "}
              {order?.paymentStatus}
            </p>
            <p>
              <span className="font-bold">Payment Method:</span>{" "}
              {order?.paymentMethod}
            </p>
            {order?.transactionId && (
              <p>
                <span className="font-bold">Transaction ID:</span>{" "}
                {order?.transactionId}
              </p>
            )}
            <p>
              <span className="font-bold">Date:</span>{" "}
              {new Date(order?.createdAt || "").toLocaleString()}
            </p>
          </section>

          {/* Customer Info */}
          <section className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-300">
              Customer Information
            </h2>
            <p>
              <span className="font-bold">Name:</span> {order?.firstName}{" "}
              {order?.lastName}
            </p>
            <p>
              <span className="font-bold">Email:</span> {order?.email}
            </p>
          </section>

          {/* Shipping Info */}
          <section className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-300">
              Shipping Information
            </h2>
            <p>
              <span className="font-bold">Address:</span>{" "}
              {order?.shippingAddress?.street}, {order?.shippingAddress?.city},{" "}
              {order?.shippingAddress?.state},{" "}
              {order?.shippingAddress?.postalCode},{" "}
              {order?.shippingAddress?.country}
            </p>
            <p>
              <span className="font-bold">Shipping Status:</span>{" "}
              {order?.shippingStatus as any}
            </p>
            {order?.shippingDate && (
              <p>
                <span className="font-bold">Shipping Date:</span>{" "}
                {new Date(order?.shippingDate).toLocaleDateString()}
              </p>
            )}
            {order?.deliveryDate && (
              <p>
                <span className="font-bold">Delivery Date:</span>{" "}
                {new Date(order?.deliveryDate).toLocaleDateString()}
              </p>
            )}
          </section>

          {/* Products */}
          <section className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-300">Products</h2>
            <ul className="space-y-4">
              {order?.products.map((product: CartItem) => (
                <li
                  key={product.productId}
                  className="flex items-center gap-4 border-b pb-4"
                >
                  {product.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={60}
                      height={60}
                      className="rounded"
                    />
                  )}
                  <div>
                    <p className="font-bold text-gray-400">{product.name}</p>
                    <p>Quantity: {product.quantity}</p>
                    <p>
                      Price: <Prices amount={product.price} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Summary */}
          <section>
            <h2 className="text-lg font-semibold text-gray-300">
              Order Summary
            </h2>
            <p>
              <span className="font-bold">Subtotal:</span> $
              <Prices amount={order?.subtotal!} />
            </p>
            <p>
              <span className="font-bold">Tax:</span>
              <Prices amount={order?.tax!} />
            </p>
            <p>
              <span className="font-bold">Shipping Cost:</span>
              <Prices amount={order?.shippingCost!} />
            </p>
            <p>
              <span className="font-bold">Discount:</span>
              -<Prices amount={order?.discount!} />
            </p>
            <p className="text-xl font-bold text-gray-300">
              Total: <Prices amount={order?.total!} />
            </p>
          </section>

          {order?.notes && (
            <section className="mt-4">
              <h2 className="text-lg font-semibold text-gray-300">Notes</h2>
              <p>{order?.notes}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
