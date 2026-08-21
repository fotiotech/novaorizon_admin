"use client";

import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";

interface FilterOptions {
  search: string;
  orderStatus: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
}

interface SearchFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  initialFilters?: Partial<FilterOptions>;
  showOrderStatus?: boolean; // default: true
}

export default function SearchFilter({
  onFilterChange,
  initialFilters = {},
  showOrderStatus = true,
}: SearchFilterProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    search: initialFilters.search || "",
    orderStatus: initialFilters.orderStatus || "",
    paymentStatus: initialFilters.paymentStatus || "",
    dateFrom: initialFilters.dateFrom || "",
    dateTo: initialFilters.dateTo || "",
  });

  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      onFilterChange({ ...filters, search: value });
    },
    500
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, search: value }));
    debouncedSearch(value);
  };

  const handleClear = () => {
    const cleared = {
      search: "",
      orderStatus: "",
      paymentStatus: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  return (
    <div className="w-full overflow-x-auto bg-card p-4 rounded-lg shadow-md border border-border">
      <div className="min-w-[640px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Search
          </label>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Order #, email, name..."
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {showOrderStatus && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Order Status
            </label>
            <select
              name="orderStatus"
              value={filters.orderStatus}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="in transit">In Transit</option>
              <option value="completed">Completed</option>
              <option value="returned">Returned</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Payment Status
          </label>
          <select
            name="paymentStatus"
            value={filters.paymentStatus}
            onChange={handleSelectChange}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className="flex gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              From
            </label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleDateChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              To
            </label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleDateChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleClear}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}