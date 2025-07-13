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
    label: "name",
    value: "identification_branding.name",
  },
  {
    label: "brand",
    value: "identification_branding.brand",
  },
  {
    label: "weight",
    value: "product_specifications.weight",
  },
  {
    label: "length",
    value: "product_specifications.dimensions.length",
  },
  {
    label: "width",
    value: "product_specifications.dimensions.width",
  },
  {
    label: "height",
    value: "product_specifications.dimensions.height",
  },
  {
    label: "color",
    value: "product_specifications.color",
  },
  { label: "main image", value: "media_visuals.main_image" },
  { label: "price", value: "pricing_availability.price" },
  {
    label: "currency",
    value: "pricing_availability.currency",
  },
  {
    label: "stock status",
    value: "pricing_availability.stock_status",
  },
  {
    label: "quantity",
    value: "pricing_availability.quantity",
  },
  { label: "short descriptions", value: "descriptions.short" },
  { label: "long descriptions", value: "descriptions.long" },
  {
    label: "primary material",
    value: "materials_composition.primary_material",
  },
  {
    label: "shipping weight",
    value: "logistics_shipping.shipping_weight",
  },
  {
    label: "origin country",
    value: "logistics_shipping.origin_country",
  },
  {
    label: "warranty period",
    value: "warranty_returns.warranty_period",
  },
  { label: "meta title", value: "seo_marketing.meta_title" },
  {
    label: "safety certifications",
    value: "legal_compliance.safety_certifications",
  },
  // Add more fields as needed...
];
