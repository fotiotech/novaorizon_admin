// app/catalog/categories/_component/types.ts

export type AttributeFlag = "isRequired" | "isHighlight";

export interface Mapping {
  id: string;
  set: string;
  groups: {
    group: string;
    attributes: {
      attribute: string;
      isRequired: boolean;
      isHighlight: boolean;
    }[];
  }[];
}

export interface AttributeSetOption {
  _id: string;
  title: string;
  code: string;
}

export interface GroupOption {
  _id: string;
  name: string;
  code: string;
}

export interface AttributeOption {
  _id: string;
  name: string;
  code: string;
  type: string;
}
