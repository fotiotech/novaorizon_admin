// app/sales/orders/[orderNumber]/page.tsx

import { findOrders } from "@/app/actions/order";
import { notFound } from "next/navigation";
import OrderDetailsClient from "../_component/OrderDetailsPage";

interface PageProps {
  params: {
    orderNumber: string;
  };
}

export default async function Page({ params }: PageProps) {
  const { orderNumber } = params;

  // Fetch the specific order using the updated findOrders
  const result = await findOrders({
    orderNumber,
    limit: 1,
  });

  const order = result.orders?.[0];

  if (!order) {
    notFound();
  }

  return <OrderDetailsClient order={order} />;
}
