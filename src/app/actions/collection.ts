// app/actions/collection.ts
"use server";

import { revalidatePath } from "next/cache";
import { Collection } from "@/models/Collection";
import { ref, deleteObject } from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";
import { connection } from "@/utils/connection";

// Types
interface Group {
  _id?: string;
  name: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string;
  position: number;
}


interface ServerResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Helper function to delete files from Firebase Storage
const deleteFromStorage = async (url: string) => {
  try {
    const urlObj = new URL(url);
    const encodedFileName = urlObj.pathname.split("/").pop();
    if (encodedFileName) {
      const fileName = decodeURIComponent(encodedFileName);
      const path = fileName.startsWith("uploads/")
        ? fileName
        : `uploads/${fileName}`;
      await deleteObject(ref(storage, path));
    }
  } catch (error) {
    console.error("Error deleting file from storage:", error);
  }
};

// Get all collections
export async function getAllCollections(): Promise<ServerResponse> {
  try {
    await connection();
    const collections = await Collection.find().sort({ createdAt: -1 });
    return { success: true, data: JSON.parse(JSON.stringify(collections)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get collection by ID
export async function getCollectionById(id: string): Promise<ServerResponse> {
  try {
    await connection();
    const collection = await Collection.findById(id);
    if (!collection) {
      return { success: false, error: "Collection not found" };
    }
    return { success: true, data: JSON.parse(JSON.stringify(collection)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Create a new collection
export async function createCollection(
  formData: FormData
): Promise<ServerResponse> {
  try {
    await connection();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const display = formData.get("display") as string;
    const status = formData.get("status") as string;
    const groups = JSON.parse((formData.get("groups") as string) || "[]");

    // Process groups
    const processedGroups = groups.map((group: any, index: number) => {
      return {
        name: group.name,
        description: group.description,
        ctaText: group.ctaText,
        ctaUrl: group.ctaUrl,
        imageUrl: group.image, // Use the image string directly
        position: group.position || index,
      };
    });

    // Create the collection
    const newCollection = new Collection({
      name,
      description,
      display,
      status,
      groups: processedGroups,
    });

    await newCollection.save();

    revalidatePath("/collection");
    return { success: true, data: JSON.parse(JSON.stringify(newCollection)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update a collection
export async function updateCollection(
  id: string,
  formData: FormData
): Promise<ServerResponse> {
  try {
    await connection();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const display = formData.get("display") as string;
    const status = formData.get("status") as string;
    const groups = JSON.parse((formData.get("groups") as string) || "[]");

    // Find existing collection
    const existingCollection = await Collection.findById(id);
    if (!existingCollection) {
      return { success: false, error: "Collection not found" };
    }

    // Process groups
    const processedGroups = groups.map((group: any, index: number) => {
      let imageUrl = group.image;

      // If image is marked as "uploaded", keep the existing image
      if (group.image === "uploaded") {
        const existingGroup = existingCollection.groups.find(
          (g: any) => g._id.toString() === group._id
        );
        if (existingGroup) {
          imageUrl = existingGroup.imageUrl;
        }
      }

      return {
        _id: group._id || undefined, // Keep existing ID if available
        name: group.name,
        description: group.description,
        ctaText: group.ctaText,
        ctaUrl: group.ctaUrl,
        imageUrl: imageUrl,
        position: group.position || index,
      };
    });

    // Update the collection
    const updatedCollection = await Collection.findByIdAndUpdate(
      id,
      {
        name,
        description,
        display,
        status,
        groups: processedGroups,
        updatedAt: Date.now(),
      },
      { new: true }
    );

    revalidatePath("/collection");
    revalidatePath(`/collection/${id}`);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedCollection)),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Delete a collection
export async function deleteCollection(id: string): Promise<ServerResponse> {
  try {
    await connection();
    const collection = await Collection.findById(id);
    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    // Delete main image from storage
    if (collection.imageUrl) {
      await deleteFromStorage(collection.imageUrl);
    }

    // Delete all group images from storage
    for (const group of collection.groups) {
      if (group.imageUrl) {
        await deleteFromStorage(group.imageUrl);
      }
    }

    await Collection.findByIdAndDelete(id);

    revalidatePath("/collection");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Delete a group from a collection
export async function deleteGroup(
  collectionId: string,
  groupId: string
): Promise<ServerResponse> {
  try {
    await connection();
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    const group = collection.groups.id(groupId);
    if (!group) {
      return { success: false, error: "Group not found" };
    }

    // Delete group image from storage
    if (group.imageUrl) {
      await deleteFromStorage(group.imageUrl);
    }

    // Remove the group
    collection.groups.pull(groupId);
    await collection.save();

    revalidatePath("/collection");
    revalidatePath(`/collection/${collectionId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
