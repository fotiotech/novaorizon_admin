import { findCustomer } from "@/app/actions/customer";
import { generatePaymentLink } from "@/app/actions/monetbil_payment";
import { useCart } from "@/app/context/CartContext";
import { useUserData } from "@/app/context/UserDataContext"; // 👈 new import
import { CartItem } from "@/app/reducer/cartReducer";
import { Customer, MonetbilPaymentRequest } from "@/constant/types";
import React, { useEffect, useState } from "react";

function MonetbilPayment() {
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const { cart } = useCart();
  const { user } = useUserData(); // 👈 use new context
  const [customer, setCustomer] = useState<Customer>();
  const [operator, setOperator] = useState<string>("");

  const calculateTotal = (cartItems: any) => {
    return cartItems.reduce(
      (total: number, item: CartItem) => total + item.price * item.quantity,
      0,
    );
  };

  useEffect(() => {
    async function getCustomer() {
      // Use 'id' or '_id' – whichever exists
      const userId = user?.id || user?._id;
      if (userId) {
        const response = await findCustomer(userId);
        setCustomer(response);
      }
    }
    getCustomer();
  }, [user]); // 👈 add user as dependency

  // Safely access billingAddress fields
  const billingAddress =
    (customer?.billingAddress as {
      phone?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    }) || {};

  const paymentData: MonetbilPaymentRequest = {
    serviceKey: process.env.NEXT_PUBLIC_MONETBIL_KEY as string,
    amount: calculateTotal(cart),
    phone: billingAddress?.phone,
    user: user?.name,
    firstName: billingAddress.firstName,
    lastName: billingAddress.lastName,
    email: billingAddress.email,
    operator: operator,
    returnUrl: `${process.env.NEXT_PUBLIC_API_URL}/checkout/payment/success`,
    notifyUrl: `${process.env.NEXT_PUBLIC_API_URL}/checkout/payment/notification`,
  };

  const fetchPaymentLink = async () => {
    const link = await generatePaymentLink(paymentData);
    if (link) {
      setPaymentLink(link);
    } else {
      console.error("Failed to generate payment link");
    }
  };

  return (
    <div className="flex justify-center items-center">
      <div>
        <h2 className="text-xl font-bold">Monetbil (Mobile Money)</h2>
        <ul className="flex flex-col gap-3 my-3 p-2">
          <li
            onClick={() => {
              setOperator("CM_ORANGEMONEY");
              fetchPaymentLink();
            }}
            className={`${
              operator === "CM_ORANGEMONEY" ? "bg-gray-300" : ""
            } border p-2 rounded-lg cursor-pointer`}
          >
            Orange Cameroun S.A
          </li>
          <li
            onClick={() => {
              setOperator("CM_MTNMOBILEMONEY");
              fetchPaymentLink();
            }}
            className={`${
              operator === "CM_MTNMOBILEMONEY" ? "bg-gray-300" : ""
            } border p-2 rounded-lg cursor-pointer`}
          >
            MTN Cameroon Ltd
          </li>
          <li
            onClick={() => {
              setOperator("CM_EUMM");
              fetchPaymentLink();
            }}
            className={`${
              operator === "CM_EUMM" ? "bg-gray-300" : ""
            } border p-2 rounded-lg cursor-pointer`}
          >
            EXPRESS UNION FINANCE
          </li>
        </ul>
        {paymentLink ? (
          <a href={paymentLink} target="_blank" rel="noopener noreferrer">
            <button
              title="pay now"
              type="button"
              className="btn text-center p-2 w-full rounded-lg"
            >
              Pay Now
            </button>
          </a>
        ) : (
          <p className="text-center">Loading payment link...</p>
        )}
      </div>
    </div>
  );
}

export default MonetbilPayment;
