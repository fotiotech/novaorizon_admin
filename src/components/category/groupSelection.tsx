"use client";

import React, { useEffect, useMemo, useState } from "react";

type AttributesGroup = {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  attributes?: string[];
  group_order: number;
  sort_order: number;
  children?: AttributesGroup[];
};

// GroupDropdown Component (simplified)
interface GroupDropdownProps {
  groups: AttributesGroup[];
  groupId: string;
  setGroupId: (id: string) => void;
  setAction: (p: string) => void;
  placeholder?: string;
}

const GroupDropdown: React.FC<GroupDropdownProps> = ({
  groups,
  groupId,
  setGroupId,
  setAction,
  placeholder = "Select or Create New Group",
}) => {
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find selected group
  const selectedGroup = useMemo(() => {
    const findGroup = (
      nodes: AttributesGroup[]
    ): AttributesGroup | undefined => {
      for (const node of nodes) {
        if (node._id === groupId) return node;
        if (node.children) {
          const found = findGroup(node.children);
          if (found) return found;
        }
      }
    };
    return findGroup(groups);
  }, [groups, groupId]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className="flex justify-between items-center p-3 rounded-lg border border-gray-300 bg-white cursor-pointer shadow-sm"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className={selectedGroup ? "text-gray-800" : "text-gray-500"}>
          {selectedGroup ? selectedGroup.name : placeholder}
        </span>
        <svg
          className={`transform transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute mt-1 w-full max-h-80 overflow-y-auto rounded-lg bg-white shadow-lg z-10 border border-gray-200">
          <div className="p-2">
            {groups.map((group) => (
              <div key={group._id}>
                <div
                  className={`p-2 hover:bg-gray-100 rounded cursor-pointer ${
                    groupId === group._id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => {
                    setGroupId(group._id);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium">{group.name}</div>
                  <div className="text-xs text-gray-500">
                    Code: {group.code} | Order: {group.group_order}
                  </div>
                </div>
              </div>
            ))}

            <div
              className="p-2 text-blue-600 hover:bg-blue-500 rounded cursor-pointer flex items-center"
              onClick={() => {
                setAction("create");
                setIsOpen(false);
              }}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Group
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDropdown;
