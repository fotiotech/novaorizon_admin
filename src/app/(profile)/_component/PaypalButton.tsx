// components/PayPalButton.tsx
import { useEffect } from "react";
import { loadScript } from "@paypal/paypal-js";

interface PayPalButtonProps {
  amount: string; // Amount to be paid
  currency: string;
  onSuccess: (details: any) => void; // Callback for success
  onError: (error: any) => void; // Callback for error
}

const PayPalButton: React.FC<PayPalButtonProps> = ({
  amount,
  currency,
  onSuccess,
  onError,
}) => {
  useEffect(() => {
    // if (typeof window !== "undefined") {
    // Load PayPal script
    loadScript({ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID as string })
      .then((paypal) => {
        if (!paypal) return;
        // Render PayPal Buttons
        paypal.Buttons!({
          createOrder: (data, actions) => {
            return actions.order.create({
              intent: "CAPTURE",
              purchase_units: [
                {
                  amount: {
                    value: amount,
                    currency_code: currency,
                  },
                },
              ],
            });
          },
          onApprove: async (data, actions) => {
            try {
              const details = await actions.order?.capture();
              onSuccess(details);
            } catch (error) {
              onError(error);
            }
          },
          onError: (err) => {
            onError(err);
          },
        }).render("#paypal-button-container");
      })
      .catch((error) => console.error("Failed to load PayPal script", error));
    // }
  }, [amount, onSuccess, onError]);

  return <div id="paypal-button-container"></div>;
};

export default PayPalButton;
