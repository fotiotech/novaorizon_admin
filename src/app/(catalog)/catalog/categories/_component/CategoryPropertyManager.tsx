// app/admin/category-properties/CategoryPropertyManager.tsx
"use client";

import { useState, useTransition } from "react";
import {
  createCategoryProperty,
  updateCategoryProperty,
  deleteCategoryProperty,
  getCategoryProperty,
} from "@/app/actions/category"; // adjust import path
import { useRouter } from "next/navigation";

// Types (could be imported from a shared types file)
type AttributeSetSummary = {
  _id: string;
  title: string;
  code: string;
};

type CategoryPropertySummary = {
  _id: string;
  name: string;
  description?: string;
  sets: AttributeSetSummary[];
  createdAt: string;
  updatedAt: string;
};

interface Props {
  initialProperties: CategoryPropertySummary[];
  attributeSets: AttributeSetSummary[];
}

export default function CategoryPropertyManager({
  initialProperties,
  attributeSets,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State for the list
  const [properties, setProperties] = useState(initialProperties);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSets, setFormSets] = useState<string[]>([]);

  // Error / success messages
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Open modal for creating a new property
  const openCreateModal = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormSets([]);
    setMessage(null);
    setIsModalOpen(true);
  };

  // Open modal for editing an existing property
  const openEditModal = (prop: CategoryPropertySummary) => {
    setEditingId(prop._id);
    setFormName(prop.name);
    setFormDescription(prop.description || "");
    setFormSets(prop.sets.map((s) => s._id));
    setMessage(null);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormSets([]);
    setMessage(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formName.trim()) {
      setMessage({ type: "error", text: "Name is required." });
      return;
    }

    const data = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      sets: formSets,
    };

    startTransition(async () => {
      try {
        let result;
        if (editingId) {
          // Update
          result = await updateCategoryProperty(editingId, data);
        } else {
          // Create
          result = await createCategoryProperty(data);
        }

        if (result.error) {
          setMessage({ type: "error", text: result.error });
          return;
        }

        // Success: refresh the list
        const freshProperties = await getCategoryProperty();
        if (freshProperties) {
          setProperties(freshProperties as any);
        }
        closeModal();
        router.refresh(); // optional: revalidate server components
      } catch (err: any) {
        setMessage({
          type: "error",
          text: err.message || "Something went wrong.",
        });
      }
    });
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category property?"))
      return;

    startTransition(async () => {
      const result = await deleteCategoryProperty(id);
      if (result.error) {
        alert(result.error);
        return;
      }
      // Refresh list
      const freshProperties = await getCategoryProperty();
      if (freshProperties) {
        setProperties(freshProperties as any);
      }
      router.refresh();
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Category Properties</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add New
        </button>
      </div>

      {/* List */}
      {properties.length === 0 ? (
        <p className="text-gray-500">No category properties found.</p>
      ) : (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Attribute Sets
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {properties.map((prop) => (
                <tr key={prop._id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {prop.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {prop.description || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {prop.sets.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {prop.sets.map((set) => (
                          <span
                            key={set._id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {set.title}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => openEditModal(prop)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(prop._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingId
                ? "Edit Category Property"
                : "Create Category Property"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Attribute Sets
                </label>
                <select
                  multiple
                  value={formSets}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (opt) => opt.value,
                    );
                    setFormSets(selected);
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 h-32"
                >
                  {attributeSets.map((set) => (
                    <option key={set._id} value={set._id}>
                      {set.title} ({set.code})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Hold Ctrl (Cmd) to select multiple.
                </p>
              </div>

              {message && (
                <div
                  className={`mb-4 p-2 rounded ${
                    message.type === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
