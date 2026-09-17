"use server";
import { connection } from "@/utils/connection";
import User from "@/models/User";
import { revalidatePath } from "next/cache";
import { auth } from "../auth";

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

/* -------------------------------------------------------------------------- */
/*                             Lean return shapes                             */
/* -------------------------------------------------------------------------- */

type LeanPreferences = {
  language?: string;
  currency?: string;
  theme?: string;
  notifications?: Record<string, boolean>;
  marketing?: Record<string, boolean>;
  [k: string]: any;
};

type LeanProfileDoc = {
  _id?: any;
  fullName?: string | null;
  email?: string;
  image?: string | null;
  phone?: {
    countryCode?: string | null;
    number?: string | null;
    e164?: string | null;
  } | null;
  preferences?: LeanPreferences | null;
  profileCompleted?: boolean;
  onboardingCompleted?: boolean;
  role?: string;
  status?: string;
};

/* -------------------------------------------------------------------------- */
/*                                  Queries                                   */
/* -------------------------------------------------------------------------- */

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

/**
 * Read the current user's profile + phone + preferences.
 */
export async function getUserProfile() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return null;

  await connection();

  const user = await User.findById(userId)
    .select(
      "fullName email image phone preferences profileCompleted onboardingCompleted role status",
    )
    .lean<LeanProfileDoc>();

  if (!user) return null;

  return JSON.parse(JSON.stringify(user));
}

/* -------------------------------------------------------------------------- */
/*                                  Update                                    */
/* -------------------------------------------------------------------------- */

export async function updateUserProfile(payload: {
  fullName?: string;
  image?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
  phone?: {
    countryCode?: string | null;
    number?: string | null;
    e164?: string | null;
  };
  preferences?: {
    language?: string;
    currency?: string;
    theme?: "light" | "dark" | "system";
    timezone?: string;
    country?: string | null;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      whatsapp?: boolean;
    };
    marketing?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      whatsapp?: boolean;
      productRecommendations?: boolean;
    };
    orderUpdates?: boolean;
    priceDropAlerts?: boolean;
    backInStockAlerts?: boolean;
    newsletter?: boolean;
  };
}) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Not authenticated" };

  await connection();

  try {
    const update: Record<string, any> = {};

    if (payload.fullName !== undefined) update.fullName = payload.fullName;
    if (payload.image !== undefined) update.image = payload.image;
    if (payload.dateOfBirth !== undefined)
      update.dateOfBirth = payload.dateOfBirth;
    if (payload.gender !== undefined) update.gender = payload.gender;

    if (payload.phone) {
      const cc = payload.phone.countryCode ?? "";
      const num = payload.phone.number ?? "";
      update.phone = {
        countryCode: payload.phone.countryCode ?? null,
        number: payload.phone.number ?? null,
        e164:
          payload.phone.e164 ??
          (cc && num ? `${cc}${num.replace(/\s+/g, "")}` : null),
      };
    }

    // ---- Load current doc once (typed via generic) ----
    const merged = await User.findById(userId)
      .select("fullName phone image preferences")
      .lean<LeanProfileDoc | null>();

    if (!merged) return { error: "User not found" };

    if (payload.preferences) {
      const currentPrefs: LeanPreferences = (merged.preferences ??
        {}) as LeanPreferences;
      update.preferences = {
        ...currentPrefs,
        ...payload.preferences,
        notifications: {
          ...(currentPrefs.notifications ?? {}),
          ...(payload.preferences.notifications ?? {}),
        },
        marketing: {
          ...(currentPrefs.marketing ?? {}),
          ...(payload.preferences.marketing ?? {}),
        },
      };
    }

    // ---- Recompute profileCompleted flag ----
    const finalFullName = update.fullName ?? merged.fullName;
    const finalPhone = update.phone ?? merged.phone;
    const finalImage = update.image ?? merged.image;
    const finalPrefs = (update.preferences ??
      merged.preferences ??
      {}) as LeanPreferences;

    const hasName = Boolean((finalFullName ?? "").toString().trim());
    const hasPhone = Boolean(finalPhone?.number);
    const hasAvatar = Boolean(finalImage);
    const hasPrefs = Boolean(
      finalPrefs.language && finalPrefs.currency && finalPrefs.theme,
    );

    update.profileCompleted = hasName && hasPhone && hasAvatar && hasPrefs;

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true },
    )
      .select(
        "fullName email image phone preferences profileCompleted onboardingCompleted role status",
      )
      .lean<LeanProfileDoc>();

    if (!updated) return { error: "User not found" };

    return { user: JSON.parse(JSON.stringify(updated)) };
  } catch (err: any) {
    console.error("[updateUserProfile]", err);
    return { error: err.message || "Update failed" };
  }
}
