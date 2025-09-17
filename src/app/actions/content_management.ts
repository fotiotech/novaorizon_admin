"use server";
import { connection } from "@/utils/connection";
import HeroContent from "@/models/HeroContent";
import { revalidatePath } from "next/cache";

export async function findHeroContent() {
  try {
    await connection();
    const heroContent = await HeroContent.find().sort({ created_at: -1 });
    return heroContent.map((res) => ({
      ...res.toObject(),
      _id: res._id?.toString(),
      created_at: res.created_at?.toISOString(),
      updated_at: res.updated_at?.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching hero content:", error);
    throw new Error("Failed to fetch hero content");
  }
}

export async function findHeroContentById(id: string) {
  try {
    await connection();
    if (!id) throw new Error("ID is required");

    const res = await HeroContent.findById(id);
    if (!res) throw new Error("Hero content not found");

    return {
      ...res.toObject(),
      _id: res._id?.toString(),
      created_at: res.created_at?.toISOString(),
      updated_at: res.updated_at?.toISOString(),
    };
  } catch (error) {
    console.error("Error fetching hero content by ID:", error);
    throw new Error("Failed to fetch hero content");
  }
}

export async function createHeroContent(prevState: any, formData: FormData) {
  try {
    await connection();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const cta_text = formData.get("cta_text") as string;
    const cta_link = formData.get("cta_link") as string;
    const imageUrl = formData.get("imageUrl") as string;

    // Validation
    if (!title || !description || !cta_text || !cta_link || !imageUrl) {
      return {
        success: false,
        message: "All fields are required",
      };
    }

    const newHeroContent = new HeroContent({
      title,
      description,
      imageUrl,
      cta_text,
      cta_link,
    });

    await newHeroContent.save();
    revalidatePath("/");

    return {
      success: true,
      message: "Hero content created successfully",
    };
  } catch (error) {
    console.error("Error creating hero content:", error);
    return {
      success: false,
      message: "Failed to create hero content",
    };
  }
}

export async function updateHeroContent(
  id: string,
  prevState: any,
  formData: FormData
) {
  try {
    await connection();

    if (!id) {
      return {
        success: false,
        message: "ID is required for update",
      };
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const cta_text = formData.get("cta_text") as string;
    const cta_link = formData.get("cta_link") as string;
    const imageUrl = formData.get("imageUrl") as string;

    // Validation
    if (!title || !description || !cta_text || !cta_link || !imageUrl) {
      return {
        success: false,
        message: "All fields are required",
      };
    }

    const updatedContent = await HeroContent.findByIdAndUpdate(
      id,
      {
        title,
        description,
        imageUrl,
        cta_text,
        cta_link,
        updated_at: Date.now(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedContent) {
      return {
        success: false,
        message: "Hero content not found",
      };
    }

    revalidatePath("/");
    return {
      success: true,
      message: "Hero content updated successfully",
    };
  } catch (error) {
    console.error("Error updating hero content:", error);
    return {
      success: false,
      message: "Failed to update hero content",
    };
  }
}
