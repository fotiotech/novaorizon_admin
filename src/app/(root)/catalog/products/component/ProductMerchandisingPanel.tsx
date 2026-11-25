"use client";

const FLAGS = [
  { key: "isFeatured", label: "Featured" },
  { key: "isTrending", label: "Trending" },
  { key: "isBestseller", label: "Bestseller" },
  { key: "newArrival", label: "New arrival" },
] as const;

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">
        {value ?? 0}
      </p>
    </div>
  );
}

export function ProductMerchandisingPanel({
  productData,
  onChange,
}: {
  productData: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}) {
  const stats = productData.stats ?? {};

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Merchandising</h2>
        <p className="text-xs text-muted-foreground">
          Curation flags and the derived signals rule collections can use.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FLAGS.map((flag) => (
          <label
            key={flag.key}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium"
          >
            <input
              type="checkbox"
              checked={productData[flag.key] === true}
              onChange={(e) => onChange({ [flag.key]: e.target.checked })}
            />
            {flag.label}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Views" value={stats.views} />
        <Stat label="Cart adds" value={stats.cartAdds} />
        <Stat label="Purchases" value={stats.purchases} />
        <Stat label="Likes" value={stats.likes} />
        <Stat
          label="Rating"
          value={
            productData.ratingCount > 0
              ? `${Number(productData.ratingAverage ?? 0).toFixed(1)} (${productData.ratingCount})`
              : "—"
          }
        />
        <Stat
          label="Revenue"
          value={Number(stats.revenue ?? 0).toLocaleString("en-US")}
        />
        <Stat
          label="Offers"
          value={Array.isArray(productData.offerIds) ? productData.offerIds.length : 0}
        />
        <Stat label="Tags" value={Array.isArray(productData.tags) ? productData.tags.length : 0} />
      </div>
    </section>
  );
}
