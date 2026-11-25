// lib/api/offer.ts
import api from "@/lib/api";

export type OfferType =
  | "percentage"
  | "fixed"
  | "bogo"
  | "free_shipping"
  | "bundle";

export interface OfferDTO {
  _id: string;
  name: string;
  description?: string | null;
  type: OfferType;
  discountValue?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  bundleQuantity?: number | null;
  eligibility?: {
    productIds: string[];
    categoryIds: string[];
    brandIds: string[];
    collectionIds: string[];
    match: "all" | "any";
    rules: { field: string; operator: string; value?: any }[];
  };
  conditions: {
    minPurchaseAmount?: number | null;
    eligibleProducts: string[];
    startDate: string;
    endDate: string;
  };
  isActive: boolean;
}

export interface OfferInput {
  name: string;
  description?: string;
  type: OfferType;
  discountValue?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  bundleQuantity?: number | null;
  eligibility?: {
    productIds: string[];
    categoryIds: string[];
    brandIds: string[];
    match: "all" | "any";
    rules: { field: string; operator: string; value?: any }[];
  };
  conditions: {
    eligibleProducts: string[];
    startDate: string;
    endDate: string;
    minPurchaseAmount?: number;
  };
  isActive?: boolean;
}

export async function listOffers(): Promise<OfferDTO[]> {
  const res = await api.get<{ data: OfferDTO[] }>("/offers");
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function createOffer(input: OfferInput): Promise<OfferDTO> {
  const res = await api.post<{ data: OfferDTO }>("/offers", input);
  return res.data.data;
}

export async function updateOffer(
  id: string,
  input: Partial<OfferInput>,
): Promise<OfferDTO> {
  const res = await api.patch<{ data: OfferDTO }>(`/offers/${id}`, input);
  return res.data.data;
}

export async function deleteOffer(id: string): Promise<void> {
  await api.delete(`/offers/${id}`);
}

export async function getEntityOffers(
  kind: "category" | "brand",
  id: string,
): Promise<string[]> {
  const res = await api.get<{ data: string[] }>(
    `/offers/eligibility/${kind}/${id}`,
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function syncEntityOffers(
  kind: "category" | "brand",
  id: string,
  offerIds: string[],
): Promise<void> {
  await api.post(`/offers/eligibility/${kind}/${id}`, { offerIds });
}