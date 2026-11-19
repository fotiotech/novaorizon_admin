// app/sales/carriers/edit/[id]/_component/EditCarrierClient.tsx
"use client";

import CarrierForm from "@/app/(root)/orders/components/carriers/CarrierForm";
import { updateCarrier } from "@/lib/api/carrier";

export default function EditCarrierClient({
  carrierId,
  initialCarrier,
}: {
  carrierId: string;
  initialCarrier: any | null;
}) {
  if (!initialCarrier) {
    return <div className="text-destructive">Carrier not found</div>;
  }

  // Convert _id to string and flatten regions
  const initialData = {
    ...initialCarrier,
    _id: initialCarrier?._id?.toString(),
    regionsServed: initialCarrier?.regionsServed?.map((r: any) => ({
      ...r,
      _id: r?._id?.toString(),
    })),
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Edit Carrier</h1>
      <CarrierForm
        initialData={initialData}
        onSubmit={async (data) => {
          await updateCarrier(carrierId, data);
        }}
        submitLabel="Update Carrier"
      />
    </div>
  );
}
