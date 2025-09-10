"use client";

import { getCategory } from "@/app/actions/category";
import React, { useEffect, useState } from "react";

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

const ATTRIBUTE_OPTIONS = [
  { label: "Category", value: "category_id" },
  { label: "Title", value: "title" },
  { label: "Brand", value: "brand" },
  { label: "Weight", value: "weight" },
  { label: "Length", value: "length" },
  { label: "Width", value: "width" },
  { label: "Height", value: "height" },
  { label: "Color", value: "color" },
  { label: "Main Image", value: "main_image" },
  { label: "List Price", value: "list_price" },
  { label: "Currency", value: "currency" },
  { label: "Stock Status", value: "stock_status" },
  { label: "Quantity", value: "quantity" },
  { label: "Short Descriptions", value: "short_description" },
  { label: "Long Descriptions", value: "long_description" },
  { label: "Primary Material", value: "primary_material" },
  { label: "Shipping Weight", value: "shipping_weight" },
  { label: "Origin Country", value: "origin_country" },
  { label: "Warranty Period", value: "warranty_period" },
  { label: "Meta Title", value: "meta_title" },
  { label: "Safety Certifications", value: "safety_certifications" },
];

interface Rule {
  attribute: string;
  operator: string;
  value: string;
  position: number;
}

interface CollectionRuleFormProps {
  rules: Rule[];
  onAddRule: (rules: Rule[]) => void;
}

export default function CollectionRuleForm({
  rules,
  onAddRule,
}: CollectionRuleFormProps) {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ) => {
    const { name, value } = e.target;
    const updatedRules: any = [...rules];

    if (name === "position") {
      updatedRules[index][name] = Number(value);
    } else {
      updatedRules[index][name] = value;
    }

    onAddRule(updatedRules);
  };

  const handleCategorySelect = (categoryId: string, index: number) => {
    const updatedRules = [...rules];
    updatedRules[index].value = categoryId;
    onAddRule(updatedRules);
  };

  const handleAddNewRule = () => {
    onAddRule([
      ...rules,
      { attribute: "", operator: "$eq", value: "", position: rules.length },
    ]);
  };

  const handleRemoveRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    // Update positions
    updatedRules.forEach((rule, i) => (rule.position = i));
    onAddRule(updatedRules);
  };

  return (
    <div className="p-4 border rounded-lg space-y-6 bg-white shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Collection Rules
        </h3>
        <button
          type="button"
          onClick={handleAddNewRule}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center text-sm"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>No rules added yet. Click "Add Rule" to create your first rule.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="p-4 border rounded-md bg-gray-50 relative group"
            >
              <button
                type="button"
                onClick={() => handleRemoveRule(index)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove rule"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4">
                  <label className="block mb-1 font-medium text-sm text-gray-700">
                    Attribute
                  </label>
                  <AttributeInput
                    value={rule.attribute}
                    onChange={(e) => handleInputChange(e, index)}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block mb-1 font-medium text-sm text-gray-700">
                    Operator
                  </label>
                  <select
                    title="Operator"
                    name="operator"
                    value={rule.operator}
                    onChange={(e) => handleInputChange(e, index)}
                    className="w-full p-2 border rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {OPERATORS.map((op) => (
                      <option
                        key={op.value}
                        value={op.value}
                        className="capitalize"
                      >
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  {rule.attribute === "category_id" ? (
                    <>
                      <label className="block mb-1 font-medium text-sm text-gray-700">
                        Category
                      </label>
                      <CategorySelect
                        value={rule.value}
                        onChange={(value) => handleCategorySelect(value, index)}
                      />
                    </>
                  ) : (
                    <>
                      <label className="block mb-1 font-medium text-sm text-gray-700">
                        Value
                      </label>
                      <input
                        type="text"
                        name="value"
                        value={rule.value}
                        onChange={(e) => handleInputChange(e, index)}
                        className="w-full p-2 border rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder='e.g. "red" or ["red", "blue"]'
                      />
                    </>
                  )}
                </div>

                <div className="md:col-span-1">
                  <label className="block mb-1 font-medium text-sm text-gray-700">
                    Position
                  </label>
                  <input
                    title="Position"
                    type="number"
                    name="position"
                    value={rule.position}
                    onChange={(e) => handleInputChange(e, index)}
                    className="w-full p-2 border rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                    min={0}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Attribute Input with suggestions
function AttributeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [suggestions, setSuggestions] = useState<
    { label: string; value: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    // Find the label for the current value
    const currentAttribute = ATTRIBUTE_OPTIONS.find(
      (opt) => opt.value === value
    );
    setInputValue(currentAttribute ? currentAttribute.label : value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (val.length > 0) {
      const filtered = ATTRIBUTE_OPTIONS.filter(
        (opt) =>
          opt.label.toLowerCase().includes(val.toLowerCase()) ||
          opt.value.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: {
    label: string;
    value: string;
  }) => {
    // Create a synthetic event to pass to the parent's onChange handler
    const syntheticEvent = {
      target: {
        name: "attribute",
        value: suggestion.value,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(syntheticEvent);
    setInputValue(suggestion.label);
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative">
      <input
        type="text"
        name="attribute"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={handleBlur}
        className="w-full p-2 border rounded text-sm focus:ring-blue-500 focus:border-blue-500"
        placeholder="Search or type attribute..."
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.value}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium">{suggestion.label}</div>
              <div className="text-xs text-gray-500">{suggestion.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Category Select Component
function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await getCategory();
        setCategories(res);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  const filtered = categories.filter((cat: any) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCategory = categories.find((c) => c._id === value);

  useEffect(() => {
    if (selectedCategory) {
      setSearch(selectedCategory.name);
    }
  }, [selectedCategory]);

  const handleSelect = (id: string) => {
    onChange(id);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search categories..."
        value={search}
        onFocus={() => setShowDropdown(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
        }}
        className="w-full p-2 border rounded text-sm focus:ring-blue-500 focus:border-blue-500"
      />

      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {filtered.length > 0 ? (
            filtered.map((cat: any) => (
              <div
                key={cat._id}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                onClick={() => handleSelect(cat._id)}
              >
                {cat.name}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500 text-sm">
              No categories found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
