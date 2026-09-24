// app/marketing/promotions/properties/page.tsx
import { listPromotionProperties } from "@/app/actions/promotion";
import Link from "next/link";

export default async function PromotionPropertiesPage() {
  const { data: properties } = await listPromotionProperties(
    {},
    { limit: 100 },
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {properties.length}{" "}
          {properties.length === 1 ? "property" : "properties"}
        </p>
        <Link
          href="/marketing/promotions/properties/create"
          className="rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          New property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-[15px] font-medium text-foreground">
            No properties yet
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Properties define the extra fields a promotion type can capture.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {properties.map((p: any) => (
            <li
              key={p._id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-medium text-foreground">
                    {p.name}
                  </span>
                  {p.isRequired && (
                    <span className="shrink-0 text-destructive">*</span>
                  )}
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {p.type}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">
                  {p.code} · order {p.sortOrder ?? 0}
                </p>
              </div>
              <Link
                href={`/marketing/promotions/properties/edit/${p._id}`}
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
