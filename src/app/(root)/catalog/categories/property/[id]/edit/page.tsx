import PropertyForm from "../../../_component/PropertyForm";

export default async function EditPropertyPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  return <PropertyForm propertyId={params.id} />;
}
