"use server";
import { connection } from "@/utils/connection";

import HeroContent from "@/models/HeroContent";
import { revalidatePath } from "next/cache";

export async function findHeroContent() {
  await connection();
  const heroContent = await HeroContent.find().sort({ created_at: -1 });

  if (heroContent) {
    return heroContent.map((res) => ({
      ...res.toObject(),
      _id: res._id?.toString(),
      // created_at: res.created_at?.toISOString(),
      // updated_at: res.updated_at?.toISOString(),
    }));
  }
}

export async function findHeroContentById(id: string) {
  await connection();
  if (id) {
    const res = await HeroContent.findById(id);
    if (res) {
      return {
        ...res.toObject(),
        _id: res._id?.toString(),
        // created_at: res.created_at?.toISOString(),
        // updated_at: res.updated_at?.toISOString(),
      };
    }
  }
}

export async function createHeroContent(files: string[], formData: FormData) {
  await connection();
  if (!formData) return;

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const cta_text = formData.get("cta_text") as string;
  const cta_link = formData.get("cta_link") as string;

  try {
    const newHeroContent = new HeroContent({
      title: title,
      description: description,
      imageUrl: files,
      cta_text: cta_text,
      cta_link: cta_link,
    });
    await newHeroContent.save();
    revalidatePath("/");
  } catch (error) {
    console.error(error);
  }
}

export async function updateHeroContent(
  id: string,
  files: string[],
  formData: FormData
) {
  await connection(); // Ensure database connection

  if (!formData) {
    console.warn("No form data provided.");
    return;
  }

  // Extract and validate form data
  const title = formData.get("title") as string | null;
  const description = formData.get("description") as string | null;
  const cta_text = formData.get("cta_text") as string | null;
  const cta_link = formData.get("cta_link") as string | null;

  if (!cta_link) {
    console.warn("Incomplete form data. Ensure all fields are filled.");
    return;
  }

  try {
    if (id) {
      // Update MongoDB document
      await HeroContent.updateOne(
        { _id: id }, // Ensure proper key for MongoDB
        {
          $set: {
            title: title,
            description: description,
            imageUrl: files || [], // Default to empty array if files is undefined
            cta_text: cta_text,
            cta_link: cta_link,
          },
        }
      );
    }

    // Revalidate path for updated content
    revalidatePath("/");
  } catch (error) {
    console.error("Error updating hero content:", error);
  }
}
