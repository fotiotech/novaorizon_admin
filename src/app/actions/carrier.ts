"use server";

import { requireAdmin } from "@/lib/authz";
import { ApiError, apiData, apiFetch } from "@/lib/server-api";

import { revalidatePath } from "next/cache";

/**
 * Carriers live in the Express backend (`/api/carriers`). This module is a
 * thin, authenticated proxy so the existing UI keeps its call signatures.
 */

// CREATE
export const createCarrier = async (data: any) => {
  await requireAdmin();
  try {
    // Ensure `costPerKm` is a number
    data.costWeight = parseFloat(data.costWeight);

    if (
      !data.regionsServed.every((region: any) => region.averageDeliveryTime)
    ) {
      throw new Error("averageDeliveryTime is required for all regions");
    }

    // Validate `regionsServed`
    data.regionsServed = data.regionsServed.map((region: any) => ({
      region: region.region,
      basePrice: parseFloat(region.basePrice),
      averageDeliveryTime: region.averageDeliveryTime,
    }));

    await apiFetch("/carriers", {
      method: "POST",
      body: data,
    });

    revalidatePath("/sales/fulfillment");
  } catch (error) {
    console.error("Error creating carrier:", error);
  }
};

// READ
export async function getCarriers() {
  await requireAdmin();

  const carriers = await apiData<any[]>("/carriers");

  return (carriers ?? []).map((data) => ({
    ...data,
    _id: String(data._id),
    regionsServed: (data.regionsServed ?? []).map((region: any) => ({
      ...region,
      _id: region?._id ? String(region._id) : region?._id,
    })),
  }));
}

// carrier.ts
export async function getCarriersById(_id: string) {
  await requireAdmin();

  let data: any;
  try {
    data = await apiData<any>(`/carriers/${encodeURIComponent(_id)}`);
  } catch (error) {
    // The backend answers 404 for a missing carrier; the old code returned null.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }

  // 🛑 If no carrier is found, return null
  if (!data) return null;

  return {
    ...data,
    _id: String(data._id),
    regionsServed:
      data.regionsServed?.map((region: any) => ({
        ...region,
        _id: region._id ? String(region._id) : region._id,
      })) || [],
  };
}

// UPDATE
export async function updateCarrier(
  id: string,
  updates: Partial<{
    name: string;
    contact: string;
    email: string;
    regionsServed: {
      region: string;
      basePrice: number;
      averageDeliveryTime: string;
    }[];
    costWeight: number;
    status: string;
  }>,
) {
  await requireAdmin();

  try {
    // Validate `costPerKm` if provided
    if (updates.costWeight) {
      updates.costWeight = parseFloat(updates.costWeight as unknown as string);
    }

    // Validate `regionsServed` if provided
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

    // Update carrier
    await apiFetch(`/carriers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: updates,
    });

    // Revalidate page cache
    revalidatePath("/sales/fulfillment");
  } catch (error) {
    console.error("Error updating carrier:", error);
    throw error;
  }
}

// DELETE
export async function deleteCarrier(id: string) {
  await requireAdmin();

  return apiFetch(`/carriers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function calculateShippingPrice(
  carrierId: string,
  region: string,
  weight?: number,
  distance?: number,
) {
  await requireAdmin();
  try {
    const regionDetails = await apiData<any>("/carriers/calculate-shipping", {
      method: "POST",
      body: { carrierId, region, weight },
    });

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
