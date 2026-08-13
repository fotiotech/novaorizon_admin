import PropertyForm from "../../../_component/PropertyForm";

export default async function EditPropertyPage({
  params,
}: {
  params: { id: string };
}) {
  return <PropertyForm propertyId={params.id} />;
}
