"use server";


import { requireAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Types } from "mongoose";

import { connection } from "@/utils/connection";
import Address from "@/models/Address";
import { PaymentMethod } from "@/models/PaymentMethod";
import { requireUser } from "@/lib/authz";

// ------------------ Authentication Helper ------------------
async function getAuthenticatedUser() {
  const user = await requireUser();
  return user.id;
}

// ------------------ Validation Schemas (Zod) ------------------
// Card entry is disabled until a tokenizing/hosted form is integrated.
const paymentMethodSchema = z.discriminatedUnion("methodType", [
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
  await requireAdmin();
  const userId = await getAuthenticatedUser();
  await connection();

  if (
    data &&
    typeof data === "object" &&
    (data as { methodType?: string }).methodType === "CreditCard"
  ) {
    throw new Error(
      "Card payments are not enabled yet. Please use Mobile Money or PayPal.",
    );
  }

  const validated = paymentMethodSchema.parse(data);

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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
