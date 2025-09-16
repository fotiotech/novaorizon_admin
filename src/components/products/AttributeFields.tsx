import React from "react";
import { AttributeDetail } from "@/app/(root)/products/component/ProductForm";
import Fields from "./Fields";

export const AttributeField: React.FC<{
  productId: string;
  attribute: AttributeDetail;
  field: any;
  handleAttributeChange: (field: string, value: any) => void;
}> = ({ productId, attribute, field, handleAttributeChange }) => {
  if (!attribute || !attribute.code) return null;
  const { code, name, type, option, isRequired, unit } = attribute;

  return (
    <Fields
      unit={unit}
      isRequired={isRequired}
      type={type}
      code={code}
      name={name}
      field={field}
      option={option}
      handleAttributeChange={handleAttributeChange}
      productId={productId}
    />
  );
};
