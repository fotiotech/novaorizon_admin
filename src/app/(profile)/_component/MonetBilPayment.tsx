"use client";

import { findOrders } from "@/app/actions/order";
import { generatePaymentLink } from "@/app/actions/monetbil_payment";
import { useCart } from "@/app/context/CartContext";
import { useUserData } from "@/app/context/UserDataContext";
import { CartItem } from "@/app/reducer/cartReducer";
import { MonetbilPaymentRequest } from "@/constant/types";
import React, { useEffect, useState } from "react";

interface MonetbilPaymentProps {
  payment_ref?: string;
  orderTotal?: number; // optionally passed from checkout if order not yet created
}

function MonetbilPayment({ payment_ref, orderTotal }: MonetbilPaymentProps) {
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const { items } = useCart(); // ✅ changed from { cart }
  const { user, addresses, paymentMethods } = useUserData();
  const [operator, setOperator] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [order, setOrder] = useState<any>(null);

  // Generate a fallback order number if none provided
  useEffect(() => {
    const generateOrderNumber = () => {
      const datePart = new Date()
        .toISOString()
        .replace(/[-:ZT.]/g, "")
        .slice(0, 14);
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      return `ORD${datePart}${randomStr}`;
    };
    if (!payment_ref) {
      setOrderNumber(generateOrderNumber());
    }
  }, [payment_ref]);

  // Fetch order if payment_ref exists
  useEffect(() => {
    async function fetchOrder() {
      if (payment_ref) {
        try {
          const response = await findOrders({ orderNumber: payment_ref });
          if (response && response.orders && response.orders.length > 0) {
            const foundOrder = response.orders[0];
            setOrder(foundOrder);
            if (foundOrder.orderNumber) {
              setOrderNumber(foundOrder.orderNumber);
            }
          }
        } catch (error) {
          console.error("Error fetching order:", error);
        }
      }
    }
    fetchOrder();
  }, [payment_ref]);

  // Calculate total from cart items (fallback)
  const calculateTotal = (cartItems: CartItem[]) => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  };

  // Determine the total amount to pay – use order total, prop, or calculate from items
  const amount = order?.total ?? orderTotal ?? calculateTotal(items);

  // Extract billing details from order or fallback to user/address
  const getBillingDetails = () => {
    // If order exists, use its embedded billingAddress and populated paymentMethodId
    if (order?.billingAddress) {
      // Try to get phone from paymentMethodId if populated
      let phone = "";
      if (order.paymentMethodId && typeof order.paymentMethodId === "object") {
        phone = order.paymentMethodId.details?.phoneNumber || "";
      }
      return {
        phone: phone,
        firstName:
          order.billingAddress.firstName ||
          user?.firstName ||
          user?.name?.split(" ")[0] ||
          "",
        lastName:
          order.billingAddress.lastName ||
          user?.lastName ||
          user?.name?.split(" ").slice(1).join(" ") ||
          "",
        email: order.billingAddress.email || user?.email || "",
      };
    }

    // Fallback to user data
    return {
      phone: "",
      firstName: user?.firstName || user?.name?.split(" ")[0] || "",
      lastName:
        user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
    };
  };

  const billing = getBillingDetails();

  const fetchPaymentLink = async (selectedOperator: string) => {
    setOperator(selectedOperator);
    setLoading(true);

    // Build payment request
    const paymentData: MonetbilPaymentRequest = {
      serviceKey: process.env.NEXT_PUBLIC_MONETBIL_KEY as string,
      paymentRef: orderNumber,
      amount: amount,
      phone: billing.phone,
      user: user?.name || billing.firstName,
      firstName: billing.firstName,
      lastName: billing.lastName,
      email: billing.email,
      operator: selectedOperator,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/payment/success`,
      notifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/payment/notification`,
    };

    try {
      const link = await generatePaymentLink(paymentData);
      setPaymentLink(link);
    } catch (error) {
      console.error("Failed to generate payment link", error);
    } finally {
      setLoading(false);
    }
  };

  const operators = [
    { code: "CM_ORANGEMONEY", name: "Orange Cameroun S.A" },
    { code: "CM_MTNMOBILEMONEY", name: "MTN Cameroon Ltd" },
    { code: "CM_EUMM", name: "EXPRESS UNION FINANCE" },
  ];

  // Show error if phone is missing
  if (!billing.phone) {
    return (
      <div className="flex justify-center items-center mt-8 bg-muted p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-md p-6 text-center border border-border">
          <p className="text-destructive">
            Phone number is required for mobile money payment. Please update
            your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center mt-8 bg-muted p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-md p-6 border border-border">
        <h2 className="text-2xl font-semibold text-center mb-6 text-foreground">
          Pay with Mobile Money
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Amount: {amount} CFA
        </p>
        <div className="flex flex-col gap-4">
          {operators.map(({ code, name }) => (
            <button
              key={code}
              onClick={() => fetchPaymentLink(code)}
              disabled={loading}
              className={`w-full border rounded-lg p-3 text-left transition-all duration-300 ${
                operator === code
                  ? "bg-primary/10 border-primary text-foreground"
                  : "hover:bg-muted border-border text-foreground"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="mt-6 text-center">
          {loading ? (
            <p className="text-muted-foreground">Generating payment link...</p>
          ) : paymentLink ? (
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full"
            >
              <button
                title="Pay Now"
                type="button"
                className="bg-primary text-primary-foreground w-full p-3 rounded-lg hover:bg-primary/90 transition-all"
              >
                Pay Now
              </button>
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select an operator to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonetbilPayment;
