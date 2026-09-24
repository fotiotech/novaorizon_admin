"use server";

import { FormState, SignupFormSchema } from "./definitions";
import User from "@/models/User";
import NewsletterSubscriber from "@/models/NewsletterSubscriber";
import { connection } from "@/utils/connection";
import crypto from "crypto";

/** Read a checkbox that may be absent when unchecked. */
const bool = (formData: FormData, name: string, def = false) => {
  const v = formData.get(name);
  return v === null ? def : v === "on";
};

export async function signup(state: FormState, formData: FormData) {
  const validatedFields = SignupFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    phoneCountryCode: formData.get("phoneCountryCode"),
    phoneNumber: formData.get("phoneNumber"),

    notifyEmail: bool(formData, "notifyEmail", true),
    notifyPush: bool(formData, "notifyPush", true),
    notifySms: bool(formData, "notifySms"),
    notifyWhatsapp: bool(formData, "notifyWhatsapp"),
    marketingEmail: bool(formData, "marketingEmail"),
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
    notifyPush,
    notifySms,
    notifyWhatsapp,
    marketingEmail,
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

    // language / currency / theme use model defaults;
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
        notifications: {
          email: notifyEmail,
          sms: notifySms,
          push: notifyPush,
          whatsapp: notifyWhatsapp,
        },
        marketing: {
          email: marketingEmail,
        },
        consentedAt: new Date(),
      },

      verificationToken: token,
      tokenExpiry: expires,

      role: "customer",
      profileCompleted: hasName && hasPhone,
    });

    const user = await newUser.save();

    if (!user) {
      return {
        message: "An error occurred while creating your account.",
      };
    }

    // ── Newsletter sync: single source of truth ─────────
    // Non-fatal: a failure here must NOT block account creation.
    if (marketingEmail) {
      try {
        const normalized = email.trim().toLowerCase();
        const existing = await NewsletterSubscriber.findOne({
          email: normalized,
        });

        if (existing) {
          if (existing.status !== "subscribed") {
            existing.status = "subscribed";
            existing.subscribedAt = new Date();
            existing.unsubscribedAt = null;
          }
          if (!existing.userId) existing.userId = user._id;
          await existing.save();
        } else {
          await NewsletterSubscriber.create({
            email: normalized,
            source: "signup",
            userId: user._id,
            unsubscribeToken: crypto.randomBytes(24).toString("hex"),
            status: "subscribed",
            subscribedAt: new Date(),
          });
        }
      } catch (err) {
        console.error("[signup] newsletter sync failed:", err);
      }
    }

    return {
      message: "Account created successfully. Please log in to your account.",
    };
  } catch (error: any) {
    console.error(error);
    return { error: "Registration failed. Try again." };
  }
}
