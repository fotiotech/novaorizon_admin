"use client";

import { updateOrderStatus } from "@/app/actions/order";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderStatusUpdater({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [status, setStatus] = useState({
    orderStatus: "",
  });
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!status.orderStatus) {
      alert("Please select a status to update.");
      return;
    }

    setLoading(true);
    const result = await updateOrderStatus(orderNumber, status as any);
    if (result.success) {
      alert("Order status updated successfully!");
      router.refresh(); // ✅ Refresh the page to reflect changes
    } else {
      alert(`Error: ${result.error}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        onChange={(e) =>
          setStatus((prev) => ({ ...prev, orderStatus: e.target.value }))
        }
        value={status.orderStatus}
        className="px-2 py-1 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Change status</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="shipped">Shipped</option>
        <option value="in transit">In Transit</option>
        <option value="completed">Completed</option>
        <option value="returned">Returned</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <button
        onClick={handleUpdate}
        disabled={loading}
        className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Updating..." : "Update"}
      </button>
    </div>
  );
}