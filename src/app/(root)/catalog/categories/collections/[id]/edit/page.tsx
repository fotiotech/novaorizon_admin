import CategoryCollectionForm from "../../_component/CategoryCollectionForm";

export default async function EditCategoryCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CategoryCollectionForm id={id} />;
}
