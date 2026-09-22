// models/PaymentSettings.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface MobileMoneyProviderConfig {
  enabled: boolean;
  /** Human-readable merchant / business name shown to customers */
  merchantName: string;
  /** Merchant code / short code / paybill number */
  merchantCode: string;
  /** Public identifier (API user, client ID) — safe to show in dashboards */
  clientId: string;
  /** Secret — API key, client secret, subscription key */
  clientSecret: string;
  /** Optional subscription key (MTN MoMo uses this in addition to API user/key) */
  subscriptionKey: string;
  /** USSD short code for manual dial-in fallback */
  ussdCode: string;
  /** "sandbox" | "production" */
  environment: "sandbox" | "production";
  /** Shown on the checkout page under the option */
  instructions: string;
}

export interface IPaymentSettings extends Document {
  key: string; // "payment" — singleton

  // ---- Method toggles ----
  cashOnDelivery: {
    enabled: boolean;
    minimumOrder: number;
    fee: number;
    instructions: string;
  };
  cardPayment: {
    enabled: boolean;
    provider: "stripe" | "paystack" | "flutterwave" | "none";
    publicKey: string;
    secretKey: string;
    environment: "sandbox" | "production";
  };
  bankTransfer: {
    enabled: boolean;
    bankName: string;
    accountName: string;
    accountNumber: string;
    swift: string;
    instructions: string;
  };

  // ---- Mobile money ----
  mobileMoney: {
    /** Master switch for the whole mobile money section */
    enabled: boolean;
    mtm: MobileMoneyProviderConfig; // MTN Mobile Money
    orange: MobileMoneyProviderConfig; // Orange Money
    wave: MobileMoneyProviderConfig;
    moov: MobileMoneyProviderConfig;
  };

  // ---- General ----
  currency: string;
  currencySymbol: string;
  defaultMethod: "cash_on_delivery" | "card" | "bank_transfer" | "mobile_money";
  testMode: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const ProviderSchema = new Schema<MobileMoneyProviderConfig>(
  {
    enabled: { type: Boolean, default: false },
    merchantName: { type: String, default: "", trim: true },
    merchantCode: { type: String, default: "", trim: true },
    clientId: { type: String, default: "", trim: true },
    clientSecret: { type: String, default: "", trim: true },
    subscriptionKey: { type: String, default: "", trim: true },
    ussdCode: { type: String, default: "", trim: true },
    environment: {
      type: String,
      enum: ["sandbox", "production"],
      default: "sandbox",
    },
    instructions: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const emptyProvider = (): MobileMoneyProviderConfig => ({
  enabled: false,
  merchantName: "",
  merchantCode: "",
  clientId: "",
  clientSecret: "",
  subscriptionKey: "",
  ussdCode: "",
  environment: "sandbox",
  instructions: "",
});

const PaymentSettingsSchema = new Schema<IPaymentSettings>(
  {
    key: { type: String, required: true, unique: true, default: "payment" },

    cashOnDelivery: {
      enabled: { type: Boolean, default: true },
      minimumOrder: { type: Number, default: 0, min: 0 },
      fee: { type: Number, default: 0, min: 0 },
      instructions: { type: String, default: "" },
    },

    cardPayment: {
      enabled: { type: Boolean, default: false },
      provider: {
        type: String,
        enum: ["stripe", "paystack", "flutterwave", "none"],
        default: "none",
      },
      publicKey: { type: String, default: "" },
      secretKey: { type: String, default: "" },
      environment: {
        type: String,
        enum: ["sandbox", "production"],
        default: "sandbox",
      },
    },

    bankTransfer: {
      enabled: { type: Boolean, default: false },
      bankName: { type: String, default: "" },
      accountName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      swift: { type: String, default: "" },
      instructions: { type: String, default: "" },
    },

    mobileMoney: {
      enabled: { type: Boolean, default: false },
      mtm: { type: ProviderSchema, default: emptyProvider },
      orange: { type: ProviderSchema, default: emptyProvider },
      wave: { type: ProviderSchema, default: emptyProvider },
      moov: { type: ProviderSchema, default: emptyProvider },
    },

    currency: { type: String, default: "XAF" },
    currencySymbol: { type: String, default: "CFA" },
    defaultMethod: {
      type: String,
      enum: ["cash_on_delivery", "card", "bank_transfer", "mobile_money"],
      default: "cash_on_delivery",
    },
    testMode: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const PaymentSettings: Model<IPaymentSettings> =
  mongoose.models.PaymentSettings ||
  mongoose.model<IPaymentSettings>("PaymentSettings", PaymentSettingsSchema);

export default PaymentSettings;
