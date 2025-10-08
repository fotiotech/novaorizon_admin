// app/admin/meta-tags/edit/[id]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import MetaTagForm from '../_component/MetaTagForm';

interface EditMetaTagPageProps {
  params: {
    id: string;
  };
}

const EditMetaTagPage = ({ params }: EditMetaTagPageProps) => {
  if (!params.id) {
    notFound();
  }

  return <MetaTagForm mode="edit" metaTagId={params.id} />;
};

export default EditMetaTagPage;