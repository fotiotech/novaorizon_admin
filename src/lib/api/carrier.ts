// lib/api/carrier.ts
import api from "@/lib/api";
import { isAxiosError } from "axios";

/* ------------------------------ types ------------------------------ */

export interface ApiCarrierRegion {
  _id?: string;
  region: string;
  basePrice: number;
  averageDeliveryTime: string;
  [k: string]: any;
}

export interface ApiCarrier {
  _id: string;
  name: string;
  contact?: string;
  email?: string;
  costWeight?: number;
  regionsServed?: ApiCarrierRegion[];
  [k: string]: any;
}

export interface CarrierInput {
  name?: string;
  contact?: string;
  email?: string;
  regionsServed?: ApiCarrierRegion[];
  costWeight?: number;
  status?: string;
  [k: string]: any;
}

export interface CalculatedShipping {
  _id?: string;
  shippingPrice?: number;
  [k: string]: any;
}

function normalizeCarrier(data: any): ApiCarrier {
  return {
    ...data,
    _id: String(data?._id),
    regionsServed: (data?.regionsServed ?? []).map((region: any) => ({
      ...region,
      _id: region?._id ? String(region._id) : region?._id,
    })),
  };
}

/* ------------------------------ CREATE ----------------------------- */

/**
 * POST /api/carriers — admin only.
 *
 * Mirrors the retired server action: coerces `costWeight`, validates that every
 * region has an `averageDeliveryTime`, normalises the region payloads and, as
 * before, swallows failures after logging them.
 */
export async function createCarrier(data: any): Promise<void> {
  try {
    data.costWeight = parseFloat(data.costWeight);

    if (
      !data.regionsServed.every((region: any) => region.averageDeliveryTime)
    ) {
      throw new Error("averageDeliveryTime is required for all regions");
    }

    data.regionsServed = data.regionsServed.map((region: any) => ({
      region: region.region,
      basePrice: parseFloat(region.basePrice),
      averageDeliveryTime: region.averageDeliveryTime,
    }));

    await api.post("/carriers", data);
  } catch (error) {
    console.error("Error creating carrier:", error);
  }
}

/* ------------------------------- READ ------------------------------ */

/** GET /api/carriers — admin only. */
export async function getCarriers(): Promise<ApiCarrier[]> {
  const res = await api.get<{ data: any[] }>("/carriers");
  const carriers = Array.isArray(res.data?.data) ? res.data.data : [];
  return carriers.map(normalizeCarrier);
}

/** GET /api/carriers/:id — admin only. Returns null when the carrier is gone. */
export async function getCarriersById(
  _id: string,
): Promise<ApiCarrier | null> {
  let data: any;
  try {
    const res = await api.get<{ data: any }>(
      `/carriers/${encodeURIComponent(_id)}`,
    );
    data = res.data?.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }

  if (!data) return null;

  return normalizeCarrier(data);
}

/* ------------------------------ UPDATE ----------------------------- */

/** PATCH /api/carriers/:id — admin only. */
export async function updateCarrier(
  id: string,
  updates: CarrierInput,
): Promise<void> {
  try {
    if (updates.costWeight) {
      updates.costWeight = parseFloat(updates.costWeight as unknown as string);
    }

    if (updates.regionsServed) {
      if (
        !updates.regionsServed.every(
          (region) =>
            region.region && region.basePrice && region.averageDeliveryTime,
        )
      ) {
        throw new Error(
          "All regions must have a region, basePrice, and averageDeliveryTime",
        );
      }

      updates.regionsServed = updates.regionsServed.map((region) => ({
        ...region,
        basePrice: parseFloat(region.basePrice as unknown as string),
      }));
    }

    await api.patch(`/carriers/${encodeURIComponent(id)}`, updates);
  } catch (error) {
    console.error("Error updating carrier:", error);
    throw error;
  }
}

/* ------------------------------ DELETE ----------------------------- */

/** DELETE /api/carriers/:id — admin only. */
export async function deleteCarrier(
  id: string,
): Promise<{ success?: boolean; message?: string }> {
  const res = await api.delete<{ success?: boolean; message?: string }>(
    `/carriers/${encodeURIComponent(id)}`,
  );
  return res.data;
}

/* ------------------------ CALCULATE SHIPPING ----------------------- */

/** POST /api/carriers/calculate-shipping — admin only. */
export async function calculateShippingPrice(
  carrierId: string,
  region: string,
  weight?: number,
  distance?: number,
): Promise<CalculatedShipping> {
  try {
    const res = await api.post<{ data: any }>("/carriers/calculate-shipping", {
      carrierId,
      region,
      weight,
    });
    const regionDetails = res.data?.data;

    return {
      ...regionDetails,
      _id: regionDetails?._id ? String(regionDetails._id) : regionDetails?._id,
      shippingPrice: regionDetails?.shippingPrice,
    };
  } catch (error) {
    console.error("Error calculating shipping price:", error);
    throw error;
  }
}
