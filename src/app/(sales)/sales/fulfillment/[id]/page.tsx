// app/carrier/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCarriersById } from "@/app/actions/carrier";
import { findOrders } from "@/app/actions/order";
import { OrderStatusUpdater } from "@/app/(sales)/components/OrderStatusUpdate";
import SearchFilter from "@/app/(sales)/components/SearchFilter";

interface FilterOptions {
  search: string;
  orderStatus: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
}

export default function CarrierDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [carrier, setCarrier] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    orderStatus: "",
    paymentStatus: "",
    dateFrom: "",
    dateTo: "",
  });

  const limit = 10;

  // Fetch carrier on mount
  useEffect(() => {
    async function fetchCarrier() {
      try {
        const data = await getCarriersById(id);
        if (!data) {
          setError("Carrier not found");
        } else {
          setCarrier(data);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load carrier");
      }
    }
    fetchCarrier();
  }, [id]);

  // Fetch orders with current filters and page
  const fetchOrders = async () => {
    if (!carrier) return;
    setLoading(true);
    try {
      const result = await findOrders({
        carrier: carrier.name, // filter by carrier name
        search: filters.search || undefined,
        orderStatus: filters.orderStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        page: currentPage,
        limit,
      });
      setOrders(result.orders);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error(err);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  // Refetch orders when carrier, filters, or page change
  useEffect(() => {
    if (carrier) {
      fetchOrders();
    }
  }, [carrier, filters, currentPage]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1); // reset to first page on filter change
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const base =
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status?.toLowerCase()) {
      case "completed":
        return `${base} bg-green/20 text-green-700 dark:text-green-400`;
      case "processing":
      case "shipped":
        return `${base} bg-blue/20 text-blue-700 dark:text-blue-400`;
      case "in transit":
        return `${base} bg-orange/20 text-orange-700 dark:text-orange-400`;
      case "cancelled":
        return `${base} bg-destructive/20 text-destructive`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  };

  const getPaymentBadge = (status: string) => {
    const base =
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status?.toLowerCase()) {
      case "paid":
        return `${base} bg-green/20 text-green-700 dark:text-green-400`;
      case "refunded":
        return `${base} bg-orange/20 text-orange-700 dark:text-orange-400`;
      case "failed":
      case "cancelled":
        return `${base} bg-destructive/20 text-destructive`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading carrier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link
          href="/sales/fulfillment"
          className="text-primary hover:text-primary/80"
        >
          ← Back to Carriers
        </Link>
        <h1 className="text-3xl font-bold text-foreground">{carrier.name}</h1>
      </div>

      {/* Carrier Details Card */}
      <div className="bg-card p-4 rounded-lg border border-border space-y-1">
        <p>
          <span className="font-medium">Contact:</span> {carrier.contact}
        </p>
        <p>
          <span className="font-medium">Email:</span> {carrier.email || "N/A"}
        </p>
        <p>
          <span className="font-medium">Cost per kg:</span> {carrier.costWeight}
        </p>
        <div>
          <span className="font-medium">Regions served:</span>
          <ul className="list-disc ml-5 mt-1">
            {carrier.regionsServed.map((r: any) => (
              <li key={r._id}>
                {r.region} – base {r.basePrice}, delivery{" "}
                {r.averageDeliveryTime}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Search & Filter */}
      <SearchFilter
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />

      {/* Orders Table */}
      <div className="bg-card p-6 rounded-lg shadow-md border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Orders ({total})
          </h2>
          {loading && (
            <span className="text-sm text-muted-foreground">Loading...</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-muted-foreground"
                  >
                    No orders found for this carrier.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground font-medium">
                      #{order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">
                      {order.firstName} {order.lastName}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {order.email}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground">
                      CFA {order.total?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getPaymentBadge(order.paymentStatus)}>
                        {order.paymentStatus || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(order.orderStatus)}>
                        {order.orderStatus || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-foreground text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      <Link
                        href={`/sales/orders/${order.orderNumber}`}
                        className="text-primary hover:text-primary/80 transition-colors text-sm"
                      >
                        View
                      </Link>
                      <OrderStatusUpdater orderNumber={order.orderNumber} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {orders.length} of {total} orders
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition text-foreground"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-input rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition text-foreground"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
