"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/app/auth";

import { connection } from "@/utils/connection";
import Address from "@/models/Address";
import { PaymentMethod } from "@/models/PaymentMethod";

// Helper to detect card type from number
function getCardType(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, "");
  if (/^4/.test(cleaned)) return "Visa";
  if (/^5[1-5]/.test(cleaned)) return "Mastercard";
  if (/^3[47]/.test(cleaned)) return "Amex";
  if (/^6(?:011|5)/.test(cleaned)) return "Discover";
  return "Card";
}

// Helper to get last 4 digits
function getLast4(cardNumber: string): string {
  return cardNumber.replace(/\D/g, "").slice(-4);
}

// ------------------ Authentication Helper ------------------
async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ------------------ Validation Schemas (Zod) ------------------
const paymentMethodSchema = z.discriminatedUnion("methodType", [
  z.object({
    methodType: z.literal("CreditCard"),
    details: z.object({
      cardNumber: z.string().min(1, "Card number is required"),
      expiryDate: z.string().min(1, "Expiry date is required"), // format "MM/YY"
      cardholderName: z.string().min(1, "Cardholder name is required"),
      billingAddressId: z.string().min(1, "Billing address is required"),
    }),
  }),
  z.object({
    methodType: z.literal("MobileMoney"),
    details: z.object({
      phoneNumber: z.string().min(9).max(13),
      provider: z.enum(["MTN", "Orange", "Camtel"]),
      reference: z.string().optional(),
    }),
  }),
  z.object({
    methodType: z.literal("PayPal"),
    details: z.object({
      email: z.string().email(),
    }),
  }),
]);

// ------------------ CREATE Payment Method ------------------
export async function createPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>,
) {
  const userId = await getAuthenticatedUser();
  await connection();

  const validated = paymentMethodSchema.parse(data);

  if (validated.methodType === "CreditCard") {
    const { billingAddressId, cardNumber, expiryDate, cardholderName } =
      validated.details;

    // Verify address belongs to user
    const address = await Address.findOne({
      _id: billingAddressId,
      userId: new Types.ObjectId(userId),
    });
    if (!address) throw new Error("Invalid billing address");

    // Compute derived fields
    const last4 = getLast4(cardNumber);
    const cardType = getCardType(cardNumber);
    const [expiryMonth, expiryYear] = expiryDate.split("/"); // "12/25" -> ["12", "25"]

    const card = new PaymentMethod({
      userId: new Types.ObjectId(userId),
      methodType: "CreditCard",
      details: {
        cardNumber,
        last4,
        cardType,
        expiryMonth,
        expiryYear,
        expiryDate,
        cardholderName,
        billingAddressId: new Types.ObjectId(billingAddressId),
      },
    });

    await card.save();
    revalidatePath("/profile/payment-methods");
    return { success: true, paymentMethod: JSON.parse(JSON.stringify(card)) };
  }

  // Mobile Money
  if (validated.methodType === "MobileMoney") {
    const mobile = new PaymentMethod({
      userId: new Types.ObjectId(userId),
      methodType: "MobileMoney",
      details: validated.details,
    });
    await mobile.save();
    revalidatePath("/profile/payment-methods");
    return { success: true, paymentMethod: JSON.parse(JSON.stringify(mobile)) };
  }

  // PayPal
  if (validated.methodType === "PayPal") {
    const paypal = new PaymentMethod({
      userId: new Types.ObjectId(userId),
      methodType: "PayPal",
      details: validated.details,
    });
    await paypal.save();
    revalidatePath("/profile/payment-methods");
    return { success: true, paymentMethod: JSON.parse(JSON.stringify(paypal)) };
  }

  throw new Error("Unsupported payment method");
}

// ------------------ GET Payment Methods ------------------
export async function getUserPaymentMethods() {
  const userId = await getAuthenticatedUser();
  await connection();

  const methods = await PaymentMethod.find({
    userId: new Types.ObjectId(userId),
  })
    .populate({
      path: "details.billingAddressId",
      model: "Address",
    })
    .sort({ createdAt: -1 })
    .lean();

  // Return plain objects; the profile page expects fields like last4, cardType, expiryMonth, expiryYear
  return JSON.parse(JSON.stringify(methods));
}

// ------------------ DELETE Payment Method ------------------
export async function deletePaymentMethod(paymentMethodId: string) {
  const userId = await getAuthenticatedUser();
  await connection();

  const result = await PaymentMethod.findOneAndDelete({
    _id: paymentMethodId,
    userId: new Types.ObjectId(userId),
  });
  if (!result) throw new Error("Payment method not found or unauthorized");

  revalidatePath("/profile/payment-methods");
  return { success: true, message: "Deleted" };
}

// ------------------ UPDATE Credit Card ------------------
export async function updateCreditCard(
  paymentMethodId: string,
  updates: {
    expiryDate?: string;
    cardholderName?: string;
    billingAddressId?: string;
  },
) {
  const userId = await getAuthenticatedUser();
  await connection();

  if (updates.billingAddressId) {
    const address = await Address.findOne({
      _id: updates.billingAddressId,
      userId: new Types.ObjectId(userId),
    });
    if (!address) throw new Error("Invalid billing address");
  }

  const updateObj: any = {};
  if (updates.expiryDate) {
    const [expiryMonth, expiryYear] = updates.expiryDate.split("/");
    updateObj["details.expiryDate"] = updates.expiryDate;
    updateObj["details.expiryMonth"] = expiryMonth;
    updateObj["details.expiryYear"] = expiryYear;
  }
  if (updates.cardholderName) {
    updateObj["details.cardholderName"] = updates.cardholderName;
  }
  if (updates.billingAddressId) {
    updateObj["details.billingAddressId"] = new Types.ObjectId(
      updates.billingAddressId,
    );
  }

  const updated = await PaymentMethod.findOneAndUpdate(
    {
      _id: paymentMethodId,
      userId: new Types.ObjectId(userId),
      methodType: "CreditCard",
    },
    { $set: updateObj },
    { new: true, runValidators: true },
  ).populate("details.billingAddressId");

  if (!updated) throw new Error("Credit card not found or unauthorized");

  revalidatePath("/profile/payment-methods");
  return { success: true, paymentMethod: JSON.parse(JSON.stringify(updated)) };
}
