// Frontend dropdown component (no change except we can call deleteAttributeGroup when needed)
import { deleteAttributeGroup } from "@/app/actions/attributegroup";
import React, { useState, useRef, useEffect } from "react";

interface Group {
  _id: string;
  name: string;
  children?: Group[];
}

interface GroupDropdownProps {
  groups: Group[];
  groupId: string;
  setGroupId: (id: string) => void;
  setEditGroupId: (id: string) => void;
  setEditingAttributes?: (prev: (p: any) => void) => void;
  placeholder?: string;
}

const GroupDropdown: React.FC<GroupDropdownProps> = ({
  groups,
  groupId,
  setGroupId,
  setEditGroupId,
  setEditingAttributes,
  placeholder = "Select or Create New Group",
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedParentId("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedGroup = (() => {
    const find = (nodes: Group[]): Group | undefined => {
      for (const node of nodes) {
        if (node._id === groupId) return node;
        if (node.children) {
          const found = find(node.children);
          if (found) return found;
        }
      }
    };
    return find(groups);
  })();

  return (
    <div className="relative w-full md:w-3/4" ref={dropdownRef}>
      <div
        className="flex justify-between items-center p-2 rounded-lg bg-[#eee] dark:bg-sec-dark cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{selectedGroup ? selectedGroup.name : placeholder}</span>
        <svg
          className={`transform transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
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
        <div className="mt-1 w-full max-h-60 overflow-y-auto rounded-lg bg-white dark:bg-sec-dark shadow-lg z-10">
          <ul>
            {groups.map((top) => (
              <li key={top._id}>
                <div className="flex items-center gap-3">
                  <div
                    className={`px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer ${
                      groupId === top._id ? "font-semibold" : ""
                    }`}
                    onClick={() => {
                      setGroupId(top._id);
                      setEditingAttributes &&
                        setEditingAttributes((prev) => ({
                          ...prev,
                          groupId: top._id,
                        }));
                      setSelectedParentId(top._id);
                    }}
                  >
                    <p>{top.name}</p>
                  </div>
                  <p
                    onClick={() => setEditGroupId(top._id)}
                    className="text-blue-500 p-2 hover:bg-gray-200"
                  >
                    Edit
                  </p>
                  <p
                    onClick={async () => {
                      await deleteAttributeGroup(top._id);
                    }}
                    className="text-red-500 p-2 hover:bg-gray-200"
                  >
                    Delete
                  </p>
                </div>

                {selectedParentId === top._id && top.children && (
                  <ul>
                    {top.children.map((child) => (
                      <li key={child._id} className="flex items-center gap-3">
                        <div
                          className={`px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer ${
                            groupId === child._id ? "font-semibold" : ""
                          }`}
                          onClick={() => {
                            setGroupId(child._id);
                            setIsOpen(false);
                            setSelectedParentId("");
                          }}
                        >
                          <p>{child.name}</p>
                        </div>
                        <p
                          onClick={() => setEditGroupId(child._id)}
                          className="text-blue-500 hover:bg-gray-200 p-2"
                        >
                          Edit
                        </p>
                        <p
                          onClick={async () => {
                            await deleteAttributeGroup(child._id);
                          }}
                          className="text-red-500 hover:bg-gray-200 p-2"
                        >
                          Delete
                        </p>
                      </li>
                    ))}
                    <li
                      className="px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-blue-600"
                      onClick={() => {
                        setGroupId("create");
                        setIsOpen(false);
                        setSelectedParentId("");
                      }}
                    >
                      + Create New Sub-group
                    </li>
                  </ul>
                )}
              </li>
            ))}
            <li
              className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => {
                setGroupId("create");
                setIsOpen(false);
                setSelectedParentId("");
              }}
            >
              + Create New Group
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default GroupDropdown;
