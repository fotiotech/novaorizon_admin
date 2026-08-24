import { getPages, deletePage } from "@/app/actions/pageActions";
import Link from "next/link";

export default async function PagesList() {
  const pages = await getPages();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pages</h1>
        <Link
          href="/content-management/pages/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          New Page
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">Slug</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Published</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page: any) => (
              <tr key={page._id}>
                <td className="border p-2">{page.title}</td>
                <td className="border p-2">{page.slug}</td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      page.status === "published"
                        ? "bg-green-100 text-green-800"
                        : page.status === "review"
                          ? "bg-blue-100 text-blue-800"
                          : page.status === "archived"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {page.status}
                  </span>
                </td>
                <td className="border p-2">
                  {page.publishedAt
                    ? new Date(page.publishedAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="border p-2 space-x-2">
                  <Link
                    href={`/content-management/pages/${page._id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <form
                    action={deletePage.bind(null, page._id) as any}
                    className="inline"
                  >
                    <button
                      type="submit"
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
