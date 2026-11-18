// app/sales/orders/[orderNumber]/page.tsx

import { apiData } from "@/lib/server-api";
import { notFound } from "next/navigation";
import OrderDetailsClient from "../_component/OrderDetailsPage";

interface PageProps {
  params: Promise<{
    orderNumber: string;
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { orderNumber } = params;

  // Server Component: call the backend through the server-side client, which
  // forwards the session cookie. (The browser axios wrapper cannot run here.)
  const result = await apiData<{ orders: any[] }>("/orders", {
    query: { orderNumber, limit: 1 },
  });

  const order = result.orders?.[0];

  if (!order) {
    notFound();
  }

  return <OrderDetailsClient order={order} />;
}
