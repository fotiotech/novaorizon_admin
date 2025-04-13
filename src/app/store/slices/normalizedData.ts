import { normalize } from "normalizr";
import { category, product } from "./schemas";

export const normalizeCategory = (data: any) => {
  return normalize(data, [category]);
};
// Normalize function
export const normalizeProducts = (data: any) => {
  return normalize(data, [product]);
};
