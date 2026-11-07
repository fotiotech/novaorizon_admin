// app/content-management/blocks/[id]/page.tsx

import BlockForm from "../_component/BlockForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BlockEditPage({ params }: PageProps) {
  const { id } = await params;

  // `/content-management/blocks/:id` → edit mode.
  return <BlockForm id={id} />;
}

export const metadata = {
  title: "Edit block",
};
