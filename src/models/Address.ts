import mongoose, { Schema, Document, Model } from "mongoose";

// ------------------ Interface ------------------
export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId; // Owner of the address
  label: string; // e.g., "Home", "Office", "Parents' House"
  street: string;
  city: string;
  state?: string; // Optional, useful for countries with states
  postalCode: string;
  country: string; // e.g., "Cameroon"
  isDefault: boolean; // If true, used as fallback for invoices
  createdAt: Date;
  updatedAt: Date;
}

// ------------------ Schema ------------------
const AddressSchema = new Schema<IAddress>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Important for fast user lookups
    },
    label: {
      type: String,
      required: true,
      trim: true,
      default: "Default", // Provide a sensible fallback
    },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String }, // optional
    postalCode: { type: String, required: true },
    country: { type: String, required: true, default: "Cameroon" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ------------------ Ensure only ONE default address per user ------------------
// This middleware prevents multiple "default" addresses for the same user
AddressSchema.pre("save", async function (next) {
  if (this.isDefault) {
    await Address.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false },
    );
  }
  next();
});

// ------------------ Model Export ------------------
const Address =
  (mongoose.models.Address as Model<IAddress>) ||
  mongoose.model<IAddress>("Address", AddressSchema);

export default Address;
