import React from "react";

/**
 * PayPal is disabled until a server-side create/capture flow with amount
 * verification is wired in. The previous component charged a hard-coded
 * $0.01 on the client and never persisted a payment.
 */
const PaypalPayment = () => (
  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
    PayPal is temporarily unavailable.
  </div>
);

export default PaypalPayment;
