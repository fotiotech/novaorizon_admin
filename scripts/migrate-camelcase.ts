import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const envFilePath = path.resolve(process.cwd(), ".env.local");
const envFile = fs.existsSync(envFilePath)
  ? fs.readFileSync(envFilePath, "utf-8")
  : "";

for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(
    /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/,
  );
  if (!match) continue;
  const [, key, rawValue] = match;
  const value = rawValue.replace(/^['"]|['"]$/g, "");
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

const mongoUri: string = MONGODB_URI;

// Field name mapping from snake_case to camelCase
const fieldMapping: Record<string, string> = {
  category_id: "categoryId",
  brand_id: "brand",
  product_id: "productId",
  list_price: "listPrice",
  sale_price: "salePrice",
  main_image: "mainImage",
  stock_quantity: "quantity",
  low_stock_threshold: "lowStockThreshold",
  url_slug: "slug",
  product_code: "productCode",
  gallery: "images",
  created_at: "createdAt",
  updated_at: "updatedAt",
  attribute_set_id: "attributeSetId",
  attribute_set: "attributeSet",
  variant_name: "variantName",
  variant_themes: "variantThemes",
  related_products: "relatedProducts",
  short_description: "shortDescription",
  key_features: "keyFeatures",
  image_url: "imageUrl",
  image_urls: "images",
  hero_image: "heroImage",
  sort_order: "sortOrder",
  parent_id: "parentId",
};

interface AnyObject {
  [key: string]: any;
}

// Recursively transform object keys from snake_case to camelCase
function transformSnakeToCamel(obj: AnyObject): AnyObject {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null
        ? transformSnakeToCamel(item)
        : item,
    );
  }

  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const transformed: AnyObject = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip _id field
    if (key === "_id" || key === "__v") {
      transformed[key] = value;
      continue;
    }

    // Map snake_case to camelCase if mapping exists
    const newKey = fieldMapping[key] || key;

    // Recursively transform nested objects
    if (typeof value === "object" && value !== null) {
      transformed[newKey] = transformSnakeToCamel(value);
    } else {
      transformed[newKey] = value;
    }
  }

  return transformed;
}

function normalizeProductDocument(product: AnyObject): AnyObject {
  const normalized = { ...product };

  if (!normalized.name && typeof normalized.title === "string") {
    normalized.name = normalized.title;
  }

  if (
    !normalized.productCode &&
    (normalized.code_type || normalized.code_value || normalized.model)
  ) {
    const type = normalized.code_type || "MODEL";
    const value = normalized.code_value || normalized.model || "";
    if (value) {
      normalized.productCode = [
        { type: String(type).toUpperCase(), value: String(value) },
      ];
    }
  }

  if (!normalized.mainImage && normalized.main_image) {
    normalized.mainImage = normalized.main_image;
  }

  if (Array.isArray(normalized.gallery) && !Array.isArray(normalized.images)) {
    normalized.images = normalized.gallery;
  }

  if (normalized.list_price != null && normalized.listPrice == null) {
    normalized.listPrice = normalized.list_price;
  }

  if (normalized.sale_price != null && normalized.price == null) {
    normalized.price = normalized.sale_price;
  }

  if (
    normalized.low_stock_threshold != null &&
    normalized.lowStockThreshold == null
  ) {
    normalized.lowStockThreshold = normalized.low_stock_threshold;
  }

  if (normalized.short_desc != null && normalized.shortDescription == null) {
    normalized.shortDescription = normalized.short_desc;
  }

  if (
    Array.isArray(normalized.related_products) &&
    !Array.isArray(normalized.relatedProducts)
  ) {
    normalized.relatedProducts = normalized.related_products.map(
      (item: any) => ({
        id: item?.id || item?._id || item,
        relationshipType:
          item?.relationshipType || item?.relationship_type || "Related",
      }),
    );
  }

  if (Array.isArray(normalized.relatedProducts)) {
    normalized.relatedProducts = normalized.relatedProducts.map(
      (item: any) => ({
        id: item?.id || item?._id || item,
        relationshipType:
          item?.relationshipType || item?.relationship_type || "Related",
      }),
    );
  }

  if (normalized.stock_status && !normalized.status) {
    const status = String(normalized.stock_status).toLowerCase();
    normalized.status = ["draft", "active", "inactive"].includes(status)
      ? status
      : "draft";
  }

  // Remove legacy keys after normalization
  const legacyKeys = [
    "category_id",
    "brand_id",
    "product_id",
    "list_price",
    "sale_price",
    "main_image",
    "gallery",
    "low_stock_threshold",
    "short_desc",
    "key_features",
    "code_type",
    "code_value",
    "related_products",
    "variant_themes",
    "stock_quantity",
    "image_url",
    "image_urls",
    "hero_image",
    "attribute_set_id",
    "attribute_set",
    "variant_name",
    "product_code",
    "sort_order",
    "parent_id",
    "model",
    "msrp",
    "condition",
    "stock_status",
  ];

  for (const key of legacyKeys) {
    delete normalized[key];
  }

  return normalized;
}

