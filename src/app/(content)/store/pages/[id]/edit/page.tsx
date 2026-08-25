import { getPageById } from "@/app/actions/pageActions";
import PageForm from "../../components/PageForm";

interface EditPageParams {
  params: Promise<{ id: string }>;
}

export default async function EditPagePage(props: EditPageParams) {
  const params = await props.params;
  const page = await getPageById(params.id);
  if (!page) {
    return <div className="p-6 text-red-500">Page not found</div>;
  }
  return <PageForm initialData={page} />;
}
