// app/(root)/channels/store/content/editorials/[id]/page.tsx

import BannerForm from "../_component/BannerForm";

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BannerForm id={id} />;
}
