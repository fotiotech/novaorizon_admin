"use client";

import {
  createAttributeGroup,
  findAllAttributeGroups,
} from "@/app/actions/attributegroup";
import {
  createAttribute,
  findCategoryAttributesAndValues,
} from "@/app/actions/attributes";
import { getCategory } from "@/app/actions/category";
import { Category } from "@/constant/types";
import React, { useEffect, useState } from "react";

type AttributeType = {
  attrName: string;
  attrValue: string[];
  group?: string;
};

type AttributesGroup = {
  _id: string;
  name: string;
  parent_id: string;
  category_id: string;
};

const Attributes = () => {
  const [category, setCategory] = useState<Category[]>([]);
  const [catId, setCatId] = useState<string>("");
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [formData, setFormData] = useState<AttributeType[]>([
    { attrName: "", attrValue: [""] },
  ]);
  const [groups, setGroups] = useState<AttributesGroup[]>([]);
  const [isNewGroup, setIsNewGroup] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      if (catId) {
        const response = await findCategoryAttributesAndValues(catId);
        if (response?.length > 0) {
          const formattedAttributes = response[0].allAttributes.map(
            (attr: any) => ({
              attrName: attr.name,
              attrValue: attr.attributeValues.map((val: any) => val.value),
            })
          );
          setAttributes(formattedAttributes);
        }
      }
      const res = await getCategory();
      setCategory(res || []);
    };

    async function getGroups() {
      const groupResponse = await findAllAttributeGroups();
      setGroups(groupResponse as unknown as AttributesGroup[]);
    }

    fetchData();
    getGroups();
  }, [catId]);

  function addAttributes() {
    setFormData((prev) => [...prev, { attrName: "", attrValue: [""] }]);
  }

  const handleInputChange = (
    index: number,
    field: keyof AttributeType,
    value: string
  ) => {
    setFormData((prev) =>
      prev.map((attr, i) =>
        i === index
          ? {
              ...attr,
              [field]: field === "attrValue" ? value.split(",") : value,
            }
          : attr
      )
    );
  };

  const handleCreateGroup = async () => {
    if (newGroupName.trim() === "") return;

    const response = await createAttributeGroup(newGroupName, groupId, catId);
    if (response) {
      setNewGroupName("");
    }
  };

  return (
    <>
      <h2 className="font-bold text-xl my-2">Attributes</h2>
      <form action={createAttribute}>
        <select
          title="Parent Category"
          name="catId"
          onChange={(e) => setCatId(e.target.value)}
          value={catId}
          className="w-3/4 p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
        >
          <option value="" className="text-gray-700">
            Select category
          </option>
          {category.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.categoryName}
            </option>
          ))}
        </select>

        <div>
          <label htmlFor={`group`}>Group:</label>
          <select
            title="group"
            name="groupName"
            onChange={(e) => {
              setIsNewGroup(e.target.value);
            }}
            className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
          >
            <option value="">Select or Create New Group</option>
            {groups.map((group) => (
              <option key={group._id} value={group.name}>
                {group.name}
              </option>
            ))}
            <option value="create">Create New Group</option>
          </select>
          {isNewGroup === "create" && (
            <div>
              <div>
                <select
                  title="group"
                  name="groupId"
                  value={groupId}
                  onChange={(e) => {
                    setGroupId(e.target.value);
                  }}
                  className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                >
                  <option value="">Select parent group</option>
                  {groups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  name="newGroupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter new group name"
                  className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
                />
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  className="btn text-sm"
                >
                  Create Group
                </button>
              </div>
            </div>
          )}
        </div>

        {formData.map((attr, index) => (
          <div key={index} className="flex gap-2 my-2">
            <div>
              <label htmlFor={`attrName-${index}`}>Attribute Name:</label>
              <input
                id={`attrName-${index}`}
                type="text"
                name={`attrName-${index}`}
                value={attr.attrName}
                onChange={(e) =>
                  handleInputChange(index, "attrName", e.target.value)
                }
                className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
              />
            </div>
            <div>
              <label htmlFor={`attrValue-${index}`}>Attribute Value:</label>
              <input
                id={`attrValue-${index}`}
                type="text"
                name={`attrValue-${index}`}
                value={attr.attrValue.join(",")}
                placeholder="Values separated by commas"
                onChange={(e) =>
                  handleInputChange(index, "attrValue", e.target.value)
                }
                className="p-2 rounded-lg bg-[#eee] dark:bg-sec-dark"
              />
            </div>
          </div>
        ))}

        <div className="flex justify-end items-center gap-2">
          <button onClick={addAttributes} type="button" className="btn text-sm">
            Add new property
          </button>
          <button type="submit" className="btn my-2">
            Save
          </button>
        </div>
      </form>

      <div>
        <h3 className="font-bold text-lg">Attributes</h3>
        <ul className="flex flex-col gap-1 max-h-96 overflow-hidden overflow-y-auto scrollbar-none">
          {attributes.map((attr) => (
            <li
              key={attr.attrName}
              className="flex justify-between cursor-pointer font-bold hover:bg-pri-dark bg-opacity-5"
            >
              {attr.attrName}
            </li>
          ))}
        </ul>
      </div>


    </>
  );
};

export default Attributes;
