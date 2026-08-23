"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  createCategoryPropertyWithMappings,
  updateCategoryPropertyWithMappings,
  getCategoryProperty,
  getAllAttributeSets,
  getAllAttributeGroups,
  getAllAttributes,
} from "@/app/actions/category";
import MappingItem from "./MappingItem";
import PropertyPreview from "./PropertyPreview";

// --- Types ---
export interface Mapping {
  id: string;
  set: string;
  groups: {
    group: string;
    attributes: {
      attribute: string;
      isRequired: boolean;
    }[];
  }[];
}

export interface AttributeSetOption {
  _id: string;
  title: string;
  code: string;
}

export interface GroupOption {
  _id: string;
  name: string;
  code: string;
}

export interface AttributeOption {
  _id: string;
  name: string;
  code: string;
  type: string;
}

interface Props {
  propertyId?: string;
  onSuccess?: () => void;
}

// Utility
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// ============================================================
// Preview Component
// ============================================================

// ============================================================
// Main Component
// ============================================================

export default function PropertyForm({ propertyId, onSuccess }: Props) {
  const router = useRouter();

  // Form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mappings, setMappings] = useState<Mapping[]>([]);

  // Available data
  const [allSets, setAllSets] = useState<AttributeSetOption[]>([]);
  const [allGroups, setAllGroups] = useState<GroupOption[]>([]);
  const [allAttributes, setAllAttributes] = useState<AttributeOption[]>([]);

  // UI states
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    code?: string;
    name?: string;
    mappings?: string;
  }>({});
  const [groupFilter, setGroupFilter] = useState<Record<string, string>>({});
  const [attrFilter, setAttrFilter] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false); // NEW

  // Fetch data
  useEffect(() => {
    Promise.all([
      getAllAttributeSets(),
      getAllAttributeGroups(),
      getAllAttributes(),
    ])
      .then(([sets, groups, attrs]) => {
        setAllSets(sets as any);
        setAllGroups(groups as any);
        setAllAttributes(attrs as any);
        setLoadingData(false);
      })
      .catch(() => {
        setError("Failed to load data. Please refresh the page.");
        toast.error("Failed to load data. Please refresh the page.");
        setLoadingData(false);
      });
  }, []);

  // Load existing property
  useEffect(() => {
    if (propertyId) {
      getCategoryProperty(propertyId)
        .then((prop) => {
          if (prop) {
            setCode(prop.code || "");
            setName(prop.name);
            setDescription(prop.description || "");
            if (prop.mappings && prop.mappings.length > 0) {
              const withIds = prop.mappings.map((m: any) => ({
                ...m,
                id: generateId(),
              }));
              setMappings(withIds);
            } else if (prop.sets && prop.sets.length > 0) {
              const converted = prop.sets.map((setId: string) => ({
                id: generateId(),
                set: setId,
                groups: [],
              }));
              setMappings(converted);
            }
          }
        })
        .catch(() => {
          setError("Failed to load property data.");
          toast.error("Failed to load property data.");
        });
    }
  }, [propertyId]);

  // Validation
  const validateField = useCallback(
    (field: "code" | "name" | "mappings") => {
      const newErrors = { ...fieldErrors };
      if (field === "code") {
        if (!code.trim()) {
          newErrors.code = "Code is required";
        } else {
          delete newErrors.code;
        }
      }
      if (field === "name") {
        if (!name.trim()) {
          newErrors.name = "Name is required";
        } else {
          delete newErrors.name;
        }
      }
      if (field === "mappings") {
        let hasError = false;
        for (const m of mappings) {
          if (!m.set) {
            newErrors.mappings = "Each mapping must have a set selected.";
            hasError = true;
            break;
          }
          if (m.groups.length === 0) {
            newErrors.mappings = `Set "${m.set}" must have at least one group selected.`;
            hasError = true;
            break;
          }
          for (const g of m.groups) {
            if (g.attributes.length === 0) {
              newErrors.mappings = `Group "${g.group}" must have at least one attribute selected.`;
              hasError = true;
              break;
            }
          }
          if (hasError) break;
        }
        if (!hasError) {
          delete newErrors.mappings;
        }
      }
      setFieldErrors(newErrors);
    },
    [code, name, mappings, fieldErrors],
  );

  useEffect(() => validateField("code"), [code, validateField]);
  useEffect(() => validateField("name"), [name, validateField]);
  useEffect(() => validateField("mappings"), [mappings, validateField]);

  // Handlers
  const addMapping = useCallback(() => {
    const newId = generateId();
    setMappings((prev) => [...prev, { id: newId, set: "", groups: [] }]);
    setExpandedId(newId);
  }, []);

  const removeMapping = useCallback(
    (id: string) => {
      setMappings((prev) => prev.filter((m) => m.id !== id));
      if (expandedId === id) setExpandedId(null);
    },
    [expandedId],
  );

  const updateMappingSet = useCallback((id: string, setValue: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, set: setValue, groups: [] } : m)),
    );
  }, []);

  const toggleGroup = useCallback((mappingId: string, groupId: string) => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.id !== mappingId) return m;
        const exists = m.groups.some((g) => g.group === groupId);
        return {
          ...m,
          groups: exists
            ? m.groups.filter((g) => g.group !== groupId)
            : [...m.groups, { group: groupId, attributes: [] }],
        };
      }),
    );
  }, []);

  const toggleAttribute = useCallback(
    (mappingId: string, groupId: string, attrId: string) => {
      setMappings((prev) =>
        prev.map((m) => {
          if (m.id !== mappingId) return m;
          const groupIndex = m.groups.findIndex((g) => g.group === groupId);
          if (groupIndex === -1) return m;
          const group = m.groups[groupIndex];
          const exists = group.attributes.some((a) => a.attribute === attrId);
          const newAttributes = exists
            ? group.attributes.filter((a) => a.attribute !== attrId)
            : [...group.attributes, { attribute: attrId, isRequired: false }];
          const newGroups = [...m.groups];
          newGroups[groupIndex] = { ...group, attributes: newAttributes };
          return { ...m, groups: newGroups };
        }),
      );
    },
    [],
  );

  const toggleRequired = useCallback(
    (mappingId: string, groupId: string, attrId: string) => {
      setMappings((prev) =>
        prev.map((m) => {
          if (m.id !== mappingId) return m;
          const groupIndex = m.groups.findIndex((g) => g.group === groupId);
          if (groupIndex === -1) return m;
          const group = m.groups[groupIndex];
          const attrIndex = group.attributes.findIndex(
            (a) => a.attribute === attrId,
          );
          if (attrIndex === -1) return m;
          const newAttributes = [...group.attributes];
          newAttributes[attrIndex] = {
            ...newAttributes[attrIndex],
            isRequired: !newAttributes[attrIndex].isRequired,
          };
          const newGroups = [...m.groups];
          newGroups[groupIndex] = { ...group, attributes: newAttributes };
          return { ...m, groups: newGroups };
        }),
      );
    },
    [],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    validateField("code");
    validateField("name");
    validateField("mappings");
    if (fieldErrors.code || fieldErrors.name || fieldErrors.mappings) {
      setError("Please fix the errors before submitting.");
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setSaving(true);
    setError(null);

    const data = {
      code,
      name,
      description,
      mappings: mappings.map(({ id, ...rest }) => rest),
    };

    try {
      let result;
      if (propertyId) {
        result = await updateCategoryPropertyWithMappings(propertyId, data);
      } else {
        result = await createCategoryPropertyWithMappings(data);
      }
      if (result.success) {
        const action = propertyId ? "updated" : "created";
        toast.success(`Category property ${action} successfully! 🎉`);
        onSuccess?.();
        setTimeout(() => {
          router.push("/catalog/categories/property");
        }, 1500);
      } else {
        const errorMsg = result.error || "Something went wrong.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to save.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = useMemo(
    () => !fieldErrors.code && !fieldErrors.name && !fieldErrors.mappings,
    [fieldErrors],
  );

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading data...</span>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <form
        onSubmit={handleSubmit}
        className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-lg shadow"
        noValidate
      >
        <h2 className="text-2xl font-bold">
          {propertyId ? "Edit" : "Create"} Category Property
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Code Field */}
        <div>
          <label htmlFor="property-code" className="block font-medium">
            Code <span className="text-red-500">*</span>
          </label>
          <input
            id="property-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`w-full border rounded p-2 ${
              fieldErrors.code ? "border-red-500" : "border-gray-300"
            }`}
            aria-invalid={!!fieldErrors.code}
            aria-describedby={fieldErrors.code ? "code-error" : undefined}
            required
          />
          {fieldErrors.code && (
            <p id="code-error" className="text-red-500 text-sm mt-1">
              {fieldErrors.code}
            </p>
          )}
        </div>

        {/* Name Field */}
        <div>
          <label htmlFor="property-name" className="block font-medium">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="property-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full border rounded p-2 ${
              fieldErrors.name ? "border-red-500" : "border-gray-300"
            }`}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            required
          />
          {fieldErrors.name && (
            <p id="name-error" className="text-red-500 text-sm mt-1">
              {fieldErrors.name}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="property-description" className="block font-medium">
            Description
          </label>
          <textarea
            id="property-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
            rows={3}
          />
        </div>

        {/* Mappings */}
        <div>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Set Mappings</h3>
            <button
              type="button"
              onClick={addMapping}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
            >
              + Add Set
            </button>
          </div>

          {fieldErrors.mappings && (
            <p id="mappings-error" className="text-red-500 text-sm mt-1">
              {fieldErrors.mappings}
            </p>
          )}

          {mappings.length === 0 && (
            <p className="text-gray-500 text-sm mt-2">No sets added yet.</p>
          )}

          {mappings.map((mapping, index) => {
            const mappingId = mapping.id;
            const isExpanded = expandedId === mappingId;
            const hasSetError = !mapping.set && !!fieldErrors.mappings;

            return (
              <MappingItem
                key={mappingId}
                mapping={mapping}
                index={index}
                allSets={allSets}
                allGroups={allGroups}
                allAttributes={allAttributes}
                groupFilter={groupFilter[mappingId] || ""}
                attrFilters={attrFilter}
                expanded={isExpanded}
                onToggleExpand={() => toggleExpand(mappingId)}
                onUpdateSet={(setId) => updateMappingSet(mappingId, setId)}
                onRemove={() => removeMapping(mappingId)}
                onToggleGroup={(groupId) => toggleGroup(mappingId, groupId)}
                onToggleAttribute={(groupId, attrId) =>
                  toggleAttribute(mappingId, groupId, attrId)
                }
                onToggleRequired={(groupId, attrId) =>
                  toggleRequired(mappingId, groupId, attrId)
                }
                onGroupFilterChange={(value) =>
                  setGroupFilter((prev) => ({ ...prev, [mappingId]: value }))
                }
                onAttrFilterChange={(groupId, value) => {
                  const key = `${mappingId}-${groupId}`;
                  setAttrFilter((prev) => ({ ...prev, [key]: value }));
                }}
                hasSetError={hasSetError}
                fieldError={fieldErrors.mappings}
              />
            );
          })}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving || !isFormValid}
            className={`bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors flex items-center ${
              saving || !isFormValid ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {saving && (
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {saving ? "Saving..." : propertyId ? "Update" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/catalog/categories/property")}
            className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Preview Toggle & Preview */}
        <div className="border-t pt-4 mt-4">
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
          >
            {showPreview ? "Hide" : "Show"} Live Preview
            <span className="text-sm">{showPreview ? "▲" : "▼"}</span>
          </button>
          {showPreview && (
            <div className="mt-2">
              <PropertyPreview
                code={code}
                name={name}
                description={description}
                mappings={mappings}
                allSets={allSets}
                allGroups={allGroups}
                allAttributes={allAttributes}
              />
            </div>
          )}
        </div>
      </form>
    </>
  );
}
