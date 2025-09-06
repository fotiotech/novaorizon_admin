import React from "react";
import Select, { MultiValue } from "react-select";
import MainImageUploader from "./MainImageUploader";
import GalleryUploader from "./GalleryUploader";
import { AttributeDetail } from "@/app/(root)/products/new/page";
import ManageRelatedProduct from "./ManageRelatedProduct";

export const AttributeField: React.FC<{
  productId: string;
  attribute: AttributeDetail;
  field: any;
  handleAttributeChange: (field: string, value: any) => void;
}> = ({ productId, attribute, field, handleAttributeChange }) => {
  if (!attribute || !attribute.code) return null;
  const { code, name, type, option } = attribute;

  return (
    <div className="mb-4">
      <label className="block mb-1">{name}</label>

      <div>
        {type === "file" && code === "main_image" && (
          <MainImageUploader productId={productId} field={field} code={code} />
        )}
        {type === "file" && code === "gallery" && (
          <GalleryUploader productId={productId} field={field} code={code} />
        )}

        {code === "related_products" && type === "select" && (
          <ManageRelatedProduct id={productId} code={code} />
        )}

        {type === "text" && (
          <input
            type="text"
            className="w-full"
            value={field || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        )}

        {type === "textarea" && (
          <textarea
            className="w-full bg-transparent"
            value={field || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        )}

        {type === "number" && (
          <input
            type="number"
            className="w-full"
            value={field || 0}
            placeholder={`Enter ${name}`}
            onChange={(e) =>
              handleAttributeChange(code, Number(e.target.value))
            }
          />
        )}

        {type === "select" && Array.isArray(option) && (
          <Select
            isMulti
            options={option.map((v) => ({ value: v, label: v }))}
            value={
              Array.isArray(field)
                ? option
                    .filter((v) => field.includes(v))
                    .map((v) => ({ value: v, label: v }))
                : []
            }
            onChange={(opts: MultiValue<{ value: string; label: string }>) =>
              handleAttributeChange(
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
                  checked={Array.isArray(field) ? field.includes(opt) : false}
                  onChange={(e) => {
                    const newVals = Array.isArray(field)
                      ? e.target.checked
                        ? [...field, opt]
                        : field.filter((v: any) => v !== opt)
                      : e.target.checked
                      ? [opt]
                      : [];
                    handleAttributeChange(code, newVals);
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
              checked={!!field}
              onChange={(e) => handleAttributeChange(code, e.target.checked)}
            />
            {field ? "Yes" : "No"}
          </label>
        )}

        {type === "radio" && Array.isArray(option) && (
          <div className="flex flex-col">
            {option.map((opt) => (
              <label key={opt} className="inline-flex items-center">
                <input
                  type="radio"
                  className="mr-2"
                  value={opt}
                  checked={field === opt}
                  onChange={() => handleAttributeChange(code, opt)}
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
            value={field || ""}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        )}

        {type === "color" && (
          <input
            title="color"
            type="color"
            className="w-full h-10 p-0"
            value={field || "#000000"}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        )}

        {type === "url" && (
          <input
            title="url"
            type="url"
            className="w-full"
            value={field || ""}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        )}

        {type === "multi-select" && Array.isArray(option) && (
          <Select
            isMulti
            options={option.map((v) => ({ value: v, label: v }))}
            value={
              Array.isArray(field)
                ? field.map((v) => ({ value: v, label: v }))
                : []
            }
            onChange={(opts) =>
              handleAttributeChange(
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
