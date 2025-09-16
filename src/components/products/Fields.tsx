"use client";

import React, { useEffect, useState } from "react";
import Select, { MultiValue } from "react-select";
import MainImageUploader from "./MainImageUploader";
import GalleryUploader from "./GalleryUploader";
import { getBrands } from "@/app/actions/brand";
import { Brand } from "@/constant/types";

interface FieldProps {
  type?: string;
  code: string;
  name?: string;
  field?: any;
  option?: any[];
  handleAttributeChange: (code: string, value: any) => void;
  productId?: string;
  unit?: string; // Add unit prop
  isRequired?: boolean; // Add isRequired prop
}

const Fields: React.FC<FieldProps> = ({
  type,
  code,
  name,
  field,
  option = [],
  handleAttributeChange,
  productId,
  unit, // Destructure unit
  isRequired, // Destructure isRequired
}) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrands()
      .then(setBrands)
      .catch((err) => {
        console.error("Brand fetch error:", err);
        setError("Failed to fetch brands. Please refresh.");
      });
  }, []);

  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: "transparent",
      borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
      borderRadius: "0.5rem",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(99, 102, 241, 0.2)" : "none",
      minHeight: "44px",
      "&:hover": {
        borderColor: state.isFocused ? "#6366f1" : "#9ca3af",
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: "#1f2937",
      borderRadius: "0.5rem",
      overflow: "hidden",
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#6366f1"
        : state.isFocused
        ? "#4b5563"
        : "#1f2937",
      color: state.isSelected ? "white" : provided.color,
      "&:hover": {
        backgroundColor: "#4b5563",
      },
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: "#6366f1",
      borderRadius: "0.375rem",
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: "white",
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: "white",
      "&:hover": {
        backgroundColor: "#818cf8",
        color: "white",
      },
    }),
  };

  // Helper function to render input with unit
  const renderInputWithUnit = (input: JSX.Element) => {
    if (!unit) return input;

    return (
      <div className="relative">
        {input}
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400">
          {unit}
        </span>
      </div>
    );
  };

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
        const textInput = (
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
            value={field || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
            required={isRequired}
          />
        );
        return renderInputWithUnit(textInput);

      case "textarea":
        return (
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors min-h-[100px]"
            value={field || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
            required={isRequired}
          />
        );

      case "number":
        const numberInput = (
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
            value={field || 0}
            placeholder={`Enter ${name}`}
            onChange={(e) =>
              handleAttributeChange(code, Number(e.target.value))
            }
            required={isRequired}
          />
        );
        return renderInputWithUnit(numberInput);

      case "select":
        if (code === "brand") {
          return (
            <Select
              options={brands.map((v) => ({ value: v._id, label: v.name }))}
              value={
                field
                  ? brands
                      .filter((v) => v._id === field)
                      .map((v) => ({ value: v._id, label: v.name }))[0] || null
                  : null
              }
              onChange={(opt: { value: string; label: string } | null) =>
                handleAttributeChange(code, opt ? opt.value : null)
              }
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              required={isRequired}
            />
          );
        }

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
            styles={customSelectStyles}
            className="react-select-container"
            classNamePrefix="react-select"
            required={isRequired}
          />
        );

      case "checkbox":
        return (
          <div className="flex flex-col space-y-3">
            {option.map((opt) => (
              <label
                key={opt}
                className="inline-flex items-center cursor-pointer"
              >
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="sr-only"
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
                    required={
                      isRequired && option.length > 0
                        ? field?.length === 0
                        : false
                    }
                  />
                  <div
                    className={`w-5 h-5 border rounded-md mr-3 flex-shrink-0 flex items-center justify-center ${
                      Array.isArray(field) && field.includes(opt)
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {Array.isArray(field) && field.includes(opt) && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-gray-700 dark:text-gray-300">{opt}</span>
              </label>
            ))}
          </div>
        );

      case "boolean":
        return (
          <label className="inline-flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={!!field}
                onChange={(e) => handleAttributeChange(code, e.target.checked)}
                required={isRequired}
              />
              <div
                className={`w-11 h-6 rounded-full ${
                  field ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600"
                } transition-colors`}
              ></div>
              <div
                className={`absolute left-0.5 top-0.5 bg-white border rounded-full w-5 h-5 transition-transform ${
                  field ? "transform translate-x-5" : ""
                }`}
              ></div>
            </div>
            <span className="ml-3 text-gray-700 dark:text-gray-300">
              {field ? "Yes" : "No"}
            </span>
          </label>
        );

      case "radio":
        return (
          <div className="flex flex-col space-y-3">
            {option.map((opt) => (
              <label
                key={opt}
                className="inline-flex items-center cursor-pointer"
              >
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    className="sr-only"
                    value={opt}
                    checked={field === opt}
                    onChange={() => handleAttributeChange(code, opt)}
                    required={isRequired}
                  />
                  <div
                    className={`w-5 h-5 border rounded-full mr-3 flex-shrink-0 flex items-center justify-center ${
                      field === opt
                        ? "border-indigo-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {field === opt && (
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                    )}
                  </div>
                </div>
                <span className="text-gray-700 dark:text-gray-300">{opt}</span>
              </label>
            ))}
          </div>
        );

      case "date":
        const dateInput = (
          <input
            title="date"
            type="date"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
            value={field || ""}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
            required={isRequired}
          />
        );
        return renderInputWithUnit(dateInput);

      case "color":
        return (
          <div className="flex items-center space-x-3">
            <input
              title="color"
              type="color"
              className="h-10 w-10 p-0 border rounded-lg cursor-pointer"
              value={field || "#000000"}
              onChange={(e) => handleAttributeChange(code, e.target.value)}
              required={isRequired}
            />
            <span className="text-gray-700 dark:text-gray-300 font-mono">
              {field || "#000000"}
            </span>
            {unit && (
              <span className="text-gray-500 dark:text-gray-400">{unit}</span>
            )}
          </div>
        );

      case "url":
        const urlInput = (
          <input
            title="url"
            type="url"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
            value={field || ""}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
            required={isRequired}
          />
        );
        return renderInputWithUnit(urlInput);

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
            styles={customSelectStyles}
            className="react-select-container"
            classNamePrefix="react-select"
            required={isRequired}
          />
        );

      default:
        const defaultInput = (
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
            value={field || ""}
            placeholder={`Enter ${name}`}
            onChange={(e) => handleAttributeChange(code, e.target.value)}
            required={isRequired}
          />
        );
        return renderInputWithUnit(defaultInput);
    }
  };

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {name}

        {unit && (
          <span className="text-gray-600 dark:text-gray-600 ml-2">
            ({unit})
          </span>
        )}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div>{renderField()}</div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default Fields;
