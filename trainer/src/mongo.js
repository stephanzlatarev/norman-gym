import { MongoClient } from "mongodb";
import zlib from "zlib";

let db = null;

async function connect() {
  if (!db) {
    const client = new MongoClient(process.env.MONGO_URL || "mongodb://mongo:27017");

    await client.connect();

    db = client.db("gym");

    db.collection("progress").createIndex( { time: 1 }, { expireAfterSeconds: 60 * 60 } )
  }

  return db;
}

export async function log(brain, mode, progress) {
  const db = await connect();

  progress.brain = brain;
  progress.time = new Date();
  await db.collection("progress").insertOne(progress);

  const rank = { brain: brain, mode: mode, error: progress.control.overall.error, pass: progress.control.overall.pass };
  await db.collection("rank").findOneAndReplace({ brain: brain }, rank, { upsert: true });
}

export async function sample(brain, samples) {
  const db = await connect();

  samples.brain = brain;
  await db.collection("samples").findOneAndReplace({ brain: brain }, samples, { upsert: true });
}

export async function isLeader(brain) {
  const db = await connect();
  const leaderboard = await db.collection("rank").find({}).toArray();

  leaderboard.sort((a, b) => (a.error - b.error));

  return (leaderboard.length && (leaderboard[0].brain === brain));
}

export async function loadBrain(name) {
  const db = await connect();
  const record = await db.collection("brain").findOne({ name: name });

  if (record) {
    return JSON.parse(zlib.gunzipSync(Buffer.from(record.brain, "base64")).toString("utf-8"));
  }
}

export async function saveBrain(name, brain) {
  const db = await connect();
  const record = zlib.gzipSync(Buffer.from(JSON.stringify(brain), "utf-8")).toString("base64");

  await db.collection("brain").findOneAndReplace({ name: name }, { name: name, brain: record }, { upsert: true });
}
