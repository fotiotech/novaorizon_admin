// app/(root)/channels/store/content/editorials/[id]/page.tsx

import EditorialForm from "../_component/EditorialForm";

export default async function EditEditorialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorialForm id={id} />;
}
