import mongoose from "mongoose";

let isConnected = false; // track the connection

export async function connection() {
  if (isConnected) {
    console.log("[MongoDB] Already connected");
    return;
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    console.log(
      "[MongoDB] Attempting to connect with URI:",
      process.env.MONGODB_URI?.substring(0, 20) + "..." // Only show start of URI for security
    );

    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("[MongoDB] Successfully connected to database");

    // Test the connection by trying to list collections
    const collections = await mongoose.connection.db
      ?.listCollections()
      .toArray();
    console.log(
      "[MongoDB] Available collections:",
      collections?.map((c) => c.name)
    );
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    // Reset the connection flag since the connection failed
    isConnected = false;
    throw error; // Re-throw to handle it in the calling code
  }
}
