import { normalize, schema } from "normalizr";

// Define a category schema
export const category = new schema.Entity("categories", {}, { idAttribute: "_id" });



// Define a product schema that references the category schema
export const product = new schema.Entity("products", {}, { idAttribute: "_id" });


