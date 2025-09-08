import React from "react";
import { AttributeDetail } from "@/app/(root)/products/new/page";
import Fields from "./Fields";

export const AttributeField: React.FC<{
  productId: string;
  attribute: AttributeDetail;
  field: any;
  handleAttributeChange: (field: string, value: any) => void;
}> = ({ productId, attribute, field, handleAttributeChange }) => {
  if (!attribute || !attribute.code) return null;
  const { code, name, type, option } = attribute;

  return (
    <Fields
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
