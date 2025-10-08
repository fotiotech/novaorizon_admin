// app/actions/meta-tag-actions.ts
'use server';

import { connection } from '@/utils/connection';
import { revalidatePath } from 'next/cache';
import MetaTagUrlModel from '@/models/MetaTagUrl';
import { MetaTagUrl, MetaTagFormData, MetaTagResponse, MetaTagListResponse } from '@/constant/types/metatag';


// Get all meta tags with pagination
export async function getMetaTags(
  page: number = 1,
  limit: number = 10,
  search: string = ''
): Promise<MetaTagListResponse> {
  try {
    await connection();

    const skip = (page - 1) * limit;
    const searchFilter = search
      ? {
          $or: [
            { url: { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const [metaTags, total] = await Promise.all([
      MetaTagUrlModel.find(searchFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MetaTagUrlModel.countDocuments(searchFilter)
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(metaTags)) as MetaTagUrl[],
      total,
      page,
      limit
    };
  } catch (error) {
    console.error('Error fetching meta tags:', error);
    return {
      success: false,
      data: [],
      total: 0,
      page,
      limit
    };
  }
}

// Get meta tag by ID
export async function getMetaTagById(id: string): Promise<MetaTagResponse> {
  try {
    await connection();

    const metaTag = await MetaTagUrlModel.findById(id).lean();

    if (!metaTag) {
      return { success: false, error: 'Meta tag not found' };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(metaTag)) as MetaTagUrl
    };
  } catch (error) {
    console.error('Error fetching meta tag:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch meta tag'
    };
  }
}

// Get meta tag by URL
export async function getMetaTagByUrl(url: string): Promise<MetaTagResponse> {
  try {
    await connection();

    // First try exact match
    let metaTag = await MetaTagUrlModel.findOne({ 
      url, 
      isActive: true 
    }).lean();

    // If no exact match, try pattern matching
    if (!metaTag) {
      const patternMetaTags = await MetaTagUrlModel.find({ 
        urlPattern: { $exists: true, $ne: '' },
        isActive: true 
      }).lean();

      const foundMetaTag = patternMetaTags.find(tag => {
        if (!tag.urlPattern) return false;
        try {
          const regex = new RegExp(tag.urlPattern);
          return regex.test(url);
        } catch {
          return false;
        }
      });
      metaTag = foundMetaTag ? foundMetaTag : null;
    }

    if (!metaTag) {
      return { success: false, error: 'Meta tag not found for this URL' };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(metaTag)) as MetaTagUrl
    };
  } catch (error) {
    console.error('Error fetching meta tag by URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch meta tag'
    };
  }
}

// Create new meta tag
export async function createMetaTag(
  formData: MetaTagFormData,
  userId: string
): Promise<MetaTagResponse> {
  try {
    await connection();

    // Check if URL already exists
    const existingMetaTag = await MetaTagUrlModel.findOne({ 
      url: formData.url 
    });

    if (existingMetaTag) {
      return { success: false, error: 'Meta tag for this URL already exists' };
    }

    // Convert keywords string to array
    const keywords = formData.keywords
      ? formData.keywords.split(',').map(k => k.trim()).filter(k => k)
      : [];

    const metaTagData = {
      ...formData,
      keywords,
      createdBy: userId,
      lastModified: new Date()
    };

    const newMetaTag = await MetaTagUrlModel.create(metaTagData);

    revalidatePath('/admin/meta-tags');
    return {
      success: true,
      data: JSON.parse(JSON.stringify(newMetaTag)) as MetaTagUrl
    };
  } catch (error) {
    console.error('Error creating meta tag:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create meta tag'
    };
  }
}

// Update meta tag
export async function updateMetaTag(
  id: string,
  formData: MetaTagFormData,
  userId: string
): Promise<MetaTagResponse> {
  try {
    await connection();

    // Check if meta tag exists
    const existingMetaTag = await MetaTagUrlModel.findById(id);
    if (!existingMetaTag) {
      return { success: false, error: 'Meta tag not found' };
    }

    // Check if URL is being changed and if it conflicts with another
    if (formData.url !== existingMetaTag.url) {
      const urlConflict = await MetaTagUrlModel.findOne({
        url: formData.url,
        _id: { $ne: id }
      });

      if (urlConflict) {
        return { success: false, error: 'Another meta tag already exists for this URL' };
      }
    }

    // Convert keywords string to array
    const keywords = formData.keywords
      ? formData.keywords.split(',').map(k => k.trim()).filter(k => k)
      : [];

    const updateData = {
      ...formData,
      keywords,
      lastModified: new Date()
    };

    const updatedMetaTag = await MetaTagUrlModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).lean();

    revalidatePath('/admin/meta-tags');
    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedMetaTag)) as MetaTagUrl
    };
  } catch (error) {
    console.error('Error updating meta tag:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update meta tag'
    };
  }
}

// Delete meta tag
export async function deleteMetaTag(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await connection();

    const result = await MetaTagUrlModel.findByIdAndDelete(id);

    if (!result) {
      return { success: false, error: 'Meta tag not found' };
    }

    revalidatePath('/admin/meta-tags');
    return { success: true };
  } catch (error) {
    console.error('Error deleting meta tag:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete meta tag'
    };
  }
}

// Toggle meta tag active status
export async function toggleMetaTagStatus(
  id: string
): Promise<MetaTagResponse> {
  try {
    await connection();

    const metaTag = await MetaTagUrlModel.findById(id);
    if (!metaTag) {
      return { success: false, error: 'Meta tag not found' };
    }

    metaTag.isActive = !metaTag.isActive;
    metaTag.lastModified = new Date();
    await metaTag.save();

    revalidatePath('/admin/meta-tags');
    return {
      success: true,
      data: JSON.parse(JSON.stringify(metaTag)) as MetaTagUrl
    };
  } catch (error) {
    console.error('Error toggling meta tag status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle meta tag status'
    };
  }
}

// Bulk update meta tags (for mass changes)
export async function bulkUpdateMetaTags(
  ids: string[],
  updates: Partial<MetaTagFormData>
): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
  try {
    await connection();

    const result = await MetaTagUrlModel.updateMany(
      { _id: { $in: ids } },
      {
        ...updates,
        lastModified: new Date()
      }
    );

    revalidatePath('/admin/meta-tags');
    return {
      success: true,
      updatedCount: result.modifiedCount
    };
  } catch (error) {
    console.error('Error in bulk update:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update meta tags'
    };
  }
}