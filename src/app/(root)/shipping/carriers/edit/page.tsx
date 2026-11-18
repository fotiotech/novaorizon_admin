"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CarrierForm from "@/app/(root)/orders/components/carriers/CarrierForm";
import { getCarriersById, updateCarrier } from "@/lib/api/carrier";

export default function EditCarrierPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [carrier, setCarrier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    if (!id) {
      setCarrier(null);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    getCarriersById(id)
      .then((data) => {
        if (isActive) setCarrier(data);
      })
      .catch((error) => {
        console.error(error);
        if (isActive) setCarrier(null);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (loading) {
    return <div className="text-muted-foreground">Loading carrier...</div>;
  }

  if (!carrier) {
    return <div className="text-destructive">Carrier not found</div>;
  }

  // Convert _id to string and flatten regions
  const initialData = {
    ...carrier,
    _id: carrier?._id?.toString(),
    regionsServed: carrier?.regionsServed?.map((r: any) => ({
      ...r,
      _id: r?._id?.toString(),
    })),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Edit Carrier</h1>
      <CarrierForm
        initialData={initialData}
        onSubmit={async (data) => {
          if (!id) return;
          await updateCarrier(id, data);
        }}
        submitLabel="Update Carrier"
      />
    </div>
  );
}
