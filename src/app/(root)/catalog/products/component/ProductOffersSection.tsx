"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  createOffer,
  listOffers,
  type OfferDTO,
  type OfferType,
} from "@/lib/api/offer";

const INPUT =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

const TYPE_OPTIONS: { value: OfferType; label: string }[] = [
  { value: "percentage", label: "Percentage off" },
  { value: "fixed", label: "Fixed price discount" },
  { value: "bogo", label: "Buy X get Y" },
  { value: "bundle", label: "Bundle discount" },
  { value: "free_shipping", label: "Free shipping" },
];

export function ProductOffersSection({
  productId,
  offerIds,
  onChange,
}: {
  productId?: string;
  offerIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [offers, setOffers] = useState<OfferDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "percentage" as OfferType,
    discountValue: "",
    buyQuantity: "1",
    getQuantity: "1",
    bundleQuantity: "1",
    startDate: "",
    endDate: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      setOffers(await listOffers());
    } catch {
      toast.error("Could not load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(() => new Set(offerIds), [offerIds]);

  const toggle = (id: string) => {
    if (selected.has(id)) onChange(offerIds.filter((x) => x !== id));
    else onChange([...offerIds, id]);
  };

  const create = async () => {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      toast.error("Name, start and end dates are required");
      return;
    }
    setSaving(true);
    try {
      const offer = await createOffer({
        name: form.name.trim(),
        type: form.type,
        discountValue: form.discountValue
          ? Number(form.discountValue)
          : undefined,
        buyQuantity:
          form.type === "bogo" ? Number(form.buyQuantity) || 1 : undefined,
        getQuantity:
          form.type === "bogo" ? Number(form.getQuantity) || 1 : undefined,
        bundleQuantity:
          form.type === "bundle"
            ? Number(form.bundleQuantity) || 1
            : undefined,
        conditions: {
          eligibleProducts: productId ? [productId] : [],
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
        },
        isActive: true,
      });
      await load();
      onChange([...offerIds, offer._id]);
      setCreating(false);
      setForm({
        name: "",
        type: "percentage",
        discountValue: "",
        buyQuantity: "1",
        getQuantity: "1",
        bundleQuantity: "1",
        startDate: "",
        endDate: "",
      });
      toast.success("Offer created and attached");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not create offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Offers</h2>
          <p className="text-xs text-muted-foreground">
            Reusable discounts attached to this product.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium"
        >
          {creating ? "Cancel" : "New offer"}
        </button>
      </div>

      {creating && (
        <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <input
            className={INPUT}
            placeholder="Offer name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className={INPUT}
              value={form.type}
              onChange={(e) =>
                setForm((p) => ({ ...p, type: e.target.value as OfferType }))
              }
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {form.type === "bogo" ? (
              <>
                <input
                  className={INPUT}
                  type="number"
                  min={1}
                  placeholder="Buy quantity"
                  value={form.buyQuantity}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, buyQuantity: e.target.value }))
                  }
                />
                <input
                  className={INPUT}
                  type="number"
                  min={1}
                  placeholder="Get quantity"
                  value={form.getQuantity}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, getQuantity: e.target.value }))
                  }
                />
              </>
            ) : form.type === "bundle" ? (
              <>
                <input
                  className={INPUT}
                  type="number"
                  min={1}
                  placeholder="Bundle quantity"
                  value={form.bundleQuantity}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bundleQuantity: e.target.value }))
                  }
                />
                <input
                  className={INPUT}
                  type="number"
                  min={0}
                  placeholder="Discount amount"
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, discountValue: e.target.value }))
                  }
                />
              </>
            ) : (
              <input
                className={INPUT}
                type="number"
                min={0}
                placeholder="Discount value"
                value={form.discountValue}
                onChange={(e) =>
                  setForm((p) => ({ ...p, discountValue: e.target.value }))
                }
              />
            )}
            <input
              className={INPUT}
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, startDate: e.target.value }))
              }
            />
            <input
              className={INPUT}
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm((p) => ({ ...p, endDate: e.target.value }))
              }
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void create()}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create & attach"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading offers…</p>
      ) : offers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No offers yet — create one above.
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
                <span className="min-w-0 flex-1 truncate">
                  {offer.name}
                </span>
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