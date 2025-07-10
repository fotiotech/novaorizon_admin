"use server";
import { connection } from "@/utils/connection";
import User from "@/models/User";

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
