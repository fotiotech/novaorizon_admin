// lib/embedProduct.ts
import { VoyageAIClient } from "voyageai";
import {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  buildEmbeddingText,
  type EmbeddableProduct,
} from "./embedding";

// MongoDB Atlas hosts Voyage models behind its own endpoint. The SDK's
// default (api.voyageai.com) rejects Atlas-issued keys with a 403, so
// we have to point it at ai.mongodb.com explicitly.
const VOYAGE_BASE_URL =
  process.env.VOYAGE_BASE_URL ?? "https://ai.mongodb.com/v1";

// Lazy — instantiated on first use, not at module load. This lets
// callers load this module before .env is populated (backfill scripts,
// tests) and pick up the key when the first call happens.
let _client: VoyageAIClient | null = null;

function getClient(): VoyageAIClient {
  if (!_client) {
    _client = new VoyageAIClient({
      apiKey: process.env.VOYAGE_API_KEY!,
      baseUrl: VOYAGE_BASE_URL,
    });
  }
  return _client;
}

export interface EmbeddingResult {
  embedding: number[];
  embeddingText: string;
  embeddingModel: string;
  embeddedAt: Date;
}

export async function embedProduct(
  product: EmbeddableProduct,
): Promise<EmbeddingResult | null> {
  if (!process.env.VOYAGE_API_KEY) {
    console.warn("[embedProduct] VOYAGE_API_KEY not set — skipping embedding");
    return null;
  }

  const text = buildEmbeddingText(product);
  if (!text) return null;

  try {
    const response = await getClient().embed({
      input: [text],
      model: EMBEDDING_MODEL,
      inputType: "document",
      outputDimension: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data?.[0]?.embedding;
    if (
      !Array.isArray(embedding) ||
      embedding.length !== EMBEDDING_DIMENSIONS
    ) {
      console.error(
        `[embedProduct] Unexpected embedding shape: got ${embedding?.length} dims`,
      );
      return null;
    }

    return {
      embedding,
      embeddingText: text,
      embeddingModel: EMBEDDING_MODEL,
      embeddedAt: new Date(),
    };
  } catch (err) {
    console.error("[embedProduct] Voyage API error:", err);
    return null;
  }
}
