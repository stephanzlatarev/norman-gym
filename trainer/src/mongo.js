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

export async function log(brain, progress, samples) {
  const db = await connect();

  progress.brain = brain;
  await db.collection("progress").insertOne(progress);

  samples.brain = brain;
  await db.collection("samples").findOneAndReplace({ brain: brain }, samples, { upsert: true });
}

export async function loadBrain(name) {
  const db = await connect();
  const record = await db.collection("brain").findOne({ name: name });

  return record ? record.brain : null;
}

export async function saveBrain(name, brain) {
  const db = await connect();

  await db.collection("brain").findOneAndReplace({ name: name }, { name: name, brain: brain }, { upsert: true });
}
