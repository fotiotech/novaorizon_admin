"use client";
// Frontend dropdown component (no change except we can call deleteAttributeGroup when needed)
import { deleteAttributeGroup } from "@/app/actions/attributegroup";
import React, { useState, useRef, useEffect, useMemo } from "react";

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

interface Option {
  value: string;
  label: string;
}

// GroupDropdown Component
interface GroupDropdownProps {
  groups: AttributesGroup[];
  groupId: string;
  setGroupId: (id: string) => void;
  setAction: (p: string) => void;
  setEditGroupId: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  placeholder?: string;
}

const GroupDropdown: React.FC<GroupDropdownProps> = ({
  groups,
  groupId,
  setGroupId,
  setAction,
  setEditGroupId,
  onDeleteGroup,
  placeholder = "Select or Create New Group",
}) => {
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  // Toggle group expansion
  const toggleGroupExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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

  // Handle group selection
  const handleSelectGroup = (id: string) => {
    setGroupId(id);
    setIsOpen(false);
  };

  // Handle action click
  const handleActionClick = (
    actionType: string,
    id: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setAction(actionType);
    setEditGroupId(id);
    if (actionType === "add attributes") {
      setGroupId(id);
    }
  };

  // Handle delete group
  const handleDeleteGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this group?")) {
      onDeleteGroup(id);
    }
  };

  // Recursive function to render groups
  const renderGroup = (group: AttributesGroup, level = 0) => {
    const hasChildren = group.children && group.children.length > 0;
    const isExpanded = expandedGroups.has(group._id);

    return (
      <div key={group._id} className="group-item">
        <div
          className={`flex flex-col gap-1 p-2 hover:bg-gray-100 rounded ${
            groupId === group._id ? "bg-blue-50" : ""
          }`}
          onClick={() => handleSelectGroup(group._id)}
        >
          <div className="flex items-center flex-1">
            {hasChildren && (
              <button
                onClick={(e) => toggleGroupExpansion(group._id, e)}
                className="mr-2 w-6 h-6 flex items-center justify-center"
              >
                {isExpanded ? "−" : "+"}
              </button>
            )}
            {!hasChildren && (
              <div className="mr-2 w-6 h-6 flex items-center justify-center opacity-0">
                +
              </div>
            )}

            <div className="flex-1">
              <div className="font-medium">{group.name}</div>
              <div className="text-xs text-gray-500 flex gap-2">
                <span>Code: {group.code}</span>
                <span>Order: {group.group_order}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => handleActionClick("add attributes", group._id, e)}
              className="p-1 text-blue-500 hover:text-blue-700"
              title="Add attributes"
            >
              + Attributes
            </button>
            <button
              type="button"
              onClick={(e) => handleActionClick("edit", group._id, e)}
              className="p-1 text-blue-500 hover:text-blue-700"
              title="Edit group"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(e) => handleDeleteGroup(group._id, e)}
              className="p-1 text-red-500 hover:text-red-700"
              title="Delete group"
            >
              Delete
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-6 pl-2 border-l border-gray-200">
            {group.children!.map((child) => renderGroup(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

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
            {groups.map((group) => renderGroup(group))}

            <div
              className="p-2 text-blue-600 hover:bg-blue-50 rounded cursor-pointer flex items-center"
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
