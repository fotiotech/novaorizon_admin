// app/sales/orders/[orderNumber]/page.tsx

import OrderDetails from "../_component/OrderDetailsPage";

export default function Page({ params }: { params: { orderNumber: string } }) {
  return <OrderDetails orderNumber={params.orderNumber} />;
}
