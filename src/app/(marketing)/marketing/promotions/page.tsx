// app/promotions/page.tsx
import { listPromotions } from '@/app/actions/promotion';
import Link from 'next/link';

export default async function PromotionsPage() {
  const { data: promotions } = await listPromotions({}, { limit: 100 });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Promotions</h1>
        <Link href="/marketing/promotions/create" className="bg-blue-600 text-white px-4 py-2 rounded">
          New Promotion
        </Link>
      </div>
      <ul className="space-y-2">
        {promotions.map((p:any) => (
          <li key={p._id} className="border p-4 rounded flex justify-between">
            <div>
              <strong>{p.name}</strong> – {p.type}
              <span className={`ml-2 text-sm ${p.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                {p.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <Link href={`/marketing/promotions/edit/${p._id}`} className="text-blue-600 hover:underline">
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}