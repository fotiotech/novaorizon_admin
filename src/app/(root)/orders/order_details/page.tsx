"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Orders } from "@/constant/types";
import { findOrders } from "@/app/actions/order";
import { useSearchParams } from "next/navigation";
import { Prices } from "@/components/Prices";
import { CartItem } from "@/app/reducer/cartReducer";
import { SkeletonLoader } from "../_component/SkeletonLoader";



// Collapsible Section Component
const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-border last:border-b-0 pb-4 last:pb-0">
      <button
        title="title"
        className="flex justify-between items-center w-full text-left focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-lg sm:text-xl font-semibold text-muted-foreground">
          {title}
        </h2>
        <span className="text-lg">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </section>
  );
};

// OrderInfo component
const OrderInfo = ({ order }: { order: Orders }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <p className="text-sm sm:text-base">
        <strong>Status:</strong> {order.orderStatus}
      </p>
      <p className="text-sm sm:text-base">
        <strong>Payment:</strong> {order.paymentStatus} via{" "}
        {order.paymentMethod}
      </p>
      {order.transactionId && (
        <p className="text-sm sm:text-base">
          <strong>Transaction ID:</strong> {order.transactionId}
        </p>
      )}
      <p className="text-sm sm:text-base">
        <strong>Date:</strong>{" "}
        {new Date(order.createdAt || "").toLocaleString()}
      </p>
    </div>
  </div>
);

// CustomerInfo component
const CustomerInfo = ({ order }: { order: Orders }) => (
  <div className="space-y-2">
    <p className="text-sm sm:text-base">
      <strong>Name:</strong> {order.firstName} {order.lastName}
    </p>
    <p className="text-sm sm:text-base">
      <strong>Email:</strong> {order.email}
    </p>
  </div>
);

// ShippingInfo component
const ShippingInfo = ({ order }: { order: Orders }) => (
  <div className="space-y-2">
    <p className="text-sm sm:text-base">
      <strong>Address:</strong> {order.shippingAddress?.street},{" "}
      {order.shippingAddress?.city}, {order.shippingAddress?.state},{" "}
      {order.shippingAddress?.postalCode}, {order.shippingAddress?.country}
    </p>
    <p className="text-sm sm:text-base">
      <strong>Status:</strong> {order.shippingStatus as any}
    </p>
    {order.shippingDate && (
      <p className="text-sm sm:text-base">
        <strong>Shipped:</strong>{" "}
        {new Date(order.shippingDate).toLocaleDateString()}
      </p>
    )}
    {order.deliveryDate && (
      <p className="text-sm sm:text-base">
        <strong>Delivered:</strong>{" "}
        {new Date(order.deliveryDate).toLocaleDateString()}
      </p>
    )}
  </div>
);

// ProductList component with memoization
const ProductList = React.memo(({ products }: { products: any[] }) => (
  <ul className="space-y-4">
    {products.map((product: any) => (
      <li
        key={`${product.productId}-${product.quantity}`}
        className="flex flex-col xs:flex-row items-start xs:items-center gap-4 p-4 border border-border rounded-xl"
      >
        {product.main_image && (
          <div className="flex-shrink-0">
            <Image
              src={product.main_image}
              alt={product.name}
              width={64}
              height={64}
              className="rounded-lg"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaUMk9k2e6Cz+WMk9k2e6Cz+WMD5p//2Q=="
            />
          </div>
        )}
        <div className="text-sm flex-1">
          <p className="font-medium text-foreground">{product.name}</p>
          <p className="text-muted-foreground">Qty: {product.quantity}</p>
          <p className="text-muted-foreground">
            Price: <Prices amount={product.price} />
          </p>
        </div>
      </li>
    ))}
  </ul>
));

ProductList.displayName = "ProductList";

// OrderSummary component
const OrderSummary = ({ order }: { order: Orders }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <p className="text-sm sm:text-base">
        <strong>Subtotal:</strong> <Prices amount={order.subtotal!} />
      </p>
      <p className="text-sm sm:text-base">
        <strong>Tax:</strong> <Prices amount={order.tax!} />
      </p>
      <p className="text-sm sm:text-base">
        <strong>Shipping:</strong> <Prices amount={order.shippingCost!} />
      </p>
      <p className="text-sm sm:text-base">
        <strong>Discount:</strong> -<Prices amount={order.discount!} />
      </p>
      <p className="col-span-2 sm:col-span-4 text-base sm:text-lg font-bold text-primary mt-2 border-t pt-2">
        Total: <Prices amount={order.total!} />
      </p>
    </div>
  </div>
);

const OrderDetailsPage = () => {
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get("orderNumber");
  const [order, setOrder] = useState<Orders>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAllOrders = useCallback(async () => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await findOrders(orderNumber, undefined);
      if (response) {
        setOrder(response as any);
      } else {
        setError("Order not found");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    getAllOrders();
  }, [getAllOrders]);

  // Memoize order sections to prevent unnecessary re-renders
  const orderSections = useMemo(() => {
    if (!order) return null;

    return (
      <>
        <CollapsibleSection title="Order Info" defaultOpen={true}>
          <OrderInfo order={order} />
        </CollapsibleSection>

        <CollapsibleSection title="Customer">
          <CustomerInfo order={order} />
        </CollapsibleSection>

        <CollapsibleSection title="Shipping">
          <ShippingInfo order={order} />
        </CollapsibleSection>

        <CollapsibleSection title="Products">
          <ProductList products={order.products} />
        </CollapsibleSection>

        <CollapsibleSection title="Summary" defaultOpen={true}>
          <OrderSummary order={order} />
        </CollapsibleSection>

        {order.notes && (
          <CollapsibleSection title="Notes">
            <p className="text-muted-foreground text-sm sm:text-base">
              {order.notes}
            </p>
          </CollapsibleSection>
        )}
      </>
    );
  }, [order]);

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p className="text-lg text-destructive mb-4">{error}</p>
            <button
              onClick={getAllOrders}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm sm:text-base"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex justify-center items-center h-96">
          <p className="text-lg text-muted-foreground">Order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="space-y-6 bg-background border border-border p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-4">
          Order #{order.orderNumber}
        </h1>
        <div className="space-y-6">{orderSections}</div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
