"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  getEntityOffers,
  listOffers,
  syncEntityOffers,
  type OfferDTO,
} from "@/lib/api/offer";

/**
 * Attaches a category/brand to offers' eligibility arrays. The offer owns the
 * promotion logic; this is the curation link from the entity side.
 */
export function OfferEligibilityPicker({
  kind,
  entityId,
}: {
  kind: "category" | "brand";
  entityId: string;
}) {
  const [offers, setOffers] = useState<OfferDTO[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [all, current] = await Promise.all([
          listOffers(),
          getEntityOffers(kind, entityId),
        ]);
        if (!cancelled) {
          setOffers(all);
          setSelected(current);
        }
      } catch {
        if (!cancelled) toast.error("Could not load offers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, entityId]);

  const toggle = async (offerId: string) => {
    const next = selected.includes(offerId)
      ? selected.filter((id) => id !== offerId)
      : [...selected, offerId];
    setSelected(next);
    setSaving(true);
    try {
      await syncEntityOffers(kind, entityId, next);
      toast.success("Offer eligibility updated");
    } catch {
      toast.error("Could not update offer eligibility");
      setSelected(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">Offers</h3>
      <p className="text-xs text-muted-foreground">
        Attach this {kind} to reusable offers.
      </p>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading offers…</p>
      ) : offers.length === 0 ? (
        <p className="text-xs text-muted-foreground">No offers yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {offers.map((offer) => (
            <label
              key={offer._id}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
            >
              <input
                type="checkbox"
                checked={selected.includes(offer._id)}
                disabled={saving}
                onChange={() => void toggle(offer._id)}
              />
              {offer.name}
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
