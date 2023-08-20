import { MongoClient } from "mongodb";

let db = null;

async function connect() {
  if (!db) {
    const client = new MongoClient(process.env.MONGO_URL || "mongodb://mongo:27017");

    await client.connect();

    db = client.db("gym");
  }

  return db;
}

export async function getProgress() {
  const db = await connect();
  const records = db.collection("progress");

  return await records.find({}).toArray();
}
