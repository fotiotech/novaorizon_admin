"use server";
import { connection } from "@/utils/connection";

import Offer from "@/models/Offer";
import { revalidatePath } from "next/cache";

export async function createOffer(data: {
  name: string;
  description?: string;
  type: string;
  discountValue?: number;
  conditions: {
    minPurchaseAmount?: number;
    eligibleProducts?: string[];
    startDate: string;
    endDate: string;
  };
  isActive: boolean;
}) {
  await connection();
  await Offer.create(data);
  revalidatePath("/admin/discounts_coupons");
}

export async function readOffers(id?: string) {
  await connection();
  if (id) {
    const offer = await Offer.findById(id);
    if (!offer) {
      throw new Error("Offer not found");
    }
    return offer;
  }
  return await Offer.find();
}

export async function updateOffer(id: string, updates: Partial<typeof Offer>) {
  await connection();
  await Offer.findByIdAndUpdate(id, updates, {
    new: true,
  });
  revalidatePath("/admin/discounts_coupons");
}

export async function deleteOffer(id: string) {
  await connection();
  await Offer.findByIdAndDelete(id);
  return { success: true };
}
