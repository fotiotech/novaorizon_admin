import { normalize } from "normalizr";
import { user, category, product, offer, attribute, attributeGroup } from "./schemas";

// Normalize user function
export const normalizeUser = (data: any) => {
  return normalize(data, [user]);
};

// Normalize category function
export const normalizeCategory = (data: any) => {
  return normalize(data, [category]);
};

// Normalize product function
export const normalizeProducts = (data: any) => {
  return normalize(data, [product]);
};

// Normalize product function
export const normalizeOffer = (data: any) => {
  return normalize(data, [product]);
};

// Normalize product function
export function normalizeAttribute(
  data: Array<{ _id: string; name: string; values: any[]; groupName: string }>
) {
  // passing an array tells Normalizr to expect a list of attributeEntity
  return normalize(data, [attribute]);
}

// Normalize attributeGroup function
export const normalizeAttributeGroup = (data: any) => {
  return normalize(data, [attributeGroup]);
};