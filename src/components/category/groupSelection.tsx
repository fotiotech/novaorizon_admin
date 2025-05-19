import React, { useState, useRef, useEffect } from "react";

// Frontend now expects nested tree with `children`
interface Group {
  _id: string;
  name: string;
  children?: Group[];
}

interface GroupDropdownProps {
  groups: Group[]; // already nested: top-level groups with children
  groupId: string;
  setGroupId: (id: string) => void;
  placeholder?: string;
}

const GroupDropdown: React.FC<GroupDropdownProps> = ({ groups, groupId, setGroupId, placeholder = "Select or Create New Group" }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedParentId("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedGroup = (() => {
    // search tree for groupId
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
        onClick={() => setIsOpen(prev => !prev)}
      >
        <span>{selectedGroup ? selectedGroup.name : placeholder}</span>
        <svg
          className={`transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className=" mt-1 w-full max-h-60 overflow-y-auto rounded-lg bg-white dark:bg-sec-dark shadow-lg z-10">
          <ul>
            {groups.map(top => (
              <li key={top._id}>
                <div
                  className={`px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer ${groupId === top._id ? "font-semibold" : ""}`}
                  onClick={() => {
                    setGroupId(top._id);
                    setSelectedParentId(top._id);
                  }}
                >
                  {top.name}
                </div>

                {selectedParentId === top._id && top.children && (
                  <ul>
                    {top.children.map(child => (
                      <li key={child._id}
                          className={`px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer ${groupId === child._id ? "font-semibold" : ""}`}
                          onClick={() => {
                            setGroupId(child._id);
                            setIsOpen(false);
                            setSelectedParentId("");
                          }}
                      >
                        {child.name}
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
