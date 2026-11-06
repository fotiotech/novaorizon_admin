import mongoose from "mongoose";

let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Connect once per process. Never log the URI — it contains credentials.
 */
export async function connection(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not configured");

    connectionPromise = mongoose
      .connect(uri, { dbName: process.env.MONGODB_DB_NAME ?? "fotiodb" })
      .then((instance) => instance)
      .catch((error) => {
        connectionPromise = null;
        console.error("[MongoDB] connection failed");
        throw error;
      });
  }

  await connectionPromise;
}
