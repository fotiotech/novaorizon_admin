import { findCustomer } from "@/app/actions/customer";
import { generatePaymentLink } from "@/app/actions/monetbil_payment";
import { useCart } from "@/app/context/CartContext";
import { useUser } from "@/app/context/UserContext";
import { CartItem } from "@/app/reducer/cartReducer";
import { Customer, MonetbilPaymentRequest } from "@/constant/types";
import React, { useEffect, useState } from "react";

function MonetbilPayment() {
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const { cart } = useCart();
  const { user } = useUser(); // Replace with actual service key from Monetbil
  const [customer, setCustomer] = useState<Customer>();
  const [operator, setOperator] = useState<string>("");

  const calculateTotal = (cartItems: any) => {
    // Assuming each cart item has a `price` and `quantity` property
    return cartItems.reduce(
      (total: number, item: CartItem) => total + item.price * item.quantity,
      0
    );
  };

  useEffect(() => {
    async function getCustomer() {
      if (user?._id) {
        const response = await findCustomer(user._id);
        setCustomer(response);
      }
    }
    getCustomer();
  }, []);

  const paymentData: MonetbilPaymentRequest = {
    serviceKey: process.env.NEXT_PUBLIC_MONETBIL_KEY as string,
    amount: calculateTotal(cart),
    phone: customer?.billingAddress.phone,
    user: user?.name,
    firstName: customer?.billingAddress.firstName,
    lastName: customer?.billingAddress.lastName,
    email: customer?.billingAddress.email,
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
            } border p-2 rounded-lg
            `}
          >
            Orange Cameroun S.A{" "}
          </li>
          <li
            onClick={() => {
              setOperator("CM_MTNMOBILEMONEY");
              fetchPaymentLink();
            }}
            className={`${
              operator === "CM_MTNMOBILEMONEY" ? "bg-gray-300" : ""
            } border p-2 rounded-lg`}
          >
            MTN Cameroon Ltd
          </li>
          <li
            onClick={() => {
              setOperator("CM_EUMM ");
              fetchPaymentLink();
            }}
            className={` ${
              operator === "CM_EUMM " ? "bg-gray-300" : ""
            } border p-2 rounded-lg`}
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
