"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCarriers, deleteCarrier } from "@/app/actions/carrier";

export default function CarrierListPage() {
  const [carriers, setCarriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCarriers = async () => {
    setLoading(true);
    const data = await getCarriers();
    setCarriers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCarriers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this carrier?")) return;
    await deleteCarrier(id);
    setCarriers((prev) => prev.filter((c) => c._id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading carriers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Carriers</h1>
        <Link
          href="sales/carriers/create"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition"
        >
          + New Carrier
        </Link>
      </div>

      {carriers.length === 0 ? (
        <p className="text-muted-foreground">No carriers found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {carriers.map((carrier) => (
            <div
              key={carrier._id}
              className="bg-card border border-border rounded-lg shadow-sm p-4 hover:shadow-md transition"
            >
              <h2 className="text-xl font-semibold text-foreground">
                {carrier.name}
              </h2>
              <p className="text-sm text-muted-foreground">Contact: {carrier.contact}</p>
              <p className="text-sm text-muted-foreground">
                Email: {carrier.email || "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">
                Cost per kg: {carrier.costWeight}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {carrier.regionsServed.map((region: any) => (
                  <span
                    key={region._id}
                    className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                  >
                    {region.region}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href={`/sales/carriers/${carrier._id}`}
                  className="text-primary hover:text-primary/80 text-sm font-medium"
                >
                  View Orders
                </Link>
                <Link
                  href={`/carriers/edit/${carrier._id}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(carrier._id)}
                  className="text-destructive hover:text-destructive/80 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}