// app/actions/promotion.ts
'use server';

import CustomerGroup from '@/models/CustomerGroup';
import Promotion from '@/models/Promotion';
import PromotionType from '@/models/PromotionType';
import PromotionTypeProperty from '@/models/PromotionTypeProperty';
import { connection } from '@/utils/connection';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';

// ---------- Helper ----------
async function ensureConnection() {
  await connection();
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}



// ---------- Promotion Options (for forms) ----------
export async function getPromotionOptions() {
  await connection();

  const [customerGroups, promotions, promotionTypes] = await Promise.all([
    CustomerGroup.find().lean(),
    Promotion.find().lean(),
    PromotionType.find().populate('properties').lean(), // get types with their properties
  ]);

  return {
    customerGroups: customerGroups.map((g: any) => ({ label: g.name, value: g._id.toString() })),
    promotions: promotions.map((p: any) => ({ label: p.name, value: p._id.toString() })),
    promotionTypes: promotionTypes.map((t: any) => ({
      label: t.name,
      value: t._id.toString(),
      properties: t.properties || [],
    })),
  };
}

// ---------- Promotion CRUD ----------
export async function createPromotion(data: any) {
  await ensureConnection();

  // Validate promotionTypeId exists
  if (!isValidObjectId(data.promotionTypeId)) {
    throw new Error('Invalid promotion type ID');
  }
  const typeExists = await PromotionType.findById(data.promotionTypeId).lean();
  if (!typeExists) {
    throw new Error('Promotion type not found');
  }

  try {
    const promotion = new Promotion(data);
    await promotion.save();
    return promotion.toObject();
  } catch (error: any) {
    throw new Error(`Failed to create promotion: ${error.message}`);
  }
}

export async function updatePromotion(id: string, data: any) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid promotion ID');
  }

  // Validate promotionTypeId if provided
  if (data.promotionTypeId && !isValidObjectId(data.promotionTypeId)) {
    throw new Error('Invalid promotion type ID');
  }
  if (data.promotionTypeId) {
    const typeExists = await PromotionType.findById(data.promotionTypeId).lean();
    if (!typeExists) {
      throw new Error('Promotion type not found');
    }
  }

  try {
    const updated = await Promotion.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      throw new Error('Promotion not found');
    }
    return updated;
  } catch (error: any) {
    throw new Error(`Failed to update promotion: ${error.message}`);
  }
}

export async function deletePromotion(id: string) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid promotion ID');
  }

  try {
    const result = await Promotion.findByIdAndDelete(id).lean();
    if (!result) {
      throw new Error('Promotion not found');
    }
    revalidatePath('/marketing/promotions'); // correct route
    return { success: true };
  } catch (error: any) {
    throw new Error(`Failed to delete promotion: ${error.message}`);
  }
}

export async function getPromotion(id: string, populate = true) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid promotion ID');
  }

  try {
    let query = Promotion.findById(id);
    if (populate) {
      query = query
        .populate('promotionTypeId') // get the promotion type
        .populate('customerEligibility.customerGroupIds') // get group details
        .populate('exclusiveWith'); // get other promotions
    }
    const promotion = await query.lean();
    return promotion;
  } catch (error: any) {
    throw new Error(`Failed to get promotion: ${error.message}`);
  }
}

export async function listPromotions(
  filter: any = {},
  options: { limit?: number; skip?: number; sort?: any } = {}
) {
  await ensureConnection();

  const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options;

  try {
    const promotions = await Promotion.find(filter)
      .populate('promotionTypeId') // populate the type
      .populate('customerEligibility.customerGroupIds')
      .populate('exclusiveWith')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Promotion.countDocuments(filter);

    return {
      data: promotions,
      total,
      limit,
      skip,
    };
  } catch (error: any) {
    throw new Error(`Failed to list promotions: ${error.message}`);
  }
}

// ---------- PromotionProperty Actions ----------

export async function createPromotionProperty(data: any) {
  await ensureConnection();

  try {
    const property = new PromotionTypeProperty(data);
    await property.save();
    return property.toObject();
  } catch (error: any) {
    // Handle duplicate key errors (code and name unique)
    if (error.code === 11000) {
      throw new Error('PromotionProperty code or name already exists');
    }
    throw new Error(`Failed to create promotion property: ${error.message}`);
  }
}

export async function updatePromotionProperty(id: string, data: any) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid promotion property ID');
  }

  try {
    const updated = await PromotionTypeProperty.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      throw new Error('PromotionProperty not found');
    }
    return updated;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('PromotionProperty code or name already exists');
    }
    throw new Error(`Failed to update promotion property: ${error.message}`);
  }
}

export async function deletePromotionProperty(id: string) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid promotion property ID');
  }

  try {
    // Check if this property is referenced by any promotion
    const refs = await Promotion.findOne({ property: id }).lean();
    if (refs) {
      throw new Error('Cannot delete property; it is used by one or more promotions');
    }

    const result = await PromotionTypeProperty.findByIdAndDelete(id).lean();
    if (!result) {
      throw new Error('PromotionProperty not found');
    }
    revalidatePath('/admin/promotion-properties');
    return { success: true };
  } catch (error: any) {
    throw new Error(`Failed to delete promotion property: ${error.message}`);
  }
}

export async function getPromotionProperty(id: string) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid promotion property ID');
  }

  try {
    const property = await PromotionTypeProperty.findById(id).lean();
    return property;
  } catch (error: any) {
    throw new Error(`Failed to get promotion property: ${error.message}`);
  }
}

export async function listPromotionProperties(
  filter: any = {},
  options: { limit?: number; skip?: number; sort?: any } = {}
) {
  await ensureConnection();

  const { limit = 10, skip = 0, sort = { sort_order: 1 } } = options;

  try {
    const properties = await PromotionTypeProperty.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await PromotionTypeProperty.countDocuments(filter);

    return {
      data: properties,
      total,
      limit,
      skip,
    };
  } catch (error: any) {
    throw new Error(`Failed to list promotion properties: ${error.message}`);
  }
}