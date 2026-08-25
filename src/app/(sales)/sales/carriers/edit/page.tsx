import CarrierForm from "@/app/(sales)/components/carriers/CarrierForm";
import { getCarriersById, updateCarrier } from "@/app/actions/carrier";

export default async function EditCarrierPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const carrier = await getCarriersById(params.id);
  if (!carrier) {
    return <div className="text-destructive">Carrier not found</div>;
  }

  // Convert _id to string and flatten regions
  const initialData = {
    ...carrier,
    _id: carrier._id.toString(),
    regionsServed: carrier.regionsServed.map((r: any) => ({
      ...r,
      _id: r._id?.toString(),
    })),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Edit Carrier</h1>
      <CarrierForm
        initialData={initialData}
        onSubmit={async (data) => {
          "use server";
          await updateCarrier(params.id, data);
        }}
        submitLabel="Update Carrier"
      />
    </div>
  );
}