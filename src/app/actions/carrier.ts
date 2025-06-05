"use server";
import { connection } from "@/utils/connection";

import Carrier from "@/models/Carrier";
import { revalidatePath } from "next/cache";

// CREATE
export const createCarrier = async (data: any) => {
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

    const newCarrier = new Carrier(data);
    await newCarrier.save();

    revalidatePath("/admin/shipping/manage_shipping");
  } catch (error) {
    console.error("Error creating carrier:", error);
  }
};

// READ
export async function getCarriers() {
  await connection();
  const carriers = await Carrier.find();
  return carriers.map((data) => ({
    ...data.toObject(),
    _id: data._id.toString(),
    regionsServed: data.regionsServed.map((region: any) => ({
      ...region.toObject(),
      _id: region._id.toString(),
    })),
  }));
}

export async function getCarriersById(_id: string) {
  await connection();
  const data = await Carrier.findOne({ _id });
  return {
    ...data.toObject(),
    _id: data._id.toString(),
    regionsServed: data.regionsServed.map((region: any) => ({
      ...region.toObject(),
      _id: region._id.toString(),
    })),
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
  }>
) {
  await connection();

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
            region.region && region.basePrice && region.averageDeliveryTime
        )
      ) {
        throw new Error(
          "All regions must have a region, basePrice, and averageDeliveryTime"
        );
      }

      updates.regionsServed = updates.regionsServed.map((region) => ({
        ...region,
        basePrice: parseFloat(region.basePrice as unknown as string),
      }));
    }

    // Update carrier
    const updatedCarrier = await Carrier.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true, // Ensure Mongoose validators run
    });

    if (!updatedCarrier) {
      throw new Error("Carrier not found");
    }

    // Revalidate page cache
    revalidatePath("/admin/shipping/manage_shipping");
  } catch (error) {
    console.error("Error updating carrier:", error);
    throw error;
  }
}

// DELETE
export async function deleteCarrier(id: string) {
  await connection();
  return Carrier.findByIdAndDelete(id);
}

export async function calculateShippingPrice(
  carrierId: string,
  region: string,
  weight?: number,
  distance?: number
) {
  try {
    // Connect to MongoDB (if not already connected)
    await connection();

    // Fetch the carrier details
    const carrier = await Carrier.findById(carrierId);
    if (!carrier) {
      throw new Error("Carrier not found");
    }

    // Find the region details within the carrier's regionsServed
    const regionDetails = carrier.regionsServed.find(
      (r: any) => r.region.toLowerCase() === region.toLowerCase()
    );
    if (!regionDetails) {
      throw new Error(`Region ${region} is not served by this carrier`);
    }

    // Compute the shipping price
    const { basePrice } = regionDetails;
    const costWeight = carrier.costWeight ? carrier.costWeight : 0;

    const w = weight ? weight : 0;

    // Shipping price formula (example: basePrice + (weight * costWeight) + (distance * costPerKm))
    const shippingPrice = basePrice + w * costWeight;

    return {
      ...regionDetails.toObject(),
      _id: regionDetails._id.toString(),
      shippingPrice: shippingPrice,
    };
  } catch (error) {
    console.error("Error calculating shipping price:", error);
    throw error;
  }
}