async function migrateProducts() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(mongoUri, { dbName: "fotiodb" });
    console.log("✅ Connected to MongoDB (fotiodb)");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection failed");
    }

    const productsCollection = db.collection("products");
    const variantsCollection = db.collection("variants");
    const attributesCollection = db.collection("attributes");
    const attributeGroupsCollection = db.collection("attributegroups");
    const attributeSetsCollection = db.collection("attributesets");

    const legacyFieldNames = [
      "category_id",
      "brand_id",
      "product_id",
      "list_price",
      "sale_price",
      "main_image",
      "gallery",
      "low_stock_threshold",
      "short_desc",
      "key_features",
      "code_type",
      "code_value",
      "related_products",
      "variant_themes",
      "stock_quantity",
      "image_url",
      "image_urls",
      "hero_image",
      "attribute_set_id",
      "attribute_set",
      "variant_name",
      "product_code",
      "sort_order",
      "parent_id",
      "model",
      "msrp",
      "condition",
      "stock_status",
      "dsin",
    ];

    const legacyUnset = Object.fromEntries(
      legacyFieldNames.map((field) => [field, ""]),
    );

    // Migrate products
    console.log("🔄 Migrating products...");
    const products = await productsCollection.find({}).toArray();
    console.log(`Found ${products.length} products to migrate`);

    let productsUpdated = 0;
    let productsFailed = 0;

    for (const product of products) {
      try {
        const transformed = transformSnakeToCamel(product);
        const normalized = normalizeProductDocument(transformed);

        // Remove deprecated fields
        const updateData: AnyObject = { ...normalized };
        delete updateData.dsin;

        await productsCollection.updateOne(
          { _id: product._id },
          { $set: updateData, $unset: legacyUnset },
        );

        productsUpdated++;

        if (productsUpdated % 10 === 0) {
          console.log(
            `  ✓ Migrated ${productsUpdated}/${products.length} products`,
          );
        }
      } catch (error) {
        console.error(`✗ Failed to migrate product ${product._id}:`, error);
        productsFailed++;
      }
    }

    console.log(
      `✅ Products migration complete: ${productsUpdated} updated, ${productsFailed} failed`,
    );

    // Migrate variants
    console.log("🔄 Migrating variants...");
    const variants = await variantsCollection.find({}).toArray();
    console.log(`Found ${variants.length} variants to migrate`);

    let variantsUpdated = 0;
    let variantsFailed = 0;

    for (const variant of variants) {
      try {
        const transformed = transformSnakeToCamel(variant);

        // Remove deprecated fields
        const updateData: AnyObject = { ...transformed };
        delete updateData.dsin;

        await variantsCollection.updateOne(
          { _id: variant._id },
          { $set: updateData, $unset: { dsin: "" } },
        );

        variantsUpdated++;

        if (variantsUpdated % 10 === 0) {
          console.log(
            `  ✓ Migrated ${variantsUpdated}/${variants.length} variants`,
          );
        }
      } catch (error) {
        console.error(`✗ Failed to migrate variant ${variant._id}:`, error);
        variantsFailed++;
      }
    }

    console.log(
      `✅ Variants migration complete: ${variantsUpdated} updated, ${variantsFailed} failed`,
    );

    // Migrate attributes
    console.log("🔄 Migrating attributes...");
    const attributes = await attributesCollection.find({}).toArray();
    console.log(`Found ${attributes.length} attributes to migrate`);

    let attributesUpdated = 0;
    let attributesFailed = 0;

    for (const attribute of attributes) {
      try {
        const transformed = transformSnakeToCamel(attribute);

        await attributesCollection.updateOne(
          { _id: attribute._id },
          { $set: transformed },
        );

        attributesUpdated++;

        if (attributesUpdated % 10 === 0) {
          console.log(
            `  ✓ Migrated ${attributesUpdated}/${attributes.length} attributes`,
          );
        }
      } catch (error) {
        console.error(`✗ Failed to migrate attribute ${attribute._id}:`, error);
        attributesFailed++;
      }
    }

    console.log(
      `✅ Attributes migration complete: ${attributesUpdated} updated, ${attributesFailed} failed`,
    );

    // Migrate attribute groups
    console.log("🔄 Migrating attribute groups...");
    const attributeGroups = await attributeGroupsCollection.find({}).toArray();
    console.log(`Found ${attributeGroups.length} attribute groups to migrate`);

    let attributeGroupsUpdated = 0;
    let attributeGroupsFailed = 0;

    for (const group of attributeGroups) {
      try {
        const transformed = transformSnakeToCamel(group);

        await attributeGroupsCollection.updateOne(
          { _id: group._id },
          { $set: transformed },
        );

        attributeGroupsUpdated++;

        if (attributeGroupsUpdated % 10 === 0) {
          console.log(
            `  ✓ Migrated ${attributeGroupsUpdated}/${attributeGroups.length} attribute groups`,
          );
        }
      } catch (error) {
        console.error(
          `✗ Failed to migrate attribute group ${group._id}:`,
          error,
        );
        attributeGroupsFailed++;
      }
    }

    console.log(
      `✅ Attribute groups migration complete: ${attributeGroupsUpdated} updated, ${attributeGroupsFailed} failed`,
    );

    // Migrate attribute sets
    console.log("🔄 Migrating attribute sets...");
    const attributeSets = await attributeSetsCollection.find({}).toArray();
    console.log(`Found ${attributeSets.length} attribute sets to migrate`);

    let attributeSetsUpdated = 0;
    let attributeSetsFailed = 0;

    for (const set of attributeSets) {
      try {
        const transformed = transformSnakeToCamel(set);

        await attributeSetsCollection.updateOne(
          { _id: set._id },
          { $set: transformed },
        );

        attributeSetsUpdated++;

        if (attributeSetsUpdated % 10 === 0) {
          console.log(
            `  ✓ Migrated ${attributeSetsUpdated}/${attributeSets.length} attribute sets`,
          );
        }
      } catch (error) {
        console.error(`✗ Failed to migrate attribute set ${set._id}:`, error);
        attributeSetsFailed++;
      }
    }

    console.log(
      `✅ Attribute sets migration complete: ${attributeSetsUpdated} updated, ${attributeSetsFailed} failed`,
    );

    // Summary
    console.log("\n📊 Migration Summary:");
    console.log(
      `  Products: ${productsUpdated} updated, ${productsFailed} failed`,
    );
    console.log(
      `  Variants: ${variantsUpdated} updated, ${variantsFailed} failed`,
    );
    console.log(
      `  Attributes: ${attributesUpdated} updated, ${attributesFailed} failed`,
    );
    console.log(
      `  Attribute Groups: ${attributeGroupsUpdated} updated, ${attributeGroupsFailed} failed`,
    );
    console.log(
      `  Attribute Sets: ${attributeSetsUpdated} updated, ${attributeSetsFailed} failed`,
    );
    console.log(
      `  Total: ${productsUpdated + variantsUpdated + attributesUpdated + attributeGroupsUpdated + attributeSetsUpdated} updated, ${productsFailed + variantsFailed + attributesFailed + attributeGroupsFailed + attributeSetsFailed} failed`,
    );

    if (
      productsFailed === 0 &&
      variantsFailed === 0 &&
      attributesFailed === 0 &&
      attributeGroupsFailed === 0 &&
      attributeSetsFailed === 0
    ) {
      console.log("\n✨ Migration completed successfully!");
    } else {
      console.log("\n⚠️  Migration completed with errors");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

migrateProducts();
