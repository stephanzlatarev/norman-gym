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

export async function log(record) {
  const db = await connect();
  const records = db.collection("progress");

  await records.insertOne(record);
}

export async function loadBrain(name) {
  const db = await connect();
  const records = db.collection("brain");
  const record = await records.findOne({ name: name });

  return record ? record.brain : null;
}

export async function saveBrain(name, brain) {
  const db = await connect();
  const records = db.collection("brain");

  await records.findOneAndReplace({ name: name }, { name: name, brain: brain }, { upsert: true });
}
