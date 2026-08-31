"use client";

import { Prices } from "@/components/Prices";
import InvoiceDisplay from "@/components/InvoiceDisplay";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OrderDetailsClientProps {
  order: any; // Replace with your actual Order type
}

export default function OrderDetailsClient({ order }: OrderDetailsClientProps) {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to orders
      </button>

      {/* Order Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">
          Order #{order.orderNumber}
        </h1>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            order.paymentStatus === "paid"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {order.paymentStatus}
        </span>
      </div>

      {/* Order Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border rounded-lg p-6">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Order Date
          </h2>
          <p className="text-foreground">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Status</h2>
          <p className="text-foreground capitalize">{order.orderStatus}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Customer
          </h2>
          <p className="text-foreground">
            {order.firstName} {order.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{order.email}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Total</h2>
          <p className="text-2xl font-bold text-foreground">
            <Prices amount={order.total} />
          </p>
        </div>
      </div>

      {/* Shipping & Billing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Shipping Address
          </h2>
          <p className="text-foreground">
            {order.shippingAddress?.street}
            <br />
            {order.shippingAddress?.city},{" "}
            {order.shippingAddress?.region || order.shippingAddress?.state}{" "}
            {order.shippingAddress?.postalCode}
            <br />
            {order.shippingAddress?.country}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Billing Address
          </h2>
          <p className="text-foreground">
            {order.billingAddress?.street}
            <br />
            {order.billingAddress?.city},{" "}
            {order.billingAddress?.region || order.billingAddress?.state}{" "}
            {order.billingAddress?.postalCode}
            <br />
            {order.billingAddress?.country}
          </p>
        </div>
      </div>

      {/* Products */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Products</h2>
        <ul className="divide-y divide-border">
          {order.products.map((item: any) => (
            <li key={item.productId?.toString()} className="py-4 flex gap-4">
              {item.main_image && (
                <Image
                  src={item.main_image}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity} × <Prices amount={item.price} />
                </p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  Subtotal: <Prices amount={item.price * item.quantity} />
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-border pt-4 mt-4 flex justify-between text-foreground">
          <span>Subtotal</span>
          <span>
            <Prices amount={order.subtotal || order.total} />
          </span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-muted-foreground text-sm">
            <span>Discount</span>
            <span>
              -<Prices amount={order.discount} />
            </span>
          </div>
        )}
        {order.shippingCost > 0 && (
          <div className="flex justify-between text-muted-foreground text-sm">
            <span>Shipping</span>
            <span>
              <Prices amount={order.shippingCost} />
            </span>
          </div>
        )}
        {order.tax > 0 && (
          <div className="flex justify-between text-muted-foreground text-sm">
            <span>Tax</span>
            <span>
              <Prices amount={order.tax} />
            </span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-foreground border-t border-border pt-4 mt-4">
          <span>Total</span>
          <span>
            <Prices amount={order.total} />
          </span>
        </div>
      </div>

      {/* Invoice */}
      {order.paymentStatus === "paid" && (
        <InvoiceDisplay orderNumber={order.orderNumber} />
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          href="/sales/orders"
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Back to All Orders
        </Link>
        {/* Additional actions like invoice, etc. can go here */}
      </div>
    </div>
  );
}
