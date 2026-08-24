import { getPageById } from "@/app/actions/pageActions";
import PageForm from "../../components/PageForm";

interface EditPageParams {
  params: { id: string };
}

export default async function EditPagePage({ params }: EditPageParams) {
  const page = await getPageById(params.id);
  if (!page) {
    return <div className="p-6 text-red-500">Page not found</div>;
  }
  return <PageForm initialData={page} />;
}
