"use client";

import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { Delete, Edit } from "@mui/icons-material";
import {
  deleteAttribute,
  findAttributesAndValues,
} from "@/app/actions/attributes";
import AttributeForm from "./_component/AttributeForm";

type AttributeType = {
  _id?: string;
  code: string;
  unitFamily?: { name: string; symbol: string; _id: string } | null;
  name: string;
  option?: string | string[] | any[]; // allow any array for flexibility
  type: string;
  sort_order: number;
};

interface Option {
  value: string;
  label: string;
}

const Attributes = () => {
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const [sortAttrOrder, setSortAttrOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAttributes();
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
        err instanceof Error ? err.message : "Failed to load attributes",
      );
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
          err instanceof Error ? err.message : "Failed to delete attribute",
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
      a.name.toLowerCase().includes(filterText.toLowerCase()),
    );
    const sorted = filtered.sort((a, b) =>
      sortAttrOrder.value === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
    return sorted;
  }, [attributes, filterText, sortAttrOrder]);

  // Robust formatting for options – handles strings, arrays, objects
  const formatOptions = (option: any): string => {
    if (!option) return "-";
    if (Array.isArray(option)) {
      if (option.length === 0) return "-";
      // If array items are objects, try to extract a display name
      if (typeof option[0] === "object" && option[0] !== null) {
        return option
          .map(
            (item) =>
              item.name || item.value || item.label || JSON.stringify(item),
          )
          .join(", ");
      }
      return option.join(", ");
    }
    if (typeof option === "string") {
      // If it's a comma-separated string, split and trim
      if (option.includes(",")) {
        return option
          .split(",")
          .map((s) => s.trim())
          .join(", ");
      }
      return option;
    }
    return String(option);
  };

  return (
    <div className="max-w-4xl w-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-xl my-2">Attributes</h2>
        <div className="flex gap-2">
          <button
            onClick={handleNewAttribute}
            className="p-2 font-semibold text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            + Attribute
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {(showForm || editingAttributeId) && (
        <AttributeForm
          attributeId={editingAttributeId || undefined}
          onSuccess={handleAttributeSuccess}
          onCancel={handleCancelEdit}
          mode={editingAttributeId ? "edit" : "create"}
        />
      )}
      {/* Filter & Sort */}
      <div className="my-3 flex md:flex-row gap-2 items-center">
        <input
          type="text"
          placeholder="Filter attributes..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full md:w-1/2 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark border border-gray-300 dark:border-gray-600"
        />
        <Select
          options={sortOptions}
          value={sortAttrOrder}
          onChange={(opt) => setSortAttrOrder(opt as Option)}
          className="w-1/3 md:w-1/4"
          classNamePrefix="react-select"
        />
      </div>
      {/* Table with horizontal scroll */}
      <div className=" bg-white dark:bg-gray-800 rounded-lg shadow w-full overflow-clip">
        <div className=" overflow-x-auto">
          <table className=" w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className=" bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Unit Family
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sort Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Options
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className=" bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {visibleAttributes?.map((attr) => (
                <tr
                  key={attr._id}
                  className=" hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="text-wrap px-6 py-4 max-w-[150px] truncate">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {attr.name}
                    </div>
                  </td>
                  <td className="text-wrap px-6 py-4 max-w-[150px] truncate">
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                      {attr.code}
                    </div>
                  </td>
                  <td className="text-wrap px-6 py-4 ">
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                      {attr.unitFamily?.name || "—"}
                    </div>
                  </td>
                  <td className="text-wrap px-6 py-4 ">
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                      {attr.type}
                    </div>
                  </td>
                  <td className="text-wrap px-6 py-4 ">
                    <div className="text-sm text-gray-500 dark:text-gray-300">
                      {attr.sort_order}
                    </div>
                  </td>
                  <td className="text-wrap px-6 py-4 max-w-[200px] truncate">
                    <div
                      className="text-sm text-gray-500 dark:text-gray-300"
                      title={formatOptions(attr.option)}
                    >
                      {formatOptions(attr.option)}
                    </div>
                  </td>
                  <td className="text-wrap px-6 py-4  text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClick(attr._id!)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        aria-label={`Edit attribute ${attr.name}`}
                      >
                        <Edit fontSize="small" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttribute(attr._id!)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        aria-label={`Delete attribute ${attr.name}`}
                      >
                        <Delete fontSize="small" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleAttributes.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {filterText
              ? "No attributes match your search"
              : "No attributes found"}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attributes;
