// app/marketing/promotions/_component/PromotionsClient.tsx
"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { listPromotions, deletePromotion } from "@/lib/api/promotion";
import { DeletePromotionButton } from "../../components/DeletePromotionButton";

export default function PromotionsClient({
  initialPromotions,
  initialTotal,
}: {
  initialPromotions: any[];
  initialTotal: number;
}) {
  const [promotions, setPromotions] = useState<any[]>(initialPromotions);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPromotions({}, { limit: 100 });
      setPromotions(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await deletePromotion(id);
      await load();
      return result;
    },
    [load],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {loading
            ? "Loading…"
            : `${total} ${total === 1 ? "promotion" : "promotions"}`}
        </p>
        <Link
          href="/marketing/promotions/create"
          className="rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          New promotion
        </Link>
      </div>

      {promotions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-[15px] font-medium text-foreground">
            No promotions yet
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Create your first promotion to get started.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {promotions.map((p: any) => {
            const calcType = p.promotionType?.calculationType;
            const label = calcType ? calcType.replace(/_/g, " ") : "—";
            return (
              <li
                key={p._id.toString()}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[15px] font-medium text-foreground">
                      {p.name}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        p.isActive
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                    {p.code && (
                      <span className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground">
                        {p.code}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] capitalize text-muted-foreground">
                    {label}
                    {p.customerEligibility?.minOrderAmount > 0
                      ? ` · min ${p.customerEligibility.minOrderAmount}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[13px]">
                  <Link
                    href={`/marketing/promotions/edit/${p._id.toString()}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Edit
                  </Link>
                  <DeletePromotionButton
                    id={p._id.toString()}
                    name={p.name}
                    action={handleDelete}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}