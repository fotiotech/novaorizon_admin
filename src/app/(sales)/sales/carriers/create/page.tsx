import CarrierForm from "@/app/(sales)/components/carriers/CarrierForm";
import { createCarrier } from "@/app/actions/carrier";

export default function CreateCarrierPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Create Carrier</h1>
      <CarrierForm
        onSubmit={async (data) => {
          "use server";
          await createCarrier(data);
        }}
        submitLabel="Create Carrier"
      />
    </div>
  );
}