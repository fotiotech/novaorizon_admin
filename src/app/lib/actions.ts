"use server";

import { FormState, SignupFormSchema } from "./definitions";
import User from "@/models/User";
import { connection } from "@/utils/connection";
import crypto from "crypto";

export async function signup(state: FormState, formData: FormData) {
  const validatedFields = SignupFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    phoneCountryCode: formData.get("phoneCountryCode"),
    phoneNumber: formData.get("phoneNumber"),
    notifyEmail: formData.get("notifyEmail") === "on",
    notifySms: formData.get("notifySms") === "on",
    notifyPush: formData.get("notifyPush") === "on",
    notifyWhatsapp: formData.get("notifyWhatsapp") === "on",
    marketingEmail: formData.get("marketingEmail") === "on",
    orderUpdates: formData.get("orderUpdates") === "on",
    newsletter: formData.get("newsletter") === "on",
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    email,
    password,
    fullName,
    phoneCountryCode,
    phoneNumber,
    notifyEmail,
    notifySms,
    notifyPush,
    notifyWhatsapp,
    marketingEmail,
    orderUpdates,
    newsletter,
  } = validatedFields.data;

  try {
    await connection();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { error: "Email is already registered." };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000);

    const cc = (phoneCountryCode ?? "").trim();
    const num = (phoneNumber ?? "").trim();
    const e164 = cc && num ? `${cc}${num.replace(/\s+/g, "")}` : null;

    const hasName = Boolean(fullName?.trim());
    const hasPhone = Boolean(num);

    // language / currency / theme use model defaults now;
    // the user can edit them from /profile via the modal.
    const newUser = new User({
      name: fullName,
      fullName,
      email,
      password,

      isVerified: true,
      emailVerified: new Date(),
      status: "active",

      phone: {
        countryCode: cc || null,
        number: num || null,
        e164,
      },

      preferences: {
        // language/currency/theme intentionally omitted → use schema defaults
        notifications: {
          email: notifyEmail,
          sms: notifySms,
          push: notifyPush,
          whatsapp: notifyWhatsapp,
        },
        marketing: {
          email: marketingEmail,
        },
        orderUpdates,
        newsletter,
        consentedAt: new Date(),
      },

      verificationToken: token,
      tokenExpiry: expires,

      role: "user",
      profileCompleted: hasName && hasPhone,
    });

    const user = await newUser.save();

    if (!user) {
      return {
        message: "An error occurred while creating your account.",
      };
    }

    return {
      message: "Account created successfully. Please log in to your account.",
    };
  } catch (error: any) {
    console.error(error);
    return { error: "Registration failed. Try again." };
  }
}
