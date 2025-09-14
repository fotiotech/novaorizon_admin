// CategoryAttribute.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { findAttributesAndValues } from "@/app/actions/attributes";
import {
  find_mapped_attributes_ids,
  getCategory,
  updateCategoryAttributes,
} from "@/app/actions/category";
import {
  findAttributeForGroups,
  updateAttributeGroup,
} from "@/app/actions/attributegroup";
import CategoryMapping from "../_component/CategoryMapping";
import GroupManagement from "../_component/GroupManagement";


type Group = {
  _id: string;
  name: string;
  parent_id?: string;
  attributes: string[] | { name: string; _id?: string }[];
};

type AttributeType = {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  option?: string | string[];
  type: string;
  sort_order: number;
};

interface Option {
  value: string;
  label: string;
}

const CategoryAttribute = ({}) => {
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [allAttributes, setAllAttributes] = useState<AttributeType[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterText, setFilterText] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<Option>({
    value: "asc",
    label: "A → Z",
  });
  const [mappedAttributes, setMappedAttributes] = useState<any>([]);

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        // Fetch categories
        const categories = await getCategory();
        if (categories) setCategoryData(categories);

        // Fetch attributes
        const attributes = await findAttributesAndValues();
        if (attributes?.length > 0)
          setAllAttributes(attributes as any[]);

        // Fetch groups
        const attributeGroups = await findAttributeForGroups();
        if (Array.isArray(attributeGroups))
          setGroups(attributeGroups as Group[]);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch mapped attributes when category changes
  useEffect(() => {
    async function fetchMappedAttributes() {
      if (!selectedCategoryId) return;

      try {
        const res = await find_mapped_attributes_ids(selectedCategoryId);
        if (res) setMappedAttributes(res);
      } catch (err) {
        console.error("Error fetching mapped attributes:", err);
      }
    }

    fetchMappedAttributes();
  }, [selectedCategoryId]);

  // Handle adding attributes to a group
  const handleAddAttributesToGroup = async (attributeIds: string[]) => {
    if (!selectedGroup) return;

    try {
      setIsLoading(true);

      // Get current attribute IDs
      const currentAttrIds = selectedGroup.attributes
        .map((attr) => (typeof attr === "string" ? attr : attr._id))
        .filter((id): id is string => id !== undefined);

      // Combine with new attributes
      const updatedAttrIds = [...currentAttrIds, ...attributeIds];

      // Update group
      await updateAttributeGroup(selectedGroup._id, {
        attributes: updatedAttrIds,
      });

      // Refresh groups
      const updatedGroups = await findAttributeForGroups();
      if (Array.isArray(updatedGroups)) setGroups(updatedGroups as Group[]);

      // Update selected group
      const updatedGroup = updatedGroups?.find(
        (g) => g._id === selectedGroup._id
      );
      if (updatedGroup) setSelectedGroup(updatedGroup as Group);

      alert("Attributes added to group successfully!");
    } catch (err) {
      console.error("Error adding attributes to group:", err);
      setError("Failed to add attributes to group");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle removing attributes from a group
  const handleRemoveAttributesFromGroup = async (attributeIds: string[]) => {
    if (!selectedGroup) return;

    try {
      setIsLoading(true);

      // Get current attribute IDs
      const currentAttrIds = selectedGroup.attributes
        .map((attr) => (typeof attr === "string" ? attr : attr._id))
        .filter((id): id is string => id !== undefined);

      // Remove specified attributes
      const updatedAttrIds = currentAttrIds.filter(
        (id) => !attributeIds.includes(id)
      );

      // Update group
      await updateAttributeGroup(selectedGroup._id, {
        attributes: updatedAttrIds,
      });

      // Refresh groups
      const updatedGroups = await findAttributeForGroups();
      if (Array.isArray(updatedGroups)) setGroups(updatedGroups as Group[]);

      // Update selected group
      const updatedGroup = updatedGroups?.find(
        (g) => g._id === selectedGroup._id
      );
      if (updatedGroup) setSelectedGroup(updatedGroup as Group);

      alert("Attributes removed from group successfully!");
    } catch (err) {
      console.error("Error removing attributes from group:", err);
      setError("Failed to remove attributes from group");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle mapping attributes to category
  const handleMapAttributesToCategory = async (attributeIds: string[]) => {
    if (!selectedCategoryId) return;

    try {
      setIsLoading(true);

      // Get current mapped attribute IDs to prevent overriding
      const currentMappedIds = mappedAttributes.flatMap((group: any) =>
        group.attributes.map((attr: any) => attr._id)
      );

      // Combine with new attributes, avoiding duplicates
      const allAttributeIds = [
        ...new Set([...currentMappedIds, ...attributeIds]),
      ];

      await updateCategoryAttributes(selectedCategoryId, allAttributeIds);

      // Refresh mapped attributes
      const res = await find_mapped_attributes_ids(selectedCategoryId);
      if (res) setMappedAttributes(res);

      alert("Attributes mapped to category successfully!");
    } catch (err) {
      console.error("Error mapping attributes to category:", err);
      setError("Failed to map attributes to category");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle removing attributes from category
  const handleUnmapAttributesFromCategory = async (attributeIds: string[]) => {
    if (!selectedCategoryId) return;

    try {
      setIsLoading(true);

      // Get current mapped attribute IDs
      const currentMappedIds = mappedAttributes.flatMap((group: any) =>
        group.attributes.map((attr: any) => attr._id)
      );

      // Remove the specified attributes
      const updatedAttributeIds = currentMappedIds.filter(
        (id:any) => !attributeIds.includes(id)
      );

      await updateCategoryAttributes(selectedCategoryId, updatedAttributeIds);

      // Refresh mapped attributes
      const res = await find_mapped_attributes_ids(selectedCategoryId);
      if (res) setMappedAttributes(res);

      alert("Attributes removed from category successfully!");
    } catch (err) {
      console.error("Error removing attributes from category:", err);
      setError("Failed to remove attributes from category");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4 p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        Category Attribute Management
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <GroupManagement
        groups={groups}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        allAttributes={allAttributes}
        filterText={filterText}
        setFilterText={setFilterText}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onAddAttributesToGroup={handleAddAttributesToGroup}
        onRemoveAttributesFromGroup={handleRemoveAttributesFromGroup}
        isLoading={isLoading}
      />

      <CategoryMapping
        categoryData={categoryData}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        groups={groups}
        allAttributes={allAttributes}
        mappedAttributes={mappedAttributes}
        onMapAttributesToCategory={handleMapAttributesToCategory}
        onUnmapAttributesFromCategory={handleUnmapAttributesFromCategory}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CategoryAttribute;
