"use client";

import React, { useState, useEffect } from "react";
import { getAttributeSets } from "@/app/actions/attribute_sets";
import AttributeSetForm from "../_component/AttributeSetForm";
import CategoryMapping from "../_component/CategoryMapping";
import CategoryAttribute from "../../categories/groupsets/page";

export default function SetsPage() {
  const [sets, setSets] = useState<any[]>([]);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchSets = async () => {
    const res = await getAttributeSets();
    if (res.success) setSets(res.data as any);
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const handleSuccess = () => {
    fetchSets();
    setShowForm(false);
    setEditingSetId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Attribute Sets</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingSetId(null);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          + New Set
        </button>
      </div>

      {showForm && (
        <AttributeSetForm
          attributeSetId={editingSetId || undefined}
          onSuccess={handleSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingSetId(null);
          }}
        />
      )}

      <CategoryAttribute />

      <div className="bg-white p-4 rounded shadow">
        {sets.length === 0 ? (
          <p>No attribute sets found.</p>
        ) : (
          <ul className="divide-y">
            {sets.map((set) => (
              <li key={set._id} className="py-2 flex justify-between">
                <span>
                  <strong>{set.title}</strong> ({set.code})
                </span>
                <div>
                  <button
                    onClick={() => {
                      setEditingSetId(set._id);
                      setShowForm(true);
                    }}
                    className="text-blue-600 mr-2"
                  >
                    Edit
                  </button>
                  <button className="text-red-600">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
