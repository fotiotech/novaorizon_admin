// components/forms/FamilyForm.tsx
import React from "react";

interface UnitFamily {
  _id?: string;
  name: string;
  description?: string;
  baseUnit: string;
}

interface FamilyFormProps {
  family: UnitFamily | null;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}

const FamilyForm: React.FC<FamilyFormProps> = ({
  family,
  onSubmit,
  onCancel,
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-96">
        <h2 className="text-xl font-semibold mb-4">
          {family ? "Edit" : "Add"} Unit Family
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              title="name"
              name="name"
              defaultValue={family?.name || ""}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              title="description"
              name="description"
              defaultValue={family?.description || ""}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Base Unit</label>
            <input
              title="baseUnit"
              name="baseUnit"
              defaultValue={family?.baseUnit || ""}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              {family ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FamilyForm;
