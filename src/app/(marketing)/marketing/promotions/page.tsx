// app/marketing/promotions/page.tsx
import { listPromotions } from "@/app/actions/promotion";
import Link from "next/link";

export default async function PromotionsPage() {
  const { data: promotions } = await listPromotions({}, { limit: 100 });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {promotions.length}{" "}
          {promotions.length === 1 ? "promotion" : "promotions"}
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
          {promotions.map((p: any) => (
            <li
              key={p._id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
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
                </div>
                {p.promotionTypeId?.name && (
                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                    {p.promotionTypeId.name}
                  </p>
                )}
              </div>
              <Link
                href={`/marketing/promotions/edit/${p._id}`}
                className="shrink-0 text-[13px] font-medium text-primary hover:underline"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
