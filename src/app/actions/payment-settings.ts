// app/actions/payment-settings.ts
"use server";

import { connection } from "@/utils/connection";
import PaymentSettings, {
  MobileMoneyProviderConfig,
} from "@/models/PaymentSettings";
import { revalidatePath } from "next/cache";

const KEY = "payment";

export interface PaymentSettingsData {
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
  mobileMoney: {
    enabled: boolean;
    mtm: MobileMoneyProviderConfig;
    orange: MobileMoneyProviderConfig;
    wave: MobileMoneyProviderConfig;
    moov: MobileMoneyProviderConfig;
  };
  currency: string;
  currencySymbol: string;
  defaultMethod: "cash_on_delivery" | "card" | "bank_transfer" | "mobile_money";
  testMode: boolean;
}

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

const DEFAULTS: PaymentSettingsData = {
  cashOnDelivery: {
    enabled: true,
    minimumOrder: 0,
    fee: 0,
    instructions: "Pay with cash when your order is delivered.",
  },
  cardPayment: {
    enabled: false,
    provider: "none",
    publicKey: "",
    secretKey: "",
    environment: "sandbox",
  },
  bankTransfer: {
    enabled: false,
    bankName: "",
    accountName: "",
    accountNumber: "",
    swift: "",
    instructions: "",
  },
  mobileMoney: {
    enabled: false,
    mtm: emptyProvider(),
    orange: emptyProvider(),
    wave: emptyProvider(),
    moov: emptyProvider(),
  },
  currency: "XAF",
  currencySymbol: "CFA",
  defaultMethod: "cash_on_delivery",
  testMode: true,
};

/* ------------------------------------------------------------------ */
/*  Serialization                                                      */
/* ------------------------------------------------------------------ */
function serializeProvider(p: any): MobileMoneyProviderConfig {
  const base = emptyProvider();
  if (!p) return base;
  return {
    enabled: !!p.enabled,
    merchantName: p.merchantName ?? "",
    merchantCode: p.merchantCode ?? "",
    clientId: p.clientId ?? "",
    clientSecret: p.clientSecret ?? "",
    subscriptionKey: p.subscriptionKey ?? "",
    ussdCode: p.ussdCode ?? "",
    environment: p.environment === "production" ? "production" : "sandbox",
    instructions: p.instructions ?? "",
  };
}

function serialize(doc: any): PaymentSettingsData {
  if (!doc) return DEFAULTS;
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    cashOnDelivery: {
      enabled: !!o.cashOnDelivery?.enabled,
      minimumOrder: Number(o.cashOnDelivery?.minimumOrder ?? 0),
      fee: Number(o.cashOnDelivery?.fee ?? 0),
      instructions: o.cashOnDelivery?.instructions ?? "",
    },
    cardPayment: {
      enabled: !!o.cardPayment?.enabled,
      provider: o.cardPayment?.provider ?? "none",
      publicKey: o.cardPayment?.publicKey ?? "",
      secretKey: o.cardPayment?.secretKey ?? "",
      environment:
        o.cardPayment?.environment === "production" ? "production" : "sandbox",
    },
    bankTransfer: {
      enabled: !!o.bankTransfer?.enabled,
      bankName: o.bankTransfer?.bankName ?? "",
      accountName: o.bankTransfer?.accountName ?? "",
      accountNumber: o.bankTransfer?.accountNumber ?? "",
      swift: o.bankTransfer?.swift ?? "",
      instructions: o.bankTransfer?.instructions ?? "",
    },
    mobileMoney: {
      enabled: !!o.mobileMoney?.enabled,
      mtm: serializeProvider(o.mobileMoney?.mtm),
      orange: serializeProvider(o.mobileMoney?.orange),
      wave: serializeProvider(o.mobileMoney?.wave),
      moov: serializeProvider(o.mobileMoney?.moov),
    },
    currency: o.currency ?? "XAF",
    currencySymbol: o.currencySymbol ?? "CFA",
    defaultMethod: o.defaultMethod ?? "cash_on_delivery",
    testMode: !!o.testMode,
  };
}

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */
export async function getPaymentSettings(): Promise<PaymentSettingsData> {
  try {
    await connection();
    const doc = await PaymentSettings.findOne({ key: KEY }).lean();
    return serialize(doc);
  } catch (err) {
    console.error("[getPaymentSettings] Failed:", err);
    return DEFAULTS;
  }
}

