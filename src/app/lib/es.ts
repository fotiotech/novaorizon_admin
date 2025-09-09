// lib/es.ts
import { Client } from "@elastic/elasticsearch";

export const esClient = new Client({
  node: process.env.ELASTIC_NODE,
  auth: { apiKey: process.env.ELASTIC_API_KEY || "" },
  sniffOnStart: false,
  sniffInterval: false,
});

const INDEX = process.env.ELASTIC_INDEX;

/**
 * Ensure the product index exists with the expected settings & mappings.
 * - Throws if ELASTIC_INDEX is not set.
 * - Returns early if the index already exists.
 */
export async function ensureProductIndex(): Promise<void> {
  if (!INDEX) {
    throw new Error("ELASTIC_INDEX environment variable is not set.");
  }

  try {
    // indices.exists may return a boolean or an object depending on client version.
    // Normalize to a boolean.
    const existsRes = await esClient.indices.exists({ index: INDEX });
    const indexExists =
      typeof existsRes === "boolean"
        ? existsRes
        : (existsRes as any).body ?? false;

    if (indexExists) {
      console.log(`Elasticsearch index "${INDEX}" already exists.`);
      return;
    }

    console.log(`Creating Elasticsearch index "${INDEX}"...`);

    await esClient.indices.create({
      index: INDEX,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            edge_ngram_analyzer: {
              type: "custom",
              tokenizer: "edge_ngram_tokenizer",
              filter: ["lowercase"],
            },
          },
          tokenizer: {
            edge_ngram_tokenizer: {
              type: "edge_ngram",
              min_gram: 2,
              max_gram: 20,
              token_chars: ["letter", "digit"],
            },
          },
        },
      },
      mappings: {
        properties: {
          title: {
            type: "text",
            fields: {
              keyword: { type: "keyword" },
              autocomplete: {
                type: "text",
                analyzer: "edge_ngram_analyzer",
                search_analyzer: "standard",
              },
            },
          },
          description: { type: "text" },
          sale_price: { type: "double" },
          category_id: { type: "keyword" },
          brand: { type: "keyword" },
          createdAt: { type: "date" },
        },
      },
    });

    console.log(`Index "${INDEX}" created.`);
  } catch (err: any) {
    // Helpful logging for debugging (do not leak secrets in production logs)
    console.error("ensureProductIndex error:", {
      message: err?.message,
      name: err?.name,
      meta: err?.meta ?? undefined,
      stack: err?.stack,
    });
    throw err;
  }
}
