import React, { useEffect, useState } from "react";
import { getCategory } from "@/app/actions/category";

interface FilterableCategorySelectProps {
  setIsCategorySelected: (val: boolean) => void;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number
  ) => void;
  index?: number; // Optional index for handling specific rule changes
}

export default function FilterableCategorySelect({
  setIsCategorySelected,
  onChange,
  index, // Default to 0 if index is not provided
}: FilterableCategorySelectProps) {
  const [category, setCategory] = useState<any>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      const res = await getCategory();
      setCategory(res);
    }
    fetchCategories();
  }, []);

  const filtered = category.filter((cat: any) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val: any) => {
    onChange(val, index ?? 0); // Use the provided index or default to 0
    setIsCategorySelected(true);
    setShowDropdown(false);
    setSearch(category.find((c: any) => c._id === val)?.name || "");
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
        className="w-full p-2 border rounded"
      />

      {showDropdown && (
        <ul className="absolute z-10 bg-gray-200 text-black border mt-1 rounded w-full max-h-48 overflow-auto shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((cat: any) => (
              <li
                key={cat._id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  handleSelect({ target: { name: "value", value: cat._id } });
                }}
              >
                {cat.name}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-gray-400">No categories found</li>
          )}
        </ul>
      )}
    </div>
  );
}
