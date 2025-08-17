import Select, { MultiValue } from "react-select";
import FilesUploader from "../FilesUploader";
import React, { useEffect, useState } from "react";

type RawFetchedGroup = {
  group: {
    _id: string;
    code: string;
    name: string;
    parent_id?: string;
  };
  attributes: Array<{
    _id: string;
    code: string;
    name: string;
    type: string;
    option?: string[];
    groupId: string;
  }>;
  children: Array<{
    group: { _id: string; code: string; name: string; parent_id?: string };
    attributes: Array<{
      _id: string;
      code: string;
      name: string;
      type: string;
      option?: string[];
      groupId: string;
    }>;
  }>;
};

type Detail = {
  _id: string;
  code: string;
  name: string;
  type: string;
  option?: string[];
  groupId: {
    _id: string;
    code: string;
    name: string;
    parent_id?: string;
  };
};

interface Props {
  fetchedGroup: RawFetchedGroup | null;
  product: any;
  path?: string;
  handleAttributeChange: (
    groupCode: string,
    attrName: string,
    selected: any
  ) => void;
}

/**
 * This component flattens “parent” + “children” into a single array of `Detail`,
 * but it first checks that `fetchedGroup`, `fetchedGroup.attributes`, and
 * `fetchedGroup.children` are all defined and are arrays.
 */
const AttributeFieldsContainer: React.FC<Props> = ({
  fetchedGroup,
  product,
  path = "",
  handleAttributeChange,
}) => {
  const [details, setDetails] = useState<Detail[]>([]);

  useEffect(() => {
    // 1) If fetchedGroup is null or attributes/children aren’t arrays, bail out.
    if (
      !fetchedGroup ||
      !Array.isArray(fetchedGroup.attributes) ||
      !Array.isArray(fetchedGroup.children)
    ) {
      setDetails([]);
      return;
    }

    // 2) Now we know fetchedGroup.attributes and fetchedGroup.children are arrays.
    const arr: Detail[] = [];

    // 2a) Parent‐level attributes (may be an empty array, but it’s definitely iterable)
    for (const attr of fetchedGroup.attributes) {
      arr.push({
        _id: attr._id,
        code: attr.code,
        name: attr.name,
        type: attr.type,
        option: attr.option,
        groupId: {
          _id: fetchedGroup.group._id,
          code: fetchedGroup.group.code,
          name: fetchedGroup.group.name,
          parent_id: fetchedGroup.group.parent_id,
        },
      });
    }

    // 2b) Child‐group attributes (each child is guaranteed to have a .attributes array)
    for (const child of fetchedGroup.children) {
      // guard in case someone passes a bad shape at runtime:
      if (!Array.isArray(child.attributes)) continue;

      for (const attr of child.attributes) {
        arr.push({
          _id: attr._id,
          code: attr.code,
          name: attr.name,
          type: attr.type,
          option: attr.option,
          groupId: {
            _id: child.group._id,
            code: child.group.code,
            name: child.group.name,
            parent_id: child.group.parent_id,
          },
        });
      }
    }

    setDetails(arr);
  }, [fetchedGroup]);

  return (
    <div>
      {details.map((detail) => (
        <AttributeField
          key={detail._id}
          detail={detail}
          field={product?.[detail.groupId.code] ?? {}}
          path={path}
          handleAttributeChange={handleAttributeChange}
        />
      ))}
    </div>
  );
};

export default AttributeFieldsContainer;



