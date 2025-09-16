"use client";

import {
  deleteAttribute,
  findAttributesAndValues,
} from "@/app/actions/attributes";
import { getUnits } from "@/app/actions/unit"; // Import your unit actions
import { Delete, Edit } from "@mui/icons-material";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import AttributeForm from "./_component/AttributeForm";

type AttributeType = {
  _id?: string;
  id?: string;
  code: string;
  unit: string;
  name: string;
  option?: string | string[];
  type: string;
  sort_order: number;
};

interface Option {
  value: string;
  label: string;
}

interface Unit {
  _id: string;
  name: string;
  symbol: string;
  unitFamily: string | { name: string };
  conversionFactor: number;
  isBaseUnit: boolean;
}

const Attributes = () => {
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]); // State for units
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const [sortAttrOrder, setSortAttrOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });
  const [showForm, setShowForm] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true); // Loading state for units

  useEffect(() => {
    fetchAttributes();
    fetchUnits(); // Fetch units when component mounts
  }, []);

  const fetchAttributes = async () => {
    try {
      const response = await findAttributesAndValues();
      if (response?.length > 0) {
        setAttributes(response as unknown as AttributeType[]);
        setError(null);
      }
    } catch (err) {
      console.error("[Attributes] Error fetching data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load attributes"
      );
    }
  };

  // Fetch units from your Unit Management system
  const fetchUnits = async () => {
    try {
      setIsLoadingUnits(true);
      const unitsData = await getUnits();
      setUnits(unitsData);
    } catch (err) {
      console.error("Error fetching units:", err);
      setError("Failed to load units");
    } finally {
      setIsLoadingUnits(false);
    }
  };

  const handleAttributeSuccess = () => {
    fetchAttributes();
    setEditingAttributeId(null);
    setShowForm(false);
  };

  const handleEditClick = (id: string) => {
    setEditingAttributeId(id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingAttributeId(null);
    setShowForm(false);
  };

  const handleNewAttribute = () => {
    setEditingAttributeId(null);
    setShowForm(true);
  };

  const handleDeleteAttribute = async (id: string) => {
    if (confirm("Are you sure you want to delete this attribute?")) {
      try {
        await deleteAttribute(id);
        fetchAttributes();
      } catch (err) {
        console.error("Error deleting attribute:", err);
        setError(
          err instanceof Error ? err.message : "Failed to delete attribute"
        );
      }
    }
  };

  const sortOptions: Option[] = [
    { value: "asc", label: "A → Z" },
    { value: "desc", label: "Z → A" },
  ];

  const visibleAttributes = useMemo(() => {
    const filtered = attributes.filter((a) =>
      a.name.toLowerCase().includes(filterText.toLowerCase())
    );
    const sorted = filtered.sort((a, b) =>
      sortAttrOrder.value === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
    return sorted;
  }, [attributes, filterText, sortAttrOrder]);

  // Function to get unit details by symbol
  const getUnitDetails = (symbol: string) => {
    const unit = units.find((u) => u.symbol === symbol);
    return unit ? `${unit.name} (${unit.symbol})` : symbol;
  };

  return (
    <div className="max-w-7xl mx-auto lg:px-8 w-full text-text">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-xl my-2">Attributes</h2>
        <div className="flex gap-2">
          <button onClick={handleNewAttribute} className="p-2 font-semibold">
            + Attribute
          </button>
          <Link href={"/attributes/group"} className="p-2 font-semibold">
            + Group
          </Link>
          {/* Update the unit link to point to your Unit Management page */}
          <Link href={"/attributes/unit"} className="p-2 font-semibold">
            + Unit
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Show form when creating or editing */}
      {(showForm || editingAttributeId) && (
        <AttributeForm
          attributeId={editingAttributeId || undefined}
          onSuccess={handleAttributeSuccess}
          onCancel={handleCancelEdit}
          mode={editingAttributeId ? "edit" : "create"}
        />
      )}

      {/* Attributes List */}
      {!showForm && !editingAttributeId && (
        <div>
          <div className="my-3 flex md:flex-row gap-2 items-center">
            <input
              type="text"
              placeholder="Filter attributes..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full md:w-1/2 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
            />
            <Select
              options={sortOptions}
              value={sortAttrOrder}
              onChange={(opt) => setSortAttrOrder(opt as Option)}
              className="w-1/3 md:w-1/4 dark:bg-sec-dark"
            />
          </div>

          {isLoadingUnits && (
            <div className="text-center py-4">Loading units...</div>
          )}

          <ul className="grid gap-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
            {visibleAttributes.map((attr) => (
              <li
                key={`${attr.name}-${attr._id || "nogroup"}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-text">{attr.name}</span>
                    <span
                      onClick={() => handleEditClick(attr._id!)}
                      className="cursor-pointer"
                    >
                      <Edit fontSize="small" />
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteAttribute(attr._id!)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Delete attribute ${attr.name}`}
                  >
                    <Delete />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Code:</span> {attr.code}
                  </div>
                  <div>
                    <span className="font-medium">Unit:</span>{" "}
                    {getUnitDetails(attr.unit)}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {attr.type}
                  </div>
                  <div>
                    <span className="font-medium">Sort Order:</span>{" "}
                    {attr.sort_order}
                  </div>
                  {attr.option && (
                    <div className="col-span-2">
                      <span className="font-medium">Options:</span>{" "}
                      {Array.isArray(attr.option)
                        ? attr.option.join(", ")
                        : attr.option}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {visibleAttributes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {filterText
                ? "No attributes match your search"
                : "No attributes found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Attributes;
