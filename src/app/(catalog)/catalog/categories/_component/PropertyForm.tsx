"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  getAllAttributeSets,
  getAllAttributeGroups,
  getAllAttributes,
} from "@/app/actions/category";
import MappingItem from "./MappingItem";
import PropertyPreview from "./PropertyPreview";
import {
  getCategoryProperty,
  updateCategoryPropertyWithMappings,
  createCategoryPropertyWithMappings,
} from "@/app/actions/category_property";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export type AttributeFlag = "isRequired" | "isHighlight";

export interface Mapping {
  id: string;
  set: string;
  groups: {
    group: string;
    attributes: {
      attribute: string;
      isRequired: boolean;
      isHighlight: boolean;
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

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

export default function PropertyForm({ propertyId, onSuccess }: Props) {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mappings, setMappings] = useState<Mapping[]>([]);

  const [allSets, setAllSets] = useState<AttributeSetOption[]>([]);
  const [allGroups, setAllGroups] = useState<GroupOption[]>([]);
  const [allAttributes, setAllAttributes] = useState<AttributeOption[]>([]);

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
  const [showPreview, setShowPreview] = useState(false);

  // ---------------- Fetch reference data ---------------- //
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

  // ---------------- Load existing property ---------------- //
  useEffect(() => {
    if (!propertyId) return;
    getCategoryProperty(propertyId)
      .then((prop) => {
        if (!prop) return;
        setCode(prop.code || "");
        setName(prop.name);
        setDescription(prop.description || "");

        if (prop.mappings && prop.mappings.length > 0) {
          const withIds = prop.mappings.map((m: any) => ({
            ...m,
            groups: (m.groups ?? []).map((g: any) => ({
              ...g,
              attributes: (g.attributes ?? []).map((a: any) => ({
                attribute: a.attribute,
                isRequired: a.isRequired === true,
                isHighlight: a.isHighlight === true,
              })),
            })),
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
      })
      .catch(() => {
        setError("Failed to load property data.");
        toast.error("Failed to load property data.");
      });
  }, [propertyId]);

  // ---------------- Validation ---------------- //
  const validateField = useCallback(
    (field: "code" | "name" | "mappings") => {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };

        if (field === "code") {
          if (!code.trim()) newErrors.code = "Code is required";
          else delete newErrors.code;
        }

        if (field === "name") {
          if (!name.trim()) newErrors.name = "Name is required";
          else delete newErrors.name;
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
          if (!hasError) delete newErrors.mappings;
        }

        return newErrors;
      });
    },
    [code, name, mappings],
  );

  useEffect(() => validateField("code"), [code, validateField]);
  useEffect(() => validateField("name"), [name, validateField]);
  useEffect(() => validateField("mappings"), [mappings, validateField]);

  // ---------------- Mapping handlers ---------------- //
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
            : [
                ...group.attributes,
                {
                  attribute: attrId,
                  isRequired: false,
                  isHighlight: false,
                },
              ];
          const newGroups = [...m.groups];
          newGroups[groupIndex] = { ...group, attributes: newAttributes };
          return { ...m, groups: newGroups };
        }),
      );
    },
    [],
  );

  const toggleFlag = useCallback(
    (
      mappingId: string,
      groupId: string,
      attrId: string,
      flag: AttributeFlag,
    ) => {
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
            [flag]: !newAttributes[attrIndex][flag],
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

  // ---------------- Submit ---------------- //
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
        toast.success(`Category property ${action} successfully!`);
        onSuccess?.();
        setTimeout(() => {
          router.push("/catalog/categories/property");
        }, 1200);
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

  // ---------------- Render ---------------- //
  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary" />
        <span className="ml-3 text-sm">Loading data…</span>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <div className=" max-w-3xl py-4  sm:py-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-5"
          noValidate
        >
          {/* Header */}
          <header>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              {propertyId ? "Edit Category Property" : "New Category Property"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Define reusable attribute mappings for categories.
            </p>
          </header>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive sm:px-4 sm:py-3"
            >
              {error}
            </div>
          )}

          {/* Basics */}
          <section className=" bg-card text-card-foreground">
            <div className=" py-3 sm:py-3.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Basic Information
              </h2>
            </div>

            <div className="space-y-4  sm:space-y-5 ">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                <div>
                  <label
                    htmlFor="property-code"
                    className="block text-sm font-medium text-foreground"
                  >
                    Code <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="property-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. electronics_attrs"
                    className={
                      fieldErrors.code
                        ? "mt-1 border-destructive focus:border-destructive"
                        : "mt-1"
                    }
                    aria-invalid={!!fieldErrors.code}
                    aria-describedby={
                      fieldErrors.code ? "code-error" : undefined
                    }
                    required
                  />
                  {fieldErrors.code && (
                    <p
                      id="code-error"
                      className="mt-1 text-xs text-destructive"
                    >
                      {fieldErrors.code}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="property-name"
                    className="block text-sm font-medium text-foreground"
                  >
                    Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="property-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Electronics Attributes"
                    className={
                      fieldErrors.name
                        ? "mt-1 border-destructive focus:border-destructive"
                        : "mt-1"
                    }
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={
                      fieldErrors.name ? "name-error" : undefined
                    }
                    required
                  />
                  {fieldErrors.name && (
                    <p
                      id="name-error"
                      className="mt-1 text-xs text-destructive"
                    >
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="property-description"
                  className="block text-sm font-medium text-foreground"
                >
                  Description
                </label>
                <textarea
                  id="property-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional description…"
                  className="mt-1 resize-none"
                />
              </div>
            </div>
          </section>

          {/* Mappings */}
          <section className=" bg-card text-card-foreground">
            <div className="flex items-center justify-between gap-3  py-3  sm:py-3.5">
              <div className="min-w-0">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Set Mappings
                </h2>
                <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                  Each set defines which groups and attributes apply.
                </p>
              </div>
              <button
                type="button"
                onClick={addMapping}
                className="admin-button-secondary shrink-0"
              >
                <span className="text-base leading-none">+</span>
                <span className="hidden sm:inline">Add Set</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>

            <div className="space-y-3  sm:space-y-4 ">
              {fieldErrors.mappings && (
                <p className="text-xs text-destructive">
                  {fieldErrors.mappings}
                </p>
              )}

              {mappings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center sm:py-10">
                  <p className="text-sm text-muted-foreground">
                    No sets added yet.
                  </p>
                  <button
                    type="button"
                    onClick={addMapping}
                    className="mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    Add your first set →
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
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
                        onUpdateSet={(setId) =>
                          updateMappingSet(mappingId, setId)
                        }
                        onRemove={() => removeMapping(mappingId)}
                        onToggleGroup={(groupId) =>
                          toggleGroup(mappingId, groupId)
                        }
                        onToggleAttribute={(groupId, attrId) =>
                          toggleAttribute(mappingId, groupId, attrId)
                        }
                        onToggleFlag={(groupId, attrId, flag) =>
                          toggleFlag(mappingId, groupId, attrId, flag)
                        }
                        onGroupFilterChange={(value) =>
                          setGroupFilter((prev) => ({
                            ...prev,
                            [mappingId]: value,
                          }))
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
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push("/catalog/categories/property")}
              className="admin-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !isFormValid}
              className="admin-button"
            >
              {saving && (
                <svg
                  className="h-4 w-4 animate-spin"
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
              {saving
                ? "Saving…"
                : propertyId
                  ? "Update Property"
                  : "Create Property"}
            </button>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border bg-card text-card-foreground">
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/50 sm:px-5 sm:py-3"
            >
              <span>Live Preview</span>
              <span className="text-muted-foreground">
                {showPreview ? "▲" : "▼"}
              </span>
            </button>
            {showPreview && (
              <div className="border-t border-border px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
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
      </div>
    </>
  );
}
