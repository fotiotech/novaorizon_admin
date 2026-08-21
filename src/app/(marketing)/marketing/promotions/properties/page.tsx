// app/marketing/promotions/properties/page.tsx
import { listPromotionProperties } from '@/app/actions/promotion';
import Link from 'next/link';

export default async function PromotionPropertiesPage() {
  const { data: properties } = await listPromotionProperties({}, { limit: 100 });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Promotion Properties</h1>
        <Link
          href="/marketing/promotions/properties/create"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          New Property
        </Link>
      </div>
      <ul className="space-y-2">
        {properties.map((p:any) => (
          <li key={p._id} className="border p-4 rounded flex justify-between">
            <div>
              <strong>{p.name}</strong> ({p.code}) – {p.type}
              {p.isRequired && <span className="ml-2 text-red-500 text-sm">*</span>}
              <span className="ml-2 text-gray-500 text-sm">order: {p.sort_order}</span>
            </div>
            <Link href={`/marketing/promotions/properties/edit/${p._id}`} className="text-blue-600 hover:underline">
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}