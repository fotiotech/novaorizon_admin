// app/marketing/content/blocks/edit/page.tsx

import ContentBlockForm from "../_component/ContentBlockForm";

export const dynamic = "force-dynamic";

export default async function EditBlockPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-muted-foreground">No block ID provided.</p>
      </div>
    );
  }
  return <ContentBlockForm id={id} />;
}
