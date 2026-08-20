// app/actions/promotion.ts
'use server';

import CustomerGroup from '@/models/CustomerGroup';
import Promotion from '@/models/Promotion';
import PromotionProperty from '@/models/PromotionProperty';
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

// ---------- Promotion Actions ----------

export async function getPromotionOptions() {
  await connection();

  const [customerGroups, promotions, properties] = await Promise.all([
    CustomerGroup.find().lean(),
    Promotion.find().lean(),
    PromotionProperty.find().sort({ sort_order: 1 }).lean(),
  ]);

  return {
    customerGroups: customerGroups.map((g:any) => ({ label: g.name, value: g._id.toString() })),
    promotions: promotions.map((p:any) => ({ label: p.name, value: p._id.toString() })),
    properties: properties.map((p:any) => ({ label: p.name, value: p._id.toString() })),
  };
}

export async function createPromotion(data: any) {
  await ensureConnection();

  try {
    // Validate referenced PromotionProperty IDs exist
    if (data.property && data.property.length > 0) {
      const existingProps = await PromotionProperty.find({
        _id: { $in: data.property },
      }).lean();
      if (existingProps.length !== data.property.length) {
        throw new Error('One or more PromotionProperty IDs are invalid');
      }
    }

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

  try {
    // Validate referenced PromotionProperty IDs exist
    if (data.property && data.property.length > 0) {
      const existingProps = await PromotionProperty.find({
        _id: { $in: data.property },
      }).lean();
      if (existingProps.length !== data.property.length) {
        throw new Error('One or more PromotionProperty IDs are invalid');
      }
    }

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
    revalidatePath('/admin/promotions'); // adjust path as needed
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
      query = query.populate('property');
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
      .populate('property')
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
    const property = new PromotionProperty(data);
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
    const updated = await PromotionProperty.findByIdAndUpdate(
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

    const result = await PromotionProperty.findByIdAndDelete(id).lean();
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
    const property = await PromotionProperty.findById(id).lean();
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
    const properties = await PromotionProperty.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await PromotionProperty.countDocuments(filter);

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