const AttributeField: React.FC<{
  detail: Detail;
  field: any;
  path?: string;
  handleAttributeChange: (
    groupCode: string,
    attrName: string,
    selected: any
  ) => void;
}> = ({ detail, field, path, handleAttributeChange }) => {
  const { code, name, _id, type, option } = detail;
  const groupCode = `${path}.${detail.groupId?.code ?? ""}`;
  const groupNam = `${path}.${detail.groupId?.name ?? ""}`;

  const stored = field[name] ?? "";

  return (
    <div key={_id} className="mb-4">
      <label className="block mb-1">{name}</label>

      {/* TEXT */}
      {type === "text" && (
        <input
          title={type}
          type="text"
          className="w-full"
          value={stored || ""}
          placeholder={`Enter ${name}`}
          onChange={(e) =>
            handleAttributeChange(groupCode, code, e.target.value)
          }
        />
      )}

      {/* TEXTAREA */}
      {type === "textarea" && (
        <textarea
          title={type}
          className="w-full bg-transparent"
          value={stored || ""}
          placeholder={`Enter ${name}`}
          onChange={(e) =>
            handleAttributeChange(groupCode, code, e.target.value)
          }
        />
      )}

      {/* NUMBER */}
      {type === "number" && (
        <input
          title={type}
          type="number"
          className="w-full"
          value={stored || 0}
          placeholder={`Enter ${name}`}
          onChange={(e) =>
            handleAttributeChange(groupCode, code, Number(e.target.value))
          }
        />
      )}

      {/* SINGLE‐SELECT / MULTI‐SELECT */}
      {type === "select" && Array.isArray(option) && (
        <Select
          isMulti
          options={option.map((v) => ({ value: v, label: v }))}
          value={
            Array.isArray(stored)
              ? option
                  .filter((v) => stored.includes(v))
                  .map((v) => ({ value: v, label: v }))
              : []
          }
          onChange={(opts: MultiValue<{ value: string; label: string }>) =>
            handleAttributeChange(
              groupCode,
              code,
              opts.map((o) => o.value)
            )
          }
          styles={{
            control: (prov) => ({ ...prov, backgroundColor: "transparent" }),
            menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
          }}
        />
      )}

      {/* CHECKBOX GROUP */}
      {type === "checkbox" && Array.isArray(option) && (
        <div className="flex flex-col">
          {option.map((opt) => (
            <label key={opt} className="inline-flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={Array.isArray(stored) ? stored.includes(opt) : false}
                onChange={(e) => {
                  const newVals = Array.isArray(stored)
                    ? e.target.checked
                      ? [...stored, opt]
                      : stored.filter((v: any) => v !== opt)
                    : e.target.checked
                    ? [opt]
                    : [];
                  handleAttributeChange(groupCode, code, newVals);
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {/* BOOLEAN (single checkbox) */}
      {type === "boolean" && (
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={!!stored}
            onChange={(e) =>
              handleAttributeChange(groupCode, code, e.target.checked)
            }
          />
          {stored ? "Yes" : "No"}
        </label>
      )}

      {/* RADIO GROUP */}
      {type === "radio" && Array.isArray(option) && (
        <div className="flex flex-col">
          {option.map((opt) => (
            <label key={opt} className="inline-flex items-center">
              <input
                type="radio"
                className="mr-2"
                name={_id}
                value={opt}
                checked={stored === opt}
                onChange={() => handleAttributeChange(groupCode, code, opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {/* DATE */}
      {type === "date" && (
        <input
          title={type}
          type="date"
          className="w-full"
          value={stored || ""}
          onChange={(e) =>
            handleAttributeChange(groupCode, code, e.target.value)
          }
        />
      )}

      {/* COLOR */}
      {type === "color" && (
        <input
          title={type}
          type="color"
          className="w-full h-10 p-0"
          value={stored || "#000000"}
          onChange={(e) =>
            handleAttributeChange(groupCode, code, e.target.value)
          }
        />
      )}

      {/* URL */}
      {type === "url" && (
        <input
          title={type}
          type="url"
          className="w-full"
          value={stored || ""}
          onChange={(e) =>
            handleAttributeChange(groupCode, code, e.target.value)
          }
        />
      )}

      {/* MULTI‐SELECT (alternative to “select” if you use MultiValue) */}
      {type === "multi-select" && Array.isArray(option) && (
        <Select
          isMulti
          options={option.map((v) => ({ value: v, label: v }))}
          value={
            Array.isArray(stored)
              ? stored.map((v) => ({ value: v, label: v }))
              : []
          }
          onChange={(opts) =>
            handleAttributeChange(
              groupCode,
              code,
              opts.map((o: any) => o.value)
            )
          }
          styles={{
            control: (prov) => ({ ...prov, backgroundColor: "transparent" }),
            menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
          }}
        />
      )}
    </div>
  );
};
