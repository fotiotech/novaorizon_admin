"use client";

import { getCategory } from "@/app/actions/category";
import React, { useEffect, useState } from "react";
import FilterableCategorySelectFilter from "@/components/category/FilterableCategorySelect";

const OPERATORS = [
  { label: "In", value: "$in" },
  { label: "Not In", value: "$nin" },
  { label: "Equal", value: "$eq" },
  { label: "Not Equal", value: "$ne" },
  { label: "Less Than", value: "$lt" },
  { label: "Less Than or Equal", value: "$lte" },
  { label: "Greater Than", value: "$gt" },
  { label: "Greater Than or Equal", value: "$gte" },
];

export default function CollectionRuleForm({
  rules,
  onAddRule,
}: {
  rules: any[];
  onAddRule: (rule: any[]) => void;
}) {
  const [isCategorySelected, setIsCategorySelected] = useState<boolean>(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ) => {
    const { name, value } = e.target;
    const updatedRules = [...rules];
    if (name === "position") {
      updatedRules[index][name] = Number(value);
    } else if (name === "value" && isCategorySelected) {
      updatedRules[index][name] = value;
    } else {
      setIsCategorySelected(false);
      updatedRules[index][name] = value;
    }
    onAddRule(updatedRules);
  };

  const handleAddNewRule = () => {
    onAddRule([
      ...rules,
      { attribute: "", operator: "$eq", value: "", position: rules.length },
    ]);
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      {rules.map((rule, index) => (
        <div key={index} className="space-y-2">
          <div>
            <label className="block mb-1 font-medium">Attribute</label>
            <select
              title="Attribute"
              name="attribute"
              value={rule.attribute}
              onChange={(e) => handleInputChange(e, index)}
              className="w-full p-2 border rounded bg-transparent text-white"
            >
              <option value="">Select attribute</option>
              {attributeOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="capitalize "
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Operator</label>
            <select
              title="Operator"
              name="operator"
              value={rule.operator}
              onChange={(e) => handleInputChange(e, index)}
              className="w-full p-2 border rounded"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value} className="capitalize">
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex  gap-4">
            <div>
              <label className="block mb-1 font-medium">Enter Value</label>
              <input
                type="text"
                name="value"
                value={rule.value}
                onChange={(e) => {
                  setIsCategorySelected(false);
                  handleInputChange(e, index);
                }}
                className="w-full p-2 border rounded"
                placeholder='e.g. "red" or ["red", "blue"]'
              />
            </div>
            <p>Or</p>
            <div>
              <label htmlFor="category_id" className="block mb-2">
                Select Category
              </label>
              <FilterableCategorySelectFilter
                setIsCategorySelected={setIsCategorySelected}
                onChange={handleInputChange}
                index={index}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium">Position</label>
            <input
              title="Position"
              type="number"
              name="position"
              value={rule.position}
              onChange={(e) => handleInputChange(e, index)}
              className="w-full p-2 border rounded"
              min={0}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddNewRule}
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        + Add Rule
      </button>
    </div>
  );
}

const attributeOptions = [
  // Top-level groups and their fields
  {
    label: "category",
    value: "category_id",
  },
  {
    label: "title",
    value: "title",
  },
  {
    label: "brand",
    value: "brand",
  },
  {
    label: "weight",
    value: "weight",
  },
  {
    label: "length",
    value: "length",
  },
  {
    label: "width",
    value: "width",
  },
  {
    label: "height",
    value: "height",
  },
  {
    label: "color",
    value: "color",
  },
  { label: "main image", value: "main_image" },
  { label: "price", value: "price" },
  {
    label: "currency",
    value: "currency",
  },
  {
    label: "stock status",
    value: "stock_status",
  },
  {
    label: "quantity",
    value: "quantity",
  },
  { label: "short descriptions", value: "short_description" },
  { label: "long descriptions", value: "long_description" },
  {
    label: "primary material",
    value: "primary_material",
  },
  {
    label: "shipping weight",
    value: "shipping_weight",
  },
  {
    label: "origin country",
    value: "origin_country",
  },
  {
    label: "warranty period",
    value: "warranty_period",
  },
  { label: "meta title", value: "meta_title" },
  {
    label: "safety certifications",
    value: "safety_certifications",
  },
  // Add more fields as needed...
];
