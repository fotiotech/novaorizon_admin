import React from "react";
import Select, { MultiValue } from "react-select";
import MainImageUploader from "./MainImageUploader";
import GalleryUploader from "./GalleryUploader";
import { AttributeDetail } from "@/app/(root)/products/list_product/new/page";

export const AttributeField: React.FC<{
  productId: string;
  attribute: AttributeDetail;
  field: any;
  path: string; // group code only
  handleAttributeChange: (
    groupCode: string,
    attrName: string,
    selected: any
  ) => void;
}> = ({ productId, attribute, field, path, handleAttributeChange }) => {
  const { code, name, _id, type, option } = attribute;
  const groupCode = path;
  const stored = field ?? "";

  return (
    <div key={_id} className="mb-4">
      <label className="block mb-1">{name}</label>

      <div>
        {type === "file" && code === "main_image" && (
          <MainImageUploader productId={productId} />
        )}
        {type === "file" && code === "gallery" && (
          <GalleryUploader productId={productId} />
        )}

        {type === "text" && (
          <input
            type="text"
            className="w-full"
            value={stored || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) =>
              handleAttributeChange(groupCode, code, e.target.value)
            }
          />
        )}

        {type === "textarea" && (
          <textarea
            className="w-full bg-transparent"
            value={stored || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) =>
              handleAttributeChange(groupCode, code, e.target.value)
            }
          />
        )}

        {type === "number" && (
          <input
            type="number"
            className="w-full"
            value={stored || 0}
            placeholder={`Enter ${name}`}
            onChange={(e) =>
              handleAttributeChange(groupCode, code, Number(e.target.value))
            }
          />
        )}

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

        {type === "date" && (
          <input
            title="date"
            type="date"
            className="w-full"
            value={stored || ""}
            onChange={(e) =>
              handleAttributeChange(groupCode, code, e.target.value)
            }
          />
        )}

        {type === "color" && (
          <input
            title="color"
            type="color"
            className="w-full h-10 p-0"
            value={stored || "#000000"}
            onChange={(e) =>
              handleAttributeChange(groupCode, code, e.target.value)
            }
          />
        )}

        {type === "url" && (
          <input
            title="url"
            type="url"
            className="w-full"
            value={stored || ""}
            onChange={(e) =>
              handleAttributeChange(groupCode, code, e.target.value)
            }
          />
        )}

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
    </div>
  );
};
