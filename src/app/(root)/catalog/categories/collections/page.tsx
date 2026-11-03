import Link from "next/link";
import { getCategoryCollectionsWithCategories } from "@/app/actions/categoryCollection";
import CollectionList from "./_component/CollectionList";

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await getCategoryCollectionsWithCategories();

  if (!result.success) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {result.error || "Failed to load category collections."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Category Collections
          </h1>
          <p className="text-gray-600 mt-1">
            Rule‑based, manual, recommendation, and related category
            collections.
          </p>
        </div>
        <Link
          href="/catalog/categories/collections/new"
          className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add New Collection
        </Link>
      </div>

      <CollectionList rows={result.data as any} />
    </div>
  );
}
