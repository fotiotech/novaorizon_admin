"use client";

import React, { useState } from "react";

const OPERATORS = ["$in", "$nin", "$eq", "$ne", "$lt", "$lte", "$gt", "$gte"];

export default function CollectionRuleForm({
  rules,
  onAddRule,
}: {
  rules: any[];
  onAddRule: (rule: any[]) => void;
}) {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ) => {
    const { name, value } = e.target;
    const updatedRules = [...rules];
    updatedRules[index] = {
      ...updatedRules[index],
      [name]: name === "position" ? Number(value) : value,
    };
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
            <input
              type="text"
              name="attribute"
              value={rule.attribute}
              onChange={(e) => handleInputChange(e, index)}
              className="w-full p-2 border rounded"
              placeholder="e.g. price"
            />
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
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Value</label>
            <input
              type="text"
              name="value"
              value={rule.value}
              onChange={(e) => handleInputChange(e, index)}
              className="w-full p-2 border rounded"
              placeholder='e.g. "red" or ["red", "blue"]'
            />
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
