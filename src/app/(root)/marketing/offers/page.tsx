"use client";

import { useEffect, useState } from "react";
import { Add, Delete, Edit, Refresh, Save } from "@mui/icons-material";
import { toast } from "react-hot-toast";
import {
  getPromotionOptions,
  type PromotionOptions,
} from "@/lib/api/promotion";
import { ProductPicker, type ProductOption } from "@/app/(root)/marketing/components/ProductPicker";
import { EntityPicker } from "@/app/(root)/marketing/components/EntityPicker";
import {
  PROMOTION_RULE_FIELDS,
  operatorsForField,
} from "@/lib/promotion/rule-fields";
import {
  createOffer,
  deleteOffer,
  listOffers,
  updateOffer,
  type OfferDTO,
  type OfferInput,
  type OfferType,
} from "@/lib/api/offer";

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/40";

const TYPES: { value: OfferType; label: string }[] = [
  { value: "percentage", label: "Percentage off" },
  { value: "fixed", label: "Fixed price discount" },
  { value: "bogo", label: "Buy X get Y" },
  { value: "bundle", label: "Bundle discount" },
  { value: "free_shipping", label: "Free shipping" },
];

const EMPTY = {
  name: "",
  type: "percentage" as OfferType,
  discountValue: "",
  buyQuantity: "1",
  getQuantity: "1",
  bundleQuantity: "1",
  startDate: "",
  endDate: "",
  isActive: true,
};

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<OfferDTO | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [options, setOptions] = useState<PromotionOptions | null>(null);
  const [eligibility, setEligibility] = useState({
    productIds: [] as string[],
    categoryIds: [] as string[],
    brandIds: [] as string[],
    collectionIds: [] as string[],
    match: "all" as "all" | "any",
    rules: [] as { field: string; operator: string; value: string }[],
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
    getPromotionOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);

  const startEdit = (offer: OfferDTO) => {
    setEditing(offer);
    setForm({
      name: offer.name,
      type: offer.type,
      discountValue:
        offer.discountValue === null || offer.discountValue === undefined
          ? ""
          : String(offer.discountValue),
      buyQuantity: String(offer.buyQuantity ?? 1),
      getQuantity: String(offer.getQuantity ?? 1),
      bundleQuantity: String(offer.bundleQuantity ?? 1),
      startDate: offer.conditions?.startDate
        ? new Date(offer.conditions.startDate).toISOString().slice(0, 10)
        : "",
      endDate: offer.conditions?.endDate
        ? new Date(offer.conditions.endDate).toISOString().slice(0, 10)
        : "",
      isActive: offer.isActive !== false,
    });
    setEligibility({
      productIds: offer.eligibility?.productIds ?? [],
      categoryIds: offer.eligibility?.categoryIds ?? [],
      brandIds: offer.eligibility?.brandIds ?? [],
      collectionIds: offer.eligibility?.collectionIds ?? [],
      match: offer.eligibility?.match === "any" ? "any" : "all",
      rules: (offer.eligibility?.rules ?? []).map((rule) => ({
        field: rule.field,
        operator: rule.operator,
        value: rule.value ?? "",
      })),
    });
  };

  const reset = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setEligibility({
      productIds: [],
      categoryIds: [],
      brandIds: [],
      collectionIds: [],
      match: "all",
      rules: [],
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      toast.error("Name, start and end dates are required");
      return;
    }
    setSaving(true);
    try {
      const input: OfferInput = {
        name: form.name.trim(),
        type: form.type,
        discountValue:
          form.discountValue === "" ? undefined : Number(form.discountValue),
        buyQuantity: form.type === "bogo" ? Number(form.buyQuantity) || 1 : undefined,
        getQuantity: form.type === "bogo" ? Number(form.getQuantity) || 1 : undefined,
        bundleQuantity:
          form.type === "bundle" ? Number(form.bundleQuantity) || 1 : undefined,
        eligibility: {
          ...eligibility,
          rules: eligibility.rules.filter((rule) => rule.field),
        },
        conditions: {
          eligibleProducts: eligibility.productIds,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
        },
        isActive: form.isActive,
      };
      if (editing) await updateOffer(editing._id, input);
      else await createOffer(input);
      toast.success(editing ? "Offer updated" : "Offer created");
      reset();
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (offer: OfferDTO) => {
    if (!window.confirm(`Delete "${offer.name}"?`)) return;
    try {
      await deleteOffer(offer._id);
      toast.success("Offer deleted");
      if (editing?._id === offer._id) reset();
      await load();
    } catch {
      toast.error("Failed to delete offer");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            Offers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable discounts selected by promotions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <Refresh fontSize="small" /> Refresh
        </button>
      </header>

      <section className="mb-5 space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">
          {editing ? "Edit offer" : "New offer"}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={INPUT}
            placeholder="Offer name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <select
            className={INPUT}
            value={form.type}
            onChange={(e) =>
              setForm((p) => ({ ...p, type: e.target.value as OfferType }))
            }
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {form.type === "bogo" ? (
            <>
              <input
                type="number"
                min={1}
                className={INPUT}
                placeholder="Buy quantity"
                value={form.buyQuantity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, buyQuantity: e.target.value }))
                }
              />
              <input
                type="number"
                min={1}
                className={INPUT}
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
                type="number"
                min={1}
                className={INPUT}
                placeholder="Bundle quantity"
                value={form.bundleQuantity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bundleQuantity: e.target.value }))
                }
              />
              <input
                type="number"
                min={0}
                className={INPUT}
                placeholder="Discount amount"
                value={form.discountValue}
                onChange={(e) =>
                  setForm((p) => ({ ...p, discountValue: e.target.value }))
                }
              />
            </>
          ) : (
            <input
              type="number"
              min={0}
              className={INPUT}
              placeholder="Discount value"
              value={form.discountValue}
              onChange={(e) =>
                setForm((p) => ({ ...p, discountValue: e.target.value }))
              }
            />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((p) => ({ ...p, isActive: e.target.checked }))
              }
            />
            Active
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="date"
            className={INPUT}
            value={form.startDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, startDate: e.target.value }))
            }
          />
          <input
            type="date"
            className={INPUT}
            value={form.endDate}
            onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
          />
        </div>

        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Eligibility
            </h3>
            <select
              className={`${INPUT} w-auto`}
              value={eligibility.match}
              onChange={(e) =>
                setEligibility((p) => ({
                  ...p,
                  match: e.target.value as "all" | "any",
                }))
              }
            >
              <option value="all">Match all rules (AND)</option>
              <option value="any">Match any rule (OR)</option>
            </select>
          </div>

          <div>
            <p className="mb-1 text-[13px] font-medium">Manual products</p>
            <ProductPicker
              value={eligibility.productIds}
              onChange={(next) =>
                setEligibility((p) => ({ ...p, productIds: next }))
              }
              options={(options?.products ?? []) as ProductOption[]}
              placeholder="Search products…"
              emptyMessage="No products found."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[13px] font-medium">Categories</p>
              <EntityPicker
                value={eligibility.categoryIds}
                onChange={(next) =>
                  setEligibility((p) => ({ ...p, categoryIds: next }))
                }
                options={options?.categories ?? []}
                placeholder="Search categories…"
                emptyMessage="No categories."
              />
            </div>
            <div>
              <p className="mb-1 text-[13px] font-medium">Brands</p>
              <EntityPicker
                value={eligibility.brandIds}
                onChange={(next) =>
                  setEligibility((p) => ({ ...p, brandIds: next }))
                }
                options={options?.brands ?? []}
                placeholder="Search brands…"
                emptyMessage="No brands."
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-[13px] font-medium">Collections</p>
            <EntityPicker
              value={eligibility.collectionIds}
              onChange={(next) =>
                setEligibility((p) => ({ ...p, collectionIds: next }))
              }
              options={options?.collections ?? []}
              placeholder="Search collections…"
              emptyMessage="No collections."
            />
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-medium">Rules</p>
            {eligibility.rules.map((rule, index) => (
              <div
                key={index}
                className="grid gap-2 sm:grid-cols-[1.4fr_0.9fr_1.2fr_auto]"
              >
                <input
                  className={INPUT}
                  placeholder="field e.g. stats.purchases"
                  list="offer-rule-fields"
                  value={rule.field}
                  onChange={(e) => {
                    const field = e.target.value;
                    const allowed = operatorsForField(field);
                    setEligibility((p) => ({
                      ...p,
                      rules: p.rules.map((r, i) =>
                        i === index
                          ? {
                              ...r,
                              field,
                              operator: allowed.includes(r.operator)
                                ? r.operator
                                : allowed[0],
                            }
                          : r,
                      ),
                    }));
                  }}
                />
                <select
                  className={INPUT}
                  value={rule.operator}
                  onChange={(e) =>
                    setEligibility((p) => ({
                      ...p,
                      rules: p.rules.map((r, i) =>
                        i === index ? { ...r, operator: e.target.value } : r,
                      ),
                    }))
                  }
                >
                  {operatorsForField(rule.field).map((operator) => (
                    <option key={operator} value={operator}>
                      {operator}
                    </option>
                  ))}
                </select>
                {rule.operator === "$exists" ? (
                  <select
                    className={INPUT}
                    value={rule.value === "true" ? "true" : "false"}
                    onChange={(e) =>
                      setEligibility((p) => ({
                        ...p,
                        rules: p.rules.map((r, i) =>
                          i === index ? { ...r, value: e.target.value } : r,
                        ),
                      }))
                    }
                  >
                    <option value="true">Exists</option>
                    <option value="false">Does not exist</option>
                  </select>
                ) : (
                  <input
                    type={
                      ["$gt", "$gte", "$lt", "$lte"].includes(rule.operator)
                        ? "number"
                        : "text"
                    }
                    className={INPUT}
                    placeholder={
                      ["$in", "$nin"].includes(rule.operator)
                        ? "comma-separated values"
                        : "value"
                    }
                    value={rule.value}
                    onChange={(e) =>
                      setEligibility((p) => ({
                        ...p,
                        rules: p.rules.map((r, i) =>
                          i === index ? { ...r, value: e.target.value } : r,
                        ),
                      }))
                    }
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setEligibility((p) => ({
                      ...p,
                      rules: p.rules.filter((_, i) => i !== index),
                    }))
                  }
                  className="rounded-lg border border-border px-2 text-xs text-destructive"
                >
                  ✕
                </button>
              </div>
            ))}
            <datalist id="offer-rule-fields">
              {PROMOTION_RULE_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </datalist>
            <button
              type="button"
              onClick={() =>
                setEligibility((p) => ({
                  ...p,
                  rules: [
                    ...p.rules,
                    { field: "", operator: "$eq", value: "" },
                  ],
                }))
              }
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs"
            >
              Add rule
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Save fontSize="small" /> {saving ? "Saving…" : "Save"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : offers.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No offers yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {offers.map((offer) => (
              <li
                key={offer._id}
                className="flex items-center gap-3 px-3 py-3 sm:px-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{offer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {offer.type}
                    {offer.discountValue != null
                      ? ` · ${offer.discountValue}`
                      : ""}
                    {offer.isActive ? "" : " · inactive"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => startEdit(offer)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <Edit fontSize="small" />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => void remove(offer)}
                  className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                >
                  <Delete fontSize="small" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}