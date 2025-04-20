import { normalize } from "normalizr";
import { user, category, product } from "./schemas";

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
