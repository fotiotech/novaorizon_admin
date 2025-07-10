import { schema } from "normalizr";

// Define a user schema
export const user = new schema.Entity("users", {}, { idAttribute: "_id" });

// Define a category schema
export const category = new schema.Entity(
  "categories",
  {},
  { idAttribute: "_id" }
);

// Define a product schema that references the category schema
export const product = new schema.Entity(
  "products",
  {},
  { idAttribute: "_id" }
);

// Define a product schema that references the category schema
export const offer = new schema.Entity("offers", {}, { idAttribute: "_id" });

// Define a product schema that references the category schema
export const order = new schema.Entity("orders", {}, { idAttribute: "_id" });

// Define a product schema that references the category schema
export const shipping = new schema.Entity("shippings", {}, { idAttribute: "_id" });

// Define a product schema that references the category schema
export const attribute = new schema.Entity(
  "attributes",
  {},
  { idAttribute: "_id" }
);

// Define a product schema that references the category schema
export const attributeGroup = new schema.Entity(
  "attributeGroups",
  {},
  { idAttribute: "_id" }
);
