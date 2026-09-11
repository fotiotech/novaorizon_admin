"use server";

// app/actions/contact.ts (append)
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { connection } from "@/utils/connection";
import ContactMessage from "@/models/ContactMessage";

export async function getContactMessages(options?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  messages: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  counts: Record<string, number>;
}> {
  await connection();

  const { status, search, page = 1, limit = 10 } = options || {};

  const query: any = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { subject: searchRegex },
      { message: searchRegex },
    ];
  }

  const skip = (page - 1) * limit;

  const [messages, total, newCount, readCount, repliedCount, archivedCount] =
    await Promise.all([
      ContactMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactMessage.countDocuments(query),
      ContactMessage.countDocuments({ status: "new" }),
      ContactMessage.countDocuments({ status: "read" }),
      ContactMessage.countDocuments({ status: "replied" }),
      ContactMessage.countDocuments({ status: "archived" }),
    ]);

  return {
    messages: messages.map((m) => ({
      ...m,
      _id: m._id.toString(),
      createdAt: m.createdAt?.toISOString?.() ?? m.createdAt,
      updatedAt: m.updatedAt?.toISOString?.() ?? m.updatedAt,
    })),
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    counts: {
      all: newCount + readCount + repliedCount + archivedCount,
      new: newCount,
      read: readCount,
      replied: repliedCount,
      archived: archivedCount,
    },
  };
}

export async function getContactMessageById(id: string) {
  await connection();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const msg = await ContactMessage.findById(id).lean();
  if (!msg) return null;
  return {
    ...msg,
    _id: msg._id.toString(),
    createdAt: msg.createdAt?.toISOString?.() ?? msg.createdAt,
    updatedAt: msg.updatedAt?.toISOString?.() ?? msg.updatedAt,
  };
}

export async function updateContactStatus(
  id: string,
  status: "new" | "read" | "replied" | "archived",
): Promise<{ success: boolean; error?: string }> {
  await connection();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, error: "Invalid message id." };
  }
  try {
    await ContactMessage.findByIdAndUpdate(id, { $set: { status } });
    revalidatePath("/admin/messages");
    return { success: true };
  } catch (error: any) {
    console.error("[updateContactStatus] Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getNewContactCount(): Promise<number> {
  await connection();
  try {
    return await ContactMessage.countDocuments({ status: "new" });
  } catch (error) {
    console.error("[getNewContactCount] Error:", error);
    return 0;
  }
}

export async function deleteContactMessage(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await connection();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, error: "Invalid message id." };
  }
  try {
    await ContactMessage.findByIdAndDelete(id);
    revalidatePath("/admin/messages");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteContactMessage] Error:", error);
    return { success: false, error: error.message };
  }
}
