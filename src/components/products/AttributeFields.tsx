import { Brand } from "@/constant/types";
import Select, { MultiValue } from "react-select";
import FilesUploader from "../FilesUploader";

// Extracted for reuse
const AttributeField: React.FC<{
  detail: any;
  stored: any;
  files: any[];
  addFiles: (f: any[]) => void;
  brands: Brand[];
  selectedBrand: { value: string; label: string } | null;
  setSelectedBrand: React.Dispatch<
    React.SetStateAction<{ value: string; label: string } | null>
  >;
  handleAttributeChange: (
    groupId: string,
    groupName: string,
    parent_id: string,
    attrName: string,
    selected: any
  ) => void;
  productId: string;
  dispatch: any;
}> = ({
  detail,
  stored,
  files,
  addFiles,
  brands,
  selectedBrand,
  setSelectedBrand,
  handleAttributeChange,
  productId,
  dispatch,
}) => {
  const { name, _id, type, option } = detail;
  const groupId = detail.groupId?._id ?? "";
  const groupName = detail.groupId?.name ?? "";
  const parent_id = detail.groupId?.parent_id ?? "";

  // Options for code type when name is 'Product Code'
  const codeTypeOptions = [
    { value: "SKU", label: "SKU" },
    { value: "UPC", label: "UPC" },
    { value: "ISBN", label: "ISBN" },
  ];

  return (
    <div key={_id} className="mb-4">
      <label className="block mb-1">{name}</label>

      {/* File type */}
      {type === "file" && (
        <FilesUploader files={stored || []} addFiles={addFiles} />
      )}

      {/* Product Code composite field */}
      {type === "text" && name === "Product Code" ? (
        <div className="flex gap-4 items-center">
          <Select
            options={codeTypeOptions}
            value={codeTypeOptions.find(
              (opt) => opt.value === (stored?.type || "")
            )}
            onChange={(opt) =>
              handleAttributeChange(groupId, groupName, parent_id, name, {
                ...stored,
                type: opt?.value,
                value: stored?.value,
              })
            }
            styles={{
              control: (prov) => ({ ...prov, backgroundColor: "transparent" }),
              menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
            }}
          />
          <input
            title="Product Code"
            type="text"
            className="flex-1"
            placeholder="Enter code"
            value={stored?.value || ""}
            onChange={(e) =>
              handleAttributeChange(groupId, groupName, parent_id, name, {
                ...stored,
                type: stored?.type,
                value: e.target.value,
              })
            }
          />
        </div>
      ) : null}

      {/* Regular text field */}
      {type === "text" && name !== "Product Code" && (
        <input
          title={type}
          type="text"
          className="w-full"
          value={stored || ""}
          onChange={(e) =>
            handleAttributeChange(
              groupId,
              groupName,
              parent_id,
              name,
              e.target.value
            )
          }
        />
      )}

      {/* Textarea */}
      {type === "textarea" && (
        <textarea
          title={type}
          className="w-full bg-transparent"
          value={stored || ""}
          onChange={(e) =>
            handleAttributeChange(
              groupId,
              groupName,
              parent_id,
              name,
              e.target.value
            )
          }
        />
      )}

      {/* Number */}
      {type === "number" && (
        <input
          title={type}
          type="number"
          className="w-full"
          value={stored || 0}
          onChange={(e) =>
            handleAttributeChange(
              groupId,
              groupName,
              parent_id,
              name,
              Number(e.target.value)
            )
          }
        />
      )}

      {/* Select multi */}
      {type === "select" && option && (
        <Select
          isMulti
          options={option.map((v: any) => ({ value: v, label: v }))}
          value={
            Array.isArray(stored)
              ? option
                  .filter((v: any) => stored.includes(v))
                  .map((v: any) => ({ value: v, label: v }))
              : []
          }
          onChange={(opts: MultiValue<{ value: string; label: string }>) =>
            handleAttributeChange(
              groupId,
              groupName,
              parent_id,
              name,
              opts.map((o) => o.value)
            )
          }
          styles={{
            control: (prov) => ({ ...prov, backgroundColor: "transparent" }),
            menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
          }}
        />
      )}

      {/* Brand select */}
      {type === "select" && name === "Brand" && (
        <Select
          value={selectedBrand}
          options={brands.map((b) => ({ value: b._id, label: b.name }))}
          onChange={(opt) => {
            setSelectedBrand(opt);
            handleAttributeChange(
              groupId,
              groupName,
              parent_id,
              name,
              opt?.value
            );
          }}
          styles={{
            control: (prov) => ({ ...prov, backgroundColor: "transparent" }),
            menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
          }}
        />
      )}

      {/* Checkbox */}
      {type === "checkbox" && option && (
        <div className="flex flex-col">
          {option.map((opt: string) => (
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
                  handleAttributeChange(
                    groupId,
                    groupName,
                    parent_id,
                    name,
                    newVals
                  );
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {/* Boolean */}
      {type === "boolean" && (
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={!!stored}
            onChange={(e) =>
              handleAttributeChange(
                groupId,
                groupName,
                parent_id,
                name,
                e.target.checked
              )
            }
          />
          {stored ? "Yes" : "No"}
        </label>
      )}

      {/* Radio */}
      {type === "radio" && option && (
        <div className="flex flex-col">
          {option.map((opt: string) => (
            <label key={opt} className="inline-flex items-center">
              <input
                type="radio"
                className="mr-2"
                name={_id}
                value={opt}
                checked={stored === opt}
                onChange={() =>
                  handleAttributeChange(
                    groupId,
                    groupName,
                    parent_id,
                    name,
                    opt
                  )
                }
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {/* Date */}
      {type === "date" && (
        <input
          title={type}
          type="date"
          className="w-full"
          value={stored || ""}
          onChange={(e) =>
            handleAttributeChange(
              groupId,
              groupName,
              parent_id,
              name,
              e.target.value
            )
          }
        />
      )}

      {/* Color */}
      {type === "color" && (
        <input
          title={type}
          type="color"
          className="w-full h-10 p-0"
          value={stored || "#000000"}
          onChange={(e) =>
            handleAttributeChange(
              groupId,
              groupName,
              parent_id,
              name,
              e.target.value
            )
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
            handleAttributeChange(
              groupId,
              groupName,
              parent_id,
              name,
              e.target.value
            )
          }
        />
      )}

      {/* Multi-select */}
      {type === "multi-select" && option && (
        <Select
          isMulti
          options={option.map((v: any) => ({ value: v, label: v }))}
          value={
            Array.isArray(stored)
              ? stored.map((v: any) => ({ value: v, label: v }))
              : []
          }
          onChange={(opts: any) =>
            handleAttributeChange(
              groupId,
              groupName,
              parent_id,
              name,
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

export default AttributeField;
