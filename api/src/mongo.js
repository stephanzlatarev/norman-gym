import { MongoClient } from "mongodb";

let db = null;

export async function connect() {
  if (!db) {
    const client = new MongoClient(process.env.MONGO_URL || "mongodb://mongo:27017");

    await client.connect();

    db = client.db("gym");
  }

  return db;
}

async function progress() {
  return (await connect()).collection("progress");
}

export async function getProgress() {
  const records = await progress();
  const projection = { epoch: 1, studyError: 1, controlError: 1 };

  return await records.find({}, projection).toArray();
}
