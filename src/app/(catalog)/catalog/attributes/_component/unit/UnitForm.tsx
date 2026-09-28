// components/forms/UnitForm.tsx
import React from "react";

interface UnitFamily {
  _id: string;
  name: string;
}

interface Unit {
  _id?: string;
  name: string;
  symbol: string;
  unitFamily: string | UnitFamily;
  conversionFactor: number;
  isBaseUnit: boolean;
}

interface UnitFormProps {
  unit: Unit | null;
  unitFamilies: UnitFamily[];
  selectedFamily: string | null;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}

const UnitForm: React.FC<UnitFormProps> = ({
  unit,
  unitFamilies,
  selectedFamily,
  onSubmit,
  onCancel,
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  // Get the unit family ID whether it's a string or object
  const getUnitFamilyId = () => {
    if (!unit) return selectedFamily || "";
    return typeof unit.unitFamily === "string"
      ? unit.unitFamily
      : unit.unitFamily._id;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-96">
        <h2 className="text-xl font-semibold mb-4">
          {unit ? "Edit" : "Add"} Unit
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              title="name"
              name="name"
              defaultValue={unit?.name || ""}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Symbol</label>
            <input
              title="symbol"
              name="symbol"
              defaultValue={unit?.symbol || ""}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Unit Family
            </label>
            <select
              title="unitFamily"
              name="unitFamily"
              defaultValue={getUnitFamilyId()}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select a family</option>
              {unitFamilies.map((family) => (
                <option key={family._id} value={family._id}>
                  {family.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Conversion Factor
            </label>
            <input
              title="conversion Factor"
              name="conversionFactor"
              type="number"
              step="0.001"
              defaultValue={unit?.conversionFactor || 1}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                name="isBaseUnit"
                type="checkbox"
                defaultChecked={unit?.isBaseUnit || false}
                className="mr-2"
              />
              Is Base Unit
            </label>
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
              {unit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnitForm;
