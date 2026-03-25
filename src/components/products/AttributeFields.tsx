import React from "react";
import { AttributeDetail } from "@/app/(root)/products/component/ProductForm";
import Fields from "./Fields";

export const AttributeField: React.FC<{
  productId: string;
  attribute: AttributeDetail;
  field: any;
  handleAttributeChange: (field: string, value: any) => void;
  units: any[];
}> = ({ productId, attribute, field, handleAttributeChange, units }) => {
  if (!attribute || !attribute.code) return null;
  const { code, name, type, option, isRequired, unitFamily } = attribute;

  return (
    <Fields
      isRequired={isRequired}
      type={type}
      code={code}
      name={name}
      field={field}
      option={option}
      handleAttributeChange={handleAttributeChange}
      productId={productId}
      unitFamily={unitFamily}
      units={units}
    />
  );
};
