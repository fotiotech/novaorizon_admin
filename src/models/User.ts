import mongoose, { Schema, model, models, Types } from "mongoose";
import bcrypt from "bcryptjs";

/* -------------------------------------------------------------------------- */
/*                                 Sub-schemas                                */
/* -------------------------------------------------------------------------- */

const WishlistItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantId: { type: Schema.Types.ObjectId, default: null }, // size / color variant
    sku: { type: String, trim: true, default: null },
    priceAtAdd: { type: Number, default: null }, // price snapshot
    currency: { type: String, uppercase: true, default: null },
    notifyOnPriceDrop: { type: Boolean, default: false },
    notifyOnRestock: { type: Boolean, default: false },
    note: { type: String, trim: true, maxlength: 300, default: null },
  },
  { _id: true, timestamps: true },
);

/* -------------------------------------------------------------------------- */
/*                                 User schema                                */
/* -------------------------------------------------------------------------- */

const UserSchema = new Schema(
  {
    /* ----------------------------- Auth / identity ---------------------------- */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    emailVerified: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    tokenExpiry: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpiry: { type: Date, default: null },

    role: {
      type: String,
      enum: ["customer", "seller", "admin", "support"],
      default: "customer",
      index: true,
    },

    // NextAuth / adapter collections
    accounts: { type: [Schema.Types.Mixed], default: [] },
    sessions: { type: [Schema.Types.Mixed], default: [] },

    /* --------------------------------- Profile -------------------------------- */
    fullName: { type: String, trim: true, default: null },
    image: { type: String, default: null }, // avatar URL (S3 / Cloudinary / etc.)

    dateOfBirth: { type: Date, default: null }, // for birthday offers (optional)
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say", null],
      default: null,
    },

    profileCompleted: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },

    /* ---------------------------------- Phone --------------------------------- */
    phone: {
      countryCode: { type: String, trim: true, default: null }, // "+1"
      number: { type: String, trim: true, default: null }, // "5551234567"
      e164: { type: String, trim: true, default: null }, // "+15551234567"
    },
    phoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: { type: Date, default: null },

    /* --------------------------------- Wishlist ------------------------------- */
    wishlist: { type: [WishlistItemSchema], default: [] },

    /* -------------------------------- Loyalty --------------------------------- */
    loyalty: {
      points: { type: Number, default: 0, min: 0 },
      tier: {
        type: String,
        enum: ["bronze", "silver", "gold", "platinum"],
        default: "bronze",
      },
      lifetimePoints: { type: Number, default: 0, min: 0 },
    },
    walletBalance: { type: Number, default: 0, min: 0 },
    referralCode: { type: String, unique: true, sparse: true, trim: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    /* ------------------------------- Preferences ------------------------------ */
    preferences: {
      language: { type: String, default: "en", lowercase: true, trim: true },
      currency: { type: String, default: "xaf", uppercase: true, trim: true },
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      timezone: { type: String, default: "UTC" },
      country: { type: String, default: null, uppercase: true, trim: true },

      /**
       * Service notifications (order/account updates).
       * There is no separate `orderUpdates` flag — if a channel is on,
       * service messages go through it.
       */
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },

      /**
       * Marketing consent. `email` is the single opt-in captured at signup
       * and is kept in sync with the NewsletterSubscriber collection.
       * Other channels are reserved for future use.
       */
      marketing: {
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false },
        productRecommendations: { type: Boolean, default: false },
      },

      priceDropAlerts: { type: Boolean, default: false },
      backInStockAlerts: { type: Boolean, default: false },

      // Consent audit trail (GDPR / CAN-SPAM)
      consentedAt: { type: Date, default: null },
      unsubscribedAt: { type: Date, default: null },
    },

    /* --------------------------------- Status --------------------------------- */
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending"],
      default: "active",
      index: true,
    },
    lastLoginAt: { type: Date, default: null },
    loginCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null }, // soft delete
  },
  {
    timestamps: true, // adds createdAt / updatedAt
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, any>) {
        delete ret.password;
        delete ret.verificationToken;
        delete ret.resetPasswordToken;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

/* -------------------------------------------------------------------------- */
/*                                   Indexes                                  */
/* -------------------------------------------------------------------------- */

UserSchema.index({ "phone.e164": 1 }, { unique: true, sparse: true });
UserSchema.index({ "wishlist.product": 1 });
UserSchema.index({ createdAt: -1 });

/* -------------------------------------------------------------------------- */
/*                              Hooks / Methods                               */
/* -------------------------------------------------------------------------- */

// Hash password before saving
UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // keep derived flags in sync
    if (this.emailVerified) this.isVerified = true;
    if (this.phone?.number && !this.phone.e164) {
      this.phone.e164 = `${this.phone.countryCode ?? ""}${this.phone.number}`;
    }
    if (!this.referralCode) {
      this.referralCode = generateReferralCode(this.email);
    }

    next();
  } catch (err) {
    next(err as Error);
  }
});

// Compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword: string) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Convenience: check whether a product is already wishlisted
UserSchema.methods.isWishlisted = function (productId: Types.ObjectId) {
  return this.wishlist.some(
    (item: { product: Types.ObjectId }) =>
      String(item.product) === String(productId),
  );
};

// Convenience: opt-in check used by your email/SMS service
UserSchema.methods.canReceive = function (
  channel: "email" | "sms" | "push" | "whatsapp",
  type: "marketing" | "notifications",
) {
  if (this.status !== "active" || this.deletedAt) return false;
  return Boolean(this.preferences?.[type]?.[channel]);
};

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function generateReferralCode(email: string): string {
  const base = (email ?? "user").split("@")[0].replace(/[^a-z0-9]/gi, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base.slice(0, 6).toUpperCase()}${rand}`;
}

/* -------------------------------------------------------------------------- */
/*                                   Model                                    */
/* -------------------------------------------------------------------------- */

const User = models.User || model("User", UserSchema);

export default User;
