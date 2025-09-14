// CategoryAttribute.tsx
"use client";

import React, { useEffect, useState } from "react";
import { findAttributesAndValues } from "@/app/actions/attributes";
import {
  find_mapped_attributes_ids,
  getCategory,
} from "@/app/actions/category";
import { findAttributeForGroups } from "@/app/actions/attributegroup";
import CategoryMapping from "../_component/CategoryMapping";
import GroupManagement from "../_component/GroupManagement";

const CategoryAttribute = ({}) => {
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [allAttributes, setAllAttributes] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (attributes?.length > 0) setAllAttributes(attributes as any);

        // Fetch groups
        const attributeGroups = await findAttributeForGroups();
        if (Array.isArray(attributeGroups)) setGroups(attributeGroups);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  return (
    <div className="mb-4 p-2 max-w-6xl mx-auto">
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
        allAttributes={allAttributes}
        isLoading={isLoading}
      />

      <CategoryMapping
        categoryData={categoryData}
        groups={groups}
        allAttributes={allAttributes}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CategoryAttribute;
