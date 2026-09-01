const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const envPath = path.resolve(__dirname, "../.env.local");
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(
    /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/,
  );
  if (!match) continue;
  const [, key, rawValue] = match;
  const value = rawValue.replace(/^['"]|['"]$/g, "");
  if (!env[key]) env[key] = value;
}

const uri = env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

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
  "title",
  "short_description",
  "description",
  "sku",
];

defaultMap = {
  name: ["title"],
  productCode: ["code_type", "code_value", "model"],
  mainImage: ["main_image"],
  images: ["gallery", "image_url", "image_urls"],
  listPrice: ["list_price"],
  salePrice: ["sale_price"],
  lowStockThreshold: ["low_stock_threshold"],
  shortDescription: ["short_desc", "short_description"],
  relatedProducts: ["related_products"],
  categoryId: ["category_id"],
  brand: ["brand_id"],
  status: ["stock_status"],
};

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizeRelated(item) {
  if (!item) return null;
  if (
    typeof item === "string" ||
    typeof item === "number" ||
    (typeof item === "object" && item._id)
  ) {
    return {
      id: item.id || item._id || item,
      relationshipType:
        item.relationshipType || item.relationship_type || "Related",
    };
  }
  return item;
}

async function cleanupProducts() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("fotiodb");
  const products = db.collection("products");

  const cursor = products.find({});
  let updated = 0;
  let processed = 0;

  for await (const doc of cursor) {
    processed++;
    const set = {};
    const unset = {};

    if (!doc.name && doc.title) set.name = doc.title;
    if (!doc.productCode && (doc.code_type || doc.code_value || doc.model)) {
      const type = doc.code_type || "MODEL";
      const value = doc.code_value || doc.model || "";
      if (value)
        set.productCode = [
          { type: String(type).toUpperCase(), value: String(value) },
        ];
    }
    if (!doc.mainImage && doc.main_image) set.mainImage = doc.main_image;
    if (Array.isArray(doc.gallery) && !Array.isArray(doc.images))
      set.images = doc.gallery;
    if (doc.list_price != null && doc.listPrice == null)
      set.listPrice = doc.list_price;
    if (doc.sale_price != null && doc.salePrice == null)
      set.salePrice = doc.sale_price;
    if (doc.low_stock_threshold != null && doc.lowStockThreshold == null)
      set.lowStockThreshold = doc.low_stock_threshold;
    if (
      (doc.short_desc != null || doc.short_description != null) &&
      doc.shortDescription == null
    ) {
      set.shortDescription = doc.short_desc ?? doc.short_description;
    }
    if (
      Array.isArray(doc.related_products) &&
      !Array.isArray(doc.relatedProducts)
    ) {
      set.relatedProducts = doc.related_products
        .map(normalizeRelated)
        .filter(Boolean);
    }
    if (doc.category_id && !doc.categoryId) set.categoryId = doc.category_id;
    if (doc.brand_id && !doc.brand) set.brand = doc.brand_id;
    if (doc.stock_status && !doc.status) {
      const s = String(doc.stock_status).toLowerCase();
      set.status = ["draft", "active", "inactive"].includes(s) ? s : "draft";
    }

    for (const key of legacyKeys) {
      if (Object.prototype.hasOwnProperty.call(doc, key)) {
        unset[key] = "";
      }
    }

    if (Object.keys(set).length || Object.keys(unset).length) {
      await products.updateOne({ _id: doc._id }, { $set: set, $unset: unset });
      updated++;
    }
  }

  const remaining = await products
    .find({ $or: legacyKeys.map((key) => ({ [key]: { $exists: true } })) })
    .toArray();
  const count = remaining.length;

  const sample = await products.findOne({});
  console.log(
    JSON.stringify(
      {
        processed,
        updated,
        legacyRemaining: count,
        sampleKeys: sample ? Object.keys(sample).slice(0, 40) : [],
        hasLegacy: sample
          ? legacyKeys.some((k) =>
              Object.prototype.hasOwnProperty.call(sample, k),
            )
          : false,
        categoryId: sample && sample.categoryId,
        mainImage: sample && sample.mainImage,
        shortDescription: sample && sample.shortDescription,
        relatedProducts: sample && sample.relatedProducts,
        status: sample && sample.status,
        productCode: sample && sample.productCode,
      },
      null,
      2,
    ),
  );

  await client.close();
}

cleanupProducts().catch((err) => {
  console.error(err);
  process.exit(1);
});
