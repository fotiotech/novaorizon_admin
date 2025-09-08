"use client";

import React from "react";
import Select, { MultiValue } from "react-select";
import MainImageUploader from "./MainImageUploader";
import GalleryUploader from "./GalleryUploader";

interface FieldProps {
  type?: string;
  code: string;
  name?: string;
  field?: any;
  option?: any[];
  handleAttributeChange: (code: string, value: any) => void;
  productId?: string;
}

const Fields: React.FC<FieldProps> = ({
  type,
  code,
  name,
  field,
  option = [],
  handleAttributeChange,
  productId,
}) => {
  const renderField = () => {
    switch (type) {
      case "file":
        if (code === "main_image") {
          return (
            <MainImageUploader
              productId={productId || ""}
              field={field}
              code={code}
            />
          );
        } else if (code === "gallery") {
          return (
            <GalleryUploader
              productId={productId || ""}
              field={field}
              code={code}
            />
          );
        }
        return null;

      case "text":
        return (
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={field || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        );

      case "textarea":
        return (
          <textarea
            className="w-full p-2 border rounded bg-transparent"
            value={field || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        );

      case "number":
        return (
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={field || 0}
            placeholder={`Enter ${name}`}
            onChange={(e) =>
              handleAttributeChange(code, Number(e.target.value))
            }
          />
        );

      case "select":
        return (
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
        );

      case "checkbox":
        return (
          <div className="flex flex-col space-y-2">
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
        );

      case "boolean":
        return (
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={!!field}
              onChange={(e) => handleAttributeChange(code, e.target.checked)}
            />
            {field ? "Yes" : "No"}
          </label>
        );

      case "radio":
        return (
          <div className="flex flex-col space-y-2">
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
        );

      case "date":
        return (
          <input
            title="date"
            type="date"
            className="w-full p-2 border rounded"
            value={field || ""}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        );

      case "color":
        return (
          <div className="flex items-center">
            <input
              title="color"
              type="color"
              className="h-10 w-10 p-0 border rounded"
              value={field || "#000000"}
              onChange={(e) => handleAttributeChange(code, e.target.value)}
            />
            <span className="ml-2">{field || "#000000"}</span>
          </div>
        );

      case "url":
        return (
          <input
            title="url"
            type="url"
            className="w-full p-2 border rounded"
            value={field || ""}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        );

      case "multi-select":
        return (
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
        );

      default:
        return (
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={field || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="mb-2">
      <label className="text-md font-semibold mb-3">{name}</label>
      <div>{renderField()}</div>
    </div>
  );
};

export default Fields;
