"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryPropertyWithMappings,
  updateCategoryPropertyWithMappings,
  getCategoryProperty,
  getAllAttributeSets,
  getGroupsBySet,
  getAttributesByGroup,
} from "@/app/actions/category";
import SetMapping from "./SetMapping";

interface Mapping {
  set: string;
  groups: {
    group: string;
    attributes: {
      attribute: string;
      isRequired: boolean;
    }[];
  }[];
}

interface AttributeSetOption {
  _id: string;
  title: string;
  code: string;
}

interface Props {
  propertyId?: string;
  onSuccess?: () => void;
}

export default function PropertyForm({ propertyId, onSuccess }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [allSets, setAllSets] = useState<AttributeSetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available sets
  useEffect(() => {
    getAllAttributeSets().then((sets) => setAllSets(sets as any));
  }, []);

  // Load existing property if editing
  useEffect(() => {
    if (propertyId) {
      getCategoryProperty(propertyId).then((prop) => {
        if (prop) {
          setName(prop.name);
          setDescription(prop.description || "");
          // Convert old format to new mappings if needed
          if (prop.mappings && prop.mappings.length > 0) {
            setMappings(prop.mappings);
          } else if (prop.sets && prop.sets.length > 0) {
            // Convert old 'sets' to mappings (all groups & all attributes)
            // This is a fallback; you might want to display a warning.
            const converted = prop.sets.map((setId: string) => ({
              set: setId,
              groups: [], // We'll need to fetch groups dynamically
            }));
            // For simplicity, we'll just set empty mappings and let the user edit.
            setMappings(converted);
          }
        }
      });
    }
  }, [propertyId]);

  const addMapping = () => {
    setMappings([...mappings, { set: "", groups: [] }]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, newMapping: Mapping) => {
    const updated = [...mappings];
    updated[index] = newMapping;
    setMappings(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate: each mapping must have a set and at least one group with attributes
    for (const m of mappings) {
      if (!m.set) {
        setError("Each mapping must have a set selected.");
        setLoading(false);
        return;
      }
      if (m.groups.length === 0) {
        setError(`Set "${m.set}" must have at least one group selected.`);
        setLoading(false);
        return;
      }
      for (const g of m.groups) {
        if (g.attributes.length === 0) {
          setError(
            `Group "${g.group}" must have at least one attribute selected.`,
          );
          setLoading(false);
          return;
        }
      }
    }

    const data = { name, description, mappings };
    try {
      let result;
      if (propertyId) {
        result = await updateCategoryPropertyWithMappings(propertyId, data);
      } else {
        result = await createCategoryPropertyWithMappings(data);
      }
      if (result.success) {
        onSuccess?.();
        router.push("/catalog/categories/property");
      } else {
        setError(result.error || "Something went wrong.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-lg shadow"
    >
      <h2 className="text-2xl font-bold">
        {propertyId ? "Edit" : "Create"} Category Property
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block font-medium">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded p-2"
          required
        />
      </div>

      <div>
        <label className="block font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded p-2"
          rows={3}
        />
      </div>

      <div>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Set Mappings</h3>
          <button
            type="button"
            onClick={addMapping}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            + Add Set
          </button>
        </div>

        {mappings.map((mapping, index) => (
          <SetMapping
            key={index}
            index={index}
            mapping={mapping}
            allSets={allSets}
            onUpdate={(newMapping) => updateMapping(index, newMapping)}
            onRemove={() => removeMapping(index)}
          />
        ))}
        {mappings.length === 0 && (
          <p className="text-gray-500 text-sm mt-2">No sets added yet.</p>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Saving..." : propertyId ? "Update" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/catalog/categories/property")}
          className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
