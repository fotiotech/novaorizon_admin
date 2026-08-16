import mongoose, { Schema, Document, Model } from "mongoose";

// ------------------ Base Interface ------------------
interface IPaymentMethodBase extends Document {
  userId: mongoose.Types.ObjectId;
  methodType: "CreditCard" | "MobileMoney" | "PayPal";
  createdAt: Date;
  updatedAt: Date;
}

// ------------------ Credit Card (Uses Address Reference) ------------------
interface ICreditCardPaymentMethod extends IPaymentMethodBase {
  methodType: "CreditCard";
  details: {
    cardNumber: string; // we'll store full but we can mask
    last4: string; // added
    cardType: string; // added: Visa, Mastercard, etc.
    expiryMonth: string; // added
    expiryYear: string; // added
    expiryDate: string; // keep for legacy or convenience
    cardholderName: string;
    billingAddressId: mongoose.Types.ObjectId;
  };
}

// ------------------ Mobile Money ------------------
interface IMobileMoneyPaymentMethod extends IPaymentMethodBase {
  methodType: "MobileMoney";
  details: {
    phoneNumber: string;
    provider: "MTN" | "Orange" | "Camtel";
    reference?: string;
  };
}

// ------------------ PayPal ------------------
interface IPayPalPaymentMethod extends IPaymentMethodBase {
  methodType: "PayPal";
  details: {
    email: string;
  };
}

type IPaymentMethod =
  | ICreditCardPaymentMethod
  | IMobileMoneyPaymentMethod
  | IPayPalPaymentMethod;

// ------------------ Schema Definitions ------------------
const baseOptions = { timestamps: true, discriminatorKey: "methodType" };

const BasePaymentMethodSchema = new Schema<IPaymentMethodBase>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    methodType: {
      type: String,
      required: true,
      enum: ["CreditCard", "MobileMoney", "PayPal"],
    },
  },
  baseOptions,
);

// --- Credit Card Schema (References Address) ---
const CreditCardSchema = new Schema<ICreditCardPaymentMethod>({
  details: {
    cardNumber: { type: String, required: true },
    last4: { type: String, required: true },
    cardType: { type: String, required: true },
    expiryMonth: { type: String, required: true },
    expiryYear: { type: String, required: true },
    expiryDate: { type: String, required: true }, // e.g., "12/25"
    cardholderName: { type: String, required: true },
    billingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
  },
});

// --- Mobile Money Schema ---
const MobileMoneySchema = new Schema<IMobileMoneyPaymentMethod>({
  details: {
    phoneNumber: { type: String, required: true },
    provider: {
      type: String,
      required: true,
      enum: ["MTN", "Orange", "Camtel"],
    },
    reference: { type: String },
  },
});

// --- PayPal Schema ---
const PayPalSchema = new Schema<IPayPalPaymentMethod>({
  details: {
    email: { type: String, required: true },
  },
});

// ------------------ Model Creation with Safe Discriminators ------------------
// Use existing model if compiled, else create it
const PaymentMethodModel =
  (mongoose.models.PaymentMethod as Model<IPaymentMethodBase>) ||
  mongoose.model<IPaymentMethodBase>("PaymentMethod", BasePaymentMethodSchema);

// Register discriminators ONLY if not already registered
if (!PaymentMethodModel.discriminators?.CreditCard) {
  PaymentMethodModel.discriminator("CreditCard", CreditCardSchema);
}
if (!PaymentMethodModel.discriminators?.MobileMoney) {
  PaymentMethodModel.discriminator("MobileMoney", MobileMoneySchema);
}
if (!PaymentMethodModel.discriminators?.PayPal) {
  PaymentMethodModel.discriminator("PayPal", PayPalSchema);
}

// Export the base model and discriminators (for direct use if needed)
export {
  PaymentMethodModel as PaymentMethod,
  // Also export the discriminator models if needed
};
export type {
  IPaymentMethod,
  ICreditCardPaymentMethod,
  IMobileMoneyPaymentMethod,
  IPayPalPaymentMethod,
};
