import { Types } from "mongoose";

export interface AttributeDoc {
  _id: Types.ObjectId;
  name: string;
  option: string[];
  type: string;
  groupId: Types.ObjectId;
}

export interface GroupInfo {
  _id: Types.ObjectId;
  name: string;
  group_order: number;
}

export interface GroupWithAttributes {
  group: GroupInfo;
  attributes: AttributeDoc[];
}

export type AttributeGroupResult =
  | AttributeDoc[]
  | {
      group: GroupInfo;
      attributes: AttributeDoc[];
      children: GroupWithAttributes[];
    }
  | null;
