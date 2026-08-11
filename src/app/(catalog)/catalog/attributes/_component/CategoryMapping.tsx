"use client";

import React, { useMemo, useState, useEffect } from "react";
import Select from "react-select";
import {
  updateCategoryAttributeSets,
  getCategory,
} from "@/app/actions/category";

interface AttributeSet {
  _id: string;
  title: string;
  description?: string;
}

interface CategoryMappingProps {
  categoryData: any[]; // categories for dropdown
  allAttributeSets: AttributeSet[]; // all attribute sets from DB
  isLoading: boolean;
}

const CategoryMapping: React.FC<CategoryMappingProps> = ({
  categoryData,
  allAttributeSets,
  isLoading: parentLoading,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [mappedSetIds, setMappedSetIds] = useState<string[]>([]);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch the category's current attribute_sets_ids when category changes
  useEffect(() => {
    async function fetchCategorySets() {
      if (!selectedCategoryId) return;
      try {
        setIsLoading(true);
        const category = await getCategory(selectedCategoryId);
        if (category && category.attribute_sets_ids) {
          setMappedSetIds(
            category.attribute_sets_ids.map((id: any) => id.toString()),
          );
        } else {
          setMappedSetIds([]);
        }
      } catch (err) {
        console.error("Error fetching category sets:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCategorySets();
  }, [selectedCategoryId]);

  // Available sets = all sets minus those already mapped
  const availableSets = useMemo(() => {
    return allAttributeSets?.filter((set) => !mappedSetIds.includes(set._id));
  }, [allAttributeSets, mappedSetIds]);

  const toggleSetSelection = (setId: string) => {
    setSelectedSetIds((prev) =>
      prev.includes(setId)
        ? prev.filter((id) => id !== setId)
        : [...prev, setId],
    );
  };

  const handleMapSets = async () => {
    if (!selectedCategoryId || selectedSetIds.length === 0) return;
    try {
      setIsLoading(true);
      const newSetIds = [...mappedSetIds, ...selectedSetIds];
      const result = await updateCategoryAttributeSets(
        selectedCategoryId,
        newSetIds,
      );
      if (result.success) {
        setMappedSetIds(newSetIds);
        setSelectedSetIds([]);
        alert("Attribute sets mapped successfully!");
      } else {
        alert(result.error || "Failed to map sets.");
      }
    } catch (err) {
      console.error(err);
      alert("Error mapping attribute sets.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnmapSet = async (setId: string) => {
    if (!selectedCategoryId) return;
    try {
      setIsLoading(true);
      const updatedSets = mappedSetIds.filter((id) => id !== setId);
      const result = await updateCategoryAttributeSets(
        selectedCategoryId,
        updatedSets,
      );
      if (result.success) {
        setMappedSetIds(updatedSets);
        alert("Attribute set removed.");
      } else {
        alert(result.error || "Failed to remove set.");
      }
    } catch (err) {
      console.error(err);
      alert("Error removing attribute set.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-2 lg:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        Map sets to category
      </h2>

      {/* Category selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Category:
        </label>
        <Select
          options={categoryData.map((cat) => ({
            value: cat._id,
            label: cat.name,
          }))}
          value={
            categoryData.find((cat) => cat._id === selectedCategoryId)
              ? {
                  value: selectedCategoryId,
                  label: categoryData.find(
                    (cat) => cat._id === selectedCategoryId,
                  )?.name,
                }
              : null
          }
          onChange={(selected) => {
            setSelectedCategoryId(selected?.value || "");
            setSelectedSetIds([]);
          }}
          className="w-full"
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: "#f9fafb",
              borderColor: "#d1d5db",
              minHeight: "42px",
            }),
          }}
        />
      </div>

      {selectedCategoryId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Available Attribute Sets */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Available Attribute Sets
              </h3>
              <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 h-80 overflow-auto bg-white dark:bg-gray-800">
                {availableSets?.length > 0 ? (
                  availableSets.map((set) => (
                    <div
                      key={set._id}
                      className={`p-2 mb-1 rounded cursor-pointer transition-colors ${
                        selectedSetIds.includes(set._id)
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => toggleSetSelection(set._id)}
                    >
                      <div className="flex items-center">
                        <span
                          className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${
                            selectedSetIds.includes(set._id)
                              ? "bg-green-500 border-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedSetIds.includes(set._id) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              ></path>
                            </svg>
                          )}
                        </span>
                        <span>{set.title}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    All sets are already mapped to this category.
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() =>
                    setSelectedSetIds(
                      availableSets?.map((set) => set._id) || [],
                    )
                  }
                  disabled={isLoading || availableSets?.length === 0}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedSetIds([])}
                  disabled={isLoading || selectedSetIds.length === 0}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Mapped Attribute Sets */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Mapped to Category
              </h3>
              <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 h-80 overflow-auto bg-white dark:bg-gray-800">
                {mappedSetIds.length > 0 ? (
                  mappedSetIds.map((setId) => {
                    const set = allAttributeSets.find((s) => s._id === setId);
                    if (!set) return null;
                    return (
                      <div
                        key={setId}
                        className="p-2 mb-1 rounded bg-gray-50 dark:bg-gray-700 flex justify-between items-center"
                      >
                        <span>{set.title}</span>
                        <button
                          onClick={() => handleUnmapSet(setId)}
                          disabled={isLoading}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-400"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No Attribute Sets mapped to this category.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Map Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleMapSets}
              disabled={isLoading || selectedSetIds.length === 0}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    ></path>
                  </svg>
                  Map Selected Sets
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryMapping;
