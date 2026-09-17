"use client";

import { useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Close, Search } from "@mui/icons-material";

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

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

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

  const debouncedSearch = useDebouncedCallback((value: string) => {
    onFilterChange({ ...filters, search: value });
  }, 500);

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
    const cleared: FilterOptions = {
      search: "",
      orderStatus: "",
      paymentStatus: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const isDirty = useMemo(
    () =>
      Boolean(
        filters.search ||
        filters.orderStatus ||
        filters.paymentStatus ||
        filters.dateFrom ||
        filters.dateTo,
      ),
    [filters],
  );

  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        {/* Search */}
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="filter-search" className={labelClass}>
            Search
          </label>
          <div className="relative">
            <Search
              fontSize="small"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="filter-search"
              type="text"
              name="search"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Order #, email, name…"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        {showOrderStatus && (
          <div className="lg:col-span-2">
            <label htmlFor="filter-order-status" className={labelClass}>
              Order status
            </label>
            <select
              id="filter-order-status"
              name="orderStatus"
              value={filters.orderStatus}
              onChange={handleSelectChange}
              className={inputClass}
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

        <div className="lg:col-span-2">
          <label htmlFor="filter-payment-status" className={labelClass}>
            Payment status
          </label>
          <select
            id="filter-payment-status"
            name="paymentStatus"
            value={filters.paymentStatus}
            onChange={handleSelectChange}
            className={inputClass}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="filter-date-from" className={labelClass}>
            From
          </label>
          <input
            id="filter-date-from"
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleDateChange}
            className={inputClass}
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="filter-date-to" className={labelClass}>
            To
          </label>
          <input
            id="filter-date-to"
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleDateChange}
            className={inputClass}
          />
        </div>
      </div>

      {isDirty && (
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Close fontSize="small" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
