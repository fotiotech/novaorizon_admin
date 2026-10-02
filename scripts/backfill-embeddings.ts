// scripts/backfill-embeddings.ts
import "./_env"; // ← first line, loads .env.local
import mongoose from "mongoose";
import Product from "@/models/Product";
import { embedProduct } from "@/lib/embedProduct";
import { needsReembedding } from "@/lib/embedding";
import { connection } from "@/utils/connection";

async function main() {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY is not set — check .env.local");
  }

  await connection();

  const all = await Product.find({})
    .select(
      "name categoryName brandName shortDescription description tags embeddingText embedding",
    )
    .lean();

  const products = all.filter((p) => needsReembedding(p));

  console.log(
    `Backfilling ${products.length} of ${all.length} products ` +
      `(${all.length - products.length} already current)...`,
  );

  let ok = 0;
  let failed = 0;

  for (const p of products) {
    const embedded = await embedProduct({
      name: p.name,
      categoryName: p.categoryName,
      brandName: p.brandName,
      shortDescription: p.shortDescription,
      description: p.description,
      tags: p.tags,
    });

    if (!embedded) {
      console.warn(`Skipped ${p._id} (embedding failed)`);
      failed++;
      continue;
    }

    // Targeted update instead of doc.save() — avoids running the
    // pre-save hook chain and only writes the four embedding fields.
    await Product.updateOne(
      { _id: p._id },
      {
        $set: {
          embedding: embedded.embedding,
          embeddingText: embedded.embeddingText,
          embeddingModel: embedded.embeddingModel,
          embeddedAt: embedded.embeddedAt,
        },
      },
    );

    ok++;
    console.log(`Embedded ${p._id}: ${p.name?.slice(0, 60) ?? ""}`);
  }

  await mongoose.disconnect();
  console.log(`Done. ${ok} embedded, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
