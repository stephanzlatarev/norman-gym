import { MongoClient } from "mongodb";
import { finished } from "stream";
import { promisify } from "util";

export const pipelineAsync = promisify(finished);

let db = null;

export async function connect() {
  if (!db) {
    const client = new MongoClient(process.env.MONGO_URL || "mongodb://mongo:27017", { connectTimeoutMS: 0 });

    await client.connect();

    db = client.db("gym");

    await db.collection("progress").createIndex({ time: 1 }, { expireAfterSeconds: 60 * 60 });
    await db.collection("events").createIndex({ time: 1 }, { expireAfterSeconds: 60 * 60 });
  }

  return db;
}