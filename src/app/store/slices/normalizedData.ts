import { normalize } from "normalizr";
import {
  user,
  category,
  product,
  offer,
  attribute,
  attributeGroup,
  order,
  shipping,
} from "./schemas";

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

// Normalize offer function
export const normalizeOffer = (data: any) => {
  return normalize(data, [offer]);
}; // Normalize order function
export const normalizeOrder = (data: any) => {
  return normalize(data, [order]);
};
export const normalizeShipping = (data: any) => {
  return normalize(data, [shipping]);
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
