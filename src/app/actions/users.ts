"use server";
import { connection } from "@/utils/connection";
import User from "@/models/User";
import { revalidatePath } from "next/cache";

export async function findUsers(_id?: string) {
  await connection();
  if (_id) {
    const data = await User.findOne({ _id });
    return {
      ...data?.toObject(),
      _id: data?._id?.toString(),
      created_at: data?.created_at?.toISOString(),
      updated_at: data?.updated_at?.toISOString(),
    };
  } else {
    const data = await User.find();
    return data.map((res) => ({
      ...res.toObject(),
      _id: res._id.toString(),
      created_at: res?.created_at?.toISOString(),
      updated_at: res?.updated_at?.toISOString(),
    }));
  }
}

export async function updateUserRoleAndPermissions(
  userId: string,
  role: string,
  permissions: string[],
) {
  await connection();

  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.role = role;
    user.permissions = permissions;
    await user.save();

    revalidatePath("/users"); // adjust path as needed
    return { success: true, message: "User updated successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
