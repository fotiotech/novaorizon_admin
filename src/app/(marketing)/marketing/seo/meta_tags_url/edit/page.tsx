// app/admin/meta-tags/edit/[id]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import MetaTagForm from '../_component/MetaTagForm';

interface EditMetaTagPageProps {
  params: Promise<{
    id: string;
  }>;
}

const EditMetaTagPage = async (props: EditMetaTagPageProps) => {
  const params = await props.params;
  if (!params.id) {
    notFound();
  }

  return <MetaTagForm mode="edit" metaTagId={params.id} />;
};

export default EditMetaTagPage;