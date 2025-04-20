import { schema } from "normalizr";

// Define a user schema
export const user = new schema.Entity("users", {}, { idAttribute: "_id" });

// Define a category schema
export const category = new schema.Entity("categories", {}, { idAttribute: "_id" });

// Define a product schema that references the category schema
export const product = new schema.Entity("products", {}, { idAttribute: "_id" });


