// src/scripts/create-indexes.cjs
require("dotenv").config();
const { QdrantClient } = require("@qdrant/js-client-rest");

console.log("QDRANT_URL:", process.env.QDRANT_URL);
console.log("QDRANT_API_KEY:", process.env.QDRANT_API_KEY ? "***" : "Not set");

// Create client with compatibility check disabled
const client = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false, // Skip version check
});

async function testConnection() {
  try {
    console.log("Testing connection to Qdrant...");

    // Test basic API call
    const health = await client.api("cluster").clusterStatus;
    console.log("✓ Connection successful!");
    console.log("Cluster status:", health.status);

    return true;
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    return false;
  }
}

async function createIndexes() {
  // Test connection first
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error("Cannot proceed without Qdrant connection");
    return;
  }

  try {
    const collections = await client.getCollections();
    console.log(`Found ${collections.collections.length} collections`);

    for (const collection of collections.collections) {
      console.log(`\nCreating indexes for collection: ${collection.name}`);

      try {
        await client.createPayloadIndex(collection.name, {
          field_name: "metadata.userId",
          field_schema: "keyword",
        });
        console.log(`✓ Created index for userId`);
      } catch (error) {
        console.log(`ℹ userId index may already exist`);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

createIndexes();
