/* MultiValueInput.tsx */
import React, { useState, useEffect } from "react";

interface Props {
  values: string[];
  onChange: (newValues: string[]) => void;
}

export default function MultiValueInput({ values, onChange }: Props) {
  const [raw, setRaw] = useState(values.join(","));

  useEffect(() => {
    setRaw(values.join(","));
  }, [values]);

  const parse = () =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

  const handleBlur = () => onChange(parse());
  const handleAddClick = () => onChange(parse());

  return (
    <div className="flex items-center gap-2 mb-2">
      <input
        type="text"
        className="flex-1 border rounded p-1"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        placeholder="e.g. Red, Blue, Green"
      />
      <button
        type="button"
        onClick={handleAddClick}
        className="px-3 py-1 bg-blue-600 text-white rounded"
      >
        Add
      </button>
    </div>
  );
}