/* ------------------------------------------------------------------ */
/*  Provider patch builder                                             */
/* ------------------------------------------------------------------ */
function providerPatch(input: any): MobileMoneyProviderConfig {
  return {
    enabled: !!input?.enabled,
    merchantName: String(input?.merchantName ?? "").trim(),
    merchantCode: String(input?.merchantCode ?? "").trim(),
    clientId: String(input?.clientId ?? "").trim(),
    clientSecret: String(input?.clientSecret ?? "").trim(),
    subscriptionKey: String(input?.subscriptionKey ?? "").trim(),
    ussdCode: String(input?.ussdCode ?? "").trim(),
    environment: input?.environment === "production" ? "production" : "sandbox",
    instructions: String(input?.instructions ?? "").trim(),
  };
}

/* ------------------------------------------------------------------ */
/*  Update                                                             */
/* ------------------------------------------------------------------ */
export async function updatePaymentSettings(
  input: Partial<PaymentSettingsData>,
): Promise<{ success: boolean; data?: PaymentSettingsData; error?: string }> {
  try {
    await connection();

    const patch: Record<string, any> = {};

    if (input.cashOnDelivery) {
      const c = input.cashOnDelivery;
      const min = Number(c.minimumOrder ?? 0);
      const fee = Number(c.fee ?? 0);
      if (!Number.isFinite(min) || min < 0) {
        return {
          success: false,
          error: "Minimum order must be a non-negative number",
        };
      }
      if (!Number.isFinite(fee) || fee < 0) {
        return { success: false, error: "Fee must be a non-negative number" };
      }
      patch.cashOnDelivery = {
        enabled: !!c.enabled,
        minimumOrder: min,
        fee,
        instructions: String(c.instructions ?? "").trim(),
      };
    }

    if (input.cardPayment) {
      const c = input.cardPayment;
      patch.cardPayment = {
        enabled: !!c.enabled,
        provider: ["stripe", "paystack", "flutterwave", "none"].includes(
          c.provider as any,
        )
          ? c.provider
          : "none",
        publicKey: String(c.publicKey ?? "").trim(),
        secretKey: String(c.secretKey ?? "").trim(),
        environment: c.environment === "production" ? "production" : "sandbox",
      };
    }

    if (input.bankTransfer) {
      const b = input.bankTransfer;
      patch.bankTransfer = {
        enabled: !!b.enabled,
        bankName: String(b.bankName ?? "").trim(),
        accountName: String(b.accountName ?? "").trim(),
        accountNumber: String(b.accountNumber ?? "").trim(),
        swift: String(b.swift ?? "").trim(),
        instructions: String(b.instructions ?? "").trim(),
      };
    }

    if (input.mobileMoney) {
      const m = input.mobileMoney;
      patch.mobileMoney = {
        enabled: !!m.enabled,
        mtm: providerPatch(m.mtm),
        orange: providerPatch(m.orange),
        wave: providerPatch(m.wave),
        moov: providerPatch(m.moov),
      };
    }

    if (input.currency !== undefined) {
      patch.currency = String(input.currency ?? "XAF")
        .trim()
        .toUpperCase();
    }
    if (input.currencySymbol !== undefined) {
      patch.currencySymbol = String(input.currencySymbol ?? "CFA").trim();
    }
    if (input.defaultMethod !== undefined) {
      const allowed = [
        "cash_on_delivery",
        "card",
        "bank_transfer",
        "mobile_money",
      ];
      patch.defaultMethod = allowed.includes(input.defaultMethod as any)
        ? input.defaultMethod
        : "cash_on_delivery";
    }
    if (input.testMode !== undefined) {
      patch.testMode = !!input.testMode;
    }

    const updated = await PaymentSettings.findOneAndUpdate(
      { key: KEY },
      { $set: patch, $setOnInsert: { key: KEY } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    revalidatePath("/settings/payment");

    return { success: true, data: serialize(updated) };
  } catch (err: any) {
    console.error("[updatePaymentSettings] Failed:", err);
    return {
      success: false,
      error: err?.message || "Failed to save payment settings",
    };
  }
}
