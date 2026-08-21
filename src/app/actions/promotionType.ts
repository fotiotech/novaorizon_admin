// app/actions/promotionType.ts
'use server';

import { connection } from '@/utils/connection';
import PromotionType from '@/models/PromotionType';
import PromotionTypeProperty from '@/models/PromotionTypeProperty';
import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import Promotion from '@/models/Promotion';

async function ensureConnection() {
  await connection();
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// ---------- Promotion Type Actions ----------

export async function createPromotionType(data: any) {
  await ensureConnection();

  try {
    // Validate referenced properties exist
    if (data.properties && data.properties.length > 0) {
      const existing = await PromotionTypeProperty.find({
        _id: { $in: data.properties },
      }).lean();
      if (existing.length !== data.properties.length) {
        throw new Error('One or more property IDs are invalid');
      }
    }

    const promotionType = new PromotionType(data);
    await promotionType.save();
    return promotionType.toObject();
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('Promotion type with this name or code already exists');
    }
    throw new Error(`Failed to create promotion type: ${error.message}`);
  }
}

export async function updatePromotionType(id: string, data: any) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid promotion type ID');
  }

  try {
    if (data.properties && data.properties.length > 0) {
      const existing = await PromotionTypeProperty.find({
        _id: { $in: data.properties },
      }).lean();
      if (existing.length !== data.properties.length) {
        throw new Error('One or more property IDs are invalid');
      }
    }

    const updated = await PromotionType.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).populate('properties').lean();

    if (!updated) {
      throw new Error('Promotion type not found');
    }
    return updated;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('Promotion type with this name or code already exists');
    }
    throw new Error(`Failed to update promotion type: ${error.message}`);
  }
}

export async function deletePromotionType(id: string) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid promotion type ID');
  }

  try {
    // Check if any promotions use this type
    const refs = await Promotion.findOne({ promotionTypeId: id }).lean();
    if (refs) {
      throw new Error('Cannot delete promotion type; it is used by one or more promotions');
    }

    const result = await PromotionType.findByIdAndDelete(id).lean();
    if (!result) {
      throw new Error('Promotion type not found');
    }
    revalidatePath('/promotion-types');
    return { success: true };
  } catch (error: any) {
    throw new Error(`Failed to delete promotion type: ${error.message}`);
  }
}

export async function getPromotionType(id: string, populate = true) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid promotion type ID');
  }

  try {
    let query = PromotionType.findById(id);
    if (populate) {
      query = query.populate('properties');
    }
    const promotionType = await query.lean();
    return promotionType;
  } catch (error: any) {
    throw new Error(`Failed to get promotion type: ${error.message}`);
  }
}

export async function listPromotionTypes(
  filter: any = {},
  options: { limit?: number; skip?: number; sort?: any } = {}
) {
  await ensureConnection();

  const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options;

  try {
    const types = await PromotionType.find(filter)
      .populate('properties')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await PromotionType.countDocuments(filter);

    return {
      data: types,
      total,
      limit,
      skip,
    };
  } catch (error: any) {
    throw new Error(`Failed to list promotion types: ${error.message}`);
  }
}

// ---------- Promotion Type Property Actions ----------

export async function createPromotionTypeProperty(data: any) {
  await ensureConnection();

  try {
    const property = new PromotionTypeProperty(data);
    await property.save();
    return property.toObject();
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('Property code already exists');
    }
    throw new Error(`Failed to create property: ${error.message}`);
  }
}

export async function updatePromotionTypeProperty(id: string, data: any) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid property ID');
  }

  try {
    const updated = await PromotionTypeProperty.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      throw new Error('Property not found');
    }
    return updated;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('Property code already exists');
    }
    throw new Error(`Failed to update property: ${error.message}`);
  }
}

export async function deletePromotionTypeProperty(id: string) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid property ID');
  }

  try {
    // Check if this property is used by any promotion type
    const refs = await PromotionType.findOne({ properties: id }).lean();
    if (refs) {
      throw new Error('Cannot delete property; it is used by one or more promotion types');
    }

    const result = await PromotionTypeProperty.findByIdAndDelete(id).lean();
    if (!result) {
      throw new Error('Property not found');
    }
    revalidatePath('/promotion-type-properties');
    return { success: true };
  } catch (error: any) {
    throw new Error(`Failed to delete property: ${error.message}`);
  }
}

export async function getPromotionTypeProperty(id: string) {
  await ensureConnection();

  if (!isValidObjectId(id)) {
    throw new Error('Invalid property ID');
  }

  try {
    const property = await PromotionTypeProperty.findById(id).lean();
    return property;
  } catch (error: any) {
    throw new Error(`Failed to get property: ${error.message}`);
  }
}

export async function listPromotionTypeProperties(
  filter: any = {},
  options: { limit?: number; skip?: number; sort?: any } = {}
) {
  await ensureConnection();

  const { limit = 10, skip = 0, sort = { sortOrder: 1 } } = options;

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
    throw new Error(`Failed to list properties: ${error.message}`);
  }
}