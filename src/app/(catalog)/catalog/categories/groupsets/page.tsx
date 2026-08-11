"use client";

import React, { useEffect, useState } from "react";
import { findAttributesAndValues } from "@/app/actions/attributes";
import { getCategory } from "@/app/actions/category";
import { findAttributeForGroups } from "@/app/actions/attributegroup";
import { getAttributeSets } from "@/app/actions/attribute_sets";
import CategoryMapping from "../../attributes/_component/CategoryMapping";

const CategoryAttribute = () => {
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [allAttributes, setAllAttributes] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [allAttributeSets, setAllAttributeSets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all required data in parallel
        const [categoriesResult, attributesResult, groupsResult, setsResult] =
          await Promise.all([
            getCategory(), // returns array of categories
            findAttributesAndValues(),
            findAttributeForGroups(),
            getAttributeSets(),
          ]);

        if (categoriesResult) setCategoryData(categoriesResult);
        if (attributesResult) setAllAttributes(attributesResult as any[]);
        if (Array.isArray(groupsResult)) setGroups(groupsResult);
        if (setsResult.success) setAllAttributeSets(setsResult.data as any[]);
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
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <CategoryMapping
        categoryData={categoryData}
        allAttributeSets={allAttributeSets} // ✅ correct data
        isLoading={isLoading}
      />
    </div>
  );
};

export default CategoryAttribute;
