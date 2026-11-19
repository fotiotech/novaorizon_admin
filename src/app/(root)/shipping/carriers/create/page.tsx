"use client";

import CarrierForm from "@/app/(root)/orders/components/carriers/CarrierForm";
import { createCarrier } from "@/lib/api/carrier";

export default function CreateCarrierPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Create Carrier</h1>
      <CarrierForm
        onSubmit={async (data) => {
          await createCarrier(data);
        }}
        submitLabel="Create Carrier"
      />
    </div>
  );
}
