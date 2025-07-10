"use client";

import React, { useState } from "react";

const OPERATORS = ["$in", "$nin", "$eq", "$ne", "$lt", "$lte", "$gt", "$gte"];

export default function CollectionRuleForm({
  onAddRule,
}: {
  onAddRule: (rule: any) => void;
}) {
  const [attribute, setAttribute] = useState("");
  const [operator, setOperator] = useState("$eq");
  const [value, setValue] = useState("");
  const [position, setPosition] = useState(0);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!attribute || value === "") {
      alert("Attribute and Value are required");
      return;
    }

    let parsedValue = value;
    try {
      parsedValue = JSON.parse(value);
    } catch (e) {
      // fallback to string if not JSON parsable
    }

    onAddRule({ attribute, operator, value: parsedValue, position });

    // Reset form
    setAttribute("");
    setOperator("$eq");
    setValue("");
    setPosition(0);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg space-y-4">
      <div>
        <label className="block mb-1 font-medium">Attribute</label>
        <input
          type="text"
          value={attribute}
          onChange={(e) => setAttribute(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="e.g. color"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Operator</label>
        <select
          title="Operator"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder='e.g. "red" or ["red", "blue"]'
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Position</label>
        <input
          title="Position"
          type="number"
          value={position}
          onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
          className="w-full p-2 border rounded"
          min={0}
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        Add Rule
      </button>
    </form>
  );
}
