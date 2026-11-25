"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { listOffers, type OfferDTO } from "@/lib/api/offer";

export function ProductOffersSection({
  offerIds,
  onChange,
}: {
  productId?: string;
  offerIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [offers, setOffers] = useState<OfferDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listOffers()
      .then((data) => {
        if (!cancelled) setOffers(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load offers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => new Set(offerIds), [offerIds]);

  const toggle = (id: string) => {
    if (selected.has(id)) onChange(offerIds.filter((value) => value !== id));
    else onChange([...offerIds, id]);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Offers</h2>
        <p className="text-xs text-muted-foreground">
          Reusable discounts attached to this product. Create offers in
          Marketing → Offers.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading offers…</p>
      ) : offers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No offers yet. Create one in Marketing → Offers.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {offers.map((offer) => (
            <li key={offer._id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={selected.has(offer._id)}
                  onChange={() => toggle(offer._id)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="min-w-0 flex-1 truncate">{offer.name}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {offer.type}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
