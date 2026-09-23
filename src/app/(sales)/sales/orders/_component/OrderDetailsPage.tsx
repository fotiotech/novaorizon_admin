"use client";

import { Prices } from "@/components/Prices";
import InvoiceDisplay from "@/components/InvoiceDisplay";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { ArrowBack, Inventory2, Receipt, OpenInNew } from "@mui/icons-material";

interface OrderDetailsClientProps {
  order: any;
}

/* ------------------------------------------------------------------ */
/* Badge styles — mirror the list page                                 */
/* ------------------------------------------------------------------ */
const statusStyles: Record<string, string> = {
  completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  processing:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  shipped:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20",
  "in transit":
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  cancelled:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  return_requested:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20",
  returned:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
};

const paymentStyles: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  cod_pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  pending:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
  failed:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  cancelled:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  refunded:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
};

const Badge = memo(function Badge({
  status,
  map,
}: {
  status: string;
  map: Record<string, string>;
}) {
  const key = status?.toLowerCase() ?? "";
  const cls = map[key] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status?.replace(/_/g, " ") || "—"}
    </span>
  );
});

/* ------------------------------------------------------------------ */
/* Pure content — used by both the popup and the standalone page.      */
/* No outer padding, no navigation chrome.                             */
/* ------------------------------------------------------------------ */
export const OrderDetailsContent = memo(function OrderDetailsContent({
  order,
  actions,
}: {
  order: any;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Order Header */}
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Order #{order.orderNumber}
        </h2>
        <Badge status={order.orderStatus} map={statusStyles} />
        <Badge status={order.paymentStatus} map={paymentStyles} />
      </header>

      {/* Order Info Grid */}
      <section className="rounded-lg bg-muted/40 p-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Order date
            </p>
            <p className="mt-1 text-sm text-foreground">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Status
            </p>
            <p className="mt-1 text-sm capitalize text-foreground">
              {order.orderStatus?.replace(/_/g, " ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Customer
            </p>
            <p className="mt-1 truncate text-sm font-medium text-foreground">
              {order.firstName} {order.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {order.email}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Total
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              <Prices amount={order.total} />
            </p>
          </div>
        </div>
      </section>

      {/* Shipping & Billing */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg bg-muted/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Shipping address
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {order.shippingAddress?.street}
            <br />
            {order.shippingAddress?.city},{" "}
            {order.shippingAddress?.region || order.shippingAddress?.state}{" "}
            {order.shippingAddress?.postalCode}
            <br />
            {order.shippingAddress?.country}
          </p>
        </section>
        <section className="rounded-lg bg-muted/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Billing address
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {order.billingAddress?.street}
            <br />
            {order.billingAddress?.city},{" "}
            {order.billingAddress?.region || order.billingAddress?.state}{" "}
            {order.billingAddress?.postalCode}
            <br />
            {order.billingAddress?.country}
          </p>
        </section>
      </div>

      {/* Products + Totals */}
      <section className="rounded-lg bg-muted/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Products</h3>
        <ul className="divide-y divide-border/60">
          {order.products?.map((item: any) => (
            <li
              key={item.productId?.toString() ?? item._id}
              className="flex gap-3 py-3 first:pt-0"
            >
              <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-lg bg-background">
                {item.main_image ? (
                  <Image
                    src={item.main_image}
                    alt={item.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Inventory2
                    fontSize="small"
                    className="text-muted-foreground"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Qty: {item.quantity} × <Prices amount={item.price} />
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  <Prices amount={item.price * item.quantity} />
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <dl className="mt-4 space-y-1.5 border-t border-border/60 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums text-foreground">
              <Prices amount={order.subtotal || order.total} />
            </dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="tabular-nums text-emerald-600 dark:text-emerald-400">
                -<Prices amount={order.discount} />
              </dd>
            </div>
          )}
          {order.shippingCost > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums text-foreground">
                <Prices amount={order.shippingCost} />
              </dd>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular-nums text-foreground">
                <Prices amount={order.tax} />
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border/60 pt-3 text-base font-semibold">
            <dt className="text-foreground">Total</dt>
            <dd className="tabular-nums text-foreground">
              <Prices amount={order.total} />
            </dd>
          </div>
        </dl>
      </section>

      {/* Invoice */}
      {order.paymentStatus === "paid" && (
        <section className="rounded-lg bg-muted/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Receipt fontSize="small" className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Invoice</h3>
          </div>
          <InvoiceDisplay orderNumber={order.orderNumber} />
        </section>
      )}

      {actions ? (
        <div className="flex flex-wrap gap-2 pt-1">{actions}</div>
      ) : null}
    </div>
  );
});
OrderDetailsContent.displayName = "OrderDetailsContent";

/* ------------------------------------------------------------------ */
/* Standalone page wrapper — used at /sales/orders/[orderNumber]      */
/* ------------------------------------------------------------------ */
export default function OrderDetailsClient({ order }: OrderDetailsClientProps) {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-clip">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowBack sx={{ fontSize: 16 }} />
        Back to orders
      </button>

      <OrderDetailsContent
        order={order}
        actions={
          <Link
            href="/sales/orders"
            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
          >
            <ArrowBack sx={{ fontSize: 16 }} />
            Back to all orders
          </Link>
        }
      />
    </div>
  );
